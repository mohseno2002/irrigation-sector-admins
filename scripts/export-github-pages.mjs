import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const clientDir = new URL("../dist/client/", import.meta.url);
const docsDir = new URL("../docs/", import.meta.url);
const docsAssetsDir = new URL("../docs/assets/", import.meta.url);

mkdirSync(docsAssetsDir, { recursive: true });

for (const file of readdirSync(docsAssetsDir)) {
  rmSync(new URL(file, docsAssetsDir));
}

for (const file of readdirSync(new URL("assets/", clientDir))) {
  cpSync(new URL(`assets/${file}`, clientDir), new URL(`assets/${file}`, docsDir));
}

const pageBundle = readdirSync(docsAssetsDir).find((file) => file.startsWith("page-") && file.endsWith(".js"));
if (!pageBundle) throw new Error("GitHub Pages export could not find the page bundle.");

const pagePath = new URL(`assets/${pageBundle}`, docsDir);
let pageSource = readFileSync(pagePath, "utf8");
const fetchPattern = "fetch(`/data/sector.json`).then(e=>{if(!e.ok)throw Error(`تعذر تحميل البيانات`);return e.json()})";
const compressedFetch = "fetch(`./data/sector.json.gz`).then(async e=>{if(!e.ok)throw Error(`تعذر تحميل البيانات`);return JSON.parse(await new Response(e.body.pipeThrough(new DecompressionStream(`gzip`))).text())})";
if (!pageSource.includes(fetchPattern)) throw new Error("Dataset fetch signature changed during export.");
pageSource = pageSource
  .replace(fetchPattern, compressedFetch)
  .replace("navigator.serviceWorker.register(`/sw.js`)", "navigator.serviceWorker.register(`./sw.js`)");
writeFileSync(pagePath, pageSource);

// حزمة العميل تبنى روابط التحميل المسبق بجذر مطلق "/" فتفشل على GitHub Pages
// (المشروع منشور تحت مسار فرعى). نحوّلها لتُحسب من مسار الصفحة نفسها.
const clientBundle = readdirSync(docsAssetsDir).find((file) => file.startsWith("index-") && file.endsWith(".js"));
if (!clientBundle) throw new Error("GitHub Pages export could not find the client bundle.");
const clientPath = new URL(`assets/${clientBundle}`, docsDir);
let clientSource = readFileSync(clientPath, "utf8");
const assetsBasePattern = "function(e){return`/`+e}";
if (!clientSource.includes(assetsBasePattern)) throw new Error("Asset base signature changed during export.");
clientSource = clientSource.replace(assetsBasePattern, "function(e){return new URL(e,document.baseURI).href}");
writeFileSync(clientPath, clientSource);

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("export", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`Static render failed with ${response.status}.`);
const html = (await response.text())
  .replaceAll("/assets/", "./assets/")
  .replaceAll("/pwa-icon.svg", "./pwa-icon.svg")
  .replaceAll("/manifest.webmanifest", "./manifest.webmanifest");
writeFileSync(new URL("index.html", docsDir), html);
writeFileSync(new URL("404.html", docsDir), html);

mkdirSync(new URL("data/", docsDir), { recursive: true });
cpSync(new URL("public/data/sector.json.gz", root), new URL("data/sector.json.gz", docsDir));
cpSync(new URL("public/pwa-icon.svg", root), new URL("pwa-icon.svg", docsDir));
cpSync(new URL("public/favicon.svg", root), new URL("favicon.svg", docsDir));

const manifest = {
  name: "إدارات قطاع الري",
  short_name: "إدارات الري",
  description: "منصة إدارات قطاع الري وهندساتها وترعها ومنشآتها المائية",
  lang: "ar",
  dir: "rtl",
  id: "./",
  start_url: "./?source=pwa",
  scope: "./",
  display: "standalone",
  orientation: "any",
  background_color: "#f4f9fb",
  theme_color: "#073b5c",
  categories: ["business", "productivity", "utilities"],
  icons: [{ src: "./pwa-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  shortcuts: [{ name: "استعراض الإدارات", short_name: "الإدارات", url: "./#administrations" }],
};
writeFileSync(new URL("manifest.webmanifest", docsDir), `${JSON.stringify(manifest, null, 2)}\n`);

const serviceWorker = `const CACHE = "irrigation-sector-admins-github-v10";
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
`;
writeFileSync(new URL("sw.js", docsDir), serviceWorker);
writeFileSync(new URL(".nojekyll", docsDir), "");

console.log(`Prepared GitHub Pages bundle with ${pageBundle}.`);
