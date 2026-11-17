/* ============================================================
   merge.js — varios cargadores, un solo Excel, sin nube.

   El flujo: cada teléfono tiene la misma carpeta (plantilla
   compartida), cada uno carga lo suyo, y un teléfono consolida
   importando los Excel de los demás.

   Regla de fusión, y es una sola: NUNCA se pisa un dato cargado.
   El mismo paciente (nombre + fecha de cirugía) se reconoce y lo
   que llega solo rellena los campos que acá están vacíos. Si dos
   personas cargaron distinto el mismo campo, gana el que ya estaba
   y el conflicto se anota en el resumen para revisarlo a mano.
   ============================================================ */

/* La identidad de un registro: nombre normalizado + fecha de cirugía.
   Con eso, "Gómez  juan" del teléfono B es "GOMEZ JUAN" del teléfono A. */
function recKey(SC, data) {
  const n = String(data[SC.idKey] || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  if (!n) return '';
  const f = SC.dateKey ? String(data[SC.dateKey] || '') : '';
  return n + '|' + f;
}

const countLoaded = (SC, data) => SC.fields.filter(f => f.t !== 'calc' && hasVal(data[f.k])).length;

async function mergeInto(folder, incoming) {
  const SC = SCHEMAS[folder];
  const existing = await Store.all(folder);
  const map = new Map();
  existing.forEach(r => { const k = recKey(SC, r.data); if (k) map.set(k, r); });

  const res = { nuevos: 0, completados: 0, iguales: 0, conflictos: [] };

  for (const inc of incoming) {
    const k = recKey(SC, inc.data);
    const ex = k ? map.get(k) : null;

    if (!ex) {
      const id = await Store.save(folder, { data: inc.data });
      if (k) map.set(k, { id, data: inc.data });
      res.nuevos++;
      continue;
    }

    /* Mismo paciente: rellenar huecos, anotar diferencias, no pisar nada. */
    let relleno = 0;
    for (const f of SC.fields) {
      if (f.t === 'calc') continue;
      /* El nombre ya sirvió para reconocer al paciente: que uno lo haya escrito
         en minúsculas no es un conflicto clínico, es tipeo. */
      if (f.k === SC.idKey) continue;
      const mio = ex.data[f.k], suyo = inc.data[f.k];
      if (!hasVal(suyo)) continue;
      if (!hasVal(mio)) { ex.data[f.k] = suyo; relleno++; }
      else if (JSON.stringify(mio) !== JSON.stringify(suyo)) {
        res.conflictos.push({ paciente: String(inc.data[SC.idKey] || ''), campo: f.l, mio: plain(mio), suyo: plain(suyo) });
      }
    }
    if (relleno) { await Store.save(folder, ex); res.completados++; }
    else res.iguales++;
  }
  return res;
}

const plain = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return v.join('/');
  return [((v.sel || []).join('/')), v.free, v.s, v.n, v.v, v.txt].filter(x => x !== undefined && x !== '' && x !== null).join(' ');
};

/* ---------- plantillas compartibles ----------
   El id de la carpeta viaja con la definición: por eso dos teléfonos con la
   misma plantilla producen Excel fusionables (y comparten la misma planilla
   de Google si está vinculada).

   El link lleva la plantilla ADENTRO, comprimida: no hay servidor. El que lo
   toca abre la app y le aparece "¿Agregar esta carpeta?". */

function templatePayload(folder) {
  return { app: 'registro-clinico', tipo: 'plantilla', v: 1, def: SCHEMAS[folder].def };
}

function templateLink(folder) {
  const packed = LZString.compressToEncodedURIComponent(JSON.stringify(templatePayload(folder)));
  return location.origin + location.pathname + '#tpl=' + packed;
}

function templateFromHash(hash) {
  const m = String(hash || '').match(/^#tpl=(.+)$/);
  if (!m) return null;
  try {
    const p = JSON.parse(LZString.decompressFromEncodedURIComponent(m[1]));
    return (p && p.tipo === 'plantilla' && p.def && Array.isArray(p.def.fields)) ? p : null;
  } catch (e) { return null; }
}

function exportTemplate(folder) {
  const SC = SCHEMAS[folder];
  const blob = new Blob([JSON.stringify(templatePayload(folder), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Plantilla_${SC.filePrefix}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function importTemplateData(p) {
  if (!p || p.tipo !== 'plantilla' || !p.def || !Array.isArray(p.def.fields)) throw new Error('Eso no es una plantilla.');
  const def = p.def;
  if (SCHEMAS[def.id] && SCHEMAS[def.id].sys) throw new Error('Esa plantilla pisa una carpeta del sistema.');
  const existia = !!SCHEMAS[def.id];
  def._saved = true;
  await Store.putFolder(JSON.parse(JSON.stringify(def)));
  if (existia) unregisterFolder(def.id);
  registerFolder(def);
  return { nombre: def.name, actualizada: existia };
}

async function importTemplate(file) {
  const txt = await file.text();
  let p;
  try { p = JSON.parse(txt); } catch (e) { throw new Error('Ese archivo no es una plantilla.'); }
  return importTemplateData(p);
}
