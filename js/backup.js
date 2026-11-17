/* ============================================================
   backup.js — el seguro contra el riesgo número uno.
   IndexedDB es un caché glorificado: iOS puede vaciarla si anda
   corto de espacio. Tres defensas, en orden de importancia:

   1. storage.persist(): le pedimos al sistema que no borre nada.
   2. Respaldo completo en un archivo: TODO (carpetas, registros,
      plantillas, alias) en un JSON que se guarda donde quieras y
      se restaura en cualquier teléfono.
   3. Recordatorio: si hay registros y pasó una semana sin
      respaldar, un aviso en el inicio. No se puede apagar,
      porque la disciplina que depende de acordarse, falla.
   ============================================================ */

async function pedirPersistencia() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const ya = await navigator.storage.persisted();
      const ok = ya || await navigator.storage.persist();
      await Store.setting('persisted', ok);
      return ok;
    }
  } catch (e) { /* viejo Safari: seguimos sin él */ }
  return false;
}

/* ---------- respaldo ---------- */
async function fullBackup() {
  const data = {
    app: 'registro-clinico', tipo: 'respaldo', v: 1, fecha: new Date().toISOString(),
    folders: await Store.folders(),
    ublocks: (await Store.setting('ublocks')) || [],
    alias: await Store.aliasTable(),
    records: {},
  };
  for (const id of Object.keys(SCHEMAS)) {
    const rs = await Store.all(id);
    data.records[id] = rs.map(r => ({ data: r.data }));
  }
  const d = new Date();
  const nombre = `Respaldo_DataCx_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  await Store.setting('lastBackup', Date.now());
  return Object.values(data.records).reduce((n, r) => n + r.length, 0);
}

/* ---------- restauración ----------
   Aditiva y con la misma regla de la fusión: nunca pisa un dato cargado.
   Restaurar dos veces el mismo archivo no duplica nada. */
async function restoreBackup(file) {
  const txt = await file.text();
  let b;
  try { b = JSON.parse(txt); } catch (e) { throw new Error('Ese archivo no es un respaldo.'); }
  if (!b || b.tipo !== 'respaldo' || !b.records) throw new Error('Ese archivo no es un respaldo.');

  /* Primero las definiciones: sin la carpeta, sus registros no tienen dónde vivir. */
  for (const def of (b.folders || [])) {
    def._saved = true;
    await Store.putFolder(JSON.parse(JSON.stringify(def)));
    if (SCHEMAS[def.id]) unregisterFolder(def.id);
    registerFolder(def);
  }
  if (b.ublocks && b.ublocks.length) {
    const mios = (await Store.setting('ublocks')) || [];
    const nombres = new Set(mios.map(x => x.l.toLowerCase()));
    b.ublocks.forEach(x => { if (!nombres.has(x.l.toLowerCase())) mios.push(x); });
    await Store.setting('ublocks', mios);
  }
  for (const al of (b.alias || [])) {
    try { await db.alias.put(al); } catch (e) {}
  }

  const detalle = [];
  for (const id of Object.keys(b.records)) {
    if (!SCHEMAS[id]) continue;
    const incoming = b.records[id].map(r => ({ data: r.data }));
    if (!incoming.length) continue;
    const r = await mergeInto(id, incoming);
    detalle.push({ carpeta: SCHEMAS[id].name, ...r });
  }
  return detalle;
}

/* ---------- recordatorio ---------- */
async function backupStatus() {
  let total = 0;
  for (const id of Object.keys(SCHEMAS)) total += await Store.count(id);
  if (!total) return null;
  const last = await Store.setting('lastBackup');
  const dias = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (dias !== null && dias < 7) return { ok: true, dias, total };
  return { ok: false, dias, total };
}
