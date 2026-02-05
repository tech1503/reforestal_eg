
/* eslint-disable no-restricted-globals */
const CACHE_NAME = 'reforestal-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Strategy: Stale-While-Revalidate for navigations, Cache-First for images
  const url = new URL(event.request.url);
  
  // Cache First for Images
  if (event.request.destination === 'image') {
      event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchRes) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, fetchRes.clone());
                    return fetchRes;
                });
            });
        })
      );
      return;
  }

  // Network First for API calls (Supabase)
  if (url.hostname.includes('supabase.co')) {
      return; // Let browser handle API caching/headers
  }

  // Stale While Revalidate for others
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
