import { and, desc, eq, inArray, isNotNull, isNull, lt, ne, notInArray, or, sql } from "drizzle-orm";
import {
  categoriesTable,
  db,
  dualWriteUpdate,
  newsTable,
  portalRssItemsTable,
} from "@workspace/db";
import { loadEnabledGlobalMapNewsFeeds, mergePortalHybridRssFeedLists } from "./global-map-news-feeds.js";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "./hm-global-news-category.js";
import { loadPortalHybridRssFeeds } from "./portal-hybrid-config.js";
import { isLikelyTurkishHeadline, shouldMoveNewsToGlobalCategory } from "./turkishContent.js";

const SKIP_CATEGORY_SLUGS = new Set(["global", "video"]);

async function buildFeedCategorySlugMap(): Promise<Map<string, string>> {
  const feeds = mergePortalHybridRssFeedLists(
    await loadPortalHybridRssFeeds(null, "all"),
    await loadEnabledGlobalMapNewsFeeds(),
  );
  return new Map(
    feeds.map((feed) => [feed.id, String(feed.categorySlug ?? "gundem").trim().toLowerCase() || "gundem"]),
  );
}

function resolveTurkishOutOfGlobalCategorySlug(feedId: string, feedCategoryMap: Map<string, string>): string {
  const feedCat = feedCategoryMap.get(feedId)?.trim().toLowerCase();
  if (feedCat && feedCat !== HM_GLOBAL_NEWS_CATEGORY_SLUG && feedCat !== "video") return feedCat;
  if (String(feedId ?? "").startsWith("gmn-")) return "dunya";
  return "gundem";
}

function isTurkishNewsOutOfGlobal(
  title: string | null | undefined,
  spot?: string | null,
  lang?: string | null,
): boolean {
  if (shouldMoveNewsToGlobalCategory(title, spot, lang)) return false;
  return isLikelyTurkishHeadline(title) || isLikelyTurkishHeadline(spot);
}

async function resolveGlobalCategoryId(): Promise<number> {
  const [globalCat] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, HM_GLOBAL_NEWS_CATEGORY_SLUG))
    .limit(1);
  const globalCategoryId = globalCat?.id;
  if (globalCategoryId == null || globalCategoryId <= 0) {
    throw new Error("global kategori bulunamadı");
  }
  return globalCategoryId;
}

async function resolveFallbackCategoryId(slug: string): Promise<number> {
  const [row] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);
  const id = row?.id;
  if (id == null || id <= 0) {
    throw new Error(`${slug} kategori bulunamadı`);
  }
  return id;
}

