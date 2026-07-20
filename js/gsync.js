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

/* ---------- el botón: elige el método según cómo se vinculó ---------- */
async function gsSync(folderId) {
  if (!navigator.onLine) throw new Error('Sin conexión. La sincronización necesita señal; los datos locales están a salvo.');
  const gs = SCHEMAS[folderId].def.gs;
  const script = !!(gs && gs.script);
  const bajados = script ? await scriptPull(folderId) : await gsPull(folderId);
  const res = await mergeInto(folderId, bajados);
  const subidos = script ? await scriptPush(folderId) : await gsPush(folderId);
  return Object.assign(res, { subidos });
}
