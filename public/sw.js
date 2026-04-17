const CACHE_NAME = 'as-apt-v3';

self.addEventListener('install', (event) => {
  // Activate the new SW immediately, don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete ALL old caches (any name that isn't current)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept cross-origin or non-http(s) requests
  if (url.origin !== self.location.origin) return;

  // Never cache dev/build tool assets
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('.hot-update') ||
    url.searchParams.has('t')
  ) {
    return;
  }

  // ALWAYS network-first for navigations and JS/CSS bundles to avoid stale-asset blank pages
  const isNavigation = event.request.mode === 'navigate';
  const isScriptOrStyle =
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html');

  if (isNavigation || isScriptOrStyle) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for safe static assets (images, fonts, etc.)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});
