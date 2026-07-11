#!/usr/bin/env node
/**
 * CLI: insaatfirmalarim.com → map_businesses import
 *
 * Örnek:
 *   node --import tsx ./scripts/scrape-insaatfirmalarim.ts --city antalya --category muteahhitlik-hizmetleri --max-firms 5 --import
 *   node --import tsx ./scripts/scrape-insaatfirmalarim.ts --max-firms 20 --import
 */
import "dotenv/config";
import {
  scrapeInsaatfirmalarimBatch,
  INSAATFIRMALARIM_CATEGORIES,
  INSAATFIRMALARIM_CITIES,
} from "../src/lib/insaatfirmalarim-scraper.js";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function argList(name: string): string[] | undefined {
  const raw = arg(name);
  if (!raw) return undefined;
  const parts = raw.includes(",") ? raw.split(",") : raw.split(/\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const modeRaw = arg("mode");
  const mode = modeRaw === "city" || modeRaw === "category" ? modeRaw : undefined;
  const categorySlug = arg("category");
  const categorySlugs = argList("categories");
  const citySlug = arg("city");
  const maxFirmsRaw = arg("max-firms");
  const maxFirms = maxFirmsRaw ? Math.max(1, parseInt(maxFirmsRaw, 10) || 10) : undefined;
  const maxPages = arg("max-pages") ? Math.max(1, parseInt(arg("max-pages")!, 10) || 2) : undefined;
  const autoImport = hasFlag("import");
  const noGeocode = hasFlag("no-geocode");

  console.log(`[insaatfirmalarim] katalog: ${INSAATFIRMALARIM_CATEGORIES.length} kategori × ${INSAATFIRMALARIM_CITIES.length} il`);
  if (mode) console.log(`  mod: ${mode}`);
  if (categorySlug) console.log(`  kategori filtresi: ${categorySlug}`);
  if (categorySlugs?.length) console.log(`  kategori listesi: ${categorySlugs.join(", ")}`);
  if (citySlug) console.log(`  şehir filtresi: ${citySlug}`);
  console.log(`  max-firms=${maxFirms ?? "sınırsız"}, max-pages=${maxPages ?? "tümü"}, import=${autoImport}, geocode=${!noGeocode}`);

  const batch = await scrapeInsaatfirmalarimBatch({
    mode,
    categorySlug,
    categorySlugs,
    citySlug,
    maxListPagesPerPair: maxPages,
    maxFirms,
    geocode: !noGeocode,
    onProgress: (msg) => console.log(`  … ${msg}`),
  });

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const importErrors: string[] = [];
  let samples = batch.firms.slice(0, 3);

  if (autoImport && batch.firms.length > 0) {
    const { importInsaatfirmalarimFirms } = await import("../src/lib/insaatfirmalarim-import.js");
    const imp = await importInsaatfirmalarimFirms(batch.firms, { maxToImport: maxFirms });
    imported = imp.imported;
    updated = imp.updated;
    skipped = imp.skipped;
    importErrors.push(...imp.errors);
    if (imp.samples.length) samples = imp.samples.slice(0, 3);
  }

  const result = {
    discovered: batch.discovered,
    scraped: batch.firms.length,
    imported,
    updated,
    skipped,
    errors: [...batch.errors, ...importErrors],
    samples,
  };

  console.log("\n=== RAPOR ===");
  console.log(`Keşfedilen URL: ${result.discovered}`);
  console.log(`Çekilen firma: ${result.scraped}`);
  if (autoImport) {
    console.log(`İçe aktarılan (yeni): ${result.imported}`);
    console.log(`Güncellenen (eksik alan): ${result.updated}`);
    console.log(`Atlanan (dedupe/değişiklik yok): ${result.skipped}`);
  }
  if (result.errors.length) {
    console.log(`Hatalar (${result.errors.length}):`);
    for (const e of result.errors.slice(0, 10)) console.log(`  - ${e}`);
  }

  console.log("\n=== ÖRNEK KAYITLAR (max 3) ===");
  for (const s of result.samples.slice(0, 3)) {
    console.log(JSON.stringify({
      name: s.name,
      city: s.city,
      district: s.district,
      phone: s.phone,
      categories: s.categories.slice(0, 3),
      description: s.seoDescription.slice(0, 160) + "…",
      photoUrl: s.photoUrl,
      coords: s.latitude && s.longitude ? [s.latitude, s.longitude] : null,
    }, null, 2));
  }

  process.exit(result.errors.length && result.scraped === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
