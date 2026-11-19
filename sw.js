// Offline cache: everything the game needs is stored on first visit.
const VERSION = 'rockbottom-v1';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/main.js', './js/state.js', './js/data.js', './js/scene.js', './js/shaders.js', './js/models.js',
  './js/yard.js', './js/noisetex.js', './js/audio.js', './js/ui.js',
  './vendor/three.module.min.js', './vendor/RoomEnvironment.js', './vendor/BufferGeometryUtils.js',
  './fonts/montserrat-latin-500-normal.woff2', './fonts/montserrat-latin-600-normal.woff2',
  './fonts/montserrat-latin-700-normal.woff2', './fonts/montserrat-latin-800-normal.woff2',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('./index.html'))));
});
