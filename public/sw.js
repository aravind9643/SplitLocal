/*
 * Minimal offline service worker for SplitLocal.
 *
 * The app is entirely local — no API calls, all data in localStorage — so
 * caching the app shell is enough to make it work with no network at all.
 *
 * Strategy:
 *   navigations  -> network first, fall back to the cached shell (so a new
 *                   deploy is picked up when online, but offline still works)
 *   static assets-> cache first (JS/fonts are content-hashed by Metro, so a
 *                   changed build fetches a new URL rather than a stale hit)
 *
 * CACHE is bumped on each deploy by changing the version string; old caches
 * are deleted on activate.
 */
/* __BUILD_MANIFEST__ — scripts/build-web.mjs replaces this block with the
   real cache version and asset list from the finished export. The values
   below are only the dev fallback for serving public/ directly. */
const CACHE = 'splitlocal-dev';
const PRECACHE = ['/', '/index.html', '/manifest.json', '/favicon.ico'];
/* __END_BUILD_MANIFEST__ */

const SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Individually, so one 404 cannot fail the whole install.
      await Promise.all(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {}))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  // Single-page app: every navigation resolves to the shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(SHELL, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(SHELL)) || (await cache.match('/')) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: serve from cache, populate on first hit.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return hit || Response.error();
      }
    })()
  );
});
