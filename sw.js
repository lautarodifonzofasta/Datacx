/* sw.js — caché para funcionar sin señal, SIN quedarse pegado en versiones viejas.
   Estrategia:
   - Navegación (abrir la app): red primero, caché si no hay señal.
     Así, cada vez que subís una versión nueva a la misma URL, los teléfonos
     la reciben en la próxima apertura con señal — sin reinstalar nada.
   - Resto de archivos: caché primero con actualización en segundo plano. */
const CACHE = 'datacx-v2';
const ASSETS = [
  './', './index.html', './css/styles.css',
  './js/library.js', './js/schemas.js', './js/db.js', './js/xlsxio.js',
  './js/app.js', './js/builder.js', './js/merge.js', './js/backup.js', './js/gsync.js',
  './vendor/lz-string.min.js', './vendor/dexie.min.js', './vendor/xlsx.full.min.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/logo.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   /* Google y demás: directo a la red */

  /* Abrir la app: red primero (trae la versión nueva), caché sin señal. */
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Resto: responde el caché ya (rápido, offline) y se actualiza atrás. */
  e.respondWith(
    caches.match(e.request).then(hit => {
      const refresh = fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
