/* Service worker OMS Enterprise - mode offline.
   Ganti VERSI setiap kali index.html diperbarui agar cache lama dibuang. */
const VERSI = 'oms-v3.0.0';
const INTI = ['./', './index.html', './config.js', './manifest.webmanifest', './ikon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(INTI)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // API POST ke Apps Script tidak di-cache
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (req.mode === 'navigate') {                           // halaman: jaringan dulu, cadangan cache
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone();
      caches.open(VERSI).then((c) => c.put('./index.html', copy));
      return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.pathname.endsWith('config.js')) {               // config: jaringan dulu
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSI).then((x) => x.put(req, c)); return r; })
      .catch(() => caches.match(req)));
    return;
  }
  // aset lain (font, ubin peta): cache dulu, lalu jaringan
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|tile\.openstreetmap\.org/.test(url.hostname))) {
      const c = r.clone();
      caches.open(VERSI).then((x) => x.put(req, c));
    }
    return r;
  }).catch(() => hit)));
});
