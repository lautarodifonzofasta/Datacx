/* ============================================================
   schemas.js — definición de campos y mapeo a las planillas.
   Los textos de encabezado se transcriben LITERALMENTE de los
   archivos originales (mayúsculas, tildes, espacios y erratas).
   ============================================================ */

/* Valores especiales que la base ya usa. Se ofrecen en todos los campos. */
const SP1 = ['Sin datos', 'No corresponde', 'Irresecable', 'Metastásico'];
const SP2 = ['S/D', 'NO CORRESP', 'IRRESECABLE', 'METASTÁSICO'];

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const COMORB = ['HTA','DBT','DLP','TBQ','EPOC','HIV','HIPOT','Ninguna','Otras'];

const DX_PREOP = ['Tumor de páncreas','Tumor de cabeza de páncreas','Tumor de cola de páncreas','Adenocarcinoma de páncreas','Quiste de páncreas','Ampuloma','Tumor Neuroendócrino','IPMN','Tumor duodenal','Metástasis','Cáncer de estómago','Pancreatitis crónica'];

const HISTO = ['Adenocarcinoma ductal','Adenocarcinoma de páncreas','Tumor neuroendócrino','Neoplasia Mucinosa Quística','Neoplasia Mucinosa Papilar Intraductal (IPMN)','Cistoadenoma Seroso Microquístico','Cistoadenoma Mucinoso','Quiste de retención','Pancreatitis crónica','Tumor sólido quístico pseudopapilar','GIST duodenal','Adenocarcinoma duodenal','Adenocarcinoma gástrico','Carcinoma indiferenciado','Metástasis'];

const CIRUGIA = ['DPC preservadora de píloro','DPC clásica','Pancreatectomía distal','Pancreatectomía distal + E','Pancreatectomía distal + E + G','Pancreatectomía distal + E + C','Pancreatectomía total','Irresecable','Sin resección','No se realiza PD'];

/* ============================================================
   CARPETA 1 — PLANILLA OPTIMIZADA (IHPBA)
   Hoja destino: "Base de Datos Cirugía Pancreáti"
   36 columnas (A→AJ). La 36 no tiene título (observaciones).
   ============================================================ */

const C1_SHEET = 'Base de Datos Cirugía Pancreáti';

