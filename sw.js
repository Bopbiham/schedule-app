/* ─── SERVICE WORKER ─── Thời Gian Biểu PWA */
const CACHE = 'tgb-v1';
const SHELL = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

// ── Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// ── Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for Firebase/Google, cache-first for app shell
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Pass through Firebase, Google APIs, fonts — let Firebase SDK handle offline
  if (url.includes('firebaseio.com') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('google.com/identitytoolkit')) {
    return; // Default browser behavior
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html')); // Offline fallback
    })
  );
});

// ── Background sync (future: retry failed cloud writes)
self.addEventListener('sync', e => {
  if (e.tag === 'sync-schedule') {
    // Notify all clients to retry sync
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'RETRY_SYNC' }))
    );
  }
});
