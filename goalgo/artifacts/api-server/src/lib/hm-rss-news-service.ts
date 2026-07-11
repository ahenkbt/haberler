import { and, inArray, isNull, eq, sql } from "drizzle-orm";
import {
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { slugify, loadNewsContext } from "./news-context.js";
import { decodeHtmlEntities } from "./decodeHtmlEntities.js";
import {
  enabledPortalHybridRssFeeds,
  feedMatchesCategorySlug,
  loadPortalHybridRssFeeds,
  resolveHmHybridRssAccess,
  type HmHybridRssScope,
} from "./portal-hybrid-config.js";
import {
  getPortalRssCachedItemsForFeeds,
  getPortalRssItemById,
  getPortalRssCacheStatus,
  refreshAllPortalRssFeeds,
  refreshPortalRssFeed,
  removePortalRssCachedItem,
  shouldAutoRefreshRssFeedOnVisit,
} from "./portal-rss-cache.js";
import {
  deletePortalRssItemByKey,
  readPortalRssItemsForFeeds,
  searchPortalRssItemsForAdmin,
} from "./portal-rss-store.js";
import {
  dedupePortalRssItemsByKey,
  normalizePortalRssCachedContentHtml,
  type PortalRssItem,
} from "./portal-rss-fetch.js";
import { stripExternalAnchorsFromHtml } from "./hybrid-news-merge.js";
import { sanitizeCumhaRssSpot } from "./rssCumhaExclude.js";
import { normalizeRssSourceUrl, rssArticleAlreadyImported } from "./rssImportDedupe.js";
import {
  resolveHmEditorCategoryId,
} from "./hm-editor-categories.js";
import { findPortalGlobalCategoryBySlug } from "./portal-category-slug.js";
import { refreshPortalRssNewsImageFromItem } from "./portal-rss-auto-import.js";
import { syncHmEditorContentToYekpare } from "./hm-yekpare-news-sync.js";
import { mirrorMediaUrlToDisk } from "./mediaBulkMigrate.js";
import {
  filterRssItemsByHiddenSet,
} from "./hybrid-news-merge.js";
import {
  hiddenHmPoolNewsIdsFromLayout,
  hiddenHmRssItemIdsFromLayout,
  readHmPublicLayout,
} from "./hm-public-layout.js";

export type HmRssNewsListItem = {
  id: string;
  title: string;
  spot: string | null;
  imageUrl: string | null;
  categorySlug: string;
  categoryName: string;
  feedId: string;
  feedLabel: string;
  /** Vitrin ayarındaki kutu içi / site içi RSS kaynağı */
  rssScope: "box" | "site" | "portal";
  externalUrl: string | null;
  publishedAt: string;
  imported: boolean;
  importedNewsId: number | null;
};

export type HmRssFeedCategoryMeta = {
  slug: string;
  label: string;
  rssScope: "box" | "site";
  feedCount: number;
};

export function parseHmRssFeedScope(feedId: string): "box" | "site" | "portal" {
  const id = String(feedId ?? "");
  if (id.includes("-box-")) return "box";
  if (id.includes("-site-")) return "site";
  return "portal";
}

function buildFeedCategoryMeta(feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>): HmRssFeedCategoryMeta[] {
  const map = new Map<string, HmRssFeedCategoryMeta>();
  for (const feed of feeds) {
    if (!feed.url) continue;
    const scopeRaw = parseHmRssFeedScope(feed.id);
    const scope: "box" | "site" = scopeRaw === "box" ? "box" : "site";
    const key = `${scope}:${feed.categorySlug}`;
    const prev = map.get(key);
    if (prev) {
      prev.feedCount += 1;
      if (feed.label.trim()) prev.label = feed.label.trim();
    } else {
      map.set(key, {
        slug: feed.categorySlug,
        label: feed.label.trim() || feed.categorySlug,
        rssScope: scope,
        feedCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "tr"));
}

function countConfiguredFeeds(
  feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>,
): { box: number; site: number } {
  let box = 0;
  let site = 0;
  for (const feed of feeds) {
    if (!feed.url) continue;
    const scope = parseHmRssFeedScope(feed.id);
    if (scope === "box") box += 1;
    else if (scope === "site") site += 1;
  }
  return { box, site };
}

export type HmRssNewsDetail = HmRssNewsListItem & {
  content: string | null;
};

export function normalizeRssCacheItemId(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  return t.startsWith("rss:") ? t.slice(4) : t;
}

/** Admin RSS araması — yalnızca haber metni alanları (kategori adı/feed etiketi hariç). */
export function rssItemMatchesAdminSearch(item: PortalRssItem, qLower: string): boolean {
  if (!qLower) return true;
  const title = item.title.toLocaleLowerCase("tr-TR");
  const spot = String(item.spot ?? "").toLocaleLowerCase("tr-TR");
  const id = String(item.id ?? "").toLocaleLowerCase("tr-TR");
  const link = String(item.link ?? "").toLocaleLowerCase("tr-TR");
  return (
    title.includes(qLower) ||
    spot.includes(qLower) ||
    id.includes(qLower) ||
    link.includes(qLower)
  );
}

async function ensurePortalRssCacheWarm(
  feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>,
): Promise<void> {
  const activeFeeds = enabledPortalHybridRssFeeds(feeds);
  if (!activeFeeds.length) return;
  const status = await getPortalRssCacheStatus(activeFeeds);
  const refreshChecks = await Promise.all(
    activeFeeds.map(async (feed) => {
      const row = status.find((s) => s.feedId === feed.id);
      const needsData = !row?.cached || row.itemCount === 0 || row.expired || row.refreshDue;
      if (!needsData) return null;
      const auto = await shouldAutoRefreshRssFeedOnVisit(feed.id);
      return auto ? feed : null;
    }),
  );
  const toRefresh = refreshChecks.filter((feed): feed is (typeof activeFeeds)[number] => feed != null);
  if (toRefresh.length > 0) {
    await Promise.all(toRefresh.map((feed) => refreshPortalRssFeed(feed).catch(() => null)));
  }
}

/** Editör «Güncelle» — site-içi RSS beslemelerini manuel yeniler (manuel/kalıcı mod). */
export async function refreshHmSiteRssFeedsForEditor(siteId: number): Promise<{
  refreshed: number;
  stored: number;
  failed: number;
}> {
  const feeds = enabledPortalHybridRssFeeds(await loadPortalHybridRssFeeds(siteId, "site"));
  if (!feeds.length) return { refreshed: 0, stored: 0, failed: 0 };
  let stored = 0;
  let failed = 0;
  const results = await refreshAllPortalRssFeeds(feeds);
  for (const row of results) {
    if (row.error) failed += 1;
    else stored += row.stored;
  }
  return { refreshed: feeds.length, stored, failed };
}

async function resolveCategoryIdForSiteImport(
  siteId: number | null,
  rawSlug: unknown,
): Promise<number | null> {
  const slug = String(rawSlug ?? "").trim().toLowerCase();
  if (!slug) return null;
  if (siteId == null) {
    const row = await findPortalGlobalCategoryBySlug(slug);
    return row?.id ?? null;
  }
  return resolveHmEditorCategoryId(siteId, slug);
}

function resolveRssContentHtml(item: PortalRssItem): string {
  const raw =
    normalizePortalRssCachedContentHtml(item.contentHtml) ||
    (item.spot ? `<p>${decodeHtmlEntities(item.spot.replace(/…$/, "").trim())}</p>` : "");
  return raw ? stripExternalAnchorsFromHtml(raw) : "";
}

function makeImportSlug(title: string, siteId: number | null): string {
  const base = slugify(title).slice(0, 80) || "haber";
  const suffix = siteId != null ? `-${siteId}` : "";
  return `${base}${suffix}-${Date.now().toString(36)}`;
}

async function loadImportedNewsMap(
  siteId: number | null,
  sourceUrls: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const urls = sourceUrls.filter(Boolean);
  if (urls.length === 0) return out;
  const cond =
    siteId == null
      ? and(isNull(newsTable.siteId), inArray(newsTable.rssSourceUrl, urls))
      : and(eq(newsTable.siteId, siteId), inArray(newsTable.rssSourceUrl, urls));
  const rows = await getNewsDbForRead()
    .select({ id: newsTable.id, rssSourceUrl: newsTable.rssSourceUrl })
    .from(newsTable)
    .where(cond);
  for (const row of rows) {
    if (row.rssSourceUrl) out.set(row.rssSourceUrl, row.id);
  }
  return out;
}

function mapPortalItemToListRow(
  item: PortalRssItem,
  feedLabel: string,
  ctx: Awaited<ReturnType<typeof loadNewsContext>>,
  importedMap: Map<string, number>,
): HmRssNewsListItem {
  const sourceUrl = normalizeRssSourceUrl(item.link);
  const cat = [...ctx.categories.values()].find((c) => c.slug === item.categorySlug);
  return {
    id: item.id,
    title: decodeHtmlEntities(item.title),
    spot: item.spot ? sanitizeCumhaRssSpot(decodeHtmlEntities(item.spot), item.link) || null : null,
    imageUrl: item.imageUrl,
    categorySlug: item.categorySlug,
    categoryName: cat?.name ?? feedLabel ?? item.categorySlug,
    feedId: item.feedId,
    feedLabel,
    rssScope: parseHmRssFeedScope(item.feedId),
    externalUrl: item.link || null,
    publishedAt: item.publishedAt,
    imported: sourceUrl ? importedMap.has(sourceUrl) : false,
    importedNewsId: sourceUrl ? (importedMap.get(sourceUrl) ?? null) : null,
  };
}

function resolveRssScopeFilter(raw: unknown): HmHybridRssScope | "all" {
  const t = String(raw ?? "all").trim().toLowerCase();
  if (t === "box") return "box";
  if (t === "site") return "site";
  return "all";
}

export async function listHmRssNewsForManagement(opts: {
  siteId: number | null;
  categorySlug?: string;
  q?: string;
  limit?: number;
  rssScope?: HmHybridRssScope | "all";
}): Promise<{
  items: HmRssNewsListItem[];
  categories: string[];
  feedCategories: HmRssFeedCategoryMeta[];
  scopes: { box: number; site: number };
  rssScope: HmHybridRssScope | "all";
  itemCount: number;
  feedCount: number;
}> {
  const rssScope = resolveRssScopeFilter(opts.rssScope);

  if (opts.siteId != null) {
    const access = await resolveHmHybridRssAccess(opts.siteId);
    if (access && !access.active) {
      return {
        items: [],
        categories: [],
        feedCategories: [],
        scopes: { box: 0, site: 0 },
        rssScope,
        itemCount: 0,
        feedCount: 0,
      };
    }
  }

  const allConfiguredFeeds = await loadPortalHybridRssFeeds(opts.siteId, "all");
  const feedCategories = buildFeedCategoryMeta(allConfiguredFeeds);
  const scopes = countConfiguredFeeds(allConfiguredFeeds);

  const feeds =
    rssScope === "all"
      ? allConfiguredFeeds
      : await loadPortalHybridRssFeeds(opts.siteId, rssScope);

  await ensurePortalRssCacheWarm(feeds);
  const activeFeeds = enabledPortalHybridRssFeeds(feeds, opts.categorySlug);
  const feedLabelById = Object.fromEntries(activeFeeds.map((feed) => [feed.id, feed.label]));
  const activeFeedIds = activeFeeds.filter((feed) => feed.enabled && feed.url).map((feed) => feed.id);
  const qRaw = opts.q?.trim() ?? "";
  const qLower = qRaw.toLocaleLowerCase("tr-TR");

  let rawItems: PortalRssItem[] = [];
  if (qRaw) {
    const [dbSearch, dbBrowse, cacheItems] = await Promise.all([
      searchPortalRssItemsForAdmin({
        feedIds: activeFeedIds,
        categorySlug: opts.categorySlug,
        q: qRaw,
        siteId: opts.siteId,
        limit: Math.min(Math.max(opts.limit ?? 300, 1), 500),
      }),
      readPortalRssItemsForFeeds(activeFeeds, { categorySlug: opts.categorySlug }),
      getPortalRssCachedItemsForFeeds(activeFeeds, opts.categorySlug),
    ]);
    rawItems = dedupePortalRssItemsByKey([...dbSearch, ...dbBrowse, ...cacheItems]).filter((item) =>
      rssItemMatchesAdminSearch(item, qLower),
    );
  } else {
    rawItems = await getPortalRssCachedItemsForFeeds(activeFeeds, opts.categorySlug);
    if (rawItems.length === 0 && activeFeeds.length > 0) {
      await refreshAllPortalRssFeeds(activeFeeds);
      rawItems = await getPortalRssCachedItemsForFeeds(activeFeeds, opts.categorySlug);
    }
    if (rawItems.length === 0 && activeFeedIds.length > 0) {
      rawItems = await readPortalRssItemsForFeeds(activeFeeds, { categorySlug: opts.categorySlug });
    }
  }

  const ctx = await loadNewsContext();

  if (opts.siteId != null) {
    const layout = await readHmPublicLayout(opts.siteId);
    const hiddenIds = hiddenHmRssItemIdsFromLayout(layout);
    if (hiddenIds.length > 0) {
      rawItems = filterRssItemsByHiddenSet(rawItems, new Set(hiddenIds));
    }
  }

  const sourceUrls = rawItems
    .map((item) => normalizeRssSourceUrl(item.link))
    .filter((url): url is string => Boolean(url));
  const importedMap = await loadImportedNewsMap(opts.siteId, sourceUrls);

  const limit = Math.min(Math.max(opts.limit ?? 300, 1), 500);
  const items = rawItems
    .map((item) => mapPortalItemToListRow(item, feedLabelById[item.feedId] ?? item.feedId, ctx, importedMap))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);

  const slugSet = new Set<string>();
  for (const meta of feedCategories) {
    if (rssScope !== "all" && meta.rssScope !== rssScope) continue;
    slugSet.add(meta.slug);
  }
  for (const item of items) slugSet.add(item.categorySlug);
  const categories = Array.from(slugSet).sort((a, b) => a.localeCompare(b, "tr"));

  return {
    items,
    categories,
    feedCategories,
    scopes,
    rssScope,
    itemCount: rawItems.length,
    feedCount: activeFeeds.length,
  };
}

export async function getHmRssNewsDetail(
  siteId: number | null,
  itemIdRaw: unknown,
): Promise<HmRssNewsDetail | null> {
  const itemId = normalizeRssCacheItemId(itemIdRaw);
  if (!itemId) return null;

  if (siteId != null) {
    const access = await resolveHmHybridRssAccess(siteId);
    if (!access?.active) return null;
  }

  const feeds = await loadPortalHybridRssFeeds(siteId, "all");
  await ensurePortalRssCacheWarm(feeds);
  const match = await getPortalRssItemById(itemId, feeds);
  if (!match) return null;

  const ctx = await loadNewsContext();
  const sourceUrl = normalizeRssSourceUrl(match.item.link);
  const importedMap = await loadImportedNewsMap(
    siteId,
    sourceUrl ? [sourceUrl] : [],
  );
  const base = mapPortalItemToListRow(match.item, match.feedLabel, ctx, importedMap);
  return {
    ...base,
    content: resolveRssContentHtml(match.item) || null,
  };
}

export type ImportHmRssNewsInput = {
  title?: string;
  spot?: string | null;
  content?: string | null;
  categorySlug?: string;
  status?: "published" | "draft";
};

export type ImportHmRssNewsResult =
  | { ok: true; newsId: number; skipped: false }
  | { ok: true; skipped: true; newsId: number | null; reason: "already_imported" }
  | { ok: false; error: string };

export async function importHmRssNewsToSite(
  siteId: number | null,
  itemIdRaw: unknown,
  input: ImportHmRssNewsInput = {},
): Promise<ImportHmRssNewsResult> {
  const itemId = normalizeRssCacheItemId(itemIdRaw);
  if (!itemId) return { ok: false, error: "Geçersiz RSS kimliği" };

  const feeds = await loadPortalHybridRssFeeds(siteId, "all");
  await ensurePortalRssCacheWarm(feeds);
  const match = await getPortalRssItemById(itemId, feeds);
  if (!match) return { ok: false, error: "RSS haberi bulunamadı" };

  const item = match.item;
  const sourceUrl = normalizeRssSourceUrl(item.link);
  const title = String(input.title ?? item.title).trim();
  if (!title) return { ok: false, error: "Başlık gerekli" };

  if (await rssArticleAlreadyImported(siteId, sourceUrl, title)) {
    await refreshPortalRssNewsImageFromItem({ siteId, sourceUrl, imageUrl: item.imageUrl, title });
    const importedMap = await loadImportedNewsMap(siteId, sourceUrl ? [sourceUrl] : []);
    return {
      ok: true,
      skipped: true,
      newsId: sourceUrl ? (importedMap.get(sourceUrl) ?? null) : null,
      reason: "already_imported",
    };
  }

  const categorySlug = String(input.categorySlug ?? item.categorySlug).trim().toLowerCase() || item.categorySlug;
  const categoryId = await resolveCategoryIdForSiteImport(siteId, categorySlug);
  const spot = String(input.spot ?? item.spot ?? "").trim() || null;
  const content =
    String(input.content ?? "").trim() ||
    resolveRssContentHtml(item) ||
    (spot ? `<p>${spot}</p>` : `<p>${title}</p>`);
  const status = input.status === "draft" ? "draft" : "published";

  const publishedAt = new Date(item.publishedAt);
  const ts = Number.isFinite(publishedAt.getTime()) ? publishedAt : new Date();

  let imageUrl = item.imageUrl;
  if (imageUrl && /^https?:\/\//i.test(String(imageUrl))) {
    const mirrored = await mirrorMediaUrlToDisk(String(imageUrl), { title, hashSeed: String(imageUrl) });
    if (mirrored) imageUrl = mirrored;
  }

  const [created] = await dualWriteInsert(newsTable, {
    title: decodeHtmlEntities(title),
    slug: makeImportSlug(title, siteId),
    spot,
    content,
    imageUrl,
    categoryId,
    authorId: null,
    status,
    isFeatured: false,
    isBreaking: false,
    tags: ["rss-hybrid"],
    views: 0,
    isAiGenerated: false,
    siteId,
    isEditorManual: true,
    rssSourceUrl: sourceUrl,
    createdAt: ts,
    updatedAt: ts,
  });

  if (!created) return { ok: false, error: "Haber kaydedilemedi" };

  if (siteId != null) {
    void syncHmEditorContentToYekpare({ siteIds: [siteId] }).catch(() => undefined);
  }

  return { ok: true, skipped: false, newsId: created.id };
}

export async function bulkImportHmRssNewsToSite(
  siteId: number | null,
  rows: Array<{ rssItemId: string; categorySlug?: string; status?: "published" | "draft" }>,
): Promise<{ imported: number; skipped: number; failed: number; results: Array<{ rssItemId: string; newsId?: number; error?: string }> }> {
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const results: Array<{ rssItemId: string; newsId?: number; error?: string }> = [];

  for (const row of rows) {
    const rssItemId = normalizeRssCacheItemId(row.rssItemId);
    if (!rssItemId) {
      failed++;
      results.push({ rssItemId: String(row.rssItemId ?? ""), error: "Geçersiz id" });
      continue;
    }
    const result = await importHmRssNewsToSite(siteId, rssItemId, {
      categorySlug: row.categorySlug,
      status: row.status,
    });
    if (!result.ok) {
      failed++;
      results.push({ rssItemId, error: result.error });
      continue;
    }
    if (result.skipped) {
      skipped++;
      results.push({ rssItemId, newsId: result.newsId ?? undefined });
      continue;
    }
    imported++;
    results.push({ rssItemId, newsId: result.newsId });
  }

  return { imported, skipped, failed, results };
}

export type DeleteHmRssNewsResult =
  | { ok: true; deletedNewsId: number | null; removedFromCache: boolean }
  | { ok: false; error: string };

export type RemoveHmRssNewsFromSiteResult =
  | { ok: true; hiddenOnSite: true; deletedNewsId: number | null; alreadyHidden: boolean }
  | { ok: false; error: string };

async function deleteSiteImportedRssNews(
  siteId: number,
  sourceUrl: string | null,
): Promise<number | null> {
  if (!sourceUrl) return null;
  const rows = await getNewsDbForRead()
    .select({ id: newsTable.id })
    .from(newsTable)
    .where(and(eq(newsTable.siteId, siteId), eq(newsTable.rssSourceUrl, sourceUrl)))
    .limit(1);
  if (!rows[0]) return null;
  await dualWriteDelete(newsTable, eq(newsTable.id, rows[0].id));
  void syncHmEditorContentToYekpare({ siteIds: [siteId] }).catch(() => undefined);
  return rows[0].id;
}

async function appendHiddenRssItemId(siteId: number, itemId: string): Promise<{ alreadyHidden: boolean }> {
  const normalized = normalizeRssCacheItemId(itemId);
  if (!normalized) return { alreadyHidden: false };

  const [row] = await getNewsDbForRead()
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  if (!row) return { alreadyHidden: false };

  const layout = await readHmPublicLayout(siteId);
  const prev = hiddenHmRssItemIdsFromLayout(layout);
  if (prev.includes(normalized)) return { alreadyHidden: true };

  const next = [...prev, normalized].slice(-5000);
  const merged = {
    ...layout,
    hmHiddenRssItemIds: next,
  };
  await dualWriteUpdate(
    hmNewsSitesTable,
    { layoutJson: JSON.stringify(merged), updatedAt: new Date() },
    eq(hmNewsSitesTable.id, siteId),
  );
  return { alreadyHidden: false };
}

/** Editör: haberi yalnızca kendi sitesinden gizler; merkez RSS önbelleği/DB silinmez. */
export async function removeHmRssNewsFromSite(
  siteId: number,
  itemIdRaw: unknown,
): Promise<RemoveHmRssNewsFromSiteResult> {
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return { ok: false, error: "Geçersiz site" };
  }

  const itemId = normalizeRssCacheItemId(itemIdRaw);
  if (!itemId) return { ok: false, error: "Geçersiz RSS kimliği" };

  const access = await resolveHmHybridRssAccess(siteId);
  if (!access?.active) return { ok: false, error: "RSS erişimi kapalı" };

  const feeds = await loadPortalHybridRssFeeds(siteId, "all");
  await ensurePortalRssCacheWarm(feeds);
  const match = await getPortalRssItemById(itemId, feeds);
  if (!match) return { ok: false, error: "RSS haberi bulunamadı" };

  const sourceUrl = normalizeRssSourceUrl(match.item.link);
  const deletedNewsId = await deleteSiteImportedRssNews(siteId, sourceUrl);
  const { alreadyHidden } = await appendHiddenRssItemId(siteId, itemId);

  return { ok: true, hiddenOnSite: true, deletedNewsId, alreadyHidden };
}

export async function deleteHmRssNewsItem(
  siteId: number | null,
  itemIdRaw: unknown,
): Promise<DeleteHmRssNewsResult> {
  const itemId = normalizeRssCacheItemId(itemIdRaw);
  if (!itemId) return { ok: false, error: "Geçersiz RSS kimliği" };

  if (siteId != null) {
    const access = await resolveHmHybridRssAccess(siteId);
    if (!access?.active) return { ok: false, error: "RSS erişimi kapalı" };
  }

  const feeds = await loadPortalHybridRssFeeds(siteId, "all");
  await ensurePortalRssCacheWarm(feeds);
  const match = await getPortalRssItemById(itemId, feeds);
  if (!match) return { ok: false, error: "RSS haberi bulunamadı" };

  const sourceUrl = normalizeRssSourceUrl(match.item.link);
  let deletedNewsId: number | null = null;

  if (sourceUrl) {
    const cond =
      siteId == null
        ? and(isNull(newsTable.siteId), eq(newsTable.rssSourceUrl, sourceUrl))
        : and(eq(newsTable.siteId, siteId), eq(newsTable.rssSourceUrl, sourceUrl));
    const rows = await getNewsDbForRead().select({ id: newsTable.id }).from(newsTable).where(cond).limit(1);
    if (rows[0]) {
      deletedNewsId = rows[0].id;
      await dualWriteDelete(newsTable, eq(newsTable.id, rows[0].id));
      if (siteId != null) {
        void syncHmEditorContentToYekpare({ siteIds: [siteId] }).catch(() => undefined);
      }
    }
  }

  const activeFeedIds = feeds.filter((feed) => feed.enabled && feed.url).map((feed) => feed.id);
  const removedFromDb = await deletePortalRssItemByKey(itemId, activeFeedIds);

  let removedFromCache = false;
  for (const feed of feeds) {
    if (!feed.enabled || !feed.url) continue;
    const removed = await removePortalRssCachedItem(itemId, feed.id);
    if (removed) removedFromCache = true;
  }

  return { ok: true, deletedNewsId, removedFromCache: removedFromCache || removedFromDb > 0 };
}

export type RemoveYekparePoolNewsFromSiteResult =
  | { ok: true; hiddenOnSite: true; deletedNewsId: number | null; alreadyHidden: boolean }
  | { ok: false; error: string };

async function appendHiddenPoolNewsId(siteId: number, articleId: number): Promise<{ alreadyHidden: boolean }> {
  if (!Number.isFinite(articleId) || articleId <= 0) return { alreadyHidden: false };

  const layout = await readHmPublicLayout(siteId);
  const prev = hiddenHmPoolNewsIdsFromLayout(layout);
  if (prev.includes(articleId)) return { alreadyHidden: true };

  const next = [...prev, articleId].slice(-5000);
  const merged = {
    ...layout,
    hmHiddenPoolNewsIds: next,
  };
  await dualWriteUpdate(
    hmNewsSitesTable,
    { layoutJson: JSON.stringify(merged), updatedAt: new Date() },
    eq(hmNewsSitesTable.id, siteId),
  );
  return { alreadyHidden: false };
}

/** Editör: Yekpare merkez havuz haberini yalnızca kendi sitesinden gizler. */
export async function removeYekparePoolNewsFromSite(
  siteId: number,
  articleIdRaw: unknown,
): Promise<RemoveYekparePoolNewsFromSiteResult> {
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return { ok: false, error: "Geçersiz site" };
  }

  const articleId = parseInt(String(articleIdRaw ?? ""), 10);
  if (!Number.isFinite(articleId) || articleId <= 0) {
    return { ok: false, error: "Geçersiz haber id" };
  }

  const access = await resolveHmHybridRssAccess(siteId);
  if (!access?.active) return { ok: false, error: "Haber erişimi kapalı" };
  if (access.isCorporate) return { ok: false, error: "Kurumsal sitelerde Yekpare havuzu kapalıdır." };

  const [source] = await getNewsDbForRead()
    .select({ id: newsTable.id })
    .from(newsTable)
    .where(and(eq(newsTable.id, articleId), isNull(newsTable.siteId), eq(newsTable.status, "published")))
    .limit(1);
  if (!source) return { ok: false, error: "Yekpare havuz haberi bulunamadı" };

  const localRows = await getNewsDbForRead()
    .select({ id: newsTable.id })
    .from(newsTable)
    .where(
      and(
        eq(newsTable.siteId, siteId),
        sql`${newsTable.rssSourceUrl} like ${`yekpare-hm-pool:%:${articleId}`}`,
      ),
    )
    .limit(1);
  let deletedNewsId: number | null = null;
  if (localRows[0]) {
    await dualWriteDelete(newsTable, eq(newsTable.id, localRows[0].id));
    deletedNewsId = localRows[0].id;
    void syncHmEditorContentToYekpare({ siteIds: [siteId] }).catch(() => undefined);
  }

  const { alreadyHidden } = await appendHiddenPoolNewsId(siteId, articleId);
  return { ok: true, hiddenOnSite: true, deletedNewsId, alreadyHidden };
}
