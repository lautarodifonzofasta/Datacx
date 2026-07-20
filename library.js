/* ============================================================
   gsync.js — un Excel vivo por carpeta, en el Google de la clínica.

   Modelo: cada carpeta propia puede vincularse a UNA planilla de
   Google Sheets. "Sincronizar" hace tres cosas, siempre en este
   orden: baja lo que hay en la planilla, lo fusiona localmente con
   la regla de siempre (nunca pisar un dato cargado), y sube la
   tabla consolidada. Todos los teléfonos apuntan a la misma
   planilla porque el vínculo viaja dentro de la plantilla.

   La app habla directo con Google desde el teléfono: no hay ningún
   servidor intermedio. Los datos van del teléfono a la cuenta
   institucional y a ningún otro lado.

   Limitación asumida: si dos teléfonos sincronizan en el mismo
   segundo, gana el último en subir. Para un servicio que
   sincroniza al terminar el pase, es un riesgo teórico; el botón
   avisa igual cuando la subida pisa una versión más nueva.
   ============================================================ */

const GS = { tokenClient: null, token: null, tokenAt: 0 };

/* El Client ID lo crea la clínica una sola vez (ver SETUP_GOOGLE.md)
   y se guarda acá para todos los usos. */
async function gsClientId(v) {
  if (v !== undefined) return Store.setting('gsClientId', v);
  return Store.setting('gsClientId');
}

function loadGIS() {
  return new Promise((res, rej) => {
    if (window.google && google.accounts) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => res();
    s.onerror = () => rej(new Error('No se pudo cargar Google. ¿Hay señal?'));
    document.head.appendChild(s);
  });
}

async function gsToken() {
  /* El token dura ~1 h; lo renovamos con margen. */
  if (GS.token && Date.now() - GS.tokenAt < 50 * 60000) return GS.token;
  const cid = await gsClientId();
  if (!cid) throw new Error('Falta configurar el Client ID de Google (Ajustes → Google Sheets).');
  await loadGIS();
  return new Promise((res, rej) => {
    GS.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cid,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (t) => {
        if (t.error) return rej(new Error('Google no autorizó: ' + t.error));
        GS.token = t.access_token; GS.tokenAt = Date.now(); res(GS.token);
      },
    });
    GS.tokenClient.requestAccessToken({ prompt: GS.token ? '' : 'consent' });
  });
}

async function gsFetch(url, opts = {}) {
  const token = await gsToken();
  const r = await fetch(url, Object.assign({}, opts, {
    headers: Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, opts.headers || {}),
  }));
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error('Google respondió ' + r.status + (e.error && e.error.message ? ': ' + e.error.message : ''));
  }
  return r.json();
}

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

/* ---------- crear o vincular ---------- */
async function gsCreate(folderId) {
  const SC = SCHEMAS[folderId];
  const r = await gsFetch(SHEETS, {
    method: 'POST',
    body: JSON.stringify({ properties: { title: SC.name + ' — Data cx' } }),
  });
  const gs = { id: r.spreadsheetId, url: r.spreadsheetUrl };
  await gsLink(folderId, gs);
  await gsPush(folderId);           /* nace con el encabezado y lo local */
  return gs;
}

function gsIdFromUrl(txt) {
  const m = String(txt || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/) || String(txt || '').match(/^([a-zA-Z0-9\-_]{20,})$/);
  return m ? m[1] : null;
}

async function gsLink(folderId, gs) {
  const def = SCHEMAS[folderId].def;
  def.gs = gs;
  await Store.putFolder(JSON.parse(JSON.stringify(def)));
  unregisterFolder(def.id); registerFolder(def);
}

/* ---------- bajar / subir ---------- */
async function gsPull(folderId) {
  const gs = SCHEMAS[folderId].def.gs;
  const r = await gsFetch(`${SHEETS}/${gs.id}/values/A1:ZZ100000?majorDimension=ROWS`);
  const rows = r.values || [];
  /* Fila 1 = encabezado. Las vacías y las separadoras de año no son pacientes. */
  return rows.slice(1)
    .filter(row => row && String(row[0] || '').trim() !== '' && !(/^\d{4}$/.test(String(row[0]).trim()) && row.slice(1).every(c => !c)))
    .map(row => ({ data: unrow1(folderId, row) }));
}