const C1_FIELDS = [
  { k:'c01', col:'A', h:'ID Paciente', l:'Apellido y Nombre / ID', t:'text', sp:false, hint:'Con "Modo anonimizado" activo se exporta como PANC-0001.' },
  { k:'c02', col:'B', h:'Edad (años)', l:'Edad', t:'num', unit:'años', min:0, max:110 },
  { k:'c03', col:'C', h:'Sexo', l:'Sexo', t:'chips', o:['Femenino','Masculino'] },
  { k:'c04', col:'D', h:'IMC', l:'IMC', t:'num', unit:'kg/m²', dec:1 },
  { k:'c05', col:'E', h:'ASA', l:'ASA', t:'chips', o:['I','II','III','IV'] },
  { k:'c06', col:'F', h:'Comorbilidades (HTA/DBT/OTRAS)', l:'Comorbilidades', t:'multi', o:COMORB, join:'/', free:true, hint:'Se exportan unidas con "/" (ej. HTA/DBT/TBQ).' },
  { k:'c07', col:'G', h:'Diagnóstico Preoperatorio', l:'Diagnóstico preoperatorio', t:'select', o:DX_PREOP, free:true },
  { k:'c08', col:'H', h:'Bilirrubina Total (mg/dl)', l:'Bilirrubina total', t:'chipsnum', o:['Normal','Elevada'], unit:'mg/dl', hint:'Podés agregar el valor si lo tenés.' },
  { k:'c09', col:'I', h:'Drenaje Biliar Preop (Sí/No)', l:'Drenaje biliar preoperatorio', t:'toggle' },
  { k:'c10', col:'J', h:'Tipo de Cirugía', l:'Tipo de cirugía', t:'select', o:CIRUGIA, free:true },
  { k:'c11', col:'K', h:'Fecha de Cirugía', l:'Fecha de cirugía', t:'date' },
  { k:'c12', col:'L', h:'Tiempo Quirúrgico (min)', l:'Tiempo quirúrgico', t:'num', unit:'min', warnMin:30, warnMax:900 },
  { k:'c13', col:'M', h:'Sangrado Estimado (ml)', l:'Sangrado estimado', t:'chipsnum', o:['Bajo','Moderado','Alto'], unit:'ml' },
  { k:'c14', col:'N', h:'Transfusión (Sí/No)', l:'Transfusión', t:'toggle' },
  { k:'c15', col:'O', h:'Textura Pancreática (Blanda/Firme)', l:'Textura pancreática', t:'chips', o:['Blanda','Firme'] },
  { k:'c16', col:'P', h:'Diámetro Wirsung (mm)', l:'Diámetro de Wirsung', t:'chipsnum', o:['Fino','Dilatado','Obliterado'], unit:'mm' },
  { k:'c17', col:'Q', h:'Tipo de Anastomosis Pancreática (PJ/PG)', l:'Anastomosis pancreática', t:'chips', o:['PJ','PG','No requiere'] },
  { k:'c18', col:'R', h:'Uso Somatostatina (Sí/No)', l:'Somatostatina', t:'toggle' },
  { k:'c19', col:'S', h:'Fístula Pancreática ISGPS (No/Bioquímica/B/C)', l:'Fístula pancreática (ISGPS)', t:'chips', o:['No','Bioquímica','B','C'] },
  { k:'c20', col:'T', h:'Retardo Vaciamiento Gástrico ISGPS (No/A/B/C)', l:'Retardo de vaciamiento gástrico', t:'chips', o:['No','A','B','C'] },
  { k:'c21', col:'U', h:'Hemorragia Postoperatoria ISGPS (No/A/B/C)', l:'Hemorragia postoperatoria', t:'chips', o:['No','A','B','C'] },
  { k:'c22', col:'V', h:'Clavien-Dindo', l:'Clavien-Dindo', t:'chips', o:['I','II','IIIa','IIIb','IVa','IVb','V'], hint:'Vacío = sin complicaciones registradas.' },
  { k:'c23', col:'W', h:'Reintervención (Sí/No)', l:'Reintervención', t:'toggle' },
  { k:'c24', col:'X', h:'Días de Internación', l:'Días de internación', t:'num', unit:'días' },
  { k:'c25', col:'Y', h:'Reingreso 30 días (Sí/No)', l:'Reingreso a 30 días', t:'toggle' },
  { k:'c26', col:'Z', h:'Mortalidad 30 días (Sí/No)', l:'Mortalidad a 30 días', t:'toggle' },
  { k:'c27', col:'AA', h:'Mortalidad 90 días (Sí/No)', l:'Mortalidad a 90 días', t:'toggle' },
  { k:'c28', col:'AB', h:'Tipo histológico', l:'Tipo histológico', t:'select', o:HISTO, free:true },
  { k:'c29', col:'AC', h:'Tamaño tumoral (mm)', l:'Tamaño tumoral', t:'num', unit:'mm', suffix:' mm', extra:['Indetectable'], hint:'Se exporta como "30 mm".' },
  { k:'c30', col:'AD', h:'Margen (libre/Comprometido)', l:'Margen', t:'chips', o:['Libre','Comprometido'] },
  { k:'c31', col:'AE', h:'Recaida (si/no)', l:'Recaída', t:'toggle' },
  { k:'c32', col:'AF', h:'Seguimiento (meses)', l:'Seguimiento', t:'num', unit:'meses', suffix:' meses', suffix1:' mes', hint:'Se exporta como "12 meses" / "1 mes".' },
  { k:'c33', col:'AG', h:'Sobrevida a 1 año', l:'Sobrevida a 1 año', t:'chips', o:['Si','No'] },
  { k:'c34', col:'AH', h:'Sobrevida a 3 años', l:'Sobrevida a 3 años', t:'chips', o:['Si','No'] },
  { k:'c35', col:'AI', h:'Sobrevida a 5 años', l:'Sobrevida a 5 años', t:'chips', o:['Si','No'] },
  { k:'c36', col:'AJ', h:'', l:'Observaciones', t:'textarea', sp:false, hint:'Columna sin título en la planilla original.' },
];

