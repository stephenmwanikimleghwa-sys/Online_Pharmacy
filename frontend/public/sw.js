const CACHE_NAME = 'pharmacy-aggregator-v5';
// API reads live in a separate cache so we can wipe them on logout without
// dropping the app shell. See CLEAR_API_CACHE message handler below.
const API_CACHE_NAME = 'pharmacy-api-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
];

const isCacheableRequest = (request) => {
  try {
    const url = new URL(request.url);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isNavigationRequest = (request) => {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  );
};

// API requests are cross-origin in production (backend is a separate host), so
// we match on the pathname prefix rather than same-origin. Only GETs are ever
// cached — never a mutation.
const isApiReadRequest = (request) => {
  if (request.method !== 'GET') return false;
  try {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
};

const serveSpaShell = () =>
  caches.match('/index.html').then((cached) => cached || fetch('/index.html'));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Keep the current shell + API caches; drop older versions.
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }).then(() => self.clients.claim()),
  );
});

// Allow the app to purge cached API reads (e.g. on logout, so the next user on
// a shared pharmacy machine can't see the previous user's cached data).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_API_CACHE') {
    event.waitUntil(caches.delete(API_CACHE_NAME));
  }
});

// Stale-while-revalidate for API reads: serve the cached copy instantly (so a
// slow or high-latency connection still paints immediately) while refreshing in
// the background. Only 200 responses are stored.
const handleApiRead = (request) =>
  caches.open(API_CACHE_NAME).then((cache) =>
    cache.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse?.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      // If we have a cached copy, return it now and let the fetch update cache.
      return cachedResponse || networkFetch;
    }),
  );

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (isApiReadRequest(request)) {
    event.respondWith(handleApiRead(request));
    return;
  }

  const url = new URL(request.url);

  // Non-API cross-origin GETs (e.g. CDN assets on another host) are left alone.
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse?.status === 404) {
            return serveSpaShell();
          }
          if (networkResponse?.ok && isCacheableRequest(request)) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => serveSpaShell()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse?.ok && isCacheableRequest(request)) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || new Response('Offline', { status: 504, statusText: 'Offline' }));
      return cachedResponse || fetchPromise;
    }),
  );
});
