/* ============================================================
   builder.js — la pantalla donde armás una carpeta.
   Los bloques traen sus campos y además arman el paso del
   formulario: agregar "Paciente" te deja un paso "Paciente".
   ============================================================ */

const COLORS = ['#189bd6', '#0272ba', '#3fbfae', '#e0794d', '#d45d79', '#6ba644'];

/* ---------- pantalla principal del constructor ---------- */
function viewBuilder() {
  const d = S.bdef;
  const w = auditFolder(d);
  const nueva = !d._saved;
  return `
  <div class="topbar">
    <button class="iconbtn" data-act="bcancel">←</button>
    <h1>${nueva ? 'Nueva carpeta' : 'Editar carpeta'}<span class="sub">${d.fields.length} campos · ${d.steps.length} pasos</span></h1>
  </div>
  <div class="wrap">
    <div class="field">
      <div class="flabel"><span class="txt">Nombre del registro</span></div>
      <input type="text" data-bset="name" value="${esc(d.name)}" placeholder="Ej.: Apendicectomías, Hernioplastias…" enterkeyhint="next">
      <div class="fhint" style="margin:10px 0 6px">Descripción (opcional)</div>
      <input type="text" data-bset="desc" value="${esc(d.desc || '')}" placeholder="Serie 2024-2026">
      <div class="fhint" style="margin:10px 0 6px">Color</div>
      <div class="chips">${COLORS.map(c => `<button class="chip" data-act="bcolor" data-v="${c}" style="background:${c};border-color:${c};min-width:48px;color:#fff;font-size:1.05rem;${d.color === c ? 'box-shadow:0 0 0 3px var(--text);' : ''}">${d.color === c ? '✓' : ''}</button>`).join('')}</div>
      <div class="fhint" style="margin-top:6px">Es el color de la tarjeta de esta carpeta en el inicio.</div>
    </div>

    ${w.map(x => `<div class="softwarn" ${x.t === 'error' ? 'style="border-color:var(--danger)"' : ''}><b>${x.t === 'error' ? 'Falta' : 'Ojo'}:</b> ${esc(x.m)}</div>`).join('')}

    <div class="section-title">Formulario</div>
    ${d.steps.length ? d.steps.map((st, si) => stepHTML(d, st, si)).join('') : `
      <div class="empty"><b>Todavía no hay campos</b>Empezá por un bloque ya armado, o creá un campo a mano.</div>`}

    <div class="btn-row" style="margin-top:12px">
      <button class="btn primary" data-act="baddblock">+ Bloque</button>
      <button class="btn" data-act="bnewfield">+ Campo</button>
      <button class="btn" data-act="bnewstep">+ Pantalla</button>
    </div>
    <p class="note" style="margin-top:8px">El formulario se llena por pantallas (los recuadros de arriba): así nadie enfrenta 30 campos de un solo scroll. “+ Pantalla” crea una vacía para agrupar tus campos; el ⭑ de cada una la guarda como bloque para reusar en otras carpetas.</p>

    ${d.fields.length ? `<div class="section-title">Excel</div>
      <p class="note">Se genera una hoja plana: encabezado en la fila 1 y una fila por paciente, en este mismo orden. La columna de cada campo está a su derecha.</p>` : ''}

    ${!nueva ? `<div class="section-title">Zona de riesgo</div>
      <button class="btn block danger" data-act="bdelfolder">Eliminar esta carpeta y sus registros</button>` : ''}
  </div>
  <div class="formbar">
    <button class="btn" data-act="bcancel">Cancelar</button>
    <button class="btn save primary" data-act="bsave" ${d.fields.length ? '' : 'disabled'}>Guardar carpeta</button>
  </div>`;
}

