/* ============================================================
   xlsxio.js — Excel adentro y afuera.
   Regla de oro: los encabezados, el nombre de hoja, el orden de
   columnas y los merges salen exactamente como están en los
   archivos originales. Nada se "mejora" al exportar.
   ============================================================ */

/* ---------- utilidades de columna ---------- */
const colIdx = (a) => XLSX.utils.decode_col(a);
const idxCol = (i) => XLSX.utils.encode_col(i);

/* ---------- fechas ---------- */
function fmtDate(iso, upper) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const [y, m, d] = iso.split('-');
  const s = `${d} ${MESES[Number(m) - 1]} ${y}`;
  return upper ? s.toUpperCase() : s;
}
function parseDate(txt) {
  if (!txt) return '';
  if (typeof txt === 'number') { // serial de Excel
    const o = XLSX.SSF.parse_date_code(txt);
    if (o) return `${o.y}-${String(o.m).padStart(2,'0')}-${String(o.d).padStart(2,'0')}`;
  }
  const s = String(txt).trim().toUpperCase().replace(/\s+DE\s+/g, ' ');
  const m = s.match(/^(\d{1,2})\s+([A-ZÁÉÍÓÚÑ]+)\s+(\d{4})$/);
  if (m) {
    const mi = MESES.findIndex(x => x.toUpperCase() === m[2]);
    if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  }
  const iso = String(txt).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : '';
}

const isSpecial = (v, sp) => typeof v === 'string' && sp.includes(v);
/* La base escribe "1 mes" en singular y "48 meses" en plural. */
const sfx = (f, n) => (Number(n) === 1 && f.suffix1) ? f.suffix1 : f.suffix;
const numOf = (v) => { const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? '' : n; };

/* ============================================================
   CARPETA 1 — valor de celda
   ============================================================ */
function cell1(f, v) {
  if (v === undefined || v === null || v === '') return '';
  if (isSpecial(v, SP1)) return v;
  switch (f.t) {
    case 'calc': return v;
    case 'date': return fmtDate(v, false);
    case 'num': {
      const n = numOf(v);
      if (n === '') return String(v);
      return f.suffix ? `${n}${sfx(f, n)}` : n;
    }
    case 'multi': {
      const arr = Array.isArray(v) ? v : (v.sel || []);
      const free = (typeof v === 'object' && v.free) ? String(v.free).trim() : '';
      const all = arr.concat(free ? [free] : []);
      return all.join(f.join || '/');
    }
    case 'chipsnum': {
      const s = v.s || '', raw = v.n === undefined ? '' : String(v.n).trim(), n = raw === '' ? '' : numOf(raw);
      if (s && n !== '') return `${s} (${n})`;
      if (s) return s;
      if (n !== '') return n;
      return raw;  /* texto libre, ej. "Sin resección" */
    }
    default: {
      if (typeof v === 'object') return JSON.stringify(v);
      /* "7" elegido con chips es un número; "IIIa" no. */
      if ((f.t === 'chips' || f.t === 'select') && /^-?\d+(?:[.,]\d+)?$/.test(String(v).trim()))
        return numOf(v);
      return v;
    }
  }
}

/* ============================================================
   CARPETA 2 — un campo se despliega en 1..n columnas
   ============================================================ */
