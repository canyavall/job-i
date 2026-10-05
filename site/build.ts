/**
 * Fills the Coverage section from the public registry, at deploy time.
 *
 *   bun site/build.ts [dataDir] [outFile]    (defaults: ../data, site/index.html in place)
 *
 * Reads companies.json, boards.json and dictionary.json (the app's own shapes). A file
 * that is missing leaves its number hidden; no companies.json leaves the whole section
 * hidden and the hero's hand-written number as it is.
 */
import { join } from "node:path";

const dir = process.argv[2] ?? join(import.meta.dir, "../data");
const out = process.argv[3] ?? join(import.meta.dir, "index.html");
let html = await Bun.file(join(import.meta.dir, "index.html")).text();

const read = async (f: string): Promise<any> => {
  try { return await Bun.file(join(dir, f)).json(); } catch { return null; }
};
/** `{version, companies: [...]}`, `{classes: {...}}` or a bare array. */
const rows = (x: any, key: string): any[] =>
  x == null ? [] : Array.isArray(x) ? x : Array.isArray(x[key]) ? x[key] : x[key] ? Object.values(x[key]) : [];
// Wired = a connector that is not switched off; the app counts it the same way.
const wired = (r: any) => r.connector != null && r.connector.enabled !== false;

const [companies, boards, dict] = await Promise.all(
  ["companies.json", "boards.json", "dictionary.json"].map(read));

const n: Record<string, number> = {};
if (companies) {
  const w = rows(companies, "companies").filter(wired);
  n.companies = w.length;
  n.countries = new Set(w.map((r) => r.country).filter(Boolean)).size;
}
if (boards) n.boards = rows(boards, "boards").filter(wired).length;
if (dict) n.classes = rows(dict, "classes").length;

const fill = (key: string, text: string) => {
  html = html.replace(new RegExp(`(<[^>]*data-cov="${key}"[^>]*>)[^<]*<`, "g"), `$1${text}<`);
};
for (const [k, v] of Object.entries(n)) {
  if (!v) continue;
  fill(k, v.toLocaleString("en-US"));
  html = html.replace(`data-stat="${k}" hidden`, `data-stat="${k}"`);
}
if (n.companies) {
  fill("floor", `${Math.floor(n.companies / 100) * 100}+`);
  html = html.replace('id="coverage" class="coverage" hidden', 'id="coverage" class="coverage"');
}
await Bun.write(out, html);
console.log(n.companies ? `coverage: ${JSON.stringify(n)}` : `no ${dir}/companies.json: coverage section left hidden`);
