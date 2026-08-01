import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gunzipSync } from "node:zlib";

const compressed = new URL("../public/data/sector.json.gz", import.meta.url);
const target = new URL("../public/data/sector.json", import.meta.url);

if (!existsSync(compressed)) {
  throw new Error("Missing compressed sector dataset: public/data/sector.json.gz");
}

if (!existsSync(target)) {
  mkdirSync(dirname(target.pathname), { recursive: true });
  writeFileSync(target, gunzipSync(readFileSync(compressed)));
  console.log("Prepared public/data/sector.json");
}
