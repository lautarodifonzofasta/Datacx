/* ============================================================
   library.js — el constructor de carpetas.
   Dos partes: los tipos de campo disponibles, y una biblioteca de
   bloques ya armados. La biblioteca existe por una razón concreta:
   que cargar "Clavien-Dindo" bien hecho sea más fácil que inventarlo
   mal. Un campo de texto libre donde debería haber opciones es una
   base de datos que no sirve para ningún trabajo.
   ============================================================ */

const TYPES = [
  { t:'chips',    l:'Una opción',      d:'Botones. Elegís una sola.',            icon:'●', opts:true },
  { t:'multi',    l:'Varias opciones', d:'Botones. Podés elegir más de una.',    icon:'▣', opts:true },
  { t:'toggle',   l:'Sí / No',         d:'Dos botones.',                          icon:'◐' },
  { t:'num',      l:'Número',          d:'Teclado numérico. Lleva unidad.',      icon:'#', unit:true },
  { t:'date',     l:'Fecha',           d:'Calendario del teléfono.',              icon:'▤' },
  { t:'text',     l:'Texto corto',     d:'Teclado. Usalo poco.',                  icon:'—' },
  { t:'textarea', l:'Texto largo',     d:'Para observaciones.',                   icon:'¶' },
  { t:'calc',     l:'Calculado',       d:'Sale solo de otros campos.',            icon:'∑' },
];
const TMAP = Object.fromEntries(TYPES.map(x => [x.t, x]));

/* Tipos que producen datos agrupables. El resto no se puede analizar. */
const ANALIZABLE = ['chips', 'multi', 'toggle', 'num', 'date', 'calc'];

/* ---------- Bloques prearmados ---------- */
const CLAVIEN = ['I', 'II', 'IIIa', 'IIIb', 'IVa', 'IVb', 'V'];

const BLOCKS = [
  {
    id:'paciente', l:'Paciente', d:'Nombre, edad, sexo, ASA, IMC, comorbilidades',
    fields:[
      { l:'Apellido y Nombre', t:'text', role:'id' },
      { l:'Edad', t:'num', unit:'años' },
      { l:'Sexo', t:'chips', o:['Femenino','Masculino'] },
      { l:'ASA', t:'chips', o:['I','II','III','IV'] },
      { l:'Peso', t:'num', unit:'kg' },
      { l:'Talla', t:'num', unit:'cm' },
      { l:'IMC', t:'calc', calc:'imc', unit:'kg/m²', hint:'Sale de peso y talla.' },
      { l:'Comorbilidades', t:'multi', o:['HTA','DBT','DLP','TBQ','EPOC','Obesidad','Ninguna'], free:true },
    ],
  },
  {
    id:'apendicitis', l:'Apendicitis', d:'Tipo, tiempo de evolución, peritonitis, Alvarado',
    fields:[
      { l:'Tipo de apendicitis', t:'chips', o:['Congestiva','Flegmonosa','Gangrenosa','Perforada'] },
      { l:'Tiempo de evolución', t:'num', unit:'horas' },
      { l:'Peritonitis', t:'chips', o:['No','Localizada','Difusa'] },
      { l:'Score de Alvarado', t:'num', unit:'/10' },
      { l:'Apendicolito', t:'toggle' },
    ],
  },
  {
    id:'laboratorio', l:'Laboratorio de ingreso', d:'Leucocitos, PCR, hemoglobina, creatinina',
    fields:[
      { l:'Leucocitos', t:'num', unit:'/mm³' },
      { l:'Neutrófilos', t:'num', unit:'%' },
      { l:'PCR', t:'num', unit:'mg/l' },
      { l:'Hemoglobina', t:'num', unit:'g/dl' },
      { l:'Creatinina', t:'num', unit:'mg/dl' },
    ],
  },
  {
    id:'cirugia', l:'Cirugía', d:'Fecha, abordaje, urgencia, tiempo quirúrgico',
    fields:[
      { l:'Fecha de cirugía', t:'date', role:'date' },
      { l:'Carácter', t:'chips', o:['Programada','Urgencia'] },
      { l:'Abordaje', t:'chips', o:['Laparoscópico','Convencional','Convertido'] },
      { l:'Tiempo quirúrgico', t:'num', unit:'min' },
      { l:'Cirujano', t:'text' },
    ],
  },
  {
    id:'complicaciones', l:'Complicaciones', d:'Clavien-Dindo, tipo, reintervención',
    fields:[
      { l:'Complicaciones', t:'multi', o:['Infección de sitio quirúrgico','Absceso intraabdominal','Íleo','Hemorragia','Evisceración','Neumonía','TVP','Ninguna'], free:true },
      { l:'Clavien-Dindo', t:'chips', o:CLAVIEN, hint:'Vacío = sin complicaciones.' },
      { l:'Reintervención', t:'toggle' },
    ],
  },
  {
    id:'evolucion', l:'Evolución', d:'Internación, UTI, reingreso, mortalidad',
    fields:[
      { l:'Fecha de alta', t:'date' },
      { l:'Días de internación', t:'calc', calc:'dias', unit:'días', hint:'Sale de la fecha de cirugía y la de alta.' },
      { l:'Días en UTI', t:'num', unit:'días' },
      { l:'Reingreso a 30 días', t:'toggle' },
      { l:'Mortalidad a 30 días', t:'toggle' },
      { l:'Mortalidad a 90 días', t:'toggle' },
    ],
  },
  {
    id:'anatpat', l:'Anatomía patológica', d:'Tipo histológico, tamaño, márgenes, ganglios',
    fields:[
      { l:'Tipo histológico', t:'text' },
      { l:'Tamaño tumoral', t:'num', unit:'mm' },
      { l:'Márgenes', t:'chips', o:['Libre','Comprometido'] },
      { l:'Ganglios', t:'text', hint:'Formato n/N, ej. 2/18.' },
    ],
  },
  {
    id:'seguimiento', l:'Seguimiento', d:'Meses, estado actual, recaída, observaciones',
    fields:[
      { l:'Seguimiento', t:'num', unit:'meses' },
      { l:'Estado actual', t:'chips', o:['Vivo sin enfermedad','Vivo con enfermedad','Fallecido','Perdido'] },
      { l:'Recaída', t:'toggle' },
      { l:'Observaciones', t:'textarea' },
    ],
  },
];

