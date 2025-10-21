// sw.js — core offline app shell (v3, network-first per HTML)
const CACHE = 'arch-spiral-core-v3';
const ASSETS = [
  './',
  './index.html',
  './app.js',                 // usa il nome ESATTO del tuo JS
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first per navigazioni/HTML per evitare index.html stantio
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first per asset statici
  e.respondWith(caches.match(req).then(res => res || fetch(req)));
});