function stepHTML(d, st, si) {
  const lastStep = si === d.steps.length - 1;
  return `
  <div class="field" style="padding:12px">
    <div class="flabel">
      <input type="text" data-bstep="${si}" value="${esc(st.t)}" style="min-height:36px;font-weight:600;background:transparent;border-color:transparent;padding:4px 6px">
      ${st.ks.length ? `<button class="iconbtn arrow" data-act="bsaveblock" data-i="${si}" title="Guardar como bloque">⭑</button>` : ''}
      <span class="col">${st.ks.length}</span>
    </div>
    ${st.ks.map((k, ki) => {
      const f = d.fields.find(x => x.k === k);
      if (!f) return '';
      const i = d.fields.indexOf(f);
      const first = si === 0 && ki === 0;
      const last = lastStep && ki === st.ks.length - 1;
      return `
      <div class="rec brow" style="margin-bottom:6px;cursor:default">
        <span class="idx">${colName(i)}</span>
        <span class="who" data-act="beditfield" data-k="${k}" style="cursor:pointer">
          <b>${esc(f.l || '(sin nombre)')}</b>
          <span>${esc(TMAP[f.t].l)}${f.o ? ' · ' + f.o.length + ' opciones' : ''}${f.unit ? ' · ' + f.unit : ''}${f.role === 'id' ? ' · identifica al paciente' : ''}${f.role === 'date' ? ' · define el año' : ''}</span>
        </span>
        <button class="iconbtn arrow" data-act="bmove" data-k="${k}" data-dir="-1" ${first ? 'disabled' : ''}>↑</button>
        <button class="iconbtn arrow" data-act="bmove" data-k="${k}" data-dir="1" ${last ? 'disabled' : ''}>↓</button>
        <button class="iconbtn arrow del" data-act="bquickdel" data-k="${k}">×</button>
      </div>`;
    }).join('')}
    ${st.ks.length ? '' : '<p class="note">Paso vacío. Se borra solo al guardar.</p>'}
  </div>`;
}