function cells2(f, v) {
  const out = {};
  const M = f.map;
  const cols = M.cols;
  const empty = (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) ||
    (typeof v === 'object' && !Array.isArray(v) && !v.s && !v.n && !v.sel && !v.free && !v.txt && v.v === undefined));

  if (empty) { cols.forEach(c => out[c] = ''); return out; }

  /* Un valor especial (S/D, NO CORRESP…) pinta todo el grupo. */
  const sv = typeof v === 'string' ? v : (v && v.v);
  if (isSpecial(sv, SP2)) { cols.forEach(c => out[c] = sv); return out; }

  switch (M.m) {
    case 'one': {
      out[cols[0]] = one2(f, v);
      return out;
    }
    case 'pick': {
      const opts = M.skipFirst ? f.o.slice(1) : f.o;
      const first = M.skipFirst ? f.o[0] : null;
      if (M.skipFirst && v === first) { cols.forEach(c => out[c] = 'NO'); return out; }
      const i = opts.indexOf(v);
      cols.forEach((c, j) => {
        if (j === i) out[c] = M.mark === 'self' ? (M.num ? Number(v) : v) : 'SI';
        else out[c] = M.blankOthers ? '' : 'NO';
      });
      return out;
    }
    case 'multi': {
      const arr = Array.isArray(v) ? v : (v.sel || []);
      f.o.forEach((o, j) => out[cols[j]] = arr.includes(o) ? 'SI' : (M.blankUnsel ? '' : 'NO'));
      return out;
    }
    case 'drenaje': {
      const t = { 'No': ['NO','NO'], 'CPRE': ['SI','NO'], 'PERCUTÁNEO': ['NO','SI'], 'Ambos': ['SI','SI'] }[v] || ['',''];
      out[cols[0]] = t[0]; out[cols[1]] = t[1];
      return out;
    }
    case 'fistula': {
      const t = { 'No': ['NO','NO','NO'], 'Bioquímica': ['SI','NO','NO'], 'A': ['SI','NO','NO'], 'B': ['NO','SI','NO'], 'C': ['NO','NO','SI'] }[v] || ['','',''];
      cols.forEach((c, j) => out[c] = t[j]);
      return out;
    }
  }
  return out;
}

function one2(f, v) {
  if (isSpecial(v, SP2)) return v;
  switch (f.t) {
    case 'date': return fmtDate(v, true);
    case 'num': {
      const n = numOf(v);
      if (n === '') return String(v).toUpperCase();
      return f.suffix ? `${n}${sfx(f, n)}` : n;
    }
    case 'multi': {
      const arr = Array.isArray(v) ? v : (v.sel || []);
      const free = (typeof v === 'object' && v.free) ? String(v.free).trim() : '';
      return arr.concat(free ? [free] : []).join(f.join || '/').toUpperCase();
    }
    case 'chipsnum': {
      const s = v.s || '', raw = v.n === undefined ? '' : String(v.n).trim(), n = raw === '' ? '' : numOf(raw);
      if (s && n !== '') return `${s.toUpperCase()} (${n})`;
      if (s) return s.toUpperCase();
      if (n !== '') return n;
      return raw.toUpperCase();
    }
    case 'toggle': {
      if (typeof v === 'object') return [v.v, v.txt].filter(Boolean).join(' — ').toUpperCase();
      return String(v).toUpperCase();
    }
    case 'text': case 'textarea':
      return String(v);           /* texto libre: se respeta tal como se escribió */
    case 'select': case 'chips':
      return String(v).toUpperCase();
    default: return v;
  }
}

/* ============================================================
   Construcción de filas
   ============================================================ */
const C1_NCOLS = C1_FIELDS.length;   // 36
const C2_NCOLS = colIdx(C2_LAST_COL) + 1; // 97

const ncols = (folder) => folder === 'c1' ? C1_NCOLS : folder === 'c2' ? C2_NCOLS : SCHEMAS[folder].fields.length;

async function rowsFor(folder, recs, anon) {
  const dk = SCHEMAS[folder].dateKey;
  const sorted = recs.slice().sort((a, b) => {
    const fa = (dk && a.data[dk]) || '9999';
    const fb = (dk && b.data[dk]) || '9999';
    return String(fa).localeCompare(String(fb));
  });
  const out = [];
  let lastYear = null;
  for (const r of sorted) {
    const iso = dk ? r.data[dk] : null;
    /* Solo una fecha ISO real genera separador de año. "S/D" o texto libre, no. */
    const m = typeof iso === 'string' && iso.match(/^(\d{4})-\d{2}-\d{2}/);
    const y = m ? m[1] : null;
    if (y && y !== lastYear && SCHEMAS[folder].yearRows !== false) {
      const sep = new Array(ncols(folder)).fill('');
      sep[0] = Number(y);
      out.push({ year: Number(y), row: sep });
      lastYear = y;
    }
    out.push({ year: y ? Number(y) : null, row: await buildRow(folder, r, anon) });
  }
  return out;
}

