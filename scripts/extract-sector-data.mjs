import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve(process.argv[2] ?? "");
const output = resolve(process.argv[3] ?? "public/data/sector.json");

if (!process.argv[2]) {
  throw new Error("Pass the source index.html path.");
}

const html = readFileSync(source, "utf8");
const match = html.match(
  /<script id="DATASET" type="application\/json">([\s\S]*?)<\/script>/,
);

if (!match) {
  throw new Error("DATASET script was not found in the source file.");
}

const raw = JSON.parse(match[1]);
const exactSeen = new Set();
const uniqueRows = raw.R.filter((row) => {
  const key = JSON.stringify(row);
  if (exactSeen.has(key)) return false;
  exactSeen.add(key);
  return true;
});

const payload = {
  version: 1,
  generatedFrom: "كبارى قطاع الرى — السجل الرقمى، build 3.65",
  generatedAt: "2026-08-01",
  duplicateRowsRemoved: raw.R.length - uniqueRows.length,
  A: raw.A,
  E: raw.E,
  C: raw.C,
  G: raw.G,
  T: raw.T,
  U: raw.U,
  M: raw.M,
  N: raw.N,
  R: uniqueRows,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(payload));
console.log(
  JSON.stringify({
    output,
    records: uniqueRows.length,
    administrations: raw.A.length,
    removed: raw.R.length - uniqueRows.length,
  }),
);
