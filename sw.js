// Portal de Tienda PJ: modo sin conexión.
// La página se busca primero en internet (para recibir siempre la última versión) y, si no hay señal, se usa la copia guardada.
const CACHE = 'portal-tienda-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // página del portal: primero internet, si falla la copia guardada
  if (req.mode === 'navigate' && url.origin === location.origin && url.pathname.startsWith(new URL('./', location).pathname)) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  // librerías y fuentes: se guardan la primera vez y luego se usan sin internet
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
    return;
  }
  // archivos propios del portal (íconos, manifiesto)
  if (url.origin === location.origin && CORE.some(p => url.pathname.endsWith(p.replace('./', '/')) && p !== './')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
