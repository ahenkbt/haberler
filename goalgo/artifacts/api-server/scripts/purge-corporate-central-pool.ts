/**
 * CLI: Kurumsal HM sitelerinden merkez Yekpare havuzuna (news.site_id NULL) sızmış
 * yekpare-hm-sync / yekpare-hm-pool kayıtlarını temizler.
 *
 * Prod deploy sonrası (Render Manual Deploy + bu PR merge):
 *   1. cd goalgo && pnpm exec tsx artifacts/api-server/scripts/purge-corporate-central-pool.ts --dry-run
 *   2. cd goalgo && pnpm exec tsx artifacts/api-server/scripts/purge-corporate-central-pool.ts
 *   3. VKD editör JWT ile: POST /api/hm/editor/news/repair-categories (belgeler → dernegimiz)
 *      Kapak görselleri: POST /api/hm/editor/news/repair-images (?dryRun=1 önizleme)
 *      İsteğe bağlı dry-run: ?dryRun=1
 *
 *   Tam otomasyon (kategori + kapak): pnpm exec tsx artifacts/api-server/scripts/vkd-corporate-post-deploy.ts
 *   Yalnızca kapak onarımı: pnpm --filter @workspace/api-server repair:corporate-manual-images
 */
import { parseArgs } from "node:util";
import { and, inArray, isNull, or, sql } from "drizzle-orm";
import { dualWriteDelete, getNewsDbForRead, newsTable } from "@workspace/db";
import {
  clearCorporateHmSiteIdsCache,
  loadCorporateHmSiteIds,
} from "../src/lib/hm-yekpare-news-sync.js";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

const dryRun = Boolean(values["dry-run"]);

clearCorporateHmSiteIdsCache();
const corporateSiteIds = await loadCorporateHmSiteIds();
const ids = [...corporateSiteIds];

if (!ids.length) {
  console.log(JSON.stringify({ corporateSiteIds: [], deleted: 0, dryRun }, null, 2));
  process.exit(0);
}

const patterns = ids.flatMap((siteId) => [
  sql`${newsTable.rssSourceUrl} LIKE ${`yekpare-hm-sync:${siteId}:%`}`,
  sql`${newsTable.rssSourceUrl} LIKE ${`yekpare-hm-pool:${siteId}:%`}`,
]);

const where = and(isNull(newsTable.siteId), or(...patterns)!);
const readDb = getNewsDbForRead();
const rows = await readDb
  .select({
    id: newsTable.id,
    title: newsTable.title,
    rssSourceUrl: newsTable.rssSourceUrl,
  })
  .from(newsTable)
  .where(where)
  .limit(5000);

console.log(
  JSON.stringify(
    {
      dryRun,
      corporateSiteIds: ids,
      matched: rows.length,
      sample: rows.slice(0, 20),
    },
    null,
    2,
  ),
);

if (!dryRun && rows.length > 0) {
  const rowIds = rows.map((row) => row.id);
  await dualWriteDelete(newsTable, and(isNull(newsTable.siteId), inArray(newsTable.id, rowIds)));
  console.log(JSON.stringify({ deleted: rowIds.length }, null, 2));
}