const C1_STEPS = [
  { t:'Paciente',       ks:['c01','c02','c03','c04','c05','c06'] },
  { t:'Preoperatorio',  ks:['c07','c08','c09'] },
  { t:'Cirugía',        ks:['c10','c11','c12','c13','c14','c15','c16','c17','c18'] },
  { t:'Complicaciones', ks:['c19','c20','c21','c22','c23'] },
  { t:'Evolución',      ks:['c24','c25','c26','c27'] },
  { t:'Anat. patológica', ks:['c28','c29','c30'] },
  { t:'Seguimiento',    ks:['c31','c32','c33','c34','c35','c36'] },
];

/* ============================================================
   CARPETA 2 — RESULTADOS Y EXPERIENCIA
   Hoja destino: "BASE DE DATOS 2022". Encabezado de 3 filas
   con celdas combinadas; los datos arrancan en la fila 4.
   ============================================================ */

const C2_SHEET = 'BASE DE DATOS 2022';

/* Encabezado literal: [celda, texto]. Todo lo no listado va vacío. */
const C2_HEADER = {
  1: { A:'APELLIDO Y NOMBRE', B:'SEXO', D:'EDAD', E:'ECOG', J:'ASA', K:'IMC', L:'COMORBILIDADES',
       M:'ESTUDIOS', U:'UBICACIÓN TUMORAL', Z:'TAMAÑO (MM)', AA:'COMPROMISO ', AE:'DRENAJE BILIAR',
       AG:'IMPRESIÓN DIAGNÓSTICA', AH:'TREP', AI:'CLASIFICACIÓN ANATÓMICA', AM:'NEO', AN:'FECHA QX',
       AO:'TRATAMIENTO QUIRÚRGICO', AW:'SANGRADO IOP', AX:'TRANS IOP', AY:'TIEMPO/MIN',
       AZ:'AMILASA EN DRENEJE', BB:'COMPLICACIONES POSOPERATORIAS', BS:'ERAS', BT:'INTERNACIÓN (DÍAS)',
       BW:'ANATOMÍA PATOLÓGICA', CE:'REINGRESO', CF:'REINTERVENCIÓN', CG:'ADY', CH:'SEGUIMIENTO (MESES)',
       CI:'ESTADO ACTUAL', CL:'INDICADORES', CN:'OBSERVACIONES', CO:'OTROS' },
  2: { M:'LABORATORIO', Q:'IMAGENES', AA:'VENOSO', AC:'ARTERIAL', AO:'RESECCIÓN', AT:'RECONSTRUCCIÓN',
       AV:'RECONS', BB:'FÍSTULA PANCREÁTICA', BE:'RVG', BH:'HEMORRAGIA POSTOPERATORIA', BK:'FIST BILIAR',
       BL:'DINDO - CLAVIEN', BW:'TIPO HISTOLÓGICO', BX:'TAMAÑO MM', BY:'MARGENES', BZ:'GANGLIOS',
       CA:'INFILTRACIÓN', CC:'DIFERENCIACÓN', CD:'OTRO DX', CG:'QT', CI:'ASINT', CJ:'RECURRENCIA' },
  3: { B:'M', C:'F', E:0, F:1, G:2, H:3, I:4, M:'BT / BD', N:'CEA', O:'CA 19-9', P:'PROTEINA',
       Q:'TC', R:'RMN', S:'USE+B', T:'PET-CT', U:'OTRO', V:'VB', W:'CABEZA', X:'CUERPO', Y:'COLA',
       AA:'<180°', AB:'˃180°', AC:'<180°', AD:'˃180°', AE:'CPRE', AF:'PERCUTÁNEO',
       AI:'RESEC', AJ:'LIMÍTROFE', AK:'LA', AL:'MTS', AM:'QT',
       AO:'DPC+PP', AP:'PC', AQ:'PD', AR:'PD +ESPL', AS:'DPT', AT:'VENOSA', AU:'ARTERIAL',
       AZ:'3° DÍA', BA:'5 DÍA', BB:'A', BC:'B', BD:'C', BE:'A', BF:'B', BG:'C',
       BH:'ENDOSCOPÍA', BI:'ANGIOGRAFÍA', BJ:'REOPERACIÓN',
       BL:'I', BM:'II', BN:'IIIa', BO:'IIIb', BP:'IVa', BQ:'IVb', BR:'V',
       BT:'UTI', BU:'PISO', BV:'TOTAL', CA:'LV', CB:'PN', CJ:'LOCAL', CK:'DISTANCIA', CL:'PLE', CM:'SG' },
};

