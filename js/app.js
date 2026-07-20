/* ============================================================
   app.js — interfaz. Pensada para el pasillo: pulgar, una mano,
   pantalla chica, poca paciencia.
   ============================================================ */

const S = {
  view: 'home',
  folder: 'c1',
  id: null,
  step: 0,
  data: {},
  counts: { c1: 0, c2: 0 },
  list: [],
  q: '',
  yr: '',
  sheet: null,
  anon: false,
  theme: 'light',
  pendingAppend: null,
};

const $ = (s, r = document) => r.querySelector(s);
const el = document.getElementById('app');
const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const draftKey = () => `${S.folder}:${S.id || 'new'}`;

/* ---------- arranque ---------- */
async function boot() {
  await loadFolders();
  pedirPersistencia();
  S.anon = (await Store.setting('anon')) || false;
  S.theme = (await Store.setting('theme')) || 'light';
  document.documentElement.dataset.theme = S.theme;
  await refreshCounts();
  const seen = await Store.setting('privacy');
  const tpl = templateFromHash(location.hash);
  if (tpl) history.replaceState(null, '', location.pathname);
  if (!seen) { render(); openPrivacy(); } else render();
  if (tpl) {
    S._tpl = tpl;
    openSheet(sheetHTML('Te compartieron una carpeta',
      `<button class="btn primary block" style="margin-bottom:8px" data-act="tplok">Agregar a mi Data cx</button>
       <button class="btn block ghost" data-act="closesheet">Ahora no</button>`,
      `“${esc(tpl.def.name)}” — ${tpl.def.fields.length} campos. Vas a cargar con el mismo formulario que el resto del servicio y los Excel se fusionan sin duplicados.`));
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

async function loadFolders() {
  userFolders().forEach(f => unregisterFolder(f.id));
  (await Store.folders()).forEach(registerFolder);
}

async function refreshCounts() {
  for (const id of Object.keys(SCHEMAS)) S.counts[id] = await Store.count(id);
  S.bkp = await backupStatus();
}

/* ---------- toasts ---------- */
let tTimer;
function toast(msg, kind = '') {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); document.body.appendChild(t); }
  t.className = 'toast ' + kind;
  t.textContent = msg;
  clearTimeout(tTimer);
  tTimer = setTimeout(() => t.remove(), 2600);
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  const sy = window.scrollY;
  const v = { home: viewHome, list: viewList, form: viewForm, dash: viewDash, settings: viewSettings, builder: viewBuilder, bfield: viewBField }[S.view];
  el.innerHTML = v();
  const SC = SCHEMAS[S.folder];
  el.className = '';
  const light = S.theme === 'light';
  el.style.setProperty('--accent', (SC && (light ? (SC.colorLight || SC.color) : SC.color)) || '#189bd6');
  el.style.setProperty('--accent-ink', light ? '#ffffff' : '#06222f');
  if (S.sheet) el.insertAdjacentHTML('beforeend', S.sheet);
  window.scrollTo(0, S.view === S._lastView ? sy : 0);
  S._lastView = S.view;
}

/* ---------- inicio ---------- */
function viewHome() {
  return `
  <div class="topbar"><h1>Data cx<span class="sub">Servicio de Cirugía</span></h1>
    <button class="iconbtn" data-act="settings">⚙</button></div>
  <div class="wrap">
    <div class="brand">
      <img src="./icons/logo.jpg" alt="Clínica Pueyrredon">
      <div class="app">Data <b>cx</b></div>
      <div class="clin">Servicio de Cirugía</div>
    </div>
    ${S.bkp && !S.bkp.ok ? `<div class="softwarn" style="margin-top:14px"><b>${S.bkp.dias === null ? 'Nunca hiciste un respaldo' : 'Hace ' + S.bkp.dias + ' días que no respaldás'}</b> y hay ${S.bkp.total} registros en este teléfono. Si se pierde o se formatea, se pierden.
      <button class="btn primary block" style="margin-top:10px" data-act="backup">Respaldar todo ahora</button></div>` : ''}
    <div class="home-hero">
      <h2>¿Qué vas a cargar?</h2>
      <p>Todo se guarda en este teléfono. El Excel se genera cuando vos lo pedís.</p>
    </div>
    ${folderCard('c1', 'Carpeta 1 · IHPBA')}
    ${folderCard('c2', 'Carpeta 2 · base extendida')}

    <div class="section-title">Tus registros</div>
    ${userFolders().map(f => folderCard(f.id, `${f.fields.length} campos · ${f.steps.length} pasos`)).join('')}
    <button class="btn block" data-act="newfolder" style="border-style:dashed">+ Nueva carpeta</button>
    <p class="note" style="margin-top:10px">Armá el formulario con los campos que quieras y la app genera el Excel sola.</p>

    <div class="section-title">Exportar</div>
    <button class="btn block" data-act="exportall">Exportar todo en un libro</button>
    <p class="note" style="margin-top:14px">${S.anon ? '<b style="color:var(--warn)">Modo anonimizado activo:</b> los nombres salen como PANC-0001.' : 'Modo anonimizado desactivado: los nombres salen completos en el Excel.'}</p>
  </div>`;
}

function gsSectionHTML(SC) {
  const gs = SC.def && SC.def.gs;
  if (gs) return `
    <div class="section-title">Google Sheets — en vivo</div>
    <div class="btn-row">
      <button class="btn primary" data-act="gssync">Sincronizar ahora</button>
      <button class="btn" data-act="gsopen">Abrir la planilla</button>
    </div>
    <p class="note" style="margin-top:10px">Esta carpeta está vinculada a una planilla de Google: <b>ese es el archivo maestro</b>. “Sincronizar” baja lo de los demás, lo fusiona (sin pisar nada) y sube todo consolidado. El vínculo viaja dentro del link de la plantilla, así que todos los teléfonos apuntan a la misma planilla. El Excel de abajo sigue disponible para el análisis.</p>`;
  return `
    <div class="section-title">Google Sheets — en vivo</div>
    <button class="btn block" data-act="gsconnect">Conectar a una planilla de Google</button>
    <p class="note" style="margin-top:10px">Una sola planilla en el Google de la clínica, todos los teléfonos escriben ahí. Requiere la aprobación del comité y una configuración única (ver SETUP_GOOGLE.md).</p>`;
}

function folderCard(id, eyebrow) {
  const SC = SCHEMAS[id];
  if (!SC) return '';
  const n = S.counts[id] || 0;
  const light = S.theme === 'light';
  const acc = (light ? (SC.colorLight || SC.color) : SC.color) || '#189bd6';
  return `
  <button class="folder" data-act="open" data-f="${id}" style="--accent:${esc(acc)};--accent-ink:${light ? '#ffffff' : '#06222f'}">
    <span class="eyebrow">${esc(eyebrow)}</span>
    <h3>${esc(SC.name)}</h3>
    <div class="meta">${esc(SC.desc || ('hoja «' + SC.sheet + '»'))}</div>
    <div class="count">${n}<small>registros</small></div>
  </button>`;
}

