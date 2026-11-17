/* ============================================================
   Data cx — script de la planilla (método gratis)

   Funciona de las DOS maneras:
   A) Pegado adentro de la planilla (Extensiones → Apps Script).
   B) Como proyecto suelto en https://script.google.com
      → en ese caso, completá ID_PLANILLA acá abajo.

   Pasos comunes:
   1) Cambiá la CLAVE por una propia del servicio.
   2) (Solo camino B) Pegá el ID de la planilla: es la parte larga
      del link, entre /d/ y /edit. Ejemplo:
      docs.google.com/spreadsheets/d/ESTE-CHURRO-DE-LETRAS/edit
   3) Implementar → Nueva implementación → "Aplicación web"
      → Ejecutar como: "Yo" → Acceso: "Cualquier persona"
      → Implementar → copiar la URL que termina en /exec.
   4) Esa URL + la clave van en Data cx.
   ============================================================ */

var CLAVE = 'CAMBIAME-por-una-clave-del-servicio';
var ID_PLANILLA = '';   // ← solo si creaste el script por fuera de la planilla

function doPost(e) {
  var p;
  try { p = JSON.parse(e.postData.contents); } catch (err) { return out({ error: 'json' }); }
  if (p.token !== CLAVE) return out({ error: 'token' });

  var ss = ID_PLANILLA
    ? SpreadsheetApp.openById(ID_PLANILLA)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return out({ error: 'No encuentro la planilla. ¿Completaste ID_PLANILLA?' });

  /* Cada carpeta de Data cx vive en su propia pestaña de este libro.
     Si la pestaña no existe todavía, se crea sola. */
  var hoja = p.hoja
    ? (ss.getSheetByName(p.hoja) || ss.insertSheet(p.hoja))
    : ss.getSheets()[0];

  if (p.action === 'pull') {
    return out({ values: hoja.getDataRange().getValues() });
  }

  if (p.action === 'push') {
    var rows = p.rows || [];
    var ancho = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    rows = rows.map(function (r) { while (r.length < ancho) r.push(''); return r; });
    hoja.clearContents();
    if (rows.length) hoja.getRange(1, 1, rows.length, ancho).setValues(rows);
    return out({ ok: true, n: rows.length - 1 });
  }

  return out({ error: 'accion desconocida' });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