/* Merges literales del archivo original. */
const C2_MERGES = ['A1:A3','AA1:AD1','AA2:AB2','AC2:AD2','AE1:AF2','AG1:AG3','AH1:AH3','AI1:AL2','AM1:AM2','AN1:AN3','AO1:AV1','AO2:AS2','AT2:AU2','AV2:AV3','AW1:AW3','AX1:AX3','AY1:AY3','AZ1:BA2','B1:C2','BB1:BR1','BB2:BD2','BE2:BG2','BH2:BJ2','BK2:BK3','BL2:BR2','BS1:BS3','BT1:BV2','BW1:CD1','BW2:BW3','BX2:BX3','BY2:BY3','BZ2:BZ3','CA2:CB2','CC2:CC3','CD2:CD3','CE1:CE3','CF1:CF3','CG2:CG3','CH1:CH3','CI1:CK1','CI2:CI3','CJ2:CK2','CL1:CM2','CN1:CN3','CO1:CO3','D1:D3','E1:I2','J1:J3','K1:K3','L1:L3','M1:T1','M2:P2','Q2:T2','U1:Y2','Z1:Z3'];

const C2_LAST_COL = 'CS'; /* 97 columnas */

/* Campos. `map` describe cómo se despliega el control en columnas.
   Tipos de mapeo:
     one   → una sola columna (cols[0])
     pick  → una columna por opción; la elegida recibe `mark` (por defecto 'SI'),
             las demás 'NO'. `blankOthers:true` deja las otras vacías.
     multi → una columna por opción; SI / NO por cada una.
*/
const C2_FIELDS = [
  { k:'nombre', col:'A', l:'Apellido y Nombre / ID', t:'text', sp:false, map:{m:'one', cols:['A']} },
  { k:'sexo', col:'B–C', l:'Sexo', t:'chips', o:['M','F'], map:{m:'pick', cols:['B','C'], mark:'self', blankOthers:true} },
  { k:'edad', col:'D', l:'Edad', t:'num', unit:'años', map:{m:'one', cols:['D']} },
  { k:'ecog', col:'E–I', l:'ECOG', t:'chips', o:['0','1','2','3','4'], map:{m:'pick', cols:['E','F','G','H','I'], mark:'self', blankOthers:true, num:true},
    hint:'Se marca el número en su propia columna; las otras quedan vacías.' },
  { k:'asa', col:'J', l:'ASA', t:'chips', o:['I','II','III','IV'], map:{m:'one', cols:['J']} },
  { k:'imc', col:'K', l:'IMC', t:'num', unit:'kg/m²', dec:1, map:{m:'one', cols:['K']} },
  { k:'comorb', col:'L', l:'Comorbilidades', t:'multi', o:COMORB, join:'/', free:true, map:{m:'one', cols:['L']} },

  { k:'lab_bt', col:'M', l:'Bilirrubina (BT / BD)', t:'chipsnum', o:['Normal','Elevada'], unit:'mg/dl', map:{m:'one', cols:['M']} },
  { k:'lab_cea', col:'N', l:'CEA', t:'text', map:{m:'one', cols:['N']} },
  { k:'lab_ca199', col:'O', l:'CA 19-9', t:'text', map:{m:'one', cols:['O']} },
  { k:'lab_prot', col:'P', l:'Proteínas', t:'text', hint:'La base usa "4.1 G/DL".', map:{m:'one', cols:['P']} },
  { k:'img', col:'Q–T', l:'Imágenes realizadas', t:'multi', o:['TC','RMN','USE+B','PET-CT'], map:{m:'multi', cols:['Q','R','S','T']},
    hint:'Cada estudio va a su columna (SI / NO / S/D).' },
  { k:'ubic', col:'V–Y', l:'Ubicación tumoral', t:'multi', o:['VB','CABEZA','CUERPO','COLA'], map:{m:'multi', cols:['V','W','X','Y'], blankUnsel:true} },
  { k:'ubic_otro', col:'U', l:'Otra ubicación', t:'text', hint:'Texto libre, como en la planilla (DUODENO, ESTÓMAGO…).', map:{m:'one', cols:['U']} },
  { k:'tam', col:'Z', l:'Tamaño', t:'num', unit:'mm', map:{m:'one', cols:['Z']} },
  { k:'venoso', col:'AA–AB', l:'Compromiso venoso', t:'chips', o:['No','<180°','˃180°'], map:{m:'pick', cols:['AA','AB'], skipFirst:true} },
  { k:'arterial', col:'AC–AD', l:'Compromiso arterial', t:'chips', o:['No','<180°','˃180°'], map:{m:'pick', cols:['AC','AD'], skipFirst:true} },
  { k:'drenaje', col:'AE–AF', l:'Drenaje biliar', t:'chips', o:['No','CPRE','PERCUTÁNEO','Ambos'], map:{m:'drenaje', cols:['AE','AF']} },
  { k:'impdx', col:'AG', l:'Impresión diagnóstica', t:'select', o:['TUMOR PANCREÁTICO','TUMOR DE CABEZA DE PÁNCREAS','TUMOR DE CUERPO Y COLA','QUISTE DE PÁNCREAS','AMPULOMA','TUMOR NEUROENDÓCRINO','IPMN','TUMOR DUODENAL','METÁSTASIS','PANCREATITIS CRÓNICA'], free:true, map:{m:'one', cols:['AG']} },
  { k:'trep', col:'AH', l:'TREP', t:'toggle', freeText:true, map:{m:'one', cols:['AH']} },
  { k:'clasif', col:'AI–AL', l:'Clasificación anatómica', t:'chips', o:['RESEC','LIMÍTROFE','LA','MTS'], map:{m:'pick', cols:['AI','AJ','AK','AL']} },
  { k:'neoqt', col:'AM', l:'Neoadyuvancia (QT)', t:'toggle', map:{m:'one', cols:['AM']} },
  { k:'fecha', col:'AN', l:'Fecha de cirugía', t:'date', map:{m:'one', cols:['AN']} },
  { k:'resec', col:'AO–AS', l:'Resección', t:'chips', o:['DPC+PP','PC','PD','PD +ESPL','DPT'], map:{m:'pick', cols:['AO','AP','AQ','AR','AS'], blankOthers:true} },
  { k:'recon_vasc', col:'AT–AU', l:'Reconstrucción vascular', t:'multi', o:['VENOSA','ARTERIAL'], map:{m:'multi', cols:['AT','AU']} },
  { k:'recons', col:'AV', l:'Reconstrucción', t:'select', o:['CHILD','DOBLE ASA','NO REQUIERE'], free:true, map:{m:'one', cols:['AV']} },
  { k:'sangrado', col:'AW', l:'Sangrado intraoperatorio', t:'chipsnum', o:['NO','BAJO','MODERADO','ALTO'], unit:'ml', map:{m:'one', cols:['AW']} },
  { k:'transiop', col:'AX', l:'Transfusión intraoperatoria', t:'toggle', map:{m:'one', cols:['AX']} },
  { k:'tiempo', col:'AY', l:'Tiempo quirúrgico', t:'num', unit:'min', warnMin:30, warnMax:900, map:{m:'one', cols:['AY']} },
  { k:'amilasa3', col:'AZ', l:'Amilasa en drenaje — 3° día', t:'text', map:{m:'one', cols:['AZ']} },
  { k:'amilasa5', col:'BA', l:'Amilasa en drenaje — 5 día', t:'text', map:{m:'one', cols:['BA']} },

  { k:'fistula', col:'BB–BD', l:'Fístula pancreática', t:'chips', o:['No','Bioquímica','A','B','C'], map:{m:'fistula', cols:['BB','BC','BD']},
    hint:'"Bioquímica" se marca en la columna A, igual que en la base actual.' },
  { k:'rvg', col:'BE–BG', l:'Retardo de vaciamiento gástrico', t:'chips', o:['No','A','B','C'], map:{m:'pick', cols:['BE','BF','BG'], skipFirst:true} },
  { k:'hemorragia', col:'BH–BJ', l:'Hemorragia postoperatoria — manejo', t:'multi', o:['ENDOSCOPÍA','ANGIOGRAFÍA','REOPERACIÓN'], map:{m:'multi', cols:['BH','BI','BJ']} },
  { k:'fistbiliar', col:'BK', l:'Fístula biliar', t:'toggle', map:{m:'one', cols:['BK']} },
  { k:'dindo', col:'BL–BR', l:'Dindo-Clavien', t:'chips', o:['I','II','IIIa','IIIb','IVa','IVb','V'], map:{m:'pick', cols:['BL','BM','BN','BO','BP','BQ','BR'], blankOthers:true} },
  { k:'eras', col:'BS', l:'ERAS', t:'toggle', map:{m:'one', cols:['BS']} },
  { k:'uti', col:'BT', l:'Internación en UTI', t:'num', unit:'días', map:{m:'one', cols:['BT']} },
  { k:'piso', col:'BU', l:'Internación en piso', t:'num', unit:'días', map:{m:'one', cols:['BU']} },
  { k:'total', col:'BV', l:'Internación total', t:'num', unit:'días', auto:'uti+piso', map:{m:'one', cols:['BV']}, hint:'Se calcula solo (UTI + PISO). Podés sobrescribirlo.' },

  { k:'histo', col:'BW', l:'Tipo histológico', t:'select', o:HISTO.map(x => x.toUpperCase()), free:true, map:{m:'one', cols:['BW']} },
  { k:'ap_tam', col:'BX', l:'Tamaño', t:'num', unit:'mm', map:{m:'one', cols:['BX']} },
  { k:'margenes', col:'BY', l:'Márgenes', t:'chips', o:['LIBRES','COMPROMETIDOS'], map:{m:'one', cols:['BY']} },
  { k:'ganglios', col:'BZ', l:'Ganglios', t:'text', hint:'Formato n/N, ej. 2/18.', map:{m:'one', cols:['BZ']} },
  { k:'infil', col:'CA–CB', l:'Infiltración', t:'multi', o:['LV','PN'], map:{m:'multi', cols:['CA','CB']} },
  { k:'difer', col:'CC', l:'Diferenciación', t:'chips', o:['BIEN','MODERADAMENTE','POBREMENTE'], map:{m:'one', cols:['CC']} },
  { k:'otrodx', col:'CD', l:'Otro diagnóstico', t:'text', map:{m:'one', cols:['CD']} },

  { k:'reingreso', col:'CE', l:'Reingreso', t:'toggle', map:{m:'one', cols:['CE']} },
  { k:'reinterv', col:'CF', l:'Reintervención', t:'toggle', map:{m:'one', cols:['CF']} },
  { k:'adyqt', col:'CG', l:'Adyuvancia (QT)', t:'toggle', freeText:true, map:{m:'one', cols:['CG']} },
  { k:'seguim', col:'CH', l:'Seguimiento', t:'num', unit:'meses', suffix:' MESES', suffix1:' MES', map:{m:'one', cols:['CH']} },
  { k:'asint', col:'CI', l:'Asintomático', t:'toggle', map:{m:'one', cols:['CI']} },
  { k:'recurr', col:'CJ–CK', l:'Recurrencia', t:'multi', o:['LOCAL','DISTANCIA'], map:{m:'multi', cols:['CJ','CK']} },
  { k:'ple', col:'CL', l:'PLE (período libre de enfermedad)', t:'num', unit:'meses', suffix:' MESES', suffix1:' MES', map:{m:'one', cols:['CL']} },
  { k:'sg', col:'CM', l:'SG (sobrevida global)', t:'num', unit:'meses', suffix:' MESES', suffix1:' MES', map:{m:'one', cols:['CM']} },
  { k:'obs', col:'CN', l:'Observaciones', t:'textarea', sp:false, map:{m:'one', cols:['CN']} },
  { k:'otros1', col:'CO', l:'Otros 1', t:'text', sp:false, map:{m:'one', cols:['CO']} },
  { k:'otros2', col:'CP', l:'Otros 2', t:'text', sp:false, map:{m:'one', cols:['CP']} },
  { k:'otros3', col:'CQ', l:'Otros 3', t:'text', sp:false, map:{m:'one', cols:['CQ']} },
  { k:'otros4', col:'CR', l:'Otros 4', t:'text', sp:false, map:{m:'one', cols:['CR']} },
  { k:'otros5', col:'CS', l:'Otros 5', t:'text', sp:false, map:{m:'one', cols:['CS']} },
];

