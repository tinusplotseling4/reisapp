const CACHE_NAME = "rondreis-noorwegen-2026-v84-egress-photo-compress";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=20260801-egress-photo-compress",
  "./app.js?v=20260801-egress-photo-compress",
  "./manifest.webmanifest",
  "./data/stages.js?v=20260801-egress-photo-compress",
  "./data/app-config.public.js",
  "./assets/vendor/supabase/supabase.min.js?v=20260724-lotte-offline",
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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windowClients) => {
      const existingClient = windowClients[0];
      if (existingClient) {
        existingClient.postMessage({ type: "OPEN_DIARY" });
        return existingClient.focus();
      }
      return clients.openWindow("./?openDiary=1");
    })
  );
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
