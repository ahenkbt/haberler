/** v15: editor session verify remount loop fix — force fresh shell assets. */
const CACHE_NAME = 'ahenkpress-v15-editor-auth';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg'
];

function isHashedViteAsset(pathname) {
  return pathname.startsWith('/assets/') && /\.(js|css)(\?|$)/i.test(pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/editor') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Hash'li JS/CSS: yalnızca ağ — eski chunk önbelleği beyaz ekran üretir.
  if (isHashedViteAsset(url.pathname) && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchAndCache = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && event.request.method === 'GET') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => null);
      return cached || fetchAndCache;
    })
  );
});
