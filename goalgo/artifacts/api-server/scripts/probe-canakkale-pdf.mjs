import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const pdfPath = "C:\\Users\\ahenk\\Downloads\\canakkale-sehitleri.pdf";
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "out");
mkdirSync(outDir, { recursive: true });

const buf = readFileSync(pdfPath);
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText();
console.log("pages", textResult.total, "textLen", textResult.text.length);
writeFileSync(path.join(outDir, "canakkale-sehitleri.txt"), textResult.text, "utf8");

try {
  const tableResult = await parser.getTable();
  writeFileSync(path.join(outDir, "canakkale-sehitleri-tables.json"), JSON.stringify(tableResult, null, 2));
  console.log("tables pages", tableResult.pages?.length ?? 0);
} catch (e) {
  console.log("getTable failed", e instanceof Error ? e.message : e);
}

console.log("--- first 5000 chars ---");
console.log(textResult.text.slice(0, 5000));
console.log("--- around 100k ---");
console.log(textResult.text.slice(100000, 105000));
