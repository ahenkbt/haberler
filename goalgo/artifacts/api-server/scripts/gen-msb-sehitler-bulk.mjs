/**
 * Mehmetçik şehitler HTML dump → goalgo/data/vkd/msb-sehitler-bulk.json
 *   node --import tsx ./scripts/gen-msb-sehitler-bulk.mjs
 *   SEHITLERIMIZ_HTML=C:\path\şehitlerimiz.txt node ...
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMehmetcikSehitCardsFromHtml } from "../src/lib/mehmetcik-sehitler-parse.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
const OUT_PATH = path.resolve(goalgoRoot, "data/vkd/msb-sehitler-bulk.json");
const BULK_VERSION = 1;

const defaultHtmlPath = "C:\\Users\\ahenk\\OneDrive\\Belgeler\\şehitlerimiz.txt";
const htmlPath = process.env.SEHITLERIMIZ_HTML?.trim() || defaultHtmlPath;

const html = readFileSync(htmlPath, "utf8");
const records = parseMehmetcikSehitCardsFromHtml(html);

const payload = {
  version: BULK_VERSION,
  source: "mehmetcik.org.tr/sehitlerimiz",
  sourceUrl: "https://www.mehmetcik.org.tr/sehitlerimiz",
  generatedAt: new Date().toISOString(),
  recordCount: records.length,
  records,
};

mkdirSync(path.dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(payload));
console.log(`[gen-msb-sehitler] ${records.length} kayıt → ${OUT_PATH}`);