/** Yanlışlıkla global'e girmiş Türkçe haberleri kaynak kategoriye taşır (news + RSS havuzu). */
export async function reclassifyTurkishNewsOutOfGlobalBatch(options?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<{ scanned: number; updated: number; scannedRss: number; updatedRss: number }> {
  const limit = Math.min(10_000, Math.max(1, options?.limit ?? 2000));
  const dryRun = options?.dryRun === true;
  const [globalCategoryId, feedCategoryMap] = await Promise.all([
    resolveGlobalCategoryId(),
    buildFeedCategorySlugMap(),
  ]);

  const newsRows = await db
    .select({
      id: newsTable.id,
      title: newsTable.title,
      spot: newsTable.spot,
      rssSourceUrl: newsTable.rssSourceUrl,
    })
    .from(newsTable)
    .where(eq(newsTable.categoryId, globalCategoryId))
    .orderBy(desc(newsTable.id))
    .limit(limit);

  const newsIdsToMove: number[] = [];
  const newsTargetSlugById = new Map<number, string>();
  const turkishNewsRows = newsRows.filter((row) => isTurkishNewsOutOfGlobal(row.title, row.spot));
  const linkFeedMap = new Map<string, string>();
  const uniqueLinks = [
    ...new Set(
      turkishNewsRows
        .map((row) => String(row.rssSourceUrl ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (uniqueLinks.length > 0) {
    const rssMatches = await db
      .select({ link: portalRssItemsTable.link, feedId: portalRssItemsTable.feedId })
      .from(portalRssItemsTable)
      .where(
        inArray(
          sql<string>`lower(btrim(${portalRssItemsTable.link}))`,
          uniqueLinks,
        ),
      );
    for (const match of rssMatches) {
      const key = String(match.link ?? "").trim().toLowerCase();
      if (key && match.feedId) linkFeedMap.set(key, match.feedId);
    }
  }
  for (const row of turkishNewsRows) {
    newsIdsToMove.push(row.id);
    const link = String(row.rssSourceUrl ?? "").trim().toLowerCase();
    const feedId = link ? linkFeedMap.get(link) : undefined;
    newsTargetSlugById.set(
      row.id,
      feedId ? resolveTurkishOutOfGlobalCategorySlug(feedId, feedCategoryMap) : "gundem",
    );
  }

  let updatedNews = newsIdsToMove.length;
  if (newsIdsToMove.length > 0 && !dryRun) {
    updatedNews = 0;
    const slugToIds = new Map<string, number[]>();
    for (const id of newsIdsToMove) {
      const slug = newsTargetSlugById.get(id) ?? "gundem";
      const bucket = slugToIds.get(slug) ?? [];
      bucket.push(id);
      slugToIds.set(slug, bucket);
    }
    for (const [slug, ids] of slugToIds) {
      const categoryId = await resolveFallbackCategoryId(slug);
      const rows = await dualWriteUpdate(newsTable, { categoryId }, inArray(newsTable.id, ids));
      updatedNews += rows.length;
    }
  }

  const rssRows = await db
    .select({
      id: portalRssItemsTable.id,
      title: portalRssItemsTable.title,
      spot: portalRssItemsTable.spot,
      lang: portalRssItemsTable.lang,
      feedId: portalRssItemsTable.feedId,
    })
    .from(portalRssItemsTable)
    .where(eq(portalRssItemsTable.categorySlug, HM_GLOBAL_NEWS_CATEGORY_SLUG))
    .orderBy(desc(portalRssItemsTable.id))
    .limit(limit);

  const rssUpdates: Array<{ id: number; categorySlug: string }> = [];
  for (const row of rssRows) {
    if (!isTurkishNewsOutOfGlobal(row.title, row.spot, row.lang)) continue;
    rssUpdates.push({
      id: row.id,
      categorySlug: resolveTurkishOutOfGlobalCategorySlug(row.feedId, feedCategoryMap),
    });
  }

  let updatedRss = rssUpdates.length;
  if (rssUpdates.length > 0 && !dryRun) {
    updatedRss = 0;
    const slugToIds = new Map<string, number[]>();
    for (const row of rssUpdates) {
      const bucket = slugToIds.get(row.categorySlug) ?? [];
      bucket.push(row.id);
      slugToIds.set(row.categorySlug, bucket);
    }
    for (const [slug, ids] of slugToIds) {
      const result = await db
        .update(portalRssItemsTable)
        .set({ categorySlug: slug })
        .where(inArray(portalRssItemsTable.id, ids))
        .returning({ id: portalRssItemsTable.id });
      updatedRss += result.length;
    }
  }

  return {
    scanned: newsRows.length,
    updated: updatedNews,
    scannedRss: rssRows.length,
    updatedRss,
  };
}

/** Deploy sonrası global'deki Türkçe haberleri tur tur tarar (en yeni → eski). */
export async function reclassifyTurkishNewsOutOfGlobalAll(options?: {
  batchSize?: number;
  maxRounds?: number;
  dryRun?: boolean;
}): Promise<{
  rounds: number;
  updatedNews: number;
  updatedRss: number;
  scannedNews: number;
  scannedRss: number;
}> {
  const batchSize = Math.min(10_000, Math.max(100, options?.batchSize ?? 2000));
  const maxRounds = Math.min(500, Math.max(1, options?.maxRounds ?? 100));
  const dryRun = options?.dryRun === true;

  let updatedNews = 0;
  let updatedRss = 0;
  let scannedNews = 0;
  let scannedRss = 0;
  let rounds = 0;

  for (let i = 0; i < maxRounds; i += 1) {
    const batch = await reclassifyTurkishNewsOutOfGlobalBatch({ limit: batchSize, dryRun });
    if (batch.scanned === 0 && batch.scannedRss === 0) break;
    rounds += 1;
    updatedNews += batch.updated;
    updatedRss += batch.updatedRss;
    scannedNews += batch.scanned;
    scannedRss += batch.scannedRss;
    if (batch.updated === 0 && batch.updatedRss === 0) break;
  }

  return { rounds, updatedNews, updatedRss, scannedNews, scannedRss };
}

async function reclassifyNewsChunk(options: {
  globalCategoryId: number;
  limit: number;
  dryRun: boolean;
  beforeId?: number;
}): Promise<{ scanned: number; updated: number; skipped: number; nextBeforeId: number | null }> {
  const whereParts = [
    isNull(newsTable.siteId),
    or(
      isNull(newsTable.categoryId),
      and(
        sql`${categoriesTable.slug} IS NOT NULL`,
        notInArray(categoriesTable.slug, [...SKIP_CATEGORY_SLUGS]),
        isNull(categoriesTable.exclusiveSiteId),
      ),
    )!,
  ];
  if (options.beforeId != null && options.beforeId > 0) {
    whereParts.push(lt(newsTable.id, options.beforeId));
  }

  const newsRows = await db
    .select({
      id: newsTable.id,
      title: newsTable.title,
      spot: newsTable.spot,
      categorySlug: categoriesTable.slug,
    })
    .from(newsTable)
    .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
    .where(and(...whereParts))
    .orderBy(desc(newsTable.id))
    .limit(options.limit);

  if (newsRows.length === 0) {
    return { scanned: 0, updated: 0, skipped: 0, nextBeforeId: null };
  }

  const newsIdsToMove: number[] = [];
  let skipped = 0;
  for (const row of newsRows) {
    const slug = String(row.categorySlug ?? "").trim().toLowerCase();
    if (SKIP_CATEGORY_SLUGS.has(slug)) {
      skipped += 1;
      continue;
    }
    if (shouldMoveNewsToGlobalCategory(row.title, row.spot)) {
      newsIdsToMove.push(row.id);
    } else {
      skipped += 1;
    }
  }

  let updated = newsIdsToMove.length;
  if (newsIdsToMove.length > 0 && !options.dryRun) {
    const rows = await dualWriteUpdate(
      newsTable,
      { categoryId: options.globalCategoryId },
      inArray(newsTable.id, newsIdsToMove),
    );
    updated = rows.length;
  }

  return {
    scanned: newsRows.length,
    updated,
    skipped,
    nextBeforeId: newsRows[newsRows.length - 1]?.id ?? null,
  };
}

async function reclassifyRssChunk(options: {
  limit: number;
  dryRun: boolean;
  beforeId?: number;
}): Promise<{ scanned: number; updated: number; skipped: number; nextBeforeId: number | null }> {
  const whereParts = [
    and(
      ne(portalRssItemsTable.categorySlug, HM_GLOBAL_NEWS_CATEGORY_SLUG),
      ne(portalRssItemsTable.categorySlug, "video"),
    )!,
  ];
  if (options.beforeId != null && options.beforeId > 0) {
    whereParts.push(lt(portalRssItemsTable.id, options.beforeId));
  }

  const rssRows = await db
    .select({
      id: portalRssItemsTable.id,
      title: portalRssItemsTable.title,
      spot: portalRssItemsTable.spot,
      lang: portalRssItemsTable.lang,
    })
    .from(portalRssItemsTable)
    .where(and(...whereParts))
    .orderBy(desc(portalRssItemsTable.id))
    .limit(options.limit);

  if (rssRows.length === 0) {
    return { scanned: 0, updated: 0, skipped: 0, nextBeforeId: null };
  }

  const rssIdsToMove: number[] = [];
  let skipped = 0;
  for (const row of rssRows) {
    if (shouldMoveNewsToGlobalCategory(row.title, row.spot, row.lang)) {
      rssIdsToMove.push(row.id);
    } else {
      skipped += 1;
    }
  }

  let updated = rssIdsToMove.length;
  if (rssIdsToMove.length > 0 && !options.dryRun) {
    const result = await db
      .update(portalRssItemsTable)
      .set({ categorySlug: HM_GLOBAL_NEWS_CATEGORY_SLUG })
      .where(inArray(portalRssItemsTable.id, rssIdsToMove))
      .returning({ id: portalRssItemsTable.id });
    updated = result.length;
  }

  return {
    scanned: rssRows.length,
    updated,
    skipped,
    nextBeforeId: rssRows[rssRows.length - 1]?.id ?? null,
  };
}

export async function reclassifyNonTurkishNewsToGlobalBatch(options?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  scannedNews: number;
  updatedNews: number;
  scannedRss: number;
  updatedRss: number;
  skipped: number;
}> {
  const limit = Math.min(10_000, Math.max(1, options?.limit ?? 2000));
  const dryRun = options?.dryRun === true;
  const globalCategoryId = await resolveGlobalCategoryId();

  const news = await reclassifyNewsChunk({ globalCategoryId, limit, dryRun });
  const rss = await reclassifyRssChunk({ limit, dryRun });

  return {
    scannedNews: news.scanned,
    updatedNews: news.updated,
    scannedRss: rss.scanned,
    updatedRss: rss.updated,
    skipped: news.skipped + rss.skipped,
  };
}

/** Deploy sonrası tüm havuzu tur tur tarar (en yeni → eski). */
export async function reclassifyNonTurkishNewsToGlobalAll(options?: {
  batchSize?: number;
  maxRounds?: number;
  dryRun?: boolean;
}): Promise<{
  rounds: number;
  updatedNews: number;
  updatedRss: number;
  scannedNews: number;
  scannedRss: number;
}> {
  const batchSize = Math.min(10_000, Math.max(100, options?.batchSize ?? 2000));
  const maxRounds = Math.min(500, Math.max(1, options?.maxRounds ?? 100));
  const dryRun = options?.dryRun === true;
  const globalCategoryId = await resolveGlobalCategoryId();

  let updatedNews = 0;
  let updatedRss = 0;
  let scannedNews = 0;
  let scannedRss = 0;
  let newsBeforeId: number | undefined;
  let rssBeforeId: number | undefined;
  let rounds = 0;

  for (let i = 0; i < maxRounds; i += 1) {
    const news = await reclassifyNewsChunk({
      globalCategoryId,
      limit: batchSize,
      dryRun,
      beforeId: newsBeforeId,
    });
    const rss = await reclassifyRssChunk({
      limit: batchSize,
      dryRun,
      beforeId: rssBeforeId,
    });

    if (news.scanned === 0 && rss.scanned === 0) break;

    rounds += 1;
    updatedNews += news.updated;
    updatedRss += rss.updated;
    scannedNews += news.scanned;
    scannedRss += rss.scanned;
    if (news.nextBeforeId != null) newsBeforeId = news.nextBeforeId;
    if (rss.nextBeforeId != null) rssBeforeId = rss.nextBeforeId;
  }

  return { rounds, updatedNews, updatedRss, scannedNews, scannedRss };
}