async function gsPush(folderId) {
  const SC = SCHEMAS[folderId];
  const gs = SC.def.gs;
  const recs = await Store.all(folderId);
  /* Tabla plana y sin filas de año: en una planilla viva molestan. Orden por fecha. */
  const dk = SC.dateKey;
  const sorted = recs.slice().sort((a, b) => String((dk && a.data[dk]) || '9999').localeCompare(String((dk && b.data[dk]) || '9999')));
  const rows = [header1(folderId)[0]];
  for (const r of sorted) rows.push(await buildRow(folderId, r, false));
  await gsFetch(`${SHEETS}/${gs.id}/values/A1:ZZ100000:clear`, { method: 'POST', body: '{}' });
  await gsFetch(`${SHEETS}/${gs.id}/values/A1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ range: 'A1', majorDimension: 'ROWS', values: rows }),
  });
  return rows.length - 1;
}

/* ============================================================
   Método simple (GRATIS, sin Google Cloud): la planilla lleva
   adentro un mini script (Apps Script) publicado como web app.
   La app le habla a esa URL. Cero tarjeta, cero consola: solo un
   Gmail común. Es el método recomendado; el de arriba (OAuth)
   queda como avanzado.

   Nota técnica: el POST va como text/plain a propósito — es lo
   que evita el "preflight" CORS que Apps Script no contesta.
   ============================================================ */

async function scriptCall(gs, payload) {
  const r = await fetch(gs.script, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    body: JSON.stringify(Object.assign({ token: gs.token || '', hoja: gs.hoja || '' }, payload)),
  });
  if (!r.ok) throw new Error('La planilla respondió ' + r.status + '. ¿El script está publicado como "Cualquier persona"?');
  const j = await r.json();
  if (j && j.error === 'token') throw new Error('La clave no coincide con la del script de la planilla.');
  if (j && j.error) throw new Error('El script respondió: ' + j.error);
  return j;
}

async function scriptPull(folderId) {
  const gs = SCHEMAS[folderId].def.gs;
  const j = await scriptCall(gs, { action: 'pull' });
  const rows = j.values || [];
  return rows.slice(1)
    .filter(row => row && String(row[0] || '').trim() !== '' && !(/^\d{4}$/.test(String(row[0]).trim()) && row.slice(1).every(c => !c)))
    .map(row => ({ data: unrow1(folderId, row) }));
}

async function scriptPush(folderId) {
  const SC = SCHEMAS[folderId];
  const recs = await Store.all(folderId);
  const dk = SC.dateKey;
  const sorted = recs.slice().sort((a, b) => String((dk && a.data[dk]) || '9999').localeCompare(String((dk && b.data[dk]) || '9999')));
  const rows = [header1(folderId)[0]];
  for (const r of sorted) rows.push(await buildRow(folderId, r, false));
  await scriptCall(SCHEMAS[folderId].def.gs, { action: 'push', rows });
  return rows.length - 1;
}

/* ============================================================
   Borrado sincronizado ("lápidas").
   Sin esto, borrar está roto: lo que borrás en un teléfono vuelve
   desde la planilla en la próxima sincronización. La regla:

   - Borrar un paciente deja una lápida (clave + fecha) que viaja
     a una pestaña aparte de la planilla («…·borrados») y de ahí a
     todos los teléfonos. El borrado gana en todos lados.
   - Rescate: si alguien vuelve a cargar o edita al mismo paciente
     DESPUÉS del borrado, esa carga nueva gana y la lápida se va.
   - Borrar la fila directamente en Google Sheets también cuenta:
     si un registro ya sincronizado desaparece de la planilla y
     nadie lo tocó localmente desde la última sincronización, se
     borra acá también.

   La pestaña de lápidas usa el mismo script: no hay que tocar
   nada en Google.
   ============================================================ */

/* Las lápidas locales son PENDIENTES: borrados hechos acá que todavía no
   viajaron. Una vez subidas, la pestaña «·borrados» de la planilla es la
   única verdad — si alguien quitó una lápida de ahí (porque volvió a cargar
   al paciente), quitada está. Guardar copias locales eternas fue el bug que
   re-mataba pacientes legítimamente recargados. */
const tombKeyOf = (folderId) => 'tombp:' + folderId;
const tombTab = (SC) => (SC.sheet + '·borrados').slice(0, 95);

async function tombPending(folderId) { return (await Store.setting(tombKeyOf(folderId))) || {}; }
async function tombSetPending(folderId, t) { return Store.setting(tombKeyOf(folderId), t); }

/* La llama el botón Eliminar de la app cuando la carpeta está sincronizada. */
async function tombAdd(folderId, data) {
  const SC = SCHEMAS[folderId];
  const k = recKey(SC, data);
  if (!k) return;
  const t = await tombPending(folderId);
  t[k] = Date.now();
  await tombSetPending(folderId, t);
}

async function tombPull(gs, SC) {
  const j = await scriptCall(gs, { action: 'pull', hoja: tombTab(SC) });
  const out = {};
  (j.values || []).slice(1).forEach(r => {
    const k = String(r[0] || '').trim(), at = Number(r[1]);
    if (k && isFinite(at)) out[k] = at;
  });
  return out;
}

async function tombPush(gs, SC, t) {
  const rows = [['REGISTRO', 'BORRADO_EL']].concat(Object.entries(t).map(([k, at]) => [k, at]));
  await scriptCall(gs, { action: 'push', hoja: tombTab(SC), rows });
}

/* ---------- el botón: elige el método según cómo se vinculó ---------- */
async function gsSync(folderId) {
  if (!navigator.onLine) throw new Error('Sin conexión. La sincronización necesita señal; los datos locales están a salvo.');
  const SC = SCHEMAS[folderId];
  const gs = SC.def.gs;
  const script = !!(gs && gs.script);

  /* 1. Lápidas: las de la planilla (la verdad) + las pendientes de este teléfono. */
  const pendientes = await tombPending(folderId);
  const tombs = script ? await tombPull(gs, SC) : {};
  for (const k in pendientes) if (!tombs[k] || pendientes[k] > tombs[k]) tombs[k] = pendientes[k];

  /* 2. Bajar la planilla. */
  const bajadosTodos = script ? await scriptPull(folderId) : await gsPull(folderId);
  const clavesEnPlanilla = new Set(bajadosTodos.map(r => recKey(SC, r.data)));

  /* 3. Aplicar lápidas localmente: se borra salvo que lo hayan tocado después. */
  let borrados = 0;
  const locales = await Store.all(folderId);
  for (const r of locales) {
    const k = recKey(SC, r.data);
    if (!k || !tombs[k]) continue;
    if ((r.updatedAt || 0) < tombs[k]) { await Store.remove(folderId, r.id); borrados++; }
    else delete tombs[k];   /* rescate: lo editaron después del borrado */
  }

  /* 4. Borrado hecho directo en la hoja de Google: un registro ya sincronizado
     que desapareció de la planilla y nadie tocó acá desde entonces. */
  if (script && bajadosTodos.length + Object.keys(tombs).length > 0) {
    for (const r of await Store.all(folderId)) {
      const k = recKey(SC, r.data);
      if (!k || clavesEnPlanilla.has(k)) continue;
      if (r.synced && (r.updatedAt || 0) <= (r.syncedAt || 0)) {
        tombs[k] = Date.now();
        await Store.remove(folderId, r.id);
        borrados++;
      }
    }
  }

  /* 5. Fusionar lo bajado (las filas con lápida no entran). */
  const bajados = bajadosTodos.filter(r => !tombs[recKey(SC, r.data)]);
  const res = await mergeInto(folderId, bajados);

  /* 6. Subir la tabla consolidada y las lápidas; marcar qué quedó sincronizado. */
  const subidos = script ? await scriptPush(folderId) : await gsPush(folderId);
  if (script) {
    await tombPush(gs, SC, tombs);
    await tombSetPending(folderId, {});   /* ya viajaron: la planilla manda */
  } else {
    await tombSetPending(folderId, tombs); /* sin pestaña remota, siguen pendientes */
  }
  await Store.markSynced(folderId, Date.now());

  return Object.assign(res, { subidos, borrados });
}
