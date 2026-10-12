// Service worker Allure — fonctionnement hors-ligne.
// Fichiers de l'app : réseau d'abord, en vérifiant auprès du serveur à chaque fois (cache: 'no-cache') pour que les mises à jour
// arrivent tout de suite, sans attendre l'expiration du cache du navigateur ; cache de l'app en secours hors connexion.
// Librairies (vendor/) et polices : cache d'abord.
const CACHE = 'allure-v22';
const CORE = [
  './', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest',
  'vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'vendor/leaflet.js', 'vendor/leaflet.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  const cacheFirst = isFont || url.pathname.includes('/vendor/');
  if (cacheFirst) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
