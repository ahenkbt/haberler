/**
 * Prod deploy sonrası tek seferlik kurumsal site kategori + kapak görseli onarımı.
 * Merkez havuz temizliği için önce purge-corporate-central-pool.ts çalıştırın.
 *
 *   cd goalgo
 *   pnpm exec tsx artifacts/api-server/scripts/vkd-corporate-post-deploy.ts --dry-run
 *   pnpm exec tsx artifacts/api-server/scripts/vkd-corporate-post-deploy.ts
 */
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { repairCorporateSiteLocalManualImages } from "../src/lib/hm-corporate-manual-image-repair.js";
import { repairCorporateSiteLocalNewsCategories } from "../src/lib/hm-corporate-news-policy.js";
import { isHmCorporateLayout, parseHmLayoutJson } from "../src/lib/hm-editor-categories.js";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

const dryRun = Boolean(values["dry-run"]);
const readDb = getNewsDbForRead();
const sites = await readDb
  .select({ id: hmNewsSitesTable.id, slug: hmNewsSitesTable.slug, layoutJson: hmNewsSitesTable.layoutJson })
  .from(hmNewsSitesTable)
  .where(eq(hmNewsSitesTable.active, true));

const corporateSites = sites.filter((site) =>
  isHmCorporateLayout(parseHmLayoutJson(site.layoutJson != null ? String(site.layoutJson) : null)),
);

const repairs: Array<{
  siteId: number;
  siteSlug: string;
  categories: Awaited<ReturnType<typeof repairCorporateSiteLocalNewsCategories>>;
  images: Awaited<ReturnType<typeof repairCorporateSiteLocalManualImages>>;
}> = [];

for (const site of corporateSites) {
  const siteSlug = String(site.slug ?? "").trim().toLowerCase();
  const categories = await repairCorporateSiteLocalNewsCategories({
    siteId: site.id,
    siteSlug,
    dryRun,
  });
  const images = await repairCorporateSiteLocalManualImages({
    siteId: site.id,
    dryRun,
  });
  repairs.push({ siteId: site.id, siteSlug, categories, images });
}

console.log(JSON.stringify({ dryRun, corporateSites: corporateSites.length, repairs }, null, 2));
