#!/usr/bin/env node
/**
 * CLI: yatport.com → map_businesses import
 *
 * Örnek:
 *   node --import tsx ./scripts/scrape-yatport.ts --max-boats 2 --import
 *   node --import tsx ./scripts/scrape-yatport.ts --mode district --district bebek --max-boats 2 --import
 */
import "dotenv/config";
import { scrapeYatportBatch } from "../src/lib/yatport-scraper.js";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const modeRaw = arg("mode");
  const mode =
    modeRaw === "listing" || modeRaw === "district" || modeRaw === "boatType" ? modeRaw : "listing";
  const listSlug = arg("list-slug") ?? "tekne-kiralama";
  const districtSlug = arg("district");
  const boatTypeSlug = arg("boat-type") ?? "motoryat-kiralama";
  const maxBoatsRaw = arg("max-boats");
  const maxBoats = maxBoatsRaw ? Math.max(1, parseInt(maxBoatsRaw, 10) || 2) : 2;
  const autoImport = hasFlag("import");
  const downloadImages = !hasFlag("no-images");

  console.log(`[yatport] mod=${mode}, max-boats=${maxBoats}, import=${autoImport}, images=${downloadImages}`);
  if (mode === "listing") console.log(`  listSlug=${listSlug}`);
  if (mode === "district") console.log(`  district=${districtSlug ?? "bebek"}`);
  if (mode === "boatType") console.log(`  boatType=${boatTypeSlug}`);

  const batch = await scrapeYatportBatch({
    mode,
    listSlug,
    districtSlug: districtSlug ?? (mode === "district" ? "bebek" : undefined),
    boatTypeSlug: mode === "boatType" ? boatTypeSlug : undefined,
    maxBoats,
    onProgress: (msg) => console.log(`  … ${msg}`),
  });

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const importErrors: string[] = [];

  if (autoImport && batch.boats.length > 0) {
    const { importYatportBoats } = await import("../src/lib/yatport-import.js");
    const imp = await importYatportBoats(batch.boats, { downloadImages, maxToImport: maxBoats });
    imported = imp.imported;
    updated = imp.updated;
    skipped = imp.skipped;
    importErrors.push(...imp.errors);
  }

  console.log("\n[yatport] sonuç:");
  console.log(`  keşfedilen: ${batch.discovered}`);
  console.log(`  kazınan: ${batch.boats.length}`);
  console.log(`  liste sayfası: ${batch.listPages ?? "?"}`);
  if (autoImport) {
    console.log(`  eklenen: ${imported}, güncellenen: ${updated}, atlanan: ${skipped}`);
  }
  if (batch.errors.length) {
    console.log(`  hatalar (${batch.errors.length}):`);
    for (const e of batch.errors.slice(0, 5)) console.log(`    - ${e}`);
  }
  if (importErrors.length) {
    console.log(`  import hataları (${importErrors.length}):`);
    for (const e of importErrors.slice(0, 5)) console.log(`    - ${e}`);
  }

  for (const boat of batch.boats.slice(0, 3)) {
    console.log(`\n  • ${boat.name} (${boat.district ?? boat.city ?? "—"})`);
    console.log(`    tel: ${boat.phone ?? "—"} · imkan: ${boat.imkanlar.length} · güvenlik: ${boat.guvenlikEkipmanlari.length}`);
    console.log(`    şart: ${boat.kullanimSartlari.length} · foto: ${boat.photoUrls.length}`);
    console.log(`    url: ${boat.sourceUrl}`);
  }

  if (batch.boats.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[yatport] fatal:", err);
  process.exitCode = 1;
});
