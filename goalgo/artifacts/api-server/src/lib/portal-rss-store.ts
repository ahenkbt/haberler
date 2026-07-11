import { and, desc, eq, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import {
  db as mainDb,
  portalRssItemsTable,
  portalRssItemViewsTable,
  type PortalRssItemInsert,
  type PortalRssItemRow,
} from "@workspace/db";
import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import { enabledPortalHybridRssFeeds, feedMatchesCategorySlug } from "./portal-hybrid-config.js";
import { dedupePortalRssItemsByKey, rssSourceNameFromUrl, type PortalRssItem } from "./portal-rss-fetch.js";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "./hm-global-news-category.js";
import {
  canonicalSharedPoolFeedId,
  expandFeedIdsForSharedPoolQuery,
} from "./portal-rss-shared-pool.js";
import { isMisclassifiedSporItem } from "./rss-spor-category-guard.js";
import { mirrorPortalRssItemsImages } from "./portal-rss-image-mirror.js";
import { isLikelyTurkishHeadline, shouldMoveNewsToGlobalCategory } from "./turkishContent.js";

/**
 * Kalıcı DB deposu — portal/site hibrit RSS haber havuzu.
 *
 * RSS öğeleri arka planda (scheduler) çekilip buraya UPSERT edilir; okuma yolu
 * (anasayfa, kategori kutuları, newsmap) bu tablodan hızlı/indeksli okur — sayfa
 * açılışında canlı RSS beklenmez. "Kutu içi RSS" (box scope) bu depoya yazılmaz.
 */

/** portal_rss_items havuz saklama — 0 = kalıcı (6 aylık otomatik silme kapalı). */
export const PORTAL_RSS_POOL_RETENTION_MS = 0;

function poolRetentionCutoff(now = Date.now()): Date | null {
  if (PORTAL_RSS_POOL_RETENTION_MS <= 0) return null;
  return new Date(now - PORTAL_RSS_POOL_RETENTION_MS);
}
const MAX_READ_PER_QUERY = 800;

/** Beslemede saklanacak kalıcı öğe sayısı (feed başına en yeni N). */
const MAX_STORED_PER_FEED = 200;

export function portalRssDedupeKey(item: Pick<PortalRssItem, "link" | "titleKey">): string {
  const link = item.link.trim().toLowerCase();
  if (link) return `link:${link}`;
  return `title:${item.titleKey}`;
}

/** `hm-<siteId>-site-...` besleme kimliğinden editör site id'sini çıkarır. */
export function siteIdFromFeedId(feedId: string): number | null {
  const m = /^hm-(\d+)-/.exec(String(feedId ?? "").trim());
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function rowToPortalRssItem(row: PortalRssItemRow): PortalRssItem {
  return {
    id: row.itemKey,
    title: row.title,
    link: row.link ?? "",
    spot: row.spot ?? "",
    contentHtml: row.contentHtml ?? undefined,
    imageUrl: row.imageUrl ?? null,
    publishedAt: row.publishedAt.toISOString(),
    cachedAt: row.cachedAt.toISOString(),
    titleKey: row.titleKey ?? "",
    feedId: row.feedId,
    categorySlug: row.categorySlug,
  };
}

function inferPortalRssItemLang(title: string, spot?: string | null): string {
  if (isLikelyTurkishHeadline(title) || isLikelyTurkishHeadline(spot)) return "tr";
  if (shouldMoveNewsToGlobalCategory(title, spot)) return "en";
  return "tr";
}

function resolvePortalRssStoredCategorySlug(item: PortalRssItem, feed: PortalHybridRssFeedConfig): string {
  const base = (item.categorySlug || feed.categorySlug || "").trim().toLowerCase();
  if (base === "video") return "video";
  const feedId = String(feed.id ?? "").trim();
  const isGlobalMapFeed = feedId.startsWith("gmn-");
  if (isLikelyTurkishHeadline(item.title) || isLikelyTurkishHeadline(item.spot)) {
    if (base === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
      const feedCat = String(feed.categorySlug ?? "").trim().toLowerCase();
      return feedCat && feedCat !== HM_GLOBAL_NEWS_CATEGORY_SLUG ? feedCat : "gundem";
    }
    return base || feed.categorySlug || "gundem";
  }
  if (isGlobalMapFeed && shouldMoveNewsToGlobalCategory(item.title, item.spot)) {
    return HM_GLOBAL_NEWS_CATEGORY_SLUG;
  }
  let resolved = base || feed.categorySlug || "gundem";
  const content = item.contentHtml ?? item.spot ?? "";
  if (isMisclassifiedSporItem(resolved, item.title, item.spot, content)) {
    resolved = "gundem";
  }
  return resolved;
}

function itemToInsert(
  item: PortalRssItem,
  feed: PortalHybridRssFeedConfig,
  now: Date,
): PortalRssItemInsert {
  const published = new Date(item.publishedAt);
  const categorySlug = resolvePortalRssStoredCategorySlug(item, feed);
  return {
    feedId: canonicalSharedPoolFeedId(feed),
    siteId: null,
    categorySlug,
    itemKey: item.id,
    dedupeKey: portalRssDedupeKey(item),
    title: item.title,
    titleKey: item.titleKey ?? "",
    link: item.link ?? "",
    spot: item.spot || null,
    contentHtml: item.contentHtml || null,
    imageUrl: item.imageUrl ?? null,
    sourceName: rssSourceNameFromUrl(item.link) ?? rssSourceNameFromUrl(feed.url) ?? feed.label,
    lang: inferPortalRssItemLang(item.title, item.spot),
    publishedAt: Number.isNaN(published.getTime()) ? now : published,
    geoLat: feed.geoLat ?? null,
    geoLng: feed.geoLng ?? null,
    regionKey: feed.regionKey ?? null,
    regionLabel: feed.regionLabel ?? null,
    countryCode: feed.countryCode ?? null,
    cachedAt: now,
  };
}

/** Bir beslemenin çektiği öğeleri ortak havuza UPSERT eder (global dedupe_key). */
export async function upsertPortalRssItems(
  feed: PortalHybridRssFeedConfig,
  items: PortalRssItem[],
): Promise<number> {
  if (items.length === 0) return 0;
  const mirroredItems = await mirrorPortalRssItemsImages(items);
  const now = new Date();
  const dbw = mainDb;

  // Aynı besleme içindeki tekilleştirme (yinelenen dedupe_key aynı batch'te çakışmasın).
  const seen = new Set<string>();
  const values: PortalRssItemInsert[] = [];
  for (const item of mirroredItems) {
    const insert = itemToInsert(item, feed, now);
    if (seen.has(insert.dedupeKey!)) continue;
    seen.add(insert.dedupeKey!);
    values.push(insert);
  }
  if (values.length === 0) return 0;

  await dbw
    .insert(portalRssItemsTable)
    .values(values)
    .onConflictDoUpdate({
      target: portalRssItemsTable.dedupeKey,
      set: {
        feedId: sql`excluded.feed_id`,
        categorySlug: sql`excluded.category_slug`,
        siteId: sql`null`,
        itemKey: sql`excluded.item_key`,
        title: sql`excluded.title`,
        titleKey: sql`excluded.title_key`,
        link: sql`excluded.link`,
        spot: sql`excluded.spot`,
        contentHtml: sql`excluded.content_html`,
        imageUrl: sql`excluded.image_url`,
        sourceName: sql`excluded.source_name`,
        publishedAt: sql`excluded.published_at`,
        geoLat: sql`excluded.geo_lat`,
        geoLng: sql`excluded.geo_lng`,
        regionKey: sql`excluded.region_key`,
        regionLabel: sql`excluded.region_label`,
        countryCode: sql`excluded.country_code`,
        cachedAt: sql`excluded.cached_at`,
        updatedAt: now,
      },
    });

  await pruneFeedOverflow(canonicalSharedPoolFeedId(feed));
  return values.length;
}

/** Feed başına en yeni MAX_STORED_PER_FEED dışındaki eski kayıtları temizler. */
async function pruneFeedOverflow(feedId: string): Promise<void> {
  const dbw = mainDb;
  await dbw.execute(sql`
    DELETE FROM ${portalRssItemsTable}
    WHERE ${portalRssItemsTable.id} IN (
      SELECT id FROM ${portalRssItemsTable}
      WHERE ${portalRssItemsTable.feedId} = ${feedId}
      ORDER BY ${portalRssItemsTable.publishedAt} DESC
      OFFSET ${MAX_STORED_PER_FEED}
    )
  `);
}

/** Eski RSS öğelerini portal_rss_items havuzundan siler — retention ≤ 0 ise no-op. */
export async function prunePortalRssItemsOld(): Promise<void> {
  const cutoff = poolRetentionCutoff();
  if (!cutoff) return;
  await mainDb.delete(portalRssItemsTable).where(lt(portalRssItemsTable.cachedAt, cutoff));
}

/** Tek beslemenin kalıcı öğeleri (readCache soğuk-başlangıç geri dolgusu için). */
export async function readPortalRssItemsForFeed(feedId: string): Promise<PortalRssItem[]> {
  const cutoff = poolRetentionCutoff();
  const conds: SQL[] = [eq(portalRssItemsTable.feedId, feedId)];
  if (cutoff) conds.push(sql`${portalRssItemsTable.cachedAt} > ${cutoff}`);
  const rows = await mainDb
    .select()
    .from(portalRssItemsTable)
    .where(and(...conds))
    .orderBy(desc(portalRssItemsTable.publishedAt))
    .limit(MAX_STORED_PER_FEED);
  return rows.map(rowToPortalRssItem);
}

/** Admin haberler araması — kalıcı `portal_rss_items` tablosunda ILIKE (title/spot/itemKey/link). */
export async function searchPortalRssItemsForAdmin(opts: {
  feedIds: string[];
  categorySlug?: string;
  q: string;
  siteId?: number | null;
  limit?: number;
}): Promise<PortalRssItem[]> {
  const feedIds = opts.feedIds.filter(Boolean);
  const q = String(opts.q ?? "").trim();
  if (!feedIds.length || !q) return [];

  const categorySlug = opts.categorySlug?.trim().toLowerCase();
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const cutoff = poolRetentionCutoff();
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);

  const whereParts: SQL[] = [
    inArray(portalRssItemsTable.feedId, feedIds),
    or(
      ilike(portalRssItemsTable.title, pattern),
      ilike(portalRssItemsTable.spot, pattern),
      ilike(portalRssItemsTable.itemKey, pattern),
      ilike(portalRssItemsTable.dedupeKey, pattern),
      ilike(portalRssItemsTable.link, pattern),
    )!,
  ];
  if (cutoff) whereParts.push(sql`${portalRssItemsTable.cachedAt} > ${cutoff}`);
  if (categorySlug) {
    whereParts.push(eq(portalRssItemsTable.categorySlug, categorySlug));
  }

  const rows = await mainDb
    .select()
    .from(portalRssItemsTable)
    .where(and(...whereParts))
    .orderBy(desc(portalRssItemsTable.publishedAt))
    .limit(limit);

  const items = dedupePortalRssItemsByKey(rows.map(rowToPortalRssItem));
  if (!categorySlug) return items;
  return items.filter((item) => feedMatchesCategorySlug(item.categorySlug, categorySlug));
}

/** Çoklu besleme okuması — kategori süzgeçli, yayın tarihine göre sıralı. */
export async function readPortalRssItemsForFeeds(
  feeds: PortalHybridRssFeedConfig[],
  opts?: { categorySlug?: string },
): Promise<PortalRssItem[]> {
  const categorySlug = opts?.categorySlug?.trim().toLowerCase();
  const scopedFeeds = categorySlug ? enabledPortalHybridRssFeeds(feeds, categorySlug) : feeds;
  const feedIds = expandFeedIdsForSharedPoolQuery(
    scopedFeeds.filter((feed) => feed.enabled && feed.url),
  );
  if (feedIds.length === 0) return [];
  const cutoff = poolRetentionCutoff();
  const conds: SQL[] = [inArray(portalRssItemsTable.feedId, feedIds)];
  if (cutoff) conds.push(sql`${portalRssItemsTable.cachedAt} > ${cutoff}`);

  const rows = await mainDb
    .select()
    .from(portalRssItemsTable)
    .where(and(...conds))
    .orderBy(desc(portalRssItemsTable.publishedAt))
    .limit(MAX_READ_PER_QUERY);

  // Global tekilleştir: aynı makale birden çok feed altında farklı kategoriyle
  // bulunabilir; tek kanonik kategoriye indir, sonra kategoriye göre süz.
  const items = dedupePortalRssItemsByKey(rows.map(rowToPortalRssItem));
  if (!categorySlug) return items;
  return items.filter((item) => feedMatchesCategorySlug(item.categorySlug, categorySlug));
}

/** Sabit RSS öğe kimliğine (itemKey) göre kalıcı depodan haber bulur. */
export async function readPortalRssItemByKey(
  itemKey: string,
  feeds: PortalHybridRssFeedConfig[],
): Promise<{ item: PortalRssItem; feedLabel: string } | null> {
  const id = String(itemKey ?? "").trim();
  if (!id) return null;
  const feedIds = expandFeedIdsForSharedPoolQuery(feeds.filter((feed) => feed.enabled && feed.url));
  if (feedIds.length === 0) return null;

  const rows = await mainDb
    .select()
    .from(portalRssItemsTable)
    .where(and(eq(portalRssItemsTable.itemKey, id), inArray(portalRssItemsTable.feedId, feedIds)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const feed = feeds.find((f) => f.id === row.feedId);
  return { item: rowToPortalRssItem(row), feedLabel: feed?.label ?? row.sourceName ?? row.categorySlug };
}

/**
 * BİRLEŞİK GLOBAL OKUNMA SAYACI — şema garanti (drizzle migrate gecikse bile).
 * `portal_rss_item_views` tablosunu ana DB'de oluşturur (haber cluster'ında değil).
 */
let viewsSchemaReady: Promise<void> | null = null;
export function ensurePortalRssItemViewsSchema(): Promise<void> {
  if (viewsSchemaReady) return viewsSchemaReady;
  viewsSchemaReady = (async () => {
    await mainDb.execute(sql`
      CREATE TABLE IF NOT EXISTS "portal_rss_item_views" (
        "item_key" text PRIMARY KEY NOT NULL,
        "views" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  })().catch((err) => {
    viewsSchemaReady = null;
    throw err;
  });
  return viewsSchemaReady;
}

/**
 * Bir RSS makalesinin BİRLEŞİK global okunma sayacını 1 artırır ve yeni değeri döner.
 * Anahtar `itemKey` tüm sitelerde (Yekpare + editör) aynı olduğundan sayaç ortaktır.
 */
export async function incrementPortalRssItemView(itemKey: string): Promise<number> {
  const key = String(itemKey ?? "").trim();
  if (!key) return 0;
  await ensurePortalRssItemViewsSchema();
  const now = new Date();
  const rows = await mainDb
    .insert(portalRssItemViewsTable)
    .values({ itemKey: key, views: 1 })
    .onConflictDoUpdate({
      target: portalRssItemViewsTable.itemKey,
      set: {
        views: sql`${portalRssItemViewsTable.views} + 1`,
        updatedAt: now,
      },
    })
    .returning({ views: portalRssItemViewsTable.views });
  return rows[0]?.views ?? 1;
}

/** Bir RSS makalesinin birleşik global okunma sayısını okur (artırmadan). */
export async function getPortalRssItemViewCount(itemKey: string): Promise<number> {
  const key = String(itemKey ?? "").trim();
  if (!key) return 0;
  try {
    const rows = await mainDb
      .select({ views: portalRssItemViewsTable.views })
      .from(portalRssItemViewsTable)
      .where(eq(portalRssItemViewsTable.itemKey, key))
      .limit(1);
    return rows[0]?.views ?? 0;
  } catch {
    return 0;
  }
}

/** RSS yönetim panelinden silinen öğeyi kalıcı depodan kaldırır. */
export async function deletePortalRssItemByKey(
  itemKey: string,
  feedIds: string[],
): Promise<number> {
  const id = String(itemKey ?? "").trim();
  if (!id || feedIds.length === 0) return 0;
  const rows = await mainDb
    .delete(portalRssItemsTable)
    .where(and(eq(portalRssItemsTable.itemKey, id), inArray(portalRssItemsTable.feedId, feedIds)))
    .returning({ id: portalRssItemsTable.id });
  return rows.length;
}

/** Feed başına kalıcı öğe sayıları (cache status için). */
export async function countPortalRssItemsByFeed(
  feedIds: string[],
): Promise<Map<string, { count: number; lastPublishedAt: string | null }>> {
  const out = new Map<string, { count: number; lastPublishedAt: string | null }>();
  if (feedIds.length === 0) return out;
  const cutoff = poolRetentionCutoff();
  const conds: SQL[] = [inArray(portalRssItemsTable.feedId, feedIds)];
  if (cutoff) conds.push(sql`${portalRssItemsTable.cachedAt} > ${cutoff}`);
  const rows = await mainDb
    .select({
      feedId: portalRssItemsTable.feedId,
      count: sql<number>`count(*)::int`,
      lastPublishedAt: sql<string | null>`max(${portalRssItemsTable.publishedAt})`,
    })
    .from(portalRssItemsTable)
    .where(and(...conds))
    .groupBy(portalRssItemsTable.feedId);
  for (const row of rows) {
    out.set(row.feedId, {
      count: row.count ?? 0,
      lastPublishedAt: row.lastPublishedAt ? new Date(row.lastPublishedAt).toISOString() : null,
    });
  }
  return out;
}