/* ---------- editor de un campo ---------- */
function viewBField() {
  const f = S.bfield;
  const T = TMAP[f.t];
  const otros = S.bdef.fields.filter(x => x.k !== f.k);
  const num = otros.filter(x => x.t === 'num');
  const fechas = otros.filter(x => x.t === 'date');
  const C = CALCS[f.calc] || CALCS.imc;
  const fuentes = f.calc === 'dias' ? fechas : num;
  return `
  <div class="topbar">
    <button class="iconbtn" data-act="bfback">←</button>
    <h1>${S.bnew ? 'Campo nuevo' : 'Editar campo'}<span class="sub">${esc(S.bdef.name || 'Sin nombre')}</span></h1>
  </div>
  <div class="wrap">
    <div class="field">
      <div class="flabel"><span class="txt">¿Qué dato es?</span></div>
      <input type="text" data-fset="l" value="${esc(f.l)}" placeholder="Tipo de apendicitis" enterkeyhint="next">
      <div class="fhint" style="margin-top:8px">Este texto va tal cual al encabezado del Excel.</div>
    </div>

    <div class="field">
      <div class="flabel"><span class="txt">¿Cómo se carga?</span></div>
      <div class="chips">${TYPES.map(t => `<button class="chip ${f.t === t.t ? 'on' : ''}" data-act="ftype" data-v="${t.t}">${t.icon} ${esc(t.l)}</button>`).join('')}</div>
      <div class="fhint" style="margin-top:8px">${esc(T.d)}</div>
      ${f.t === 'text' ? '<div class="softwarn" style="margin-top:10px"><b>Ojo:</b> el texto libre no se puede contar ni comparar. Si las respuestas son previsibles, usá “Una opción”.</div>' : ''}
    </div>

    ${T.opts ? `
    <div class="field">
      <div class="flabel"><span class="txt">Opciones</span><span class="col">${(f.o || []).length}</span></div>
      <div class="chips">${(f.o || []).map((o, i) => `<button class="chip on" data-act="fopdel" data-i="${i}">${esc(o)} &times;</button>`).join('')}</div>
      <div class="inline-num" style="margin-top:8px">
        <input type="text" id="newopt" placeholder="Escribí una opción y tocá Enter" enterkeyhint="done">
        <button class="btn" style="min-height:44px" data-act="fopadd">Agregar</button>
      </div>
      <div class="fhint" style="margin:10px 0 6px">Escalas en un toque:</div>
      <div class="chips">
        <button class="chip" data-act="fscale" data-v="0-10">0 a 10 (EVA)</button>
        <button class="chip" data-act="fscale" data-v="1-5">1 a 5</button>
        <button class="chip" data-act="fscale" data-v="I-IV">I a IV</button>
        <button class="chip" data-act="fscale" data-v="sino">Sí / No / Parcial</button>
      </div>
      ${(f.o || []).length < 2 ? '<div class="fhint" style="margin-top:8px">Necesitás al menos dos.</div>' : ''}
      ${f.t === 'multi' ? `<div class="switchrow" style="margin-top:10px"><div><div class="t">Permitir “Otras”</div><div class="d">Agrega un campo de texto para lo que no esté en la lista.</div></div>
        <div class="sw ${f.free ? 'on' : ''}" data-act="ffree"></div></div>` : ''}
    </div>` : ''}

    ${T.unit ? `
    <div class="field">
      <div class="flabel"><span class="txt">Unidad</span></div>
      <input type="text" data-fset="unit" value="${esc(f.unit || '')}" placeholder="mm, días, /mm³, años">
      <div class="chips" style="margin-top:8px">${['años','días','horas','min','mm','ml','kg','cm','meses','/mm³','mg/dl','%','/10'].map(u => `<button class="chip ${f.unit === u ? 'on' : ''}" data-act="funit" data-v="${esc(u)}">${esc(u)}</button>`).join('')}</div>
      <div class="fhint" style="margin-top:8px">Va al encabezado entre paréntesis. Sin unidad, en dos años nadie sabe si eran días u horas.</div>
    </div>` : ''}

    ${f.t === 'calc' ? `
    <div class="field">
      <div class="flabel"><span class="txt">¿Qué calcula?</span></div>
      <div class="chips">${Object.entries(CALCS).map(([k, c]) => `<button class="chip ${f.calc === k ? 'on' : ''}" data-act="fcalc" data-v="${k}">${esc(c.l)}</button>`).join('')}</div>
      ${fuentes.length < C.need ? `<div class="softwarn" style="margin-top:10px"><b>Falta:</b> primero necesitás ${C.need} campos de ${f.calc === 'dias' ? 'fecha' : 'número'} en esta carpeta. Creálos y volvé.</div>`
        : C.ask.map((label, i) => `
        <div class="fhint" style="margin:10px 0 6px">${esc(label)}</div>
        <div class="chips">${fuentes.map(x => `<button class="chip ${(f.from || [])[i] === x.k ? 'on' : ''}" data-act="ffrom" data-i="${i}" data-v="${x.k}">${esc(x.l)}</button>`).join('')}</div>`).join('')}
    </div>` : ''}

    <div class="field">
      <div class="flabel"><span class="txt">Ayuda (opcional)</span></div>
      <input type="text" data-fset="hint" value="${esc(f.hint || '')}" placeholder="Aparece en chico debajo del campo">
    </div>

    ${S.bnew ? '' : '<button class="btn block danger" data-act="fdel">Eliminar este campo</button><p class="note" style="margin-top:8px">Se borra la columna del Excel. Lo cargado en ese campo queda guardado en los registros, pero deja de exportarse.</p>'}
  </div>
  <div class="formbar">
    <button class="btn" data-act="bfback">Cancelar</button>
    <button class="btn save primary" data-act="fsave" ${f.l.trim() ? '' : 'disabled'}>Listo</button>
  </div>`;
}

