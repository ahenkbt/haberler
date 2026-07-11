/**
 * PDF metninden Çanakkale şehit JSON paketleri üretir.
 *   node --import tsx ./scripts/gen-canakkale-sehitleri-data.mjs
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseCanakkaleSehitleriText } from "../src/lib/canakkale-sehitleri-parse.ts";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
const OUT_DIR = path.resolve(goalgoRoot, "data/vkd/canakkale-sehitleri");
const PDF_PATH = process.env.CANAKKALE_SEHITLERI_PDF ?? "C:\\Users\\ahenk\\Downloads\\canakkale-sehitleri.pdf";
const CHUNK_SIZE = 2500;
const DATA_SYNC_VERSION = 1;

async function extractPdfText() {
  const cachedTxt = path.resolve(__dirname, "out/canakkale-sehitleri.txt");
  try {
    const txt = readFileSync(cachedTxt, "utf8");
    if (txt.length > 100_000) {
      console.log("[gen-canakkale] önbellek metin kullanılıyor:", cachedTxt);
      return txt;
    }
  } catch {
    /* extract */
  }

  console.log("[gen-canakkale] PDF okunuyor:", PDF_PATH);
  const buf = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  return result.text;
}

function writeChunks(records) {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let batch = 0;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    batch += 1;
    const slice = records.slice(i, i + CHUNK_SIZE);
    writeFileSync(
      path.join(OUT_DIR, `batch-${String(batch).padStart(3, "0")}.json`),
      JSON.stringify({ records: slice }),
    );
  }

  const provinces = new Map();
  for (const r of records) {
    const key = r.province || "BİLİNMİYOR";
    provinces.set(key, (provinces.get(key) ?? 0) + 1);
  }

  writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        dataSyncVersion: DATA_SYNC_VERSION,
        recordCount: records.length,
        batchCount: batch,
        chunkSize: CHUNK_SIZE,
        provinceCount: provinces.size,
        topProvinces: [...provinces.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([province, count]) => ({ province, count })),
      },
      null,
      2,
    ),
  );

  console.log(`[gen-canakkale] ${records.length} kayıt, ${batch} batch → ${OUT_DIR}`);
}

async function main() {
  const text = await extractPdfText();
  const records = parseCanakkaleSehitleriText(text);
  console.log("[gen-canakkale] parse edilen kayıt:", records.length);
  console.log("[gen-canakkale] örnek:", records[0], records[100]);
  writeChunks(records);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