async function buildRow(folder, rec, anon) {
  const SC = SCHEMAS[folder];
  const row = new Array(ncols(folder)).fill('');
  const fields = SC.fields;
  const nameKey = SC.idKey;

  for (const f of fields) {
    let v = rec.data[f.k];
    if (f.t === 'calc') v = runCalc(f, rec.data);
    if (f.k === nameKey && anon) v = await Store.aliasFor(v);
    if (folder !== 'c2') {
      row[colIdx(f.col)] = cell1(f, v);
    } else {
      const cs = cells2(f, v);
      for (const c in cs) row[colIdx(c)] = cs[c];
    }
  }
  /* La planilla escribe detalles dentro del casillero ("SI (LAT)", "SI, SIN PP",
     "FÍSTULA A"). Si esa columna sigue marcada, devolvemos el texto original. */
  const det = rec.data._det || {};
  for (const c in det) {
    const i = colIdx(c);
    const now = row[i], was = det[c];
    const wasUnknown = SP2.includes(String(was).toUpperCase());
    /* Marcada con detalle ("SI (LAT)"), o sin dato en esa columna sola ("S/D"). */
    if ((now === 'SI' && !wasUnknown) || (wasUnknown && (now === 'NO' || now === ''))) row[i] = was;
  }

  /* Red de seguridad: un NaN o un undefined sueltos corrompen el .xlsx. */
  return row.map(c => (c === undefined || c === null || (typeof c === 'number' && !isFinite(c))) ? '' : c);
}

/* ---------- encabezados ---------- */
function header1(folder) {
  if (folder === 'c1') {
    const h = new Array(C1_NCOLS).fill('');
    C1_FIELDS.forEach(f => h[colIdx(f.col)] = f.h);
    return [h];
  }
  /* Carpeta propia: encabezado de una fila. La etiqueta es el encabezado, más la
     unidad entre paréntesis para que dentro de dos años se sepa qué se midió. */
  const SC = SCHEMAS[folder];
  return [SC.fields.map(f => f.h !== undefined ? f.h : (f.unit ? `${f.l} (${f.unit})` : f.l))];
}
function header2() {
  return [1, 2, 3].map(r => {
    const row = new Array(C2_NCOLS).fill('');
    const src = C2_HEADER[r] || {};
    for (const c in src) row[colIdx(c)] = src[c];
    return row;
  });
}

/* ---------- armado de la hoja ---------- */
function sheetFor(folder, dataRows) {
  const aoa = (folder === 'c2' ? header2() : header1(folder)).concat(dataRows);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (folder === 'c2') {
    ws['!merges'] = C2_MERGES.map(m => XLSX.utils.decode_range(m));
  }
  const n = ncols(folder);
  ws['!cols'] = new Array(n).fill(0).map((_, i) => ({ wch: i === 0 ? 28 : 14 }));
  return ws;
}

/* ============================================================
   Exportar: reemplazar (archivo nuevo) o anexar (sobre uno existente)
   ============================================================ */
async function exportFolder(folder, recs, opts = {}) {
  const S = SCHEMAS[folder];
  const anon = !!opts.anon;
  const rows = (await rowsFor(folder, recs, anon)).map(r => r.row);

  let wb, ws;
  if (opts.appendTo) {
    const buf = await opts.appendTo.arrayBuffer();
    wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellStyles: true });
    const name = wb.SheetNames.includes(S.sheet) ? S.sheet : wb.SheetNames[0];
    ws = wb.Sheets[name];
    const lastRow = lastDataRow(ws);
    const existing = yearsIn(ws, folder);
    /* Sacamos las filas separadoras de años que ya existen en el archivo. */
    const withSep = await rowsFor(folder, recs, anon);
    const toAdd = withSep.filter(r => !(isSepRow(r.row) && existing.has(r.row[0]))).map(r => r.row);
    XLSX.utils.sheet_add_aoa(ws, toAdd, { origin: { r: lastRow + 1, c: 0 } });
    if (folder === 'c2' && !ws['!merges']) ws['!merges'] = C2_MERGES.map(m => XLSX.utils.decode_range(m));
  } else {
    ws = sheetFor(folder, rows);
    wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.sheet);
  }
  /* Carpeta propia → un solo archivo canónico, sin fecha en el nombre:
     "Apendicectomias.xlsx" es EL Excel de la carpeta, siempre el mismo. */
  XLSX.writeFile(wb, fileName(S.filePrefix, !S.flat));
  return recs.length;
}

