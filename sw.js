/* Lumina Academy service worker — app-shell cache for installable PWA.
   API calls (/api/*) always go to network; everything else is cache-first. */
const CACHE = 'lumina-academy-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['./', './index.html', './manifest.webmanifest'])
    ).catch(() => undefined).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never cache API traffic — always hit the network so "AI not connected"
  // states stay honest.
  if (url.pathname.startsWith('/api/')) return;
  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(request).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
