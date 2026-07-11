import { desc, inArray } from "drizzle-orm";
import {
  db,
  dualWriteUpdate,
  getNewsDbForRead,
  newsTable,
  portalRssItemsTable,
} from "@workspace/db";
import {
  buildSporToGundemCategoryIdMap,
  findAllCategoryIdsByCanonicalSlug,
  loadHmSiteSlugPrefixes,
  portalCategorySlugMatches,
} from "./portal-category-slug.js";
import { isMisclassifiedSporItem } from "./rss-spor-category-guard.js";
import { invalidateNewsPageBundleCache } from "./news-page-bundle.js";
import { invalidateNewsContextCache } from "./news-context.js";

const TARGET_SLUG = "gundem";

export async function recategorizeMisclassifiedSporBatch(options?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  scannedNews: number;
  updatedNews: number;
  scannedRss: number;
  updatedRss: number;
  dryRun: boolean;
}> {
  const limit = Math.min(10_000, Math.max(1, options?.limit ?? 2000));
  const dryRun = options?.dryRun === true;

  const sporCategoryIds = await findAllCategoryIdsByCanonicalSlug("spor");
  if (sporCategoryIds.length === 0) {
    return { scannedNews: 0, updatedNews: 0, scannedRss: 0, updatedRss: 0, dryRun };
  }

  const defaultGundemId = (await findAllCategoryIdsByCanonicalSlug(TARGET_SLUG))[0];
  if (defaultGundemId == null) {
    throw new Error("gundem kategori bulunamadı");
  }
  const sporToGundem = await buildSporToGundemCategoryIdMap(sporCategoryIds);

  const newsRows = await getNewsDbForRead()
    .select({
      id: newsTable.id,
      categoryId: newsTable.categoryId,
      title: newsTable.title,
      spot: newsTable.spot,
      content: newsTable.content,
      slug: newsTable.slug,
      siteId: newsTable.siteId,
    })
    .from(newsTable)
    .where(inArray(newsTable.categoryId, sporCategoryIds))
    .orderBy(desc(newsTable.id))
    .limit(limit);

  const newsByTargetGundem = new Map<number, number[]>();
  for (const row of newsRows) {
    if (!isMisclassifiedSporItem("spor", row.title, row.spot, row.content)) continue;
    const sporCatId = row.categoryId ?? sporCategoryIds[0]!;
    const gundemId = sporToGundem.get(sporCatId) ?? defaultGundemId;
    const bucket = newsByTargetGundem.get(gundemId) ?? [];
    bucket.push(row.id);
    newsByTargetGundem.set(gundemId, bucket);
  }

  let updatedNews = 0;
  if (!dryRun) {
    for (const [gundemId, ids] of newsByTargetGundem) {
      if (ids.length === 0) continue;
      const rows = await dualWriteUpdate(newsTable, { categoryId: gundemId }, inArray(newsTable.id, ids));
      updatedNews += rows.length;
      for (const row of newsRows.filter((r) => ids.includes(r.id))) {
        invalidateNewsPageBundleCache({ slug: row.slug ?? undefined, siteId: row.siteId ?? null });
      }
    }
  } else {
    updatedNews = [...newsByTargetGundem.values()].reduce((sum, ids) => sum + ids.length, 0);
  }

  const siteSlugs = await loadHmSiteSlugPrefixes();
  const rssRows = await db
    .select({
      id: portalRssItemsTable.id,
      title: portalRssItemsTable.title,
      spot: portalRssItemsTable.spot,
      contentHtml: portalRssItemsTable.contentHtml,
      categorySlug: portalRssItemsTable.categorySlug,
    })
    .from(portalRssItemsTable)
    .orderBy(desc(portalRssItemsTable.id))
    .limit(limit * 3);

  const sporRssRows = rssRows.filter((row) =>
    portalCategorySlugMatches("spor", String(row.categorySlug ?? ""), siteSlugs),
  );

  const rssIdsToMove = sporRssRows
    .filter((row) =>
      isMisclassifiedSporItem("spor", row.title, row.spot, row.contentHtml),
    )
    .map((row) => row.id);

  let updatedRss = rssIdsToMove.length;
  if (rssIdsToMove.length > 0 && !dryRun) {
    const result = await db
      .update(portalRssItemsTable)
      .set({ categorySlug: TARGET_SLUG })
      .where(inArray(portalRssItemsTable.id, rssIdsToMove));
    updatedRss = result.rowCount ?? rssIdsToMove.length;
  }

  if (!dryRun && (updatedNews > 0 || updatedRss > 0)) {
    invalidateNewsContextCache();
  }

  return {
    scannedNews: newsRows.length,
    updatedNews,
    scannedRss: sporRssRows.length,
    updatedRss,
    dryRun,
  };
}