/* ---------- Campos calculados ----------
   A propósito no hay un intérprete de fórmulas: son tres cálculos concretos
   y predecibles. Una fórmula libre en una app clínica es una forma elegante
   de meter errores que nadie revisa. */
const CALCS = {
  imc:  { l:'IMC', need:2, ask:['Peso (kg)', 'Talla (cm)'], fn:(p, t) => (p > 0 && t > 0) ? +(p / Math.pow(t / 100, 2)).toFixed(1) : '' },
  dias: { l:'Días entre dos fechas', need:2, ask:['Fecha inicial', 'Fecha final'], fn:(a, b) => {
    const d1 = Date.parse(a), d2 = Date.parse(b);
    return (isNaN(d1) || isNaN(d2)) ? '' : Math.round((d2 - d1) / 86400000);
  }, dates:true },
  suma: { l:'Suma', need:2, ask:['Primer campo', 'Segundo campo'], fn:(a, b) => (isNaN(+a) || isNaN(+b)) ? '' : +a + +b },
};

function runCalc(f, data) {
  const c = CALCS[f.calc];
  if (!c || !f.from || f.from.length < c.need) return '';
  const args = f.from.map(k => {
    const v = data[k];
    if (c.dates) return v;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? '' : n;
  });
  if (args.some(a => a === '' || a === undefined || a === null)) return '';
  return c.fn(...args);
}

/* ---------- Crear una carpeta ---------- */
let _kn = 0;
/* Clave interna e inmutable. Renombrar un campo no la toca: por eso los datos
   viejos no quedan huérfanos cuando cambiás una etiqueta. */
const newKey = () => 'f' + Date.now().toString(36) + (_kn++).toString(36);
const newFolderId = () => 'u' + Date.now().toString(36);

function blankFolder() {
  return {
    id: newFolderId(),
    name: '',
    desc: '',
    color: '#4d9de0',
    sheet: '',
    fields: [],
    steps: [],
    createdAt: Date.now(),
    sys: false,
  };
}

function fieldFromLib(src) {
  const f = { k: newKey(), l: src.l, t: src.t };
  ['o', 'unit', 'hint', 'free', 'role', 'calc'].forEach(p => { if (src[p] !== undefined) f[p] = JSON.parse(JSON.stringify(src[p])); });
  return f;
}

