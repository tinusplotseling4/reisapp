const CACHE_NAME = "rondreis-noorwegen-2026-v62-dashboard-diary";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=20260723-dashboard-diary",
  "./app.js?v=20260723-dashboard-diary",
  "./manifest.webmanifest",
  "./data/stages.js?v=20260723-dashboard-diary",
  "./data/app-config.public.js",
  "./assets/images/scandinavia-map-hero.png",
  "./assets/images/icons/app-icon.svg",
  "./assets/vendor/pannellum/pannellum.css",
  "./assets/vendor/pannellum/pannellum.js",
  "./assets/vendor/exifr/exifr-lite.umd.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (!sameOrigin) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