const C2_STEPS = [
  { t:'Paciente', ks:['nombre','sexo','edad','ecog','asa','imc','comorb'] },
  { t:'Estudios preop.', ks:['lab_bt','lab_cea','lab_ca199','lab_prot','img'] },
  { t:'Tumor y estadificación', ks:['ubic','ubic_otro','tam','venoso','arterial','drenaje','impdx','trep','clasif','neoqt'] },
  { t:'Cirugía', ks:['fecha','resec','recon_vasc','recons','sangrado','transiop','tiempo'] },
  { t:'Postoperatorio', ks:['amilasa3','amilasa5','fistula','rvg','hemorragia','fistbiliar','dindo','eras'] },
  { t:'Internación', ks:['uti','piso','total'] },
  { t:'Anat. patológica', ks:['histo','ap_tam','margenes','ganglios','infil','difer','otrodx'] },
  { t:'Evolución', ks:['reingreso','reinterv','adyqt','seguim','asint','recurr','ple','sg'] },
  { t:'Observaciones', ks:['obs','otros1','otros2','otros3','otros4','otros5'] },
];

/* Campos comunes entre carpetas, para la precarga cruzada. */
const CROSS = [
  { c1:'c01', c2:'nombre' },
  { c1:'c02', c2:'edad' },
  { c1:'c03', c2:'sexo', f12:v => (v === 'Femenino' ? 'F' : v === 'Masculino' ? 'M' : v), f21:v => (v === 'F' ? 'Femenino' : v === 'M' ? 'Masculino' : v) },
  { c1:'c05', c2:'asa' },
  { c1:'c04', c2:'imc' },
  { c1:'c06', c2:'comorb' },
  { c1:'c11', c2:'fecha' },
  { c1:'c12', c2:'tiempo' },
  { c1:'c24', c2:'total' },
  { c1:'c32', c2:'seguim' },
];

