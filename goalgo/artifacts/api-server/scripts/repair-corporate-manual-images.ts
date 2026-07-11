/**
 * Kurumsal site-yerel WXR/manuel haberlerde yanlış rss-* kapak görsellerini otomatik onarır.
 * Eski read-path zenginleştirme hatası DB'ye yazılmış yanlış imageUrl'leri içerik HTML'den kurtarır.
 *
 * Yerel:
 *   cd goalgo
 *   pnpm --filter @workspace/api-server repair:corporate-manual-images -- --dry-run
 *   pnpm --filter @workspace/api-server repair:corporate-manual-images -- --site-slug=vatankahramanlari
 *
 * Render shell (DATABASE_URL ortam değişkeninden; .env gerekmez):
 *   cd /app/artifacts/api-server && node --import tsx ./scripts/repair-corporate-manual-images.ts --dry-run --site-slug=vatankahramanlari
 *   cd /app && pnpm --filter @workspace/api-server repair:corporate-manual-images -- --dry-run --site-slug=vatankahramanlari
 */
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { isHmCorporateLayout, parseHmLayoutJson } from "../src/lib/hm-editor-categories.js";
import { repairAllCorporateSiteLocalManualImages } from "../src/lib/hm-corporate-manual-image-repair.js";

const { values, positionals } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    "site-id": { type: "string" },
    "site-slug": { type: "string" },
    limit: { type: "string", default: "500" },
  },
  allowPositionals: true,
});

function argFromPositionals(flag: string): string | null {
  const idx = positionals.indexOf(flag);
  if (idx < 0 || idx + 1 >= positionals.length) return null;
  return positionals[idx + 1] ?? null;
}

const dryRun = Boolean(values["dry-run"]);
const siteIdRaw = values["site-id"] ?? argFromPositionals("--site-id");
const siteSlugRaw = values["site-slug"] ?? argFromPositionals("--site-slug");
const limitPerSite = Math.min(2000, Math.max(1, Number(values.limit) || 500));

const readDb = getNewsDbForRead();
let siteIds: number[] = [];

if (siteIdRaw) {
  const id = Number(siteIdRaw);
  if (!Number.isFinite(id) || id <= 0) {
    console.error("Geçersiz --site-id");
    process.exit(1);
  }
  siteIds = [id];
} else if (siteSlugRaw) {
  const slug = String(siteSlugRaw).trim().toLowerCase();
  const [site] = await readDb
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, slug))
    .limit(1);
  if (!site) {
    console.error(`Site bulunamadı: ${slug}`);
    process.exit(1);
  }
  siteIds = [site.id];
} else {
  const sites = await readDb
    .select({ id: hmNewsSitesTable.id, layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true));
  siteIds = sites
    .filter((site) => isHmCorporateLayout(parseHmLayoutJson(site.layoutJson != null ? String(site.layoutJson) : null)))
    .map((site) => site.id);
}

const repairs = await repairAllCorporateSiteLocalManualImages({
  siteIds,
  dryRun,
  limitPerSite,
});

const totalRepaired = repairs.reduce((sum, r) => sum + r.result.repaired, 0);
console.log(JSON.stringify({ dryRun, sites: siteIds.length, totalRepaired, repairs }, null, 2));

if (dryRun && totalRepaired > 0) {
  console.log("\nUygulamak için --dry-run olmadan tekrar çalıştırın.");
}
