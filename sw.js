const CACHE = "irrigation-sector-admins-github-v12";
const ROOT = new URL("./", self.registration.scope).href;
const CORE = ["./", "./data/sector.json.gz", "./manifest.webmanifest", "./pwa-icon.svg"]
  .map((path) => new URL(path, ROOT).href);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request)
      .then((response) => {
        caches.open(CACHE).then((cache) => cache.put(ROOT, response.clone()));
        return response;
      })
      .catch(() => caches.match(ROOT)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) =>
    cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    })
  ));
});
