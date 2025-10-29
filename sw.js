const CACHE_NAME = 'mishkat-tech-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/project1.html',
  '/project3.html',
  '/project5.html',
  '/project7.html',
  '/assets/app.js',
  '/assets/ai-assistant.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return; // let the network handle it (e.g., AI provider APIs)
  }

  // Cache-first strategy with background update
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