/* Las dos carpetas del páncreas son plantillas del sistema: no se editan ni se
   borran, porque su Excel ya alimenta un trabajo en curso. Las que armás vos se
   suman al registro en tiempo de ejecución y de acá para abajo son iguales.

   sp      = valores especiales que ofrece cada campo
   spFull  = primer paso donde "Irresecable" y "Metastásico" tienen sentido
   idKey   = campo que identifica al paciente (búsqueda, anonimizado)
   dateKey = campo que define el año (filtro, orden, separadores)
   yes/no  = cómo escribe los Sí/No esta planilla
   flat    = encabezado de una fila (las del páncreas, no) */
const SCHEMAS = {
  c1: { id:'c1', name:'Planilla optimizada', long:'Planilla Optimizada — formato IHPBA', desc:'36 campos · hoja «Base de Datos Cirugía Pancreáti»',
        sheet:C1_SHEET, fields:C1_FIELDS, steps:C1_STEPS, sp:SP1, spFull:2, idKey:'c01', dateKey:'c11', yes:'Si', no:'No',
        flat:false, sys:true, color:'#31b4e8', colorLight:'#189bd6', filePrefix:'Carpeta1_Planilla_Optimizada' },
  c2: { id:'c2', name:'Resultados y experiencia', long:'Resultados y Experiencia — base extendida', desc:'97 columnas · hoja «BASE DE DATOS 2022»',
        sheet:C2_SHEET, fields:C2_FIELDS, steps:C2_STEPS, sp:SP2, spFull:2, idKey:'nombre', dateKey:'fecha', yes:'SI', no:'NO',
        flat:false, sys:true, color:'#4da3e0', colorLight:'#0272ba', filePrefix:'Carpeta2_Resultados_Experiencia' },
};

const FMAP = {
  c1: Object.fromEntries(C1_FIELDS.map(f => [f.k, f])),
  c2: Object.fromEntries(C2_FIELDS.map(f => [f.k, f])),
};

/* Registra una carpeta propia. `compile()` (library.js) convierte la definición
   guardada en un esquema idéntico al de arriba. */
function registerFolder(def) {
  const SC = compile(def);
  SCHEMAS[SC.id] = SC;
  FMAP[SC.id] = Object.fromEntries(SC.fields.map(f => [f.k, f]));
  return SC;
}
function unregisterFolder(id) { delete SCHEMAS[id]; delete FMAP[id]; }
const userFolders = () => Object.values(SCHEMAS).filter(s => !s.sys);
