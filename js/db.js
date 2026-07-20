/* ============================================================
   db.js — todo vive en el dispositivo (IndexedDB vía Dexie).
   Sin backend: no sale un solo dato del celular salvo que vos
   exportes el Excel y lo compartas. Ver README (Opción A).
   ============================================================ */

const db = new Dexie('registro_pancreatico');

/* v1: las dos carpetas del páncreas, cada una con su tabla. */
db.version(1).stores({
  c1: '++id, anio, nombre, updatedAt',
  c2: '++id, anio, nombre, updatedAt',
  drafts: 'key',
  settings: 'key',
  alias: 'nombre, code',
});

/* v2: carpetas que definís vos. `folders` guarda la definición (qué campos tiene
   el formulario); `records` los pacientes de todas ellas. Las dos del páncreas
   siguen en sus tablas de siempre: no se tocan, no se migran, no se rompen. */
db.version(2).stores({
  c1: '++id, anio, nombre, updatedAt',
  c2: '++id, anio, nombre, updatedAt',
  folders: 'id, name, createdAt',
  records: '++id, folderId, anio, nombre, updatedAt',
  drafts: 'key',
  settings: 'key',
  alias: 'nombre, code',
});

const SYS = ['c1', 'c2'];
const isSys = (f) => SYS.includes(f);

const Store = {
  async all(folder) {
    if (isSys(folder)) return db[folder].orderBy('updatedAt').reverse().toArray();
    const rs = await db.records.where('folderId').equals(folder).toArray();
    return rs.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(folder, id) {
    return isSys(folder) ? db[folder].get(id) : db.records.get(id);
  },
  async save(folder, rec) {
    const SC = SCHEMAS[folder];
    rec.updatedAt = Date.now();
    rec.anio = yearOf(SC, rec) || 0;
    rec.nombre = String(rec.data[SC.idKey] || '').trim();
    if (isSys(folder)) {
      if (rec.id) { await db[folder].put(rec); return rec.id; }
      delete rec.id;
      return db[folder].add(rec);
    }
    rec.folderId = folder;
    if (rec.id) { await db.records.put(rec); return rec.id; }
    delete rec.id;
    return db.records.add(rec);
  },
  async remove(folder, id) {
    return isSys(folder) ? db[folder].delete(id) : db.records.delete(id);
  },
  async count(folder) {
    return isSys(folder) ? db[folder].count() : db.records.where('folderId').equals(folder).count();
  },

  /* --- definiciones de carpetas --- */
  async folders() { return (await db.folders.toArray()).sort((a, b) => a.createdAt - b.createdAt); },
  async putFolder(def) { return db.folders.put(def); },
  async delFolder(id) {
    await db.records.where('folderId').equals(id).delete();
    return db.folders.delete(id);
  },

  async setDraft(key, data) { return db.drafts.put({ key, data, at: Date.now() }); },
  async getDraft(key) { const d = await db.drafts.get(key); return d ? d.data : null; },
  async delDraft(key) { return db.drafts.delete(key); },

  async setting(key, val) {
    if (val === undefined) { const s = await db.settings.get(key); return s ? s.val : undefined; }
    return db.settings.put({ key, val });
  },

  /* --- Modo anonimizado: la tabla de equivalencias NO sale de acá --- */
  async aliasFor(nombre) {
    const n = String(nombre || '').trim().toUpperCase();
    if (!n) return '';
    const hit = await db.alias.get(n);
    if (hit) return hit.code;
    const total = await db.alias.count();
    const code = 'PANC-' + String(total + 1).padStart(4, '0');
    await db.alias.put({ nombre: n, code });
    return code;
  },
  async aliasTable() { return db.alias.toArray(); },
};

function yearOf(SC, rec) {
  const iso = SC && SC.dateKey ? rec.data[SC.dateKey] : null;
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-\d{2}-\d{2}/);
  return m ? Number(m[1]) : null;
}
