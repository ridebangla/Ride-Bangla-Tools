/* Ride Bangla Tools — service worker (offline-capable PWA)
   Pages + JS/CSS are NETWORK-FIRST so visitors always see the newest site;
   cached copies are only a fallback when offline. Images stay cache-first
   with a background refresh so the site stays fast. */
var CACHE = 'rb-tools-v4';
var CORE = [
  '/',
  '/index.html',
  '/assets/manifest.webmanifest',
  '/assets/main.js',
  '/assets/ai.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

function putInCache(req, res) {
  if (res && (res.status === 200 || res.type === 'opaque')) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
  }
  return res;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  var path = url.pathname;
  var isHTML = e.request.mode === 'navigate' || path === '/' || /\.html?(\?|$)/.test(path);
  var isCode = /\.(js|css)(\?|$)/.test(path);

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      // NETWORK-FIRST for pages, JS, CSS — the visitor must never see a stale page.
      if (isHTML || isCode) {
        return fetch(e.request)
          .then(function (res) { return putInCache(e.request, res); })
          .catch(function () {
            return hit || caches.match(isHTML ? '/index.html' : e.request, { ignoreSearch: true });
          });
      }
      // STALE-WHILE-REVALIDATE for images/fonts: fast first paint, refresh behind.
      var net = fetch(e.request)
        .then(function (res) { return putInCache(e.request, res); })
        .catch(function () { return hit; });
      return hit || net;
    })
  );
});
