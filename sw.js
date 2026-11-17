// Nira Ora – service worker (hors ligne). Changer VERSION à chaque mise à jour.
const VERSION = 'nira-v7.16-demo';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'data.js', 'manifest.json', 'icon-192.png',
  'lib/three.module.min.js', 'lib/jsm/loaders/GLTFLoader.js', 'lib/jsm/utils/BufferGeometryUtils.js', 'lib/jsm/environments/RoomEnvironment.js',
  'tex/skin_n.png', 'models/meta.json', 'models/care_meta.json', 'models/instruments.glb', 'models/dressings.glb'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== VERSION).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); return res; }))));
