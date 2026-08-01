const CACHE_PREFIX = "irrigation-sector-admins-";
const CACHE = "irrigation-sector-admins-sector-platform-8";
const ROOT = new URL("./", self.registration.scope);
const CORE = [
  new URL("./index.html", ROOT).href,
  new URL("./manifest.webmanifest", ROOT).href,
  new URL("./pwa-icon.svg", ROOT).href,
  new URL("./sync-client.js", ROOT).href,
  new URL("./platform-modules.js", ROOT).href,
  new URL("./data/sector.json.gz", ROOT).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return caches.match(new URL("./index.html", ROOT).href);
        }
        return Response.error();
      }))
  );
});
