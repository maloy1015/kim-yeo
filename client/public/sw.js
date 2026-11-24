/* Service worker: oflayn qobiq + tezkor yuklash. API har doim tarmoqdan (oflaynda – keshdan). Video keshlanmaydi. */
const VERSION = 'v1';
const SHELL = 'shell-' + VERSION;
const RUNTIME = 'runtime-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/\.(mp4|webm|mov)$/i.test(url.pathname) || url.pathname.startsWith('/uploads/') || req.headers.has('range')) return; // video: brauzer o'zi

  if (url.pathname.startsWith('/api/')) {
    // tarmoq birinchi, oflaynda oxirgi muvaffaqiyatli javob
    e.respondWith(fetch(req).then(res => {
      if (res.ok && !/\/api\/(auth|admin)/.test(url.pathname)) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || new Response(JSON.stringify({ error: 'Oflayn rejim' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put('/', copy)); return res; }).catch(() => caches.match('/')));
    return;
  }
  // statik fayllar: keshdan, orqada yangilanadi
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); } return res; }).catch(() => cached);
    return cached || net;
  }));
});
