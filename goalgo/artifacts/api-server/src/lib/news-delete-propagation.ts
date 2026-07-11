import { eq, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import {
  db as mainDb,
  dualWriteDelete,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
  portalRssItemsTable,
} from "@workspace/db";
import { hiddenHmPoolNewsIdsFromLayout, readHmPublicLayout } from "./hm-public-layout.js";
import { isInternalHybridRssRef } from "./hm-sync-source.js";
import { invalidateNewsPageBundleCache } from "./news-page-bundle.js";
import { removePortalRssCachedItem } from "./portal-rss-cache.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";

async function hideCentralNewsFromAllHmSites(articleId: number): Promise<void> {
  if (!Number.isFinite(articleId) || articleId <= 0) return;

  const sites = await mainDb
    .select({ id: hmNewsSitesTable.id, layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true));

  for (const site of sites) {
    const layout = await readHmPublicLayout(site.id);
    const prev = hiddenHmPoolNewsIdsFromLayout(layout);
    if (prev.includes(articleId)) continue;
    const next = [...prev, articleId].slice(-5000);
    await dualWriteUpdate(
      hmNewsSitesTable,
      { layoutJson: JSON.stringify({ ...layout, hmHiddenPoolNewsIds: next }), updatedAt: new Date() },
      eq(hmNewsSitesTable.id, site.id),
    );
  }
}

async function purgePortalRssPoolBySourceUrl(sourceUrl: string): Promise<void> {
  const normalized = normalizeRssSourceUrl(sourceUrl);
  if (!normalized || !/^https?:\/\//i.test(normalized)) return;

  const dedupeKey = `link:${normalized.toLowerCase()}`;
  const rows = await mainDb
    .select({
      itemKey: portalRssItemsTable.itemKey,
      feedId: portalRssItemsTable.feedId,
    })
    .from(portalRssItemsTable)
    .where(
      or(
        eq(portalRssItemsTable.dedupeKey, dedupeKey),
        eq(portalRssItemsTable.link, normalized),
        sql`lower(${portalRssItemsTable.link}) = ${normalized.toLowerCase()}`,
      )!,
    );

  if (rows.length === 0) return;

  await mainDb
    .delete(portalRssItemsTable)
    .where(
      or(
        eq(portalRssItemsTable.dedupeKey, dedupeKey),
        eq(portalRssItemsTable.link, normalized),
        sql`lower(${portalRssItemsTable.link}) = ${normalized.toLowerCase()}`,
      )!,
    );

  for (const row of rows) {
    await removePortalRssCachedItem(row.itemKey, row.feedId).catch(() => undefined);
  }
}

/**
 * Admin haber silme: merkez havuz + HM site kopyaları + portal_rss_items temizliği.
 * Slug yönlendirmesi çağıran tarafta ayrı kaydedilir.
 */
export async function propagateAdminNewsDelete(newsId: number): Promise<void> {
  const readDb = getNewsDbForRead();
  const [row] = await readDb.select().from(newsTable).where(eq(newsTable.id, newsId)).limit(1);
  if (!row) return;

  const rssRef = String(row.rssSourceUrl ?? "").trim();
  const sourceUrl = normalizeRssSourceUrl(rssRef);
  const isExternalRss = !!sourceUrl && /^https?:\/\//i.test(sourceUrl);

  if (isExternalRss) {
    await dualWriteDelete(newsTable, eq(newsTable.rssSourceUrl, sourceUrl));
    await purgePortalRssPoolBySourceUrl(sourceUrl);
  } else {
    if (row.siteId == null) {
      await dualWriteDelete(
        newsTable,
        sql`${newsTable.rssSourceUrl} like ${`yekpare-hm-pool:%:${newsId}`}`,
      );
      if (!isInternalHybridRssRef(rssRef)) {
        await hideCentralNewsFromAllHmSites(newsId);
      }
    }
    await dualWriteDelete(newsTable, eq(newsTable.id, newsId));
  }

  invalidateNewsPageBundleCache({ slug: row.slug ?? undefined, siteId: row.siteId ?? null });
}

/** Admin list: merkez haberler + tüm RSS kaynaklı (HM site dahil) içerik. */
export function adminNewsListScopeCondition(): SQL {
  return or(isNull(newsTable.siteId), isNotNull(newsTable.rssSourceUrl))!;
}
