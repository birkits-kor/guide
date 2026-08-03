const VERSION = 'birkits-dashboard-20260803-hero-month-5';

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        return key.indexOf('birkits-dashboard-') === 0 && key !== VERSION
          ? caches.delete(key)
          : Promise.resolve();
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(new Request(event.request, { cache: 'reload' })));
});