/* ---------- listado ---------- */
function viewList() {
  const S_ = SCHEMAS[S.folder];
  const years = [...new Set(S.list.map(r => r.anio).filter(Boolean))].sort((a, b) => b - a);
  const rows = filtered();
  return `
  <div class="topbar">
    <button class="iconbtn" data-act="home">←</button>
    <h1>${esc(S_.name)}<span class="sub">${rows.length} de ${S.list.length} registros</span></h1>
    ${S_.sys ? '' : '<button class="iconbtn" data-act="editfolder">✎</button>'}
    <button class="iconbtn" data-act="dash">📊</button>
  </div>
  <div class="wrap">
    <div class="searchbar">
      <input type="text" placeholder="Buscar por nombre o ID" value="${esc(S.q)}" data-inp="q" enterkeyhint="search">
      <select data-inp="yr">
        <option value="">Año</option>
        ${years.map(y => `<option value="${y}" ${String(S.yr) === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
    </div>
    <button class="btn primary block" data-act="new">+ Nuevo registro</button>
    <div class="section-title">Registros</div>
    ${rows.length ? `<div class="reclist">${rows.map((r, i) => `
      <div class="rec" data-act="edit" data-id="${r.id}">
        <span class="idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="who"><b>${esc(r.nombre || '(sin nombre)')}</b><span>${esc(summary(r))}</span></span>
        <span class="yr">${r.anio || '—'}</span>
      </div>`).join('')}</div>`
      : `<div class="empty"><b>Todavía no hay nada acá</b>Tocá “Nuevo registro” para cargar el primer paciente, o importá el Excel actual desde Ajustes.</div>`}
    <div class="section-title">Excel</div>
    <div class="btn-row">
      <button class="btn primary" data-act="export">Exportar a Excel</button>
      <button class="btn" data-act="append">Anexar a un archivo</button>
    </div>
    <p class="note" style="margin-top:10px">“Exportar” arma el archivo completo desde cero. “Anexar” te pide el .xlsx actual y agrega estos registros abajo del último, sin tocar lo anterior.</p>

    ${S_.sys ? '' : gsSectionHTML(S_)}
    <div class="section-title">Varios cargadores</div>
    <div class="btn-row">
      <button class="btn" data-act="merge">Fusionar un Excel</button>
      ${S_.sys ? '' : '<button class="btn" data-act="sharetpl">Compartir plantilla</button>'}
    </div>
    <p class="note" style="margin-top:10px"><b>Un solo Excel por carpeta.</b> Un teléfono es el dueño del archivo maestro (${S_.sys ? 'con fecha, como pide el trabajo' : `siempre llamado ${esc(S_.filePrefix)}.xlsx`}). Los demás no generan su propio Excel: exportan y se lo mandan al dueño, que toca “Fusionar”. Los pacientes nuevos se agregan; los repetidos solo completan campos vacíos. <b>Nunca se pisa un dato cargado.</b> Al reexportar, el maestro sale actualizado con el mismo nombre.</p>
  </div>`;
}

function filtered() {
  const q = S.q.trim().toLowerCase();
  return S.list.filter(r =>
    (!q || String(r.nombre || '').toLowerCase().includes(q)) &&
    (!S.yr || String(r.anio) === String(S.yr)));
}

/* Los dos o tres datos que te dejan reconocer al paciente en la lista:
   los primeros campos de opciones o números que tengan algo cargado. */
function summary(r) {
  const SC = SCHEMAS[S.folder];
  return SC.fields
    .filter(f => f.role !== 'id' && f.role !== 'date' && ['chips','select','num'].includes(f.t))
    .map(f => {
      const v = r.data[f.k];
      if (!hasVal(v) || typeof v === 'object') return null;
      return f.t === 'num' ? `${v}${f.unit ? ' ' + f.unit : ''}` : String(v);
    })
    .filter(Boolean).slice(0, 3).join(' · ');
}

/* ---------- formulario ---------- */
function viewForm() {
  const SC = SCHEMAS[S.folder];
  const step = SC.steps[S.step];
  const total = SC.fields.length;
  const done = SC.fields.filter(f => f.t === 'calc' ? runCalc(f, S.data) !== '' : hasVal(S.data[f.k])).length;
  const pct = Math.round(done / total * 100);
  const warns = checks();

  return `
  <div class="topbar">
    <button class="iconbtn" data-act="back">←</button>
    <h1>${S.id ? 'Editar registro' : 'Nuevo registro'}<span class="sub">${esc(SC.name)} · ${done}/${total} campos</span></h1>
    ${S.id ? '<button class="iconbtn" data-act="more">⋯</button>' : ''}
  </div>
  <div class="wrap">
    <div class="progress">
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="steps">${SC.steps.map((s, i) => `
        <button class="stepchip ${i === S.step ? 'on' : ''}" data-act="step" data-i="${i}"><span class="n">${i + 1}</span>${esc(s.t)}</button>`).join('')}</div>
    </div>
    ${warns.map(w => `<div class="softwarn">${w.html}</div>`).join('')}
    ${step.ks.map(k => fieldHTML(SC, FMAP[S.folder][k])).join('')}
    ${missingHTML(step)}
  </div>
  <div class="formbar">
    <button class="btn" data-act="prev" ${S.step === 0 ? 'disabled' : ''}>Anterior</button>
    <button class="btn save primary" data-act="save">Guardar</button>
    <button class="btn" data-act="next" ${S.step === SC.steps.length - 1 ? 'disabled' : ''}>Siguiente</button>
  </div>`;
}

function missingHTML(step) {
  const miss = step.ks.filter(k => !hasVal(S.data[k]) && (FMAP[S.folder][k] || {}).t !== 'calc');
  if (!miss.length) return '';
  return `<div class="missing">Faltan ${miss.length} campos en este paso:<br>
    ${miss.map(k => `<a data-act="goto" data-k="${k}">${esc(FMAP[S.folder][k].l)}</a>`).join('')}
    <br><span class="note">No pasa nada: podés guardar igual.</span></div>`;
}

const hasVal = (v) => !(v === undefined || v === null || v === '' ||
  (Array.isArray(v) && !v.length) ||
  (typeof v === 'object' && !Array.isArray(v) && !v.s && v.n !== 0 && !v.n && !(v.sel || []).length && !v.free && !v.v && !v.txt && !v.seen));

function fieldHTML(SC, f) {
  if (!f) return '';
  const v = S.data[f.k];
  const sp = spFor(SC, f);
  const isSp = typeof v === 'string' && sp.includes(v);
  return `
  <div class="field ${hasVal(v) ? 'filled' : ''}" id="f-${f.k}">
    <div class="flabel"><span class="txt">${esc(f.l)}</span><span class="col">${esc(f.col)}</span></div>
    ${f.hint ? `<div class="fhint">${esc(f.hint)}</div>` : ''}
    ${detHint(f)}
    ${isSp ? '' : ctrlHTML(f, v)}
    ${spHTML(f, sp, v, isSp)}
  </div>`;
}

/* Qué valores especiales tienen sentido en este campo. "Irresecable" y
   "Metastásico" describen el tumor, así que no aparecen en Edad ni en ASA. */
function spFor(SC, f) {
  if (f.sp === false) return [];
  const i = SC.steps.findIndex(s => s.ks.includes(f.k));
  return i >= SC.spFull ? SC.sp : SC.sp.slice(0, 2);
}

/* Plegado por defecto: un botón chico. La lista completa aparece solo si la pedís. */
function spHTML(f, sp, v, isSp) {
  if (!sp.length) return '';
  if (isSp) return `<div class="chips special"><button class="chip on" data-act="sp" data-k="${f.k}" data-v="${esc(v)}">${esc(v)} &times;</button></div>`;
  if (S._sp !== f.k) return `<div class="chips special"><button class="chip" data-act="spopen" data-k="${f.k}">Sin dato o no aplica…</button></div>`;
  return `<div class="chips special">${sp.map(o => `<button class="chip" data-act="sp" data-k="${f.k}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}
    <button class="chip" data-act="spopen" data-k="">Cerrar</button></div>`;
}

/* Detalles que la planilla escribe dentro del casillero: no los escondemos. */
function detHint(f) {
  const det = S.data._det || {};
  const hits = (f.map ? f.map.cols : []).filter(c => det[c]).map(c => `${c}: ${det[c]}`);
  return hits.length ? `<div class="fhint">En la planilla dice <b>${esc(hits.join(' · '))}</b>. Se respeta al exportar si no cambiás la selección.</div>` : '';
}

function ctrlHTML(f, v) {
  const chip = (o, on, act, extra = '') => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-k="${f.k}" data-v="${esc(o)}" ${extra}>${esc(o)}</button>`;
  switch (f.t) {
    case 'text':
      return `<input type="text" data-set="${f.k}" value="${esc(v || '')}" enterkeyhint="next">`;
    case 'textarea':
      return `<textarea data-set="${f.k}" rows="3">${esc(v || '')}</textarea>`;
    case 'num':
      return `<div class="inline-num"><input type="text" inputmode="decimal" data-set="${f.k}" value="${esc(v === 0 ? '0' : (v || ''))}">
        ${f.unit ? `<span class="unit">${esc(f.unit)}</span>` : ''}</div>
        ${f.extra ? `<div class="chips" style="margin-top:8px">${f.extra.map(o => chip(o, v === o, 'chip')).join('')}</div>` : ''}`;
    case 'date':
      return `<input type="date" data-set="${f.k}" value="${esc(v || '')}">
        ${v ? `<div class="fhint" style="margin:8px 0 0">Se exporta como <b>${esc(fmtDate(v, S.folder === 'c2'))}</b></div>` : ''}`;
    case 'chips': {
      const wide = f.o.length <= 4 ? ' wide' : '';
      return `<div class="chips">${f.o.map(o => `<button class="chip${wide} ${v === o ? 'on' : ''}" data-act="chip" data-k="${f.k}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    }
    case 'toggle': {
      const SC = SCHEMAS[S.folder], yes = SC.yes, no = SC.no;
      const cur = typeof v === 'object' && v ? v.v : v;
      return `<div class="chips">
        <button class="chip wide ${cur === yes ? 'on' : ''}" data-act="tog" data-k="${f.k}" data-v="${yes}">Sí</button>
        <button class="chip wide ${cur === no ? 'on' : ''}" data-act="tog" data-k="${f.k}" data-v="${no}">No</button></div>
        ${f.freeText ? `<input type="text" style="margin-top:8px" placeholder="Detalle (opcional)" data-set2="${f.k}" value="${esc((v && v.txt) || '')}">` : ''}`;
    }
    case 'select':
      return `<div class="chips">${f.o.map(o => chip(o, v === o, 'chip')).join('')}</div>
        ${f.free ? `<input type="text" style="margin-top:8px" placeholder="Otro (escribilo)" data-set="${f.k}" value="${esc(f.o.includes(v) ? '' : (v || ''))}">` : ''}`;
    case 'multi': {
      const sel = Array.isArray(v) ? v : ((v && v.sel) || []);
      const free = (v && v.free) || '';
      return `<div class="chips">${f.o.map(o => chip(o, sel.includes(o), 'multi')).join('')}</div>
        ${f.free ? `<input type="text" style="margin-top:8px" placeholder="Otras (texto libre)" data-setfree="${f.k}" value="${esc(free)}">` : ''}`;
    }
    case 'calc': {
      const r = runCalc(f, S.data);
      const c = CALCS[f.calc];
      const faltan = (f.from || []).map(k => FMAP[S.folder][k]).filter(x => x && !hasVal(S.data[x.k]));
      return `<div class="inline-num"><input type="text" value="${esc(r === '' ? '' : r)}" readonly style="opacity:${r === '' ? .5 : 1}" placeholder="Se calcula solo">
        ${f.unit ? `<span class="unit">${esc(f.unit)}</span>` : ''}</div>
        ${faltan.length ? `<div class="fhint" style="margin-top:8px">Falta cargar ${faltan.map(x => esc(x.l)).join(' y ')}.</div>` : ''}`;
    }
    case 'chipsnum': {
      const s = (v && v.s) || '', n = (v && (v.n === 0 ? '0' : v.n)) || '';
      return `<div class="chips">${f.o.map(o => chip(o, s === o, 'cn'))?.join('')}</div>
        <div class="inline-num" style="margin-top:8px">
          <input type="text" inputmode="decimal" placeholder="Valor exacto (opcional)" data-setn="${f.k}" value="${esc(n)}">
          ${f.unit ? `<span class="unit">${esc(f.unit)}</span>` : ''}</div>`;
    }
  }
  return '';
}

/* ---------- avisos de consistencia (nunca bloquean) ---------- */
function checks() {
  const d = S.data, w = [];
  if (!isSys(S.folder)) return w;
  if (S.folder === 'c1') {
    if (d.c23 === 'Si' && !hasVal(d.c22))
      w.push({ html: `<b>Reintervención = Sí</b> pero Clavien-Dindo está vacío. Suele ser IIIb. <button class="btn ghost" style="min-height:34px;padding:0 10px;margin-left:6px" data-act="fix" data-k="c22" data-v="IIIb">Poner IIIb</button>` });
    if (d.c10 === 'Irresecable' && (!hasVal(d.c15) || !hasVal(d.c16) || !hasVal(d.c17)))
      w.push({ html: `<b>Cirugía irresecable.</b> Textura, Wirsung y anastomosis pueden completarse como “Irresecable”. <button class="btn ghost" style="min-height:34px;padding:0 10px;margin-left:6px" data-act="fixirres">Completar</button>` });
    if (d.c26 === 'Si' && d.c27 === 'No')
      w.push({ html: `<b>Ojo:</b> mortalidad a 30 días = Sí pero a 90 días = No.` });
  } else {
    if (d.reinterv === 'SI' && !hasVal(d.dindo))
      w.push({ html: `<b>Reintervención = Sí</b> y Dindo-Clavien vacío. Suele ser IIIb. <button class="btn ghost" style="min-height:34px;padding:0 10px;margin-left:6px" data-act="fix" data-k="dindo" data-v="IIIb">Poner IIIb</button>` });
  }
  return w;
}

/* ---------- dashboard ----------
   Para las del páncreas los indicadores están elegidos a mano (fístula B/C,
   mortalidad). Para las tuyas salen del tipo de cada campo: los Sí/No dan un
   porcentaje, los números una mediana, las opciones una distribución.
   Es para ver cómo viene la carga, no para el paper. */
function viewDash() {
  const SC = SCHEMAS[S.folder], rs = S.list, n = rs.length;
  const cards = isSys(S.folder) ? sysCards(rs, n) : autoCards(SC, rs, n);
  const dists = isSys(S.folder)
    ? [[S.folder === 'c1' ? 'Tipo de cirugía' : 'Resección', tally(rs.map(r => r.data[S.folder === 'c1' ? 'c10' : 'resec']).filter(hasVal))]]
    : SC.fields.filter(f => f.t === 'chips' && f.o).slice(0, 4)
        .map(f => [f.l, tally(rs.map(r => r.data[f.k]).filter(hasVal))]).filter(d => d[1].length);

  return `
  <div class="topbar"><button class="iconbtn" data-act="list">←</button>
    <h1>Control de calidad<span class="sub">${esc(SC.name)}</span></h1></div>
  <div class="wrap">
    <p class="note" style="margin:14px 0">Esto es para revisar cómo viene la carga, no para el paper.</p>
    ${n ? `<div class="stats">
      ${cards.map(c => `<div class="stat"><div class="k">${esc(c[0])}</div><div class="v">${esc(c[1])}</div></div>`).join('')}
      ${dists.map(d => `<div class="stat wide"><div class="k">${esc(d[0])}</div>${barsHTML(d[1])}</div>`).join('')}
    </div>` : '<div class="empty"><b>Sin registros</b>Cargá el primer paciente y acá aparecen los números.</div>'}
  </div>`;
}

const dNum = (rs, k) => rs.map(r => parseFloat(String(typeof r.data[k] === 'object' ? (r.data[k] || {}).n : r.data[k]).replace(',', '.'))).filter(x => !isNaN(x));
const median = (a) => { if (!a.length) return '—'; const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(1); };
const mean = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : '—';
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';

function sysCards(rs, n) {
  if (S.folder === 'c1') {
    const fbc = rs.filter(r => ['B', 'C'].includes(r.data.c19)).length;
    const m30 = rs.filter(r => r.data.c26 === 'Si').length;
    const m90 = rs.filter(r => r.data.c27 === 'Si').length;
    return [['n total', n], ['Fístula B/C', `${fbc} · ${pct(fbc, n)}`], ['Mortalidad 30 d', `${m30} · ${pct(m30, n)}`],
      ['Mortalidad 90 d', `${m90} · ${pct(m90, n)}`], ['Internación (mediana)', median(dNum(rs, 'c24')) + ' d'], ['Tiempo qx (media)', mean(dNum(rs, 'c12')) + ' min']];
  }
  const fbc = rs.filter(r => ['B', 'C'].includes(r.data.fistula)).length;
  const eras = rs.filter(r => r.data.eras === 'SI').length;
  const rein = rs.filter(r => r.data.reinterv === 'SI').length;
  return [['n total', n], ['Fístula B/C', `${fbc} · ${pct(fbc, n)}`], ['Reintervención', `${rein} · ${pct(rein, n)}`],
    ['ERAS', pct(eras, n)], ['Internación total (mediana)', median(dNum(rs, 'total')) + ' d'], ['Tiempo qx (media)', mean(dNum(rs, 'tiempo')) + ' min']];
}

function autoCards(SC, rs, n) {
  const out = [['n total', n]];
  const cargados = rs.length ? Math.round(rs.reduce((a, r) => a + SC.fields.filter(f => hasVal(r.data[f.k])).length, 0) / rs.length / SC.fields.length * 100) : 0;
  out.push(['Completitud', cargados + '%']);

  /* Las tasas primero: la mortalidad importa más que la mediana de la talla.
     Los campos que solo existen para alimentar un cálculo (peso, talla) no van. */
  const fuente = new Set([].concat(...SC.fields.filter(f => f.from).map(f => f.from)));

  SC.fields.filter(f => f.t === 'toggle').forEach(f => {
    const cargado = rs.filter(r => hasVal(r.data[f.k])).length;
    if (!cargado) return;
    const si = rs.filter(r => r.data[f.k] === SC.yes).length;
    out.push([f.l, `${si} · ${pct(si, cargado)}`]);
  });

  SC.fields.filter(f => (f.t === 'num' || f.t === 'calc') && !fuente.has(f.k)).forEach(f => {
    const a = f.t === 'calc' ? rs.map(r => runCalc(f, r.data)).filter(v => v !== '' && !isNaN(v)).map(Number) : dNum(rs, f.k);
    if (a.length) out.push([`${f.l} (mediana)`, `${median(a)}${f.unit ? ' ' + f.unit : ''}`]);
  });

  return out.slice(0, 10);
}

function barsHTML(dist) {
  if (!dist.length) return '<p class="note">Sin datos todavía.</p>';
  const max = Math.max(1, ...dist.map(d => d[1]));
  return dist.map(d => `<div class="bar"><span class="lbl">${esc(d[0])}</span><span class="track"><span class="fill" style="width:${d[1] / max * 100}%"></span></span><span class="n">${d[1]}</span></div>`).join('');
}

function tally(arr) {
  const m = {};
  arr.forEach(v => { const k = String(typeof v === 'object' ? (v.sel || []).join('/') : v); if (k) m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

/* ---------- ajustes ---------- */
function viewSettings() {
  return `
  <div class="topbar"><button class="iconbtn" data-act="home">←</button><h1>Ajustes</h1></div>
  <div class="wrap">
    <div class="section-title">Privacidad</div>
    <div class="switchrow"><div><div class="t">Modo anonimizado</div><div class="d">Al exportar, el nombre se reemplaza por PANC-0001. La tabla de equivalencias queda solo en este teléfono.</div></div>
      <div class="sw ${S.anon ? 'on' : ''}" data-act="anon"></div></div>
    <button class="btn block" data-act="alias">Exportar tabla de equivalencias</button>
    <div class="section-title">Apariencia</div>
    <div class="switchrow"><div><div class="t">Modo oscuro</div><div class="d">Para la guardia de noche. De día, los colores de la clínica.</div></div>
      <div class="sw ${S.theme === 'dark' ? 'on' : ''}" data-act="theme"></div></div>
    <div class="section-title">Importar</div>
    <p class="note">Traé el .xlsx histórico para ver y editar esos registros desde el celular. No se pisa nada: se agregan.</p>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn" data-act="imp" data-f="c1">Importar Carpeta 1</button>
      <button class="btn" data-act="imp" data-f="c2">Importar Carpeta 2</button>
    </div>
    <div class="section-title">Respaldo</div>
    <p class="note">Un archivo con TODO: carpetas, registros, plantillas y la tabla de alias. Se restaura en este u otro teléfono sin duplicar nada. ${S.bkp && S.bkp.dias !== null ? `Último respaldo: hace ${S.bkp.dias} ${S.bkp.dias === 1 ? 'día' : 'días'}.` : 'Todavía no hiciste ninguno.'}</p>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn primary" data-act="backup">Respaldar todo</button>
      <button class="btn" data-act="restore">Restaurar</button>
    </div>
    <div class="section-title">Plantillas</div>
    <p class="note">Si otro teléfono del servicio armó una carpeta, importá su plantilla y cargás con el mismo formulario. Los Excel de los dos después se fusionan sin duplicados.</p>
    <button class="btn block" style="margin-top:10px" data-act="importtpl">Importar plantilla</button>
    <div class="section-title">Datos de ejemplo</div>
    <button class="btn block" data-act="seed">Cargar 3 registros de ejemplo</button>
    <div class="section-title">Zona de riesgo</div>
    <button class="btn block danger" data-act="wipe">Borrar todo lo de este dispositivo</button>
    <p class="note" style="margin-top:20px">Data cx · Servicio de Cirugía, Clínica Pueyrredon · funciona sin señal · los datos no salen del teléfono.</p>
  </div>`;
}

/* ---------- hoja modal ---------- */
function sheetHTML(title, body, sub = '') {
  return `<div class="sheet-bg" data-act="closesheet"><div class="sheet" data-stop="1"><div class="grab"></div>
    <h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}${body}</div></div>`;
}
function openSheet(html) { S.sheet = html; render(); }
function closeSheet() { S.sheet = null; render(); }

function openPrivacy() {
  openSheet(sheetHTML('Antes de empezar',
    `<p class="note">Estás por cargar datos de salud identificables. Tres cosas:</p>
     <ul class="note" style="padding-left:18px;line-height:1.9">
       <li>Todo queda guardado <b>en este dispositivo</b>. No hay servidor, no hay nube, no se comparte con terceros.</li>
       <li>Si perdés o formateás el teléfono, se pierden los datos. Exportá el Excel seguido.</li>
       <li>Si vas a compartir el archivo, activá <b>Modo anonimizado</b> en Ajustes.</li>
     </ul>
     <button class="btn primary block" style="margin-top:14px" data-act="privacyok">Entendido</button>`));
}

/* ============================================================
   ACCIONES
   ============================================================ */
const ACTS = {
  async home() { S.view = 'home'; await refreshCounts(); render(); },
  async open(t) { S.folder = t.dataset.f; await goList(); },
  async list() { await goList(); },
  dash() { S.view = 'dash'; render(); },
  settings() { S.view = 'settings'; render(); },
  closesheet() { closeSheet(); },
  async privacyok() { await Store.setting('privacy', true); closeSheet(); },

  async new() {
    S.id = null; S.step = 0; S.data = {};
    const d = await Store.getDraft(draftKey());
    if (d && Object.keys(d).length) {
      S.data = d;
      toast('Recuperamos un borrador sin guardar');
    }
    S.view = 'form'; render();
  },
  async edit(t) {
    const r = await Store.get(S.folder, Number(t.dataset.id));
    S.id = r.id; S.data = JSON.parse(JSON.stringify(r.data)); S.step = 0;
    const d = await Store.getDraft(draftKey());
    if (d) S.data = d;
    S.view = 'form'; render();
  },
  async back() { await Store.setDraft(draftKey(), S.data); await goList(); },
  step(t) { S.step = Number(t.dataset.i); render(); },
  prev() { S.step = Math.max(0, S.step - 1); render(); },
  next() { S.step = Math.min(SCHEMAS[S.folder].steps.length - 1, S.step + 1); render(); },

  chip(t) { setVal(t.dataset.k, S.data[t.dataset.k] === t.dataset.v ? '' : t.dataset.v); },
  tog(t) {
    const f = FMAP[S.folder][t.dataset.k], cur = S.data[t.dataset.k];
    const curV = typeof cur === 'object' && cur ? cur.v : cur;
    const nv = curV === t.dataset.v ? '' : t.dataset.v;
    setVal(t.dataset.k, f.freeText ? { v: nv, txt: (cur && cur.txt) || '' } : nv);
  },
  multi(t) {
    const k = t.dataset.k, f = FMAP[S.folder][k], o = t.dataset.v;
    let v = S.data[k];
    let sel = Array.isArray(v) ? v.slice() : ((v && v.sel) ? v.sel.slice() : []);
    sel = sel.includes(o) ? sel.filter(x => x !== o) : sel.concat([o]);
    setVal(k, { sel, free: (v && v.free) || '', seen: true });
  },
  cn(t) {
    const k = t.dataset.k, v = S.data[k] || {};
    setVal(k, { s: v.s === t.dataset.v ? '' : t.dataset.v, n: v.n || '' });
  },
  sp(t) { S._sp = null; setVal(t.dataset.k, S.data[t.dataset.k] === t.dataset.v ? '' : t.dataset.v); },
  spopen(t) { S._sp = t.dataset.k || null; render(); },
  fix(t) { setVal(t.dataset.k, t.dataset.v); },
  fixirres() {
    ['c15', 'c16', 'c17'].forEach(k => { if (!hasVal(S.data[k])) S.data[k] = 'Irresecable'; });
    saveDraft(); render();
  },
  goto(t) {
    const n = document.getElementById('f-' + t.dataset.k);
    if (n) { n.scrollIntoView({ behavior: 'smooth', block: 'center' }); n.classList.add('highlight'); }
  },

  async save() {
    const nameKey = SCHEMAS[S.folder].idKey;
    const rec = { id: S.id || undefined, data: S.data };
    const id = await Store.save(S.folder, rec);
    await Store.delDraft(draftKey());
    const missing = SCHEMAS[S.folder].fields.filter(f => !hasVal(S.data[f.k])).length;
    toast(`Guardado${missing ? ` · faltan ${missing} campos` : ''}`, 'ok');
    if (!S.id) { S.id = id; await maybeCross(nameKey); }
    await goList();
  },
  more() {
    openSheet(sheetHTML('Este registro', `
      <button class="btn block" style="margin-bottom:8px" data-act="dup">Duplicar (reoperación del mismo paciente)</button>
      <button class="btn block danger" data-act="del">Eliminar</button>`));
  },
  async dup() {
    const d = JSON.parse(JSON.stringify(S.data));
    if (SCHEMAS[S.folder].dateKey) delete d[SCHEMAS[S.folder].dateKey];
    S.id = null; S.data = d; S.sheet = null; S.step = 0;
    toast('Copia lista. Cargá la nueva fecha de cirugía.');
    render();
  },
  async del() {
    await Store.remove(S.folder, S.id);
    await Store.delDraft(draftKey());
    S.sheet = null; toast('Registro eliminado');
    await goList();
  },

  async export() {
    if (!S.list.length) return toast('No hay registros para exportar', 'err');
    await exportFolder(S.folder, S.list, { anon: S.anon });
    toast(`${S.list.length} registros exportados`, 'ok');
  },
  async append() {
    S.pendingAppend = S.folder;
    pick(async (file) => {
      try {
        await exportFolder(S.folder, S.list, { anon: S.anon, appendTo: file });
        toast('Filas anexadas al final del archivo', 'ok');
      } catch (e) { toast('No se pudo leer ese archivo: ' + e.message, 'err'); }
    });
  },
  async exportall() {
    const ids = Object.keys(SCHEMAS);
    const packs = [];
    for (const id of ids) { const rs = await Store.all(id); if (rs.length) packs.push([id, rs]); }
    if (!packs.length) return toast('No hay nada para exportar', 'err');
    await exportAll(packs, { anon: S.anon });
    toast(`Libro con ${packs.length} hojas generado`, 'ok');
  },
  async gsconnect() {
    const conf = await Store.setting('gsScript');
    if (conf && conf.url) {
      const SC = SCHEMAS[S.folder];
      return openSheet(sheetHTML('Conectar con Google Sheets',
        `<button class="btn primary block" style="margin-bottom:8px" data-act="gsquick">Usar la planilla del servicio</button>
         <p class="note" style="margin-bottom:8px">Se crea sola la pestaña «${esc(SC.sheet)}» en la planilla ya configurada. No hay que tocar nada en Google.</p>
         <button class="btn block ghost" data-act="gsother">Usar otra planilla / cambiar configuración</button>
         <button class="btn block ghost" style="margin-top:8px" data-act="closesheet">Cancelar</button>`,
        'La planilla del servicio ya quedó configurada una vez; cada carpeta nueva es una pestaña adentro.'));
    }
    ACTS.gsother();
  },
  gsother() {
    openSheet(sheetHTML('Conectar con Google Sheets',
      `<p class="note" style="margin-bottom:8px"><b>Método gratis</b> (sin tarjeta, sin Google Cloud): creá una planilla, pegale el script <b>GOOGLE_SCRIPT.gs</b> (Extensiones → Apps Script), publicalo y pegá acá la URL y tu clave. Guía completa: SETUP_GOOGLE.md.</p>
       <input type="text" id="gsscript" placeholder="URL del script (termina en /exec)" style="margin-bottom:8px">
       <input type="text" id="gstoken" placeholder="Clave (la del script)" style="margin-bottom:8px">
       <button class="btn primary block" data-act="gsscriptgo">Vincular</button>
       <p class="note" style="margin:14px 0 8px"><b>Método avanzado</b> (Client ID de Google Cloud — también gratis, más pasos):</p>
       <input type="text" id="gscid" placeholder="xxxx.apps.googleusercontent.com" style="margin-bottom:8px">
       <button class="btn block" style="margin-bottom:8px" data-act="gscreate">Crear planilla con mi cuenta</button>
       <input type="text" id="gsurl" placeholder="…o link de una planilla existente" style="margin-bottom:8px">
       <button class="btn block" data-act="gslinkgo">Vincular esa planilla</button>
       <button class="btn block ghost" style="margin-top:8px" data-act="closesheet">Cancelar</button>`,
      'En los dos métodos la app escribe directo del teléfono a Google: no hay ningún servidor en el medio.'));
  },
  async gsquick() {
    const conf = await Store.setting('gsScript');
    try {
      await gsLink(S.folder, { script: conf.url, token: conf.token, hoja: SCHEMAS[S.folder].sheet });
      S.sheet = null;
      toast('Conectando…');
      const r = await gsSync(S.folder);
      await goList();
      toast(`Pestaña «${SCHEMAS[S.folder].sheet}» lista: ${r.nuevos} bajados, ${r.subidos} en la planilla.`, 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async gsscriptgo() {
    const url = ((document.getElementById('gsscript') || {}).value || '').trim();
    const token = ((document.getElementById('gstoken') || {}).value || '').trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) return toast('Esa URL no parece de un script publicado (debe terminar en /exec).', 'err');
    if (!token) return toast('Falta la clave (la que pusiste en el script).', 'err');
    try {
      /* Queda guardada para todas las carpetas futuras: configurar una sola vez. */
      await Store.setting('gsScript', { url, token });
      await gsLink(S.folder, { script: url, token, hoja: SCHEMAS[S.folder].sheet });
      S.sheet = null;
      toast('Vinculando y sincronizando…');
      const r = await gsSync(S.folder);
      await goList();
      toast(`Conectado: ${r.nuevos} bajados, ${r.subidos} en la planilla.`, 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async gscreate() {
    try {
      await saveCidIfTyped();
      toast('Conectando con Google…');
      const gs = await gsCreate(S.folder);
      S.sheet = null; render();
      toast('Planilla creada y vinculada. Compartí la plantilla de nuevo para que los demás apunten a ella.', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async gslinkgo() {
    try {
      await saveCidIfTyped();
      const id = gsIdFromUrl((document.getElementById('gsurl') || {}).value);
      if (!id) return toast('Ese link no parece de una planilla de Google.', 'err');
      await gsLink(S.folder, { id, url: 'https://docs.google.com/spreadsheets/d/' + id });
      S.sheet = null;
      const r = await gsSync(S.folder);
      await goList();
      toast(`Vinculada y sincronizada: ${r.nuevos} nuevos, ${r.subidos} en la planilla.`, 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async gssync() {
    try {
      toast('Sincronizando…');
      const r = await gsSync(S.folder);
      await goList();
      const conf = r.conflictos.slice(0, 10).map(c =>
        `<div class="rec" style="cursor:default"><span class="who"><b>${esc(c.paciente)}</b><span>${esc(c.campo)}: acá “${esc(c.mio)}”, en la planilla “${esc(c.suyo)}”</span></span></div>`).join('');
      openSheet(sheetHTML('Sincronizado',
        `<div class="stats" style="margin-top:4px">
          <div class="stat"><div class="k">Bajados nuevos</div><div class="v">${r.nuevos}</div></div>
          <div class="stat"><div class="k">Completados</div><div class="v">${r.completados}</div></div>
          <div class="stat"><div class="k">En la planilla</div><div class="v">${r.subidos}</div></div>
          <div class="stat"><div class="k">Conflictos</div><div class="v">${r.conflictos.length}</div></div>
        </div>
        ${r.conflictos.length ? `<p class="note" style="margin:10px 0 8px">Se conservó lo de este teléfono; revisalos a mano:</p><div class="reclist">${conf}</div>` : ''}
        <button class="btn primary block" style="margin-top:12px" data-act="closesheet">Listo</button>`));
    } catch (e) { toast(e.message, 'err'); }
  },
  gsopen() {
    const gs = SCHEMAS[S.folder].def.gs;
    if (gs && gs.url) window.open(gs.url, '_blank');
    else toast('Abrila desde tu Google Drive: es la planilla donde pegaste el script.');
  },
  async merge() {
    pick(async (file) => {
      try {
        const recs = await importFile(S.folder, file);
        if (!recs.length) return toast('No encontré pacientes en ese archivo', 'err');
        const r = await mergeInto(S.folder, recs);
        await goList();
        const detalle = r.conflictos.slice(0, 12).map(c =>
          `<div class="rec" style="cursor:default"><span class="who"><b>${esc(c.paciente)}</b><span>${esc(c.campo)}: acá dice “${esc(c.mio)}”, el archivo trae “${esc(c.suyo)}”</span></span></div>`).join('');
        openSheet(sheetHTML('Fusión terminada',
          `<div class="stats" style="margin-top:4px">
            <div class="stat"><div class="k">Nuevos</div><div class="v">${r.nuevos}</div></div>
            <div class="stat"><div class="k">Completados</div><div class="v">${r.completados}</div></div>
            <div class="stat"><div class="k">Sin cambios</div><div class="v">${r.iguales}</div></div>
            <div class="stat"><div class="k">Conflictos</div><div class="v">${r.conflictos.length}</div></div>
          </div>
          ${r.conflictos.length ? `<p class="note" style="margin:10px 0 8px">En estos campos las dos cargas dicen cosas distintas. Se conservó lo de este teléfono; revisalos a mano:</p><div class="reclist">${detalle}</div>${r.conflictos.length > 12 ? `<p class="note">…y ${r.conflictos.length - 12} más.</p>` : ''}` : ''}
          <button class="btn primary block" style="margin-top:12px" data-act="closesheet">Listo</button>`));
      } catch (e) { toast('Error al fusionar: ' + e.message, 'err'); }
    });
  },
  sharetpl() {
    const SC = SCHEMAS[S.folder];
    openSheet(sheetHTML('Compartir esta plantilla',
      `<button class="btn primary block" style="margin-bottom:8px" data-act="sharelink">Compartir link (WhatsApp)</button>
       <button class="btn block" data-act="sharefile">Descargar como archivo</button>`,
      `El que toque el link abre Data cx con la carpeta “${esc(SC.name)}” lista para agregar en un toque. Mismo formulario, mismos Excel fusionables.`));
  },
  async sharelink() {
    const url = templateLink(S.folder);
    const SC = SCHEMAS[S.folder];
    S.sheet = null;
    if (navigator.share) {
      try { await navigator.share({ title: `Plantilla ${SC.name} — Data cx`, text: `Tocá el link para agregar la carpeta “${SC.name}” a tu Data cx:`, url }); }
      catch (e) { /* canceló el share: no es un error */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast('Link copiado. Pegalo en WhatsApp.', 'ok');
    }
    render();
  },
  sharefile() { S.sheet = null; exportTemplate(S.folder); toast('Plantilla descargada.'); render(); },
  importtpl() {
    pick(async (file) => {
      try {
        const r = await importTemplate(file);
        await refreshCounts();
        toast(r.actualizada ? `Plantilla “${r.nombre}” actualizada` : `Carpeta “${r.nombre}” creada`, 'ok');
        S.view = 'home'; render();
      } catch (e) { toast(e.message, 'err'); }
    }, '.json');
  },
  async tplok() {
    try {
      const r = await importTemplateData(S._tpl);
      S._tpl = null; S.sheet = null;
      await refreshCounts();
      toast(r.actualizada ? `Carpeta “${r.nombre}” actualizada` : `Carpeta “${r.nombre}” agregada`, 'ok');
      render();
    } catch (e) { toast(e.message, 'err'); }
  },
  async backup() {
    const n = await fullBackup();
    await refreshCounts();
    toast(`Respaldo con ${n} registros descargado. Guardalo fuera del teléfono (mail, Drive, compu).`, 'ok');
    render();
  },
  restore() {
    pick(async (file) => {
      try {
        const det = await restoreBackup(file);
        await refreshCounts();
        const resumen = det.map(d => `${d.carpeta}: ${d.nuevos} nuevos, ${d.completados} completados`).join(' · ');
        toast(det.length ? `Restaurado. ${resumen}` : 'El respaldo no traía registros nuevos.', 'ok');
        S.view = 'home'; render();
      } catch (e) { toast(e.message, 'err'); }
    }, '.json');
  },
  async alias() { await exportAlias(); toast('Tabla de equivalencias exportada'); },
  async anon() { S.anon = !S.anon; await Store.setting('anon', S.anon); render(); },
  async theme() {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = S.theme;
    await Store.setting('theme', S.theme); render();
  },
  imp(t) {
    const f = t.dataset.f;
    pick(async (file) => {
      try {
        const recs = await importFile(f, file);
        if (!recs.length) return toast('No encontré filas de pacientes en ese archivo', 'err');
        for (const r of recs) await Store.save(f, r);
        await refreshCounts();
        toast(`${recs.length} registros importados a ${SCHEMAS[f].name}`, 'ok');
        render();
      } catch (e) { toast('Error al importar: ' + e.message, 'err'); }
    });
  },
  async seed() {
    await seedDemo();
    await refreshCounts();
    toast('Datos de ejemplo cargados'); render();
  },
  async wipe() {
    openSheet(sheetHTML('¿Borrar todo?', `<p class="note">Se borran los registros de las dos carpetas y la tabla de equivalencias de este dispositivo. No se puede deshacer. Exportá el Excel antes.</p>
      <button class="btn block danger" style="margin-top:12px" data-act="wipeok">Sí, borrar todo</button>
      <button class="btn block ghost" style="margin-top:8px" data-act="closesheet">Cancelar</button>`));
  },
  async wipeok() {
    await Promise.all([db.c1.clear(), db.c2.clear(), db.drafts.clear(), db.alias.clear()]);
    await refreshCounts(); S.sheet = null; S.view = 'home'; toast('Dispositivo limpio'); render();
  },
};

async function goList() { S.list = await Store.all(S.folder); S.view = 'list'; render(); }

function setVal(k, v) { S.data[k] = v; saveDraft(); render(); }
let dTimer;
function saveDraft() { clearTimeout(dTimer); dTimer = setTimeout(() => Store.setDraft(draftKey(), S.data), 120); }

/* Si el nombre ya existe en la otra carpeta, ofrecemos traer lo común. */
async function lookupOther() {
  if (!isSys(S.folder)) return;
  const nameKey = SCHEMAS[S.folder].idKey;
  const name = String(S.data[nameKey] || '').trim().toUpperCase();
  if (S.id || name.length < 4 || S._asked === name) return;
  const other = S.folder === 'c1' ? 'c2' : 'c1';
  const hit = (await Store.all(other)).find(r => String(r.nombre || '').trim().toUpperCase() === name);
  if (!hit) return;
  S._asked = name;
  openSheet(sheetHTML('Ese paciente ya está en la otra carpeta',
    `<button class="btn primary block" style="margin-bottom:8px" data-act="pull" data-id="${hit.id}" data-o="${other}">Precargar campos comunes</button>
     <button class="btn block ghost" data-act="closesheet">No, cargo todo de nuevo</button>`,
    `Está en ${esc(SCHEMAS[other].name)}. Traemos edad, sexo, ASA, IMC, fecha, tiempo quirúrgico, internación y seguimiento. Los registros quedan separados.`));
}

ACTS.pull = async function (t) {
  const other = t.dataset.o;
  const src = (await Store.get(other, Number(t.dataset.id))).data;
  for (const c of CROSS) {
    const kf = other === 'c1' ? c.c1 : c.c2, kt = other === 'c1' ? c.c2 : c.c1;
    let v = src[kf];
    if (!hasVal(v) || hasVal(S.data[kt])) continue;
    if (other === 'c1' && c.f12) v = c.f12(v);
    if (other === 'c2' && c.f21) v = c.f21(v);
    S.data[kt] = v;
  }
  S.sheet = null; saveDraft(); toast('Campos comunes precargados'); render();
};

/* ---------- precarga entre carpetas ---------- */
/* La precarga cruzada solo aplica entre las dos carpetas del páncreas: son las
   únicas que comparten campos conocidos. */
async function maybeCross(nameKey) {
  const name = String(S.data[nameKey] || '').trim().toUpperCase();
  if (!name || !isSys(S.folder)) return;
  const other = S.folder === 'c1' ? 'c2' : 'c1';
  const all = await Store.all(other);
  const hit = all.find(r => String(r.nombre || '').trim().toUpperCase() === name);
  if (hit) return;
  openSheet(sheetHTML('¿Lo cargamos también en la otra carpeta?',
    `<button class="btn primary block" style="margin-bottom:8px" data-act="crossgo" data-o="${other}">Sí, precargar en ${esc(SCHEMAS[other].name)}</button>
     <button class="btn block ghost" data-act="closesheet">Ahora no</button>`,
    `Podemos pasar edad, sexo, ASA, IMC, fecha, tiempo quirúrgico, internación y seguimiento. El registro queda aparte.`));
}

ACTS.crossgo = async function (t) {
  const other = t.dataset.o, from = S.folder, src = S.data;
  const d = {};
  for (const c of CROSS) {
    const kf = from === 'c1' ? c.c1 : c.c2, kt = from === 'c1' ? c.c2 : c.c1;
    let v = src[kf];
    if (!hasVal(v)) continue;
    if (from === 'c1' && c.f12) v = c.f12(v);
    if (from === 'c2' && c.f21) v = c.f21(v);
    d[kt] = v;
  }
  S.folder = other; S.id = null; S.data = d; S.step = 0; S.sheet = null; S.view = 'form';
  toast('Campos comunes precargados'); render();
};

/* ---------- selector de archivo ---------- */
async function saveCidIfTyped() {
  const inp = document.getElementById('gscid');
  if (inp && inp.value.trim()) await gsClientId(inp.value.trim());
}

function pick(cb, accept) {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = accept || '.xlsx,.xls';
  i.onchange = () => { if (i.files[0]) cb(i.files[0]); };
  i.click();
}

/* ============================================================
   EVENTOS
   ============================================================ */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  if (t.classList.contains('sheet-bg') && e.target !== t) return;
  const a = ACTS[t.dataset.act];
  if (a) { e.preventDefault(); a(t); }
});

/* Lee un control y lo vuelca al registro. La usan `input` y `change`: el selector
   de fecha nativo del celular dispara `change` y no siempre `input`, y si acá no
   leemos el valor, el re-dibujo posterior lo borra. */
function readInput(t) {
  const d = t.dataset;
  if (d.bset !== undefined) { S.bdef[d.bset] = t.value; return true; }
  if (d.bstep !== undefined) { S.bdef.steps[Number(d.bstep)].t = t.value; return true; }
  if (d.fset !== undefined) { S.bfield[d.fset] = t.value; return true; }
  if (d.set !== undefined) { S.data[d.set] = t.value; autoIfTotal(d.set); saveDraft(); return true; }
  if (d.set2 !== undefined) { const c = S.data[d.set2] || {}; S.data[d.set2] = { v: c.v || '', txt: t.value }; saveDraft(); return true; }
  if (d.setfree !== undefined) { const c = S.data[d.setfree] || {}; S.data[d.setfree] = { sel: c.sel || (Array.isArray(c) ? c : []), free: t.value, seen: true }; saveDraft(); return true; }
  if (d.setn !== undefined) { const c = S.data[d.setn] || {}; S.data[d.setn] = { s: c.s || '', n: t.value }; saveDraft(); return true; }
  return false;
}

document.addEventListener('input', (e) => {
  const t = e.target;
  if (readInput(t)) return;
  if (t.dataset.inp === 'q') {
    S.q = t.value; render();
    const inp = document.querySelector('[data-inp="q"]');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'newopt') { e.preventDefault(); ACTS.fopadd(); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.inp === 'yr') { S.yr = t.value; render(); return; }
  readInput(t);
  /* La fecha se re-dibuja para actualizar el "se exporta como…". */
  if (t.dataset.set !== undefined && t.type === 'date') render();
  if (S.view === 'form' && t.dataset.set === SCHEMAS[S.folder].idKey) lookupOther();
});

function autoIfTotal(k) {
  if (S.folder !== 'c2') return;
  if (k === 'total') S.data._totalManual = true;
  if (k === 'uti' || k === 'piso') {
    const u = parseFloat(S.data.uti), p = parseFloat(S.data.piso);
    if (!isNaN(u) && !isNaN(p) && !S.data._totalManual) {
      S.data.total = u + p;
      const inp = document.querySelector('[data-set="total"]');
      if (inp) inp.value = u + p;
    }
  }
}

/* ============================================================
   DATOS DE EJEMPLO (los tres primeros casos de la base real,
   con nombres cambiados)
   ============================================================ */
async function seedDemo() {
  const c1 = [
    { c01:'DEMO PACIENTE UNO', c02:71, c03:'Femenino', c05:'II', c06:{sel:['HTA'],free:''}, c07:'Tumor de páncreas',
      c08:{s:'Elevada',n:''}, c09:'Si', c10:'DPC preservadora de píloro', c11:'2018-01-09', c12:445, c13:{s:'Bajo',n:''},
      c14:'No', c15:'Blanda', c16:{s:'Fino',n:''}, c17:'PJ', c18:'No', c19:'No', c20:'No', c21:'No', c23:'No', c24:6,
      c25:'No', c26:'No', c27:'Sin datos', c28:'Adenocarcinoma ductal', c29:30, c30:'Libre', c31:'Sin datos', c32:3,
      c33:'Sin datos', c34:'Sin datos', c35:'Sin datos', c36:'Sin más datos de la paciente' },
    { c01:'DEMO PACIENTE DOS', c02:36, c03:'Femenino', c05:'I', c06:{sel:[],free:'HTD'}, c07:'Quiste de páncreas',
      c08:{s:'Normal',n:''}, c09:'No', c10:'Pancreatectomía distal', c11:'2018-01-23', c12:225, c13:{s:'Bajo',n:''},
      c14:'No', c15:'Blanda', c16:{s:'Fino',n:''}, c17:'No requiere', c18:'No', c19:'Bioquímica', c20:'No', c21:'No',
      c22:'I', c23:'No', c24:3, c25:'No', c26:'No', c27:'No', c28:'Cistoadenoma Seroso Microquístico', c29:23,
      c30:'Libre', c31:'No', c32:5, c33:'Sin datos', c34:'Sin datos', c35:'Sin datos', c36:'Sin más datos de la paciente' },
    { c01:'DEMO PACIENTE TRES', c02:66, c03:'Masculino', c05:'III', c06:{sel:['Ninguna'],free:''}, c07:'Tumor de páncreas',
      c08:{s:'Elevada',n:''}, c09:'Si', c10:'Sin resección', c11:'2018-01-30', c12:175, c13:{s:'Bajo',n:''}, c14:'No',
      c15:'Irresecable', c16:'Irresecable', c17:'No requiere', c18:'No', c19:'No', c20:'No', c21:'No', c23:'No', c24:3,
      c25:'No', c26:'No', c27:'No', c28:'Adenocarcinoma ductal', c29:'Irresecable', c30:'Metastásico', c31:'Metastásico',
      c32:5, c33:'No', c34:'No', c35:'No' },
  ];
  const c2 = [
    { nombre:'DEMO PACIENTE UNO', sexo:'F', edad:71, ecog:'0', asa:'II', comorb:{sel:['HTA'],free:''},
      lab_bt:{s:'Elevada',n:''}, lab_prot:'4.1 G/DL', img:[], ubic:['CABEZA'], venoso:'No', arterial:'No',
      drenaje:'CPRE', impdx:'TUMOR PANCREÁTICO', trep:{v:'NO',txt:''}, clasif:'RESEC', neoqt:'NO', fecha:'2018-01-09',
      resec:'DPC+PP', recon_vasc:[], recons:'CHILD', sangrado:{s:'NO',n:''}, transiop:'NO', tiempo:445,
      amilasa3:'10/12', amilasa5:'7/9', fistula:'No', rvg:'No', hemorragia:[], fistbiliar:'NO', eras:'SI',
      uti:2, piso:4, total:6, histo:'ADENOCARCINOMA DUCTAL', ap_tam:30, margenes:'LIBRES', ganglios:'5/13',
      infil:['LV','PN'], reingreso:'NO', reinterv:'NO', adyqt:{v:'SI',txt:''}, seguim:3, asint:'S/D',
      obs:'SIN MÁS SEGUIMIENTO DE PACIENTE' },
    { nombre:'DEMO PACIENTE DOS', sexo:'F', edad:36, ecog:'0', asa:'I', comorb:{sel:[],free:'HTD'},
      lab_bt:{s:'Normal',n:''}, img:['RMN'], ubic:['COLA'], venoso:'No', arterial:'No', drenaje:'No',
      impdx:'QUISTE DE PÁNCREAS', trep:{v:'NO',txt:''}, clasif:'RESEC', neoqt:'NO', fecha:'2018-01-23', resec:'PD',
      recon_vasc:[], recons:'NO REQUIERE', sangrado:{s:'NO',n:''}, transiop:'NO', tiempo:225, amilasa3:'4906',
      fistula:'Bioquímica', rvg:'No', hemorragia:[], fistbiliar:'NO', eras:'SI', uti:1, piso:2, total:3,
      histo:'CISTOADENOMA SEROSO MICROQUÍSTICO', ap_tam:23, margenes:'LIBRES', reingreso:'NO', reinterv:'NO',
      adyqt:{v:'NO',txt:''}, seguim:5, obs:'SIN MÁS SEGUIMIENTO DE PACIENTE' },
  ];
  for (const d of c1) await Store.save('c1', { data: d });
  for (const d of c2) await Store.save('c2', { data: d });
}

/* Arrancamos recién cuando están todos los scripts. `boot()` acá suelto corría
   antes de que el navegador leyera builder.js, y render() buscaba funciones que
   todavía no existían: andaba solo por una carrera con IndexedDB. */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else setTimeout(boot, 0);  /* si el documento ya está listo, esperamos igual a que
                              terminen de evaluarse los scripts que siguen a éste */