/* Un registro sin identificador no se puede buscar; sin fecha no se puede
   agrupar por año. Se resuelven solos con el primer campo que sirva. */
function fixRoles(def) {
  if (!def.fields.some(f => f.role === 'id')) {
    const c = def.fields.find(f => f.t === 'text');
    if (c) c.role = 'id';
  }
  if (!def.fields.some(f => f.role === 'date')) {
    const c = def.fields.find(f => f.t === 'date');
    if (c) c.role = 'date';
  }
  return def;
}

/* La definición se vuelve un esquema igual al de las carpetas del páncreas.
   De ahí en más, el formulario y el exportador no saben la diferencia. */
function compile(def) {
  fixRoles(def);
  const fields = def.fields.map((f, i) => Object.assign({}, f, { col: colName(i), sp: f.role === 'id' ? false : undefined }));
  const idF = fields.find(f => f.role === 'id');
  const dateF = fields.find(f => f.role === 'date');
  return {
    id: def.id,
    name: def.name || 'Sin nombre',
    long: def.name,
    desc: def.desc,
    color: def.color,
    sheet: (def.sheet || def.name || 'Registro').slice(0, 31),
    fields,
    steps: def.steps && def.steps.length ? def.steps : autoSteps(fields),
    sp: ['Sin datos', 'No corresponde'],
    spFull: 99,
    yes: 'Si', no: 'No',
    idKey: idF ? idF.k : null,
    dateKey: dateF ? dateF.k : null,
    flat: true,
    filePrefix: slug(def.name || 'Registro'),
    def,
  };
}

const colName = (i) => { let s = '', n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'Registro';

/* Pasos de a 6 campos si no los agrupaste vos. Nadie llena 40 campos de un scroll. */
function autoSteps(fields) {
  const out = [];
  for (let i = 0; i < fields.length; i += 6) {
    out.push({ t: `Paso ${out.length + 1}`, ks: fields.slice(i, i + 6).map(f => f.k) });
  }
  return out.length ? out : [{ t: 'Datos', ks: [] }];
}

/* ---------- Avisos de calidad ----------
   No bloquean nada. Pero si armás una base que no vas a poder analizar,
   preferimos decírtelo ahora y no cuando tengas 200 pacientes cargados. */
function auditFolder(def) {
  const w = [];
  const n = def.fields.length;
  if (!n) return w;
  if (!def.fields.some(f => f.role === 'id')) w.push({ t:'error', m:'No hay un campo que identifique al paciente. Agregá uno de texto corto.' });
  if (!def.fields.some(f => f.role === 'date')) w.push({ t:'warn', m:'No hay fecha de cirugía. Sin ella no se puede filtrar ni agrupar por año.' });

  const libres = def.fields.filter(f => f.t === 'text' && f.role !== 'id');
  if (libres.length > 2) w.push({ t:'warn', m:`${libres.length} campos de texto corto. El texto libre no se puede contar ni comparar: si el campo tiene respuestas previsibles, conviene "Una opción".` });

  def.fields.forEach(f => {
    if ((f.t === 'chips' || f.t === 'multi') && (!f.o || f.o.length < 2)) w.push({ t:'error', m:`"${f.l}" no tiene opciones cargadas.` });
    if (f.t === 'calc' && (!f.from || f.from.length < (CALCS[f.calc] || {}).need)) w.push({ t:'error', m:`"${f.l}" es calculado pero le faltan los campos de origen.` });
    if (f.t === 'num' && !f.unit) w.push({ t:'warn', m:`"${f.l}" no tiene unidad. Dentro de dos años nadie va a saber si eran días u horas.` });
  });

  const dup = {};
  def.fields.forEach(f => { const k = f.l.trim().toLowerCase(); dup[k] = (dup[k] || 0) + 1; });
  Object.entries(dup).filter(([, c]) => c > 1).forEach(([k]) => w.push({ t:'warn', m:`Hay más de un campo llamado "${k}".` }));

  const util = def.fields.filter(f => ANALIZABLE.includes(f.t)).length;
  if (n >= 5 && util / n < 0.5) w.push({ t:'warn', m:'Más de la mitad de los campos son texto libre. Esta base va a ser difícil de analizar.' });
  return w;
}