/* ---------- acciones ---------- */
Object.assign(ACTS, {
  newfolder() { S.bdef = blankFolder(); S.view = 'builder'; render(); },
  editfolder() { S.bdef = JSON.parse(JSON.stringify(SCHEMAS[S.folder].def)); S.bdef._saved = true; S.view = 'builder'; render(); },
  bcancel() { S.bdef = null; S.view = 'home'; refreshCounts().then(render); },
  bcolor(t) { S.bdef.color = t.dataset.v; render(); },

  async baddblock() {
    S._ub = (await Store.setting('ublocks')) || [];
    const item = (b, propio) => `<div style="display:flex;gap:6px;margin-bottom:8px;align-items:stretch">
      <button class="btn" style="flex:1;text-align:left;justify-content:flex-start;height:auto;padding:12px 14px;flex-direction:column;align-items:flex-start" data-act="bblockpick" data-v="${b.id}">
        <b style="font-size:1rem">${esc(b.l)}</b><span class="note" style="margin-top:2px">${esc(b.d)}</span></button>
      ${propio ? `<button class="iconbtn" style="min-width:44px;height:auto;color:var(--danger)" data-act="bdelblock" data-v="${b.id}">×</button>` : ''}</div>`;
    openSheet(sheetHTML('Bloques',
      (S._ub.length ? `<div class="section-title" style="margin-top:0">Tus bloques</div>` + S._ub.map(b => item(b, true)).join('') : '') +
      `<div class="section-title" ${S._ub.length ? '' : 'style="margin-top:0"'}>De la biblioteca</div>` +
      BLOCKS.map(b => item(b, false)).join('') +
      `<button class="btn block ghost" style="margin-top:6px" data-act="closesheet">Cerrar</button>`,
      'Tocá uno para ver sus campos y elegir cuáles entran. Tus bloques se crean con el ⭑ de cualquier paso.'));
  },

  /* ⭑: el paso se vuelve un bloque reutilizable en todas tus carpetas. */
  async bsaveblock(t) {
    const st = S.bdef.steps[Number(t.dataset.i)];
    const fields = st.ks.map(k => S.bdef.fields.find(f => f.k === k)).filter(Boolean)
      .map(f => {
        const c = { l: f.l, t: f.t };
        ['o', 'unit', 'hint', 'free', 'calc'].forEach(p => { if (f[p] !== undefined) c[p] = JSON.parse(JSON.stringify(f[p])); });
        return c;
      });
    if (!fields.length) return;
    const ub = (await Store.setting('ublocks')) || [];
    const nombre = (st.t || 'Bloque').trim();
    const b = { id: 'ub' + Date.now().toString(36), l: nombre, d: fields.map(f => f.l).slice(0, 4).join(', ') + (fields.length > 4 ? '…' : ''), fields };
    /* Mismo nombre = actualización, no duplicado. */
    const i = ub.findIndex(x => x.l.toLowerCase() === nombre.toLowerCase());
    if (i >= 0) ub[i] = b; else ub.push(b);
    await Store.setting('ublocks', ub);
    toast(`Bloque “${nombre}” guardado. Aparece en “+ Bloque” en todas tus carpetas.`, 'ok');
  },
  async bdelblock(t) {
    const ub = ((await Store.setting('ublocks')) || []).filter(x => x.id !== t.dataset.v);
    await Store.setting('ublocks', ub);
    ACTS.baddblock();
  },

  /* Segundo paso del selector: los campos del bloque, todos marcados. Destildás
     lo que no querés y agregás el resto. */
  bblockpick(t) {
    S.bpick = { id: t.dataset.v, on: new Set() };
    renderBlockPick();
  },
  bblocktoggle(t) {
    const i = Number(t.dataset.i);
    S.bpick.on.has(i) ? S.bpick.on.delete(i) : S.bpick.on.add(i);
    renderBlockPick();
  },
  bblockall() {
    const b = findBlock(S.bpick.id);
    S.bpick.on = S.bpick.on.size === b.fields.length ? new Set() : new Set(b.fields.map((_, i) => i));
    renderBlockPick();
  },
  baddblockgo() {
    const b = findBlock(S.bpick.id);
    const elegidos = b.fields.filter((_, i) => S.bpick.on.has(i));
    const fs = elegidos.map(fieldFromLib);
    /* Un solo campo puede identificar al paciente, y una sola fecha define el año. */
    fs.forEach(f => { if (f.role && S.bdef.fields.some(x => x.role === f.role)) delete f.role; });
    /* Un calculado sin sus fuentes no entra: IMC sin peso o sin talla no existe. */
    const nombres = new Set(S.bdef.fields.concat(fs).map(f => f.l));
    const fs2 = fs.filter(f => {
      if (f.t !== 'calc') return true;
      const need = f.calc === 'imc' ? ['Peso', 'Talla'] : f.calc === 'dias' ? ['Fecha de cirugía', 'Fecha de alta'] : [];
      return need.every(n => nombres.has(n));
    });
    if (!fs2.length) { S.bpick = null; closeSheet(); return; }
    S.bdef.fields = S.bdef.fields.concat(fs2);
    S.bdef.steps.push({ t: b.l, ks: fs2.map(f => f.k), _block: true });
    linkCalcs(S.bdef, fs2);
    S.bpick = null; S.sheet = null; render();
    toast(`${fs2.length} campos agregados${fs2.length < fs.length ? ' (los calculados sin sus fuentes quedaron afuera)' : ''}`);
  },

  bnewfield() { S.bfield = { k: newKey(), l: '', t: 'chips', o: [] }; S.bnew = true; S.view = 'bfield'; render(); },
  bnewstep() { S.bdef.steps.push({ t: 'Nueva pantalla', ks: [] }); render(); toast('Pantalla creada. Ponele nombre y agregale campos.'); },
  beditfield(t) {
    S.bfield = JSON.parse(JSON.stringify(S.bdef.fields.find(f => f.k === t.dataset.k)));
    S.bnew = false; S.view = 'bfield'; render();
  },
  bfback() { S.bfield = null; S.view = 'builder'; render(); },
  ftype(t) {
    const f = S.bfield;
    f.t = t.dataset.v;
    if (!TMAP[f.t].opts) { delete f.o; delete f.free; } else if (!f.o) f.o = [];
    if (!TMAP[f.t].unit) delete f.unit;
    if (f.t === 'calc') { f.calc = f.calc || 'imc'; f.from = f.from || []; } else { delete f.calc; delete f.from; }
    render();
  },
  fopadd() {
    const i = document.getElementById('newopt');
    const v = (i.value || '').trim();
    if (!v) return;
    S.bfield.o = (S.bfield.o || []).concat([v]);
    render();
    const n = document.getElementById('newopt'); if (n) n.focus();
  },
  fopdel(t) { S.bfield.o.splice(Number(t.dataset.i), 1); render(); },
  fscale(t) {
    const v = t.dataset.v;
    S.bfield.o = v === '0-10' ? ['0','1','2','3','4','5','6','7','8','9','10']
      : v === '1-5' ? ['1','2','3','4','5']
      : v === 'I-IV' ? ['I','II','III','IV']
      : ['Sí','No','Parcial'];
    render();
  },
  ffree() { S.bfield.free = !S.bfield.free; render(); },
  funit(t) { S.bfield.unit = S.bfield.unit === t.dataset.v ? '' : t.dataset.v; render(); },
  fcalc(t) { S.bfield.calc = t.dataset.v; S.bfield.from = []; render(); },
  ffrom(t) {
    const f = S.bfield;
    f.from = f.from || [];
    f.from[Number(t.dataset.i)] = t.dataset.v;
    render();
  },
  fsave() {
    const f = S.bfield, d = S.bdef;
    f.l = f.l.trim();
    const i = d.fields.findIndex(x => x.k === f.k);
    if (i >= 0) { d.fields[i] = f; }
    else {
      d.fields.push(f);
      let st = d.steps[d.steps.length - 1];
      if (!st || st._block) { st = { t: 'Otros datos', ks: [] }; d.steps.push(st); }
      st.ks.push(f.k);
    }
    fixRoles(d);
    S.bfield = null; S.view = 'builder'; render();
  },
  bquickdel(t) {
    const k = t.dataset.k, d = S.bdef;
    const f = d.fields.find(x => x.k === k);
    d.fields = d.fields.filter(x => x.k !== k);
    d.steps.forEach(st => { st.ks = st.ks.filter(x => x !== k); });
    d.fields.forEach(x => { if (x.from) x.from = x.from.filter(y => y !== k); });
    fixRoles(d);
    render();
    toast(`“${f ? f.l : 'Campo'}” quitado. Cancelá sin guardar si te arrepentís.`);
  },
  fdel() {
    const k = S.bfield.k, d = S.bdef;
    d.fields = d.fields.filter(f => f.k !== k);
    d.steps.forEach(st => { st.ks = st.ks.filter(x => x !== k); });
    d.fields.forEach(f => { if (f.from) f.from = f.from.filter(x => x !== k); });
    S.bfield = null; S.view = 'builder'; render();
  },

  /* Mover un campo lo mueve también de columna en el Excel: el orden del
     formulario y el del archivo son el mismo. */
  bmove(t) {
    const d = S.bdef, k = t.dataset.k, dir = Number(t.dataset.dir);
    const si = d.steps.findIndex(st => st.ks.includes(k));
    const st = d.steps[si], ki = st.ks.indexOf(k);
    const dest = ki + dir;
    if (dest >= 0 && dest < st.ks.length) { st.ks.splice(ki, 1); st.ks.splice(dest, 0, k); }
    else {
      const sd = si + dir;
      if (sd < 0 || sd >= d.steps.length) return;
      st.ks.splice(ki, 1);
      dir < 0 ? d.steps[sd].ks.push(k) : d.steps[sd].ks.unshift(k);
    }
    reorder(d); render();
  },

  async bsave() {
    const d = S.bdef;
    d.name = (d.name || '').trim() || 'Sin nombre';
    d.steps = d.steps.filter(st => st.ks.length);
    reorder(d);
    fixRoles(d);
    d._saved = true;
    await Store.putFolder(JSON.parse(JSON.stringify(d)));
    registerFolder(d);
    S.bdef = null; S.folder = d.id;
    await refreshCounts();
    toast('Carpeta guardada', 'ok');
    await goList();
  },

  bdelfolder() {
    openSheet(sheetHTML('¿Eliminar la carpeta?',
      `<button class="btn block danger" data-act="bdelok">Sí, eliminar todo</button>
       <button class="btn block ghost" style="margin-top:8px" data-act="closesheet">Cancelar</button>`,
      `Se borran la definición y los ${S.counts[S.bdef.id] || 0} registros cargados. Exportá el Excel antes.`));
  },
  async bdelok() {
    const id = S.bdef.id;
    await Store.delFolder(id);
    unregisterFolder(id);
    S.bdef = null; S.sheet = null; S.view = 'home'; S.folder = 'c1';
    await refreshCounts();
    toast('Carpeta eliminada'); render();
  },
});