const isSepRow = (row) => typeof row[0] === 'number' && row.slice(1).every(c => c === '');

function lastDataRow(ws) {
  const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = ref.e.r; r >= 0; r--) {
    for (let c = ref.s.c; c <= ref.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v !== undefined && cell.v !== '') return r;
    }
  }
  return ref.e.r;
}

function yearsIn(ws, folder) {
  const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const set = new Set();
  for (let r = 0; r <= ref.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cell && typeof cell.v === 'number' && cell.v > 1990 && cell.v < 2100) set.add(cell.v);
  }
  return set;
}

function fileName(prefix, dated = true) {
  if (!dated) return `${prefix}.xlsx`;
  const d = new Date();
  const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}_${s}.xlsx`;
}

/* Exportar todo: un libro con una hoja por carpeta que tenga registros. */
async function exportAll(packs, opts = {}) {
  const wb = XLSX.utils.book_new();
  const usados = new Set();
  for (const [id, recs] of packs) {
    const rows = (await rowsFor(id, recs, opts.anon)).map(r => r.row);
    let name = SCHEMAS[id].sheet.slice(0, 31);
    while (usados.has(name)) name = name.slice(0, 28) + '_' + (usados.size + 1);
    usados.add(name);
    XLSX.utils.book_append_sheet(wb, sheetFor(id, rows), name);
  }
  XLSX.writeFile(wb, fileName('Registros_Completo'));
}

/* Tabla de equivalencias del modo anonimizado (sale aparte, a pedido). */
async function exportAlias() {
  const rows = await Store.aliasTable();
  const ws = XLSX.utils.aoa_to_sheet([['CÓDIGO', 'APELLIDO Y NOMBRE']].concat(rows.map(r => [r.code, r.nombre])));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equivalencias');
  XLSX.writeFile(wb, fileName('Tabla_Equivalencias_NO_COMPARTIR'));
}

/* ============================================================
   Importar el Excel existente → registros editables
   ============================================================ */
async function importFile(folder, file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const S = SCHEMAS[folder];
  const name = wb.SheetNames.includes(S.sheet) ? S.sheet : wb.SheetNames[0];
  const ws = wb.Sheets[name];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: '' });
  const start = folder === 'c2' ? 3 : 1;
  const out = [];
  for (let i = start; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || !row.length) continue;
    if (isSepRow(row.map(x => x === undefined ? '' : x))) continue;
    if (String(row[0] || '').trim() === '') continue;
    const data = folder === 'c2' ? unrow2(row) : unrow1(folder, row);
    out.push({ data, importedAt: Date.now(), src: file.name });
  }
  return out;
}

function get(row, col) { const v = row[colIdx(col)]; return v === undefined ? '' : v; }

/* En la base, un casillero marcado dice "SI", pero también "SI (LAT)",
   "SI, SIN PP" o directamente el motivo ("FÍSTULA A"). Todo eso es una marca.
   "NO", vacío y "S/D" no lo son. */
function isMark(v) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  if (!s) return false;
  if (/^(NO|N\/C)$/i.test(s)) return false;
  return !SP2.includes(s.toUpperCase());
}

function unrow1(folder, row) {
  const d = {};
  for (const f of SCHEMAS[folder].fields) {
    if (f.t === 'calc') continue;
    const raw = get(row, f.col);
    if (raw === '' || raw === null) continue;
    const s = String(raw).trim();
    if (SP1.includes(s)) { d[f.k] = s; continue; }
    switch (f.t) {
      case 'date': d[f.k] = parseDate(raw) || s; break;
      case 'num': { const n = numOf(s); d[f.k] = n === '' ? s : n; break; }
      case 'multi': {
        const opts = f.o || COMORB, parts = s.split('/').map(x => x.trim()).filter(Boolean);
        d[f.k] = { sel: parts.filter(x => opts.includes(x)), free: parts.filter(x => !opts.includes(x)).join('/'), seen: true };
        break;
      }
      case 'chipsnum': {
        const hit = (f.o || []).find(o => s.toLowerCase().startsWith(o.toLowerCase()));
        d[f.k] = hit ? { s: hit, n: numOf(s) === '' ? '' : numOf(s) } : { s: '', n: numOf(s) === '' ? s : numOf(s) };
        break;
      }
      default: d[f.k] = s;
    }
  }
  return d;
}

function keepDet(d, col, val) {
  d._det = d._det || {};
  d._det[col] = String(val).trim();
}

function unrow2(row) {
  const d = {};
  for (const f of C2_FIELDS) {
    const M = f.map, cols = M.cols;
    const vals = cols.map(c => { const v = get(row, c); return typeof v === 'string' ? v.trim() : v; });
    const sp = vals.find(v => SP2.includes(String(v).toUpperCase()));
    if (sp && vals.every(v => v === '' || SP2.includes(String(v).toUpperCase()))) { d[f.k] = String(sp).toUpperCase(); continue; }
    if (vals.every(v => v === '' || v === null || v === undefined)) continue;

    switch (M.m) {
      case 'one': {
        const s = String(vals[0]).trim();
        if (f.t === 'date') d[f.k] = parseDate(vals[0]) || s;
        else if (f.t === 'num') { const n = numOf(s); d[f.k] = n === '' ? s : n; }
        else if (f.t === 'multi') d[f.k] = { sel: s.split('/').map(x => x.trim()).filter(x => f.o.includes(x)), free: s.split('/').map(x => x.trim()).filter(x => !f.o.includes(x)).join('/') };
        else if (f.t === 'chipsnum') {
          const hit = (f.o || []).find(o => s.toUpperCase().startsWith(o.toUpperCase()));
          d[f.k] = hit ? { s: hit, n: numOf(s) === '' ? '' : numOf(s) } : { s: '', n: numOf(s) === '' ? s : numOf(s) };
        }
        else if (f.t === 'toggle') {
          d[f.k] = /^SI/i.test(s) ? 'SI' : /^NO/i.test(s) ? 'NO' : s;
          if (/^SI/i.test(s) && s.toUpperCase() !== 'SI') keepDet(d, cols[0], s);
        }
        else d[f.k] = s;
        break;
      }
      case 'pick': {
        const opts = M.skipFirst ? f.o.slice(1) : f.o;
        let idx = -1;
        vals.forEach((v, j) => { if (M.mark === 'self' ? String(v) !== '' : isMark(v)) idx = j; });
        if (idx >= 0) {
          d[f.k] = M.mark === 'self' ? String(vals[idx]) : opts[idx];
          if (M.mark !== 'self' && String(vals[idx]).trim().toUpperCase() !== 'SI') keepDet(d, cols[idx], vals[idx]);
        } else if (M.skipFirst && vals.some(v => /^NO$/i.test(String(v)))) d[f.k] = f.o[0];
        break;
      }
      case 'multi': {
        const sel = [];
        vals.forEach((v, j) => {
          if (SP2.includes(String(v).trim().toUpperCase())) return keepDet(d, cols[j], v);
          if (!isMark(v)) return;
          sel.push(f.o[j]);
          if (String(v).trim().toUpperCase() !== 'SI') keepDet(d, cols[j], v);
        });
        /* Un grupo todo en "NO" es una respuesta, no un vacío: lo marcamos como visto
           para que vuelva a salir con sus NO. */
        if (sel.length || vals.some(v => String(v).trim() !== '')) d[f.k] = { sel, seen: true };
        break;
      }
      case 'drenaje': {
        const a = /^SI$/i.test(String(vals[0])), b = /^SI$/i.test(String(vals[1]));
        d[f.k] = a && b ? 'Ambos' : a ? 'CPRE' : b ? 'PERCUTÁNEO' : 'No';
        break;
      }
      case 'fistula': {
        const [a, b, c] = vals.map(v => /^SI$/i.test(String(v)));
        d[f.k] = c ? 'C' : b ? 'B' : a ? 'A' : 'No';
        break;
      }
    }
  }
  return d;
}
