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
const serviceWorkerPattern = "navigator.serviceWorker.register(`/sw.js`)";
if (!pageSource.includes(fetchPattern)) throw new Error("Dataset fetch signature changed during export.");
if (!pageSource.includes(serviceWorkerPattern)) throw new Error("Service worker signature changed during export.");
pageSource = pageSource
  .replace(fetchPattern, compressedFetch)
  .replace(serviceWorkerPattern, "navigator.serviceWorker.register(`./sw.js?v=13`,{updateViaCache:`none`})");
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
const githubCacheGuard = `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<script>if("caches"in self){caches.keys().then(function(keys){return Promise.all(keys.filter(function(key){return key.indexOf("irrigation-sector-admins-")===0}).map(function(key){return caches.delete(key)}))})}</script>`;
const html = (await response.text())
  .replaceAll("/assets/", "./assets/")
  .replaceAll("/pwa-icon.svg", "./pwa-icon.svg")
  .replaceAll("/manifest.webmanifest", "./manifest.webmanifest")
  .replace("</head>", `${githubCacheGuard}</head>`);
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

const serviceWorker = `const CACHE_PREFIX = "irrigation-sector-admins-";
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});
`;
writeFileSync(new URL("sw.js", docsDir), serviceWorker);
writeFileSync(new URL(".nojekyll", docsDir), "");

console.log(`Prepared GitHub Pages bundle with ${pageBundle}.`);