const findBlock = (id) => BLOCKS.find(x => x.id === id) || (S._ub || []).find(x => x.id === id);

function renderBlockPick() {
  const b = findBlock(S.bpick.id);
  const n = S.bpick.on.size;
  const todos = n === b.fields.length;
  openSheet(sheetHTML(b.l,
    `<div class="chips" style="gap:8px">${b.fields.map((f, i) => {
      const on = S.bpick.on.has(i);
      return `<button class="chip ${on ? 'on' : ''}" style="min-height:44px" data-act="bblocktoggle" data-i="${i}">${on ? '✓ ' : ''}${esc(f.l)}</button>`;
    }).join('')}</div>
     <button class="btn block" style="margin-top:10px" data-act="bblockall">${todos ? 'Desmarcar todos' : 'Marcar todos'}</button>
     <button class="btn primary block" style="margin-top:8px" data-act="baddblockgo" ${n ? '' : 'disabled'}>${n ? `Agregar ${n} ${n === 1 ? 'campo' : 'campos'}` : 'Tocá los campos que quieras'}</button>
     <button class="btn block ghost" style="margin-top:8px" data-act="baddblock">Volver a los bloques</button>`,
    'Tocá cada campo que quieras agregar.'));
}

/* El orden de los campos sigue al de los pasos: lo que ves arriba en el
   formulario es la columna A del Excel. */
function reorder(d) {
  const order = [].concat(...d.steps.map(st => st.ks));
  d.fields.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
}

function linkCalcs(d, fs) {
  fs.filter(f => f.t === 'calc').forEach(f => {
    const c = CALCS[f.calc];
    if (!c) return;
    const pool = c.dates ? d.fields.filter(x => x.t === 'date') : d.fields.filter(x => x.t === 'num' && x.k !== f.k);
    if (f.calc === 'imc') {
      const p = pool.find(x => /peso/i.test(x.l)), t = pool.find(x => /talla/i.test(x.l));
      if (p && t) f.from = [p.k, t.k];
    } else if (f.calc === 'dias') {
      const a = pool.find(x => /cirug/i.test(x.l)), b = pool.find(x => /alta/i.test(x.l));
      if (a && b) f.from = [a.k, b.k];
    }
  });
}
