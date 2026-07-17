import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getNewsDbForRead, categoriesTable } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { logger } from "../lib/logger.js";
import {
  getRssAutomationStatus,
  setRssAutomationEnabled,
  shouldRunRssAutomationTick,
} from "../lib/rss-automation-control.js";
import {
  enabledPortalHybridRssFeeds,
  feedMatchesCategorySlug,
  loadPortalHybridRssFeeds,
  resolveHmHybridRssAccess,
} from "../lib/portal-hybrid-config.js";
import {
  getPortalRssCacheStatus,
  getPortalRssCachedItemsForFeeds,
  getPortalRssItemById,
  isBoxScopeFeedId,
  refreshAllPortalRssFeeds,
  refreshPortalRssFeed,
} from "../lib/portal-rss-cache.js";
import { readPortalRssItemsForFeeds, incrementPortalRssItemView } from "../lib/portal-rss-store.js";
import {
  filterForeignOnlyPortalHybridRssFeeds,
  filterForeignOnlyPortalRssItems,
} from "../lib/hybrid-news-foreign-rss.js";
import {
  loadPortalDbNews,
  loadHmSiteDbNews,
  loadEditorScopedDbNews,
  resolveEditorScopedPoolOpts,
  applyEditorSourceAttribution,
  applyNewsSiteOverrides,
  mergeHybridNews,
  enrichHybridNewsListImages,
  sanitizeHybridNewsItemForPublic,
  stripExternalAnchorsFromHtml,
  parseHybridExcludeIds,
  pickNextHybridInfiniteItem,
  HYBRID_ROTATE_SOURCES,
  scopeNewsContextForSite,
  resolveActivatedSet,
  filterRssItemsByActivatedSet,
  filterRssItemsByHiddenSet,
  shouldApplyActivatedPoolCategoryFilter,
} from "../lib/hybrid-news-merge.js";
import {
  enrichSerializedNewsListImages,
  filterHiddenPoolNewsItems,
} from "../lib/news-list-image-enrich.js";
import { enrichHybridNewsItemsWithOrigins } from "../lib/hybrid-news-origin.js";
import { loadNewsContext } from "../lib/news-context.js";
import { portalRssInternalHref, normalizePortalRssCachedContentHtml, rssSourceNameFromUrl } from "../lib/portal-rss-fetch.js";
import { sanitizeCumhaRssSpot } from "../lib/rssCumhaExclude.js";
import { decodeHtmlEntities } from "../lib/decodeHtmlEntities.js";
import {
  loadEnabledGlobalMapNewsFeeds,
  mergePortalHybridRssFeedLists,
} from "../lib/global-map-news-feeds.js";
import { loadWorldBriefs } from "../lib/world-briefs-service.js";
import { filterHmCategoryContentGuard, passesHmCategoryContentGuard } from "../lib/hm-category-content-guard.js";
import {
  filterNewsItemsForSiteGlobalPolicy,
  isGlobalNewsCategoryEnabledOnSite,
  isHmGlobalNewsCategorySlug,
} from "../lib/hm-global-news-category.js";
import { filterCorporatePublicNewsItems } from "../lib/hm-corporate-news-policy.js";
import { findNewsSlugByRssSourceLink, isPortalRssSyncToNewsEnabled } from "../lib/portal-rss-auto-import.js";
import { importPortalRssNewsByCategoryBatch } from "../lib/portal-rss-category-import.js";
import { getActiveHmNewsSiteBySlugCompat } from "../lib/hm-site-compat.js";
import {
  adminProcessOnePortalRssMetaJob,
  getPortalRssAiMetaConfig,
  getPortalRssAiMetaQueueStats,
  getPortalRssAiMetaRecentJobs,
  updatePortalRssAiMetaConfig,
} from "../lib/portal-rss-ai-meta.js";

const router: IRouter = Router();

function normalizeHybridSlugParam(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** `siteId` yoksa `slug` ile çöz — index.html erken prefetch için. */
async function resolveHybridSiteIdFromRequest(req: Request): Promise<number | null> {
  const siteIdRaw = Number(req.query.siteId ?? 0);
  if (Number.isFinite(siteIdRaw) && siteIdRaw > 0) return siteIdRaw;
  const slug = normalizeHybridSlugParam(req.query.slug);
  if (!slug) return null;
  const row = await getActiveHmNewsSiteBySlugCompat(slug);
  return row?.active ? row.id : null;
}

/** Havuz (çok kategorili) için: her öğeyi KENDİ kategori slug'ına göre içerik korumasından geçir. */
function guardItemsByOwnCategory<T extends { categorySlug?: unknown; title?: unknown }>(items: T[]): T[] {
  return items.filter((item) => passesHmCategoryContentGuard(item, String(item.categorySlug ?? "")));
}

function filterSiteHiddenRssItems<T extends { id?: string | null }>(
  items: T[],
  hiddenIds: string[] | undefined,
): T[] {
  if (!hiddenIds?.length) return items;
  return filterRssItemsByHiddenSet(items, new Set(hiddenIds));
}

function buildSiteGlobalCategoryPolicy(opts: {
  newsmapMode?: boolean;
  categorySlug?: string;
  activatedSlugs?: string[] | null;
}) {
  return {
    newsmapMode: opts.newsmapMode === true,
    activatedSlugs: opts.activatedSlugs ?? null,
    requestedCategorySlug: opts.categorySlug ?? null,
  };
}

/**
 * Editör / newsmap: TR yerel kategori RSS yerine DB; dış RSS yalnızca yurtdışı.
 * Site içi RSS (`hybridRssEnabled`) açıkken filtre kapalı — editör kendi feed’lerini kullanır.
 * Kutu içi RSS (box) zaten muaf.
 */
function useForeignOnlyHybridRss(
  editorPool: boolean,
  newsmapMode: boolean,
  rssScope: string,
  hybridRssEnabled = false,
): boolean {
  if (hybridRssEnabled) return false;
  return (editorPool || newsmapMode) && rssScope !== "box";
}

const NEWSMAP_HYBRID_RESPONSE_TTL_MS = 60_000;
type NewsmapHybridCacheEntry = { expiresAt: number; body: Record<string, unknown> };
const newsmapHybridResponseCache = new Map<string, NewsmapHybridCacheEntry>();

/**
 * Sıcak public uçlar (/news/pool, /news/hybrid) için kısa TTL yanıt önbelleği.
 * Soğuk başlangıçta (her deploy sonrası) anasayfa kategori kutuları aynı sorguları
 * yağmur gibi yağdırır; her URL için hesap 45 sn'de bir yapılır, gerisi bellekten
 * döner. Arama (`q`) içeren istekler önbelleklenmez. Veri publictir, oturuma bağlı değildir.
 */
const PUBLIC_NEWS_RESPONSE_TTL_MS = 45_000;
const PUBLIC_NEWS_RESPONSE_MAX_ENTRIES = 300;
const publicNewsResponseCache = new Map<string, { expiresAt: number; body: unknown }>();

function publicNewsCacheKey(req: Request): string | null {
  if (req.method !== "GET") return null;
  if (String(req.query.q ?? "").trim()) return null;
  if (String(req.query.excludeIds ?? "").trim()) return null;
  const categorySlug =
    typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim().toLowerCase() : "";
  const categories =
    typeof req.query.categories === "string" ? req.query.categories.trim().toLowerCase() : "";
  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  const slugParam = normalizeHybridSlugParam(req.query.slug);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20) || 20, 1), 500);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const rssScopeRaw = String(req.query.rssScope ?? "").trim();
  const rssScope = rssScopeRaw === "box" ? "box" : rssScopeRaw === "all" ? "all" : "site";
  const dbFirst =
    String(req.query.dbFirst ?? "").trim() === "1" ||
    String(req.query.dbFirst ?? "").trim() === "true";
  const yekparePoolOnly =
    String(req.query.yekparePool ?? "").trim() === "1" ||
    String(req.query.yekparePool ?? "").trim() === "true";
  return [
    req.path,
    siteId ?? (slugParam || "portal"),
    categorySlug,
    categories,
    limit,
    offset,
    rssScope,
    dbFirst ? "db-first" : "full",
    yekparePoolOnly ? "yekpare-pool" : "mixed",
  ].join("|");
}

/**
 * Önbellek isabetinde yanıtı hemen döner (true). Kaçırmada `res.json`'u sarmalayarak
 * başarılı (200) gövdeyi önbelleğe yazar ve false döner — handler normal akışına devam eder.
 */
function servePublicNewsCached(req: Request, res: Response): boolean {
  const key = publicNewsCacheKey(req);
  if (!key) return false;

  const hit = publicNewsResponseCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.setHeader("X-Yekpare-Cache", "hit");
    res.json(hit.body);
    return true;
  }
  if (hit) publicNewsResponseCache.delete(key);

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 200) {
      if (publicNewsResponseCache.size >= PUBLIC_NEWS_RESPONSE_MAX_ENTRIES) {
        const oldestKey = publicNewsResponseCache.keys().next().value;
        if (oldestKey !== undefined) publicNewsResponseCache.delete(oldestKey);
      }
      publicNewsResponseCache.set(key, { expiresAt: Date.now() + PUBLIC_NEWS_RESPONSE_TTL_MS, body });
    }
    return originalJson(body);
  }) as typeof res.json;
  return false;
}

function newsmapHybridCacheKey(input: {
  categorySlug?: string;
  q?: string;
  limit: number;
  offset: number;
  siteId: number | null;
  rssOnly: boolean;
  rssScope: string;
  includeGlobalFeeds: boolean;
}): string {
  return [
    input.siteId ?? "portal",
    input.categorySlug ?? "",
    input.q ?? "",
    input.limit,
    input.offset,
    input.rssOnly ? "rss" : "mixed",
    input.rssScope,
    input.includeGlobalFeeds ? "global" : "local",
  ].join("|");
}

function readNewsmapHybridResponseCache(key: string): Record<string, unknown> | null {
  const hit = newsmapHybridResponseCache.get(key);
  if (!hit || hit.expiresAt <= Date.now()) {
    if (hit) newsmapHybridResponseCache.delete(key);
    return null;
  }
  return hit.body;
}

function writeNewsmapHybridResponseCache(key: string, body: Record<string, unknown>): void {
  newsmapHybridResponseCache.set(key, {
    expiresAt: Date.now() + NEWSMAP_HYBRID_RESPONSE_TTL_MS,
    body,
  });
  if (newsmapHybridResponseCache.size > 24) {
    const oldest = [...newsmapHybridResponseCache.entries()]
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0]?.[0];
    if (oldest) newsmapHybridResponseCache.delete(oldest);
  }
}

let portalRssWarmInFlight: Promise<void> | null = null;
/** İstek tetiklemeli arka plan RSS — slot başına en fazla bir kez (8 saat). */
let portalRssBackgroundRefreshAtMs = 0;
const PORTAL_RSS_BG_REFRESH_COOLDOWN_MS = Math.max(
  60 * 60_000,
  Number(process.env.PORTAL_RSS_BG_REFRESH_COOLDOWN_MS) || 8 * 60 * 60_000,
);

function mayTriggerBackgroundPortalRssRefresh(): boolean {
  const now = Date.now();
  if (now - portalRssBackgroundRefreshAtMs < PORTAL_RSS_BG_REFRESH_COOLDOWN_MS) return false;
  portalRssBackgroundRefreshAtMs = now;
  return true;
}

/**
 * Canlı RSS: portal her zaman; HM editör siteleri Site içi / kutu RSS açıkken (aksi halde cache boş kalır).
 */
function mayTriggerLivePortalRssRefresh(siteId: number | null, allowHmSite = false): boolean {
  return siteId == null || allowHmSite;
}

async function warmPortalRssCacheIfEmpty(feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>): Promise<void> {
  const activeFeeds = enabledPortalHybridRssFeeds(feeds);
  if (!activeFeeds.length) return;

  const cached = await getPortalRssCachedItemsForFeeds(feeds);
  if (cached.length > 0) return;

  if (portalRssWarmInFlight) {
    await portalRssWarmInFlight;
    return;
  }

  portalRssWarmInFlight = refreshAllPortalRssFeeds(feeds)
    .then(() => undefined)
    .finally(() => {
      portalRssWarmInFlight = null;
    });
  await portalRssWarmInFlight;
}

function triggerPortalRssWarmIfEmpty(
  feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>,
  siteId: number | null,
  allowHmSite = false,
): void {
  if (!mayTriggerLivePortalRssRefresh(siteId, allowHmSite)) return;
  void shouldRunRssAutomationTick()
    .then((allowed) => {
      if (!allowed || !mayTriggerBackgroundPortalRssRefresh()) return;
      return warmPortalRssCacheIfEmpty(feeds);
    })
    .catch((err) => {
      console.warn("[portal-rss] background warm failed", err instanceof Error ? err.message : err);
    });
}

function triggerUnderfilledRssRefresh(
  feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>,
  siteId: number | null,
  allowHmSite = false,
): void {
  if (!mayTriggerLivePortalRssRefresh(siteId, allowHmSite)) return;
  void (async () => {
    if (!(await shouldRunRssAutomationTick())) return;
    if (!mayTriggerBackgroundPortalRssRefresh()) return;
    const cacheStatus = await getPortalRssCacheStatus(feeds);
    const underfilledFeeds = feeds.filter((feed) => {
      const status = cacheStatus.find((row) => row.feedId === feed.id);
      return feed.enabled && feed.url && (!status?.cached || status.expired || status.refreshDue || status.itemCount < feed.maxItems);
    });
    if (underfilledFeeds.length > 0) {
      await Promise.all(underfilledFeeds.map((feed) => refreshPortalRssFeed(feed).catch(() => null)));
    }
  })().catch((err) => {
    console.warn("[portal-rss] background refresh failed", err instanceof Error ? err.message : err);
  });
}

router.get("/news/world-briefs", async (req, res): Promise<void> => {
  const perFeed = Number(req.query.perFeed ?? req.query.limit ?? 0);
  const warm = String(req.query.warm ?? "1").trim() !== "0";

  try {
    const payload = await loadWorldBriefs({ perFeed: perFeed > 0 ? perFeed : undefined, warmCache: warm });
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
    res.json(payload);
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Dünyadan kısa kısa haberler alınamadı",
    });
  }
});

/**
 * DB tabanlı haber havuzu — CANLI RSS YOK. `portal_rss_items` (arka planda senkronlanan)
 * + yayınlanmış DB haberleri birleştirir, kategori(ler)e göre süzer, sayfalar.
 *
 *   GET /api/news/pool?categories=teknoloji,gundem&limit=20&offset=0&siteId=12
 *
 * Editör siteleri yalnızca admin panelinde AKTİF ettikleri kategorilerin haberlerini
 * çeker: `categories` boşsa site/portal havuzunun tümü döner; doluysa yalnızca o slug'lar.
 */
router.get("/news/pool", async (req, res): Promise<void> => {
  if (servePublicNewsCached(req, res)) return;
  const rawCategories = typeof req.query.categories === "string" ? req.query.categories : "";
  const categorySlugs = rawCategories
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;

  try {
    let poolAccess: Awaited<ReturnType<typeof resolveHmHybridRssAccess>> = null;
    if (siteId != null) {
      poolAccess = await resolveHmHybridRssAccess(siteId);
      if (!poolAccess || !poolAccess.active) {
        res.status(404).json({ error: "Site bulunamadı" });
        return;
      }
    }

    const ctx = await loadNewsContext();
    const perCatLimit = Math.min(limit + offset + 100, 300);
    const catList = categorySlugs.length ? categorySlugs : [undefined];

    // DB haberleri — kategori başına yükle, id ile tekilleştir.
    const dbById = new Map<number, Awaited<ReturnType<typeof loadPortalDbNews>>["items"][number]>();
    const poolOpts = poolAccess ? resolveEditorScopedPoolOpts(poolAccess) : null;
    for (const slug of catList) {
      const result =
        siteId != null
          ? await loadEditorScopedDbNews({
              siteId,
              categorySlug: slug,
              q,
              limit: perCatLimit,
              offset: 0,
              ...(poolOpts ?? {
                activatedSlugs: poolAccess?.activatedCategorySlugs,
                activationDefault: "all" as const,
                hiddenPoolNewsIds: poolAccess?.hiddenPoolNewsIds,
                excludeCentralPool: false,
              }),
            })
          : await loadPortalDbNews({ categorySlug: slug, q, limit: perCatLimit, offset: 0 });
      for (const item of result.items) dbById.set(item.id, item);
    }

    const useRssPool = !isPortalRssSyncToNewsEnabled() && !poolAccess?.isCorporate;
    let filteredRss: Awaited<ReturnType<typeof readPortalRssItemsForFeeds>> = [];
    let feedLabels: Record<string, string> = {};
    let feedGeoById: Record<string, { countryCode: string | null; regionKey: string | null }> = {};
    if (useRssPool) {
      // Kalıcı RSS havuzu (canlı çekim yok) — box scope hariç, kategori süzgeçli.
      const feeds = (await loadPortalHybridRssFeeds(siteId, "all")).filter((feed) => !isBoxScopeFeedId(feed.id));
      const activeFeeds = enabledPortalHybridRssFeeds(feeds);
      feedLabels = Object.fromEntries(activeFeeds.map((feed) => [feed.id, feed.label]));
      feedGeoById = Object.fromEntries(
        activeFeeds.map((feed) => [
          feed.id,
          { countryCode: feed.countryCode ?? null, regionKey: feed.regionKey ?? null },
        ]),
      );
      const allRss = await readPortalRssItemsForFeeds(activeFeeds);
      const rssItems = categorySlugs.length
        ? allRss.filter((item) => categorySlugs.some((slug) => feedMatchesCategorySlug(item.categorySlug, slug)))
        : allRss;
      const qFilteredRss = q
        ? rssItems.filter((item) => item.title.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")))
        : rssItems;
      filteredRss =
        siteId != null && categorySlugs.length === 0
          ? filterRssItemsByActivatedSet(
              qFilteredRss,
              resolveActivatedSet(
                poolAccess?.activatedCategorySlugs,
                "all",
              ),
            )
          : qFilteredRss;
      if (siteId != null) {
        filteredRss = filterSiteHiddenRssItems(filteredRss, poolAccess?.hiddenRssItemIds);
      }
    }

    // İçerik koruması: SPOR'a etiketlenmiş siyaset haberlerini havuzdan çıkar (kendi slug'ına göre).
    const merged = mergeHybridNews({
      dbItems: guardItemsByOwnCategory([...dbById.values()]),
      rssItems: guardItemsByOwnCategory(filteredRss),
      feedLabels,
      limit,
      offset,
      ctx: scopeNewsContextForSite(ctx, siteId),
    });
    const enriched = await enrichHybridNewsItemsWithOrigins(merged.items);
    const siteGlobalPolicy = buildSiteGlobalCategoryPolicy({
      activatedSlugs: poolAccess?.activatedCategorySlugs ?? null,
    });
    let visibleItems = filterNewsItemsForSiteGlobalPolicy(enriched, {
      ...siteGlobalPolicy,
      feedGeoById,
    });
    if (poolAccess?.isCorporate) {
      visibleItems = filterCorporatePublicNewsItems(visibleItems, { siteSlug: poolAccess.slug });
    }

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=180");
    res.json({
      items: visibleItems.map(sanitizeHybridNewsItemForPublic),
      total: visibleItems.length,
      limit,
      offset,
      categories: categorySlugs,
      siteId,
      sources: { db: merged.dbCount, rss: merged.rssCount },
    });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Haber havuzu alınamadı" });
  }
});

router.get("/news/hybrid", async (req, res): Promise<void> => {
  const resolvedSiteId = await resolveHybridSiteIdFromRequest(req);
  if (resolvedSiteId != null && !String(req.query.siteId ?? "").trim()) {
    req.query.siteId = String(resolvedSiteId);
  }
  if (servePublicNewsCached(req, res)) return;
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim().toLowerCase() : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const newsmapMode =
    String(req.query.newsmap ?? "").trim() === "1" ||
    String(req.query.newsmap ?? "").trim() === "true";
  const limit = Math.min(
    Math.max(Number(req.query.limit ?? 20) || 20, 1),
    newsmapMode ? 500 : 100,
  );
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  const rssOnly = String(req.query.rssOnly ?? "").trim() === "1" || String(req.query.source ?? "").trim() === "rss";
  const rssScopeRaw = String(req.query.rssScope ?? "").trim();
  const rssScope = rssScopeRaw === "box" ? "box" : rssScopeRaw === "all" ? "all" : "site";
  const includeGlobalFeeds =
    String(req.query.global ?? "").trim() === "1" ||
    String(req.query.global ?? "").trim() === "true" ||
    String(req.query.newsmap ?? "").trim() === "1" ||
    String(req.query.newsmap ?? "").trim() === "true";
  const dbFirst =
    !rssOnly &&
    (String(req.query.dbFirst ?? "").trim() === "1" ||
      String(req.query.dbFirst ?? "").trim() === "true");
  const yekparePoolOnly =
    String(req.query.yekparePool ?? "").trim() === "1" ||
    String(req.query.yekparePool ?? "").trim() === "true";

  /**
   * Editör sitesi (box hariç): Site içi RSS açıksa site feed'leri; kapalıysa Yekpare
   * merkez + yabancı-only. Kutu içi RSS (rssScope=box) canlı ve ayrı.
   */
  const editorPool = siteId != null && rssScope !== "box";
  // hybridRssEnabled resolve sonrası güncellenir (dbFirst / ana path).
  let foreignOnlyRss = useForeignOnlyHybridRss(editorPool && !yekparePoolOnly, newsmapMode, rssScope, false);

  try {
    /** Phase-1 fast path — DB only, RSS warm in background (newsmap + anasayfa ilk boyama). */
    if (dbFirst) {
      const [ctx, hmAccess] = await Promise.all([
        loadNewsContext(),
        siteId != null ? resolveHmHybridRssAccess(siteId) : Promise.resolve(null),
      ]);
      if (siteId != null) {
        if (!hmAccess || !hmAccess.active) {
          res.status(404).json({ error: "Site bulunamadı" });
          return;
        }
        foreignOnlyRss = useForeignOnlyHybridRss(
          editorPool && !yekparePoolOnly,
          newsmapMode,
          rssScope,
          hmAccess.hybridRssEnabled === true,
        );
      }

      const poolOpts = hmAccess ? resolveEditorScopedPoolOpts(hmAccess) : null;
      const includeCachedRss =
        !hmAccess?.isCorporate &&
        (yekparePoolOnly ||
          newsmapMode ||
          editorPool ||
          (!isPortalRssSyncToNewsEnabled() && siteId == null));
      const dbLimit = Math.min(limit, 200);
      const poolActivationDefault = poolOpts?.activationDefault ?? "all";

      const loadDbResult = async () => {
        if (yekparePoolOnly && siteId != null) {
          if (hmAccess?.isCorporate) {
            return { items: [], total: 0 };
          }
          const portal = await loadPortalDbNews({ categorySlug, q, limit: dbLimit, offset: 0 });
          const activated = resolveActivatedSet(hmAccess?.activatedCategorySlugs, poolActivationDefault);
          let items = portal.items;
          if (activated && shouldApplyActivatedPoolCategoryFilter(categorySlug)) {
            items = items.filter((item) => {
              const slug = String(item.categorySlug ?? "").trim().toLowerCase();
              if (!slug) return false;
              if (activated.has(slug)) return true;
              for (const want of activated) {
                if (slug === want || slug.endsWith(`-${want}`) || want.endsWith(`-${slug}`)) return true;
              }
              return false;
            });
          }
          items = await applyNewsSiteOverrides(items, siteId);
          items = filterHiddenPoolNewsItems(items, hmAccess?.hiddenPoolNewsIds);
          items = await enrichSerializedNewsListImages(items);
          return { items, total: items.length };
        }
        return editorPool
          ? loadEditorScopedDbNews({
              siteId: siteId!,
              categorySlug,
              q,
              limit: dbLimit,
              offset: 0,
              ...(poolOpts ?? {
                activatedSlugs: hmAccess?.activatedCategorySlugs,
                activationDefault: poolActivationDefault,
                hiddenPoolNewsIds: hmAccess?.hiddenPoolNewsIds,
                excludeCentralPool: false,
              }),
            })
          : siteId != null
            ? loadHmSiteDbNews({ siteId, categorySlug, q, limit: dbLimit, offset: 0 })
            : loadPortalDbNews({ categorySlug, q, limit: dbLimit, offset: 0 });
      };

      const loadCachedRssBundle = async () => {
        let mapRssItems: Awaited<ReturnType<typeof getPortalRssCachedItemsForFeeds>> = [];
        let mapFeedLabels: Record<number, string> = {};
        let mapFeedGeoById: Record<number, {
          geoLat: number | null;
          geoLng: number | null;
          regionKey: string | null;
          regionLabel: string | null;
          countryCode: string | null;
        }> = {};
        if (!includeCachedRss) {
          return { mapRssItems, mapFeedLabels, mapFeedGeoById };
        }
        const scopeForFeeds = editorPool ? "all" : rssScope;
        const mapFeeds = await loadPortalHybridRssFeeds(editorPool ? siteId! : siteId, scopeForFeeds);
        let scopeFeeds = editorPool ? mapFeeds.filter((feed) => !isBoxScopeFeedId(feed.id)) : mapFeeds;
        if (foreignOnlyRss) {
          scopeFeeds = filterForeignOnlyPortalHybridRssFeeds(scopeFeeds);
        }
        const mapLabelFeeds = enabledPortalHybridRssFeeds(scopeFeeds);
        const mapActiveFeeds = enabledPortalHybridRssFeeds(scopeFeeds, categorySlug);
        mapFeedLabels = Object.fromEntries(mapLabelFeeds.map((feed) => [feed.id, feed.label]));
        mapFeedGeoById = Object.fromEntries(
          mapLabelFeeds.map((feed) => [
            feed.id,
            {
              geoLat: feed.geoLat ?? null,
              geoLng: feed.geoLng ?? null,
              regionKey: feed.regionKey ?? null,
              regionLabel: feed.regionLabel ?? null,
              countryCode: feed.countryCode ?? null,
            },
          ]),
        );
        let cachedMapRss = await getPortalRssCachedItemsForFeeds(mapActiveFeeds, categorySlug);
        if (editorPool && shouldApplyActivatedPoolCategoryFilter(categorySlug)) {
          cachedMapRss = filterRssItemsByActivatedSet(
            cachedMapRss,
            resolveActivatedSet(
              hmAccess?.activatedCategorySlugs,
              poolActivationDefault,
            ),
          );
        }
        if (foreignOnlyRss) {
          cachedMapRss = filterForeignOnlyPortalRssItems(cachedMapRss, mapFeedGeoById);
        }
        cachedMapRss = filterSiteHiddenRssItems(cachedMapRss, hmAccess?.hiddenRssItemIds);
        mapRssItems = q
          ? cachedMapRss.filter((item) => item.title.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")))
          : cachedMapRss;
        return { mapRssItems, mapFeedLabels, mapFeedGeoById };
      };

      const [dbResult, rssBundle] = await Promise.all([loadDbResult(), loadCachedRssBundle()]);
      const { mapRssItems, mapFeedLabels, mapFeedGeoById } = rssBundle;

      // dbFirst: RSS ısınmasını istek yolunda BEKLEME (eskiden 12s'ye kadar blokluyordu).
      // Aşağıdaki triggerPortalRssWarmIfEmpty arka planda doldurur; bir sonraki istek cache'ten alır.

      // İçerik koruması: istenen kategori SPOR ise siyaset sızıntısını (DB + harita RSS) at.
      const merged = mergeHybridNews({
        dbItems: filterHmCategoryContentGuard(dbResult.items, categorySlug),
        rssItems: filterHmCategoryContentGuard(mapRssItems, categorySlug),
        feedLabels: mapFeedLabels,
        feedGeoById: mapFeedGeoById,
        limit,
        offset,
        ctx: scopeNewsContextForSite(ctx, siteId),
      });
      const imageEnriched = await enrichHybridNewsListImages(merged.items);
      const enrichedRaw = await enrichHybridNewsItemsWithOrigins(imageEnriched);
      const enriched = editorPool ? applyEditorSourceAttribution(enrichedRaw, siteId!) : enrichedRaw;
      const siteGlobalPolicy = buildSiteGlobalCategoryPolicy({
        newsmapMode: yekparePoolOnly ? false : newsmapMode,
        categorySlug,
        activatedSlugs: hmAccess?.activatedCategorySlugs ?? null,
      });
      let visibleItems = filterNewsItemsForSiteGlobalPolicy(enriched, {
        ...siteGlobalPolicy,
        feedGeoById: mapFeedGeoById,
      });
      if (hmAccess?.isCorporate) {
        visibleItems = filterCorporatePublicNewsItems(visibleItems, { siteSlug: hmAccess.slug });
      }
      if (yekparePoolOnly && siteId != null) {
        visibleItems = visibleItems.filter((item) => item.publishedOnSiteId == null);
      }
      void loadPortalHybridRssFeeds(editorPool ? siteId! : siteId, editorPool ? "all" : rssScope)
        .then((feeds) => (editorPool ? feeds.filter((feed) => !isBoxScopeFeedId(feed.id)) : feeds))
        .then((feeds) => {
          if (includeGlobalFeeds && rssScope === "all") {
            return loadEnabledGlobalMapNewsFeeds().then((globalFeeds) =>
              mergePortalHybridRssFeedLists(feeds, globalFeeds),
            );
          }
          return feeds;
        })
        .then((feeds) =>
          foreignOnlyRss
            ? filterForeignOnlyPortalHybridRssFeeds(feeds)
            : feeds,
        )
        .then((feeds) => triggerPortalRssWarmIfEmpty(feeds, siteId, hmAccess?.hybridRssEnabled === true || rssScope === "box"))
        .catch(() => null);
      res.setHeader(
        "Cache-Control",
        newsmapMode
          ? "public, max-age=30, s-maxage=120, stale-while-revalidate=300"
          : "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      );
      res.json({
        items: visibleItems.map(sanitizeHybridNewsItemForPublic),
        total: visibleItems.length,
        limit,
        offset,
        categorySlug: categorySlug ?? null,
        siteId,
        rssOnly: false,
        rssScope,
        globalFeeds: includeGlobalFeeds && rssScope === "all",
        hybridRssEnabled: siteId != null ? hmAccess?.hybridRssEnabled === true : null,
        dbFirst: true,
        sources: { db: merged.dbCount, rss: merged.rssCount },
      });
      return;
    }

    const cacheKey = newsmapMode
      ? newsmapHybridCacheKey({
          categorySlug,
          q,
          limit,
          offset,
          siteId,
          rssOnly,
          rssScope,
          includeGlobalFeeds,
        })
      : null;
    if (cacheKey) {
      const cachedBody = readNewsmapHybridResponseCache(cacheKey);
      if (cachedBody) {
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
        res.json(cachedBody);
        void loadPortalHybridRssFeeds(siteId, rssScope)
          .then((bgFeeds) => {
            if (includeGlobalFeeds && rssScope === "all") {
              return loadEnabledGlobalMapNewsFeeds().then((globalFeeds) =>
                mergePortalHybridRssFeedLists(bgFeeds, globalFeeds),
              );
            }
            return bgFeeds;
          })
          .then((bgFeeds) =>
            foreignOnlyRss ? filterForeignOnlyPortalHybridRssFeeds(bgFeeds) : bgFeeds,
          )
          .then((bgFeeds) =>
            triggerUnderfilledRssRefresh(
              enabledPortalHybridRssFeeds(bgFeeds, categorySlug),
              siteId,
              rssScope === "box",
            ),
          )
          .catch(() => null);
        return;
      }
    }

    let includeRss = true;
    let hmAccess: Awaited<ReturnType<typeof resolveHmHybridRssAccess>> = null;

    if (siteId != null) {
      hmAccess = await resolveHmHybridRssAccess(siteId);
      if (!hmAccess || !hmAccess.active) {
        res.status(404).json({ error: "Site bulunamadı" });
        return;
      }
      // Box her zaman; site-içi RSS yalnızca vitrin anahtarı açıkken.
      includeRss = rssScope === "box" ? true : hmAccess.hybridRssEnabled === true;
      foreignOnlyRss = useForeignOnlyHybridRss(
        editorPool && !yekparePoolOnly,
        newsmapMode,
        rssScope,
        hmAccess.hybridRssEnabled === true,
      );
    }

    // Site içi RSS açık → site feed'leri. Kapalı editör → Yekpare merkez (yabancı-only).
    let feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>;
    if (rssScope === "box") {
      feeds = await loadPortalHybridRssFeeds(siteId, "box");
    } else if (siteId != null && hmAccess?.hybridRssEnabled === true) {
      feeds = (await loadPortalHybridRssFeeds(siteId, "all")).filter((feed) => !isBoxScopeFeedId(feed.id));
    } else if (editorPool) {
      feeds = filterForeignOnlyPortalHybridRssFeeds(await loadPortalHybridRssFeeds(null, "site"));
    } else {
      feeds = await loadPortalHybridRssFeeds(siteId, rssScope);
    }
    if (includeGlobalFeeds && rssScope === "all") {
      const globalFeeds = await loadEnabledGlobalMapNewsFeeds();
      feeds = mergePortalHybridRssFeedLists(feeds, globalFeeds);
    }
    if (foreignOnlyRss && !(siteId != null && hmAccess?.hybridRssEnabled === true)) {
      feeds = filterForeignOnlyPortalHybridRssFeeds(feeds);
    }

    const activeFeeds = enabledPortalHybridRssFeeds(feeds, categorySlug);
    // Öğeler feed kategorisinden bağımsız (per-item) süzülür; etiket/geo eşlemesini
    // tüm etkin feed'lerden kur ki kategori kutusundaki her öğe kaynağını gösterebilsin.
    const labelFeeds = enabledPortalHybridRssFeeds(feeds);
    const feedLabels = Object.fromEntries(labelFeeds.map((feed) => [feed.id, feed.label]));
    const feedGeoById = Object.fromEntries(
      labelFeeds.map((feed) => [
        feed.id,
        {
          geoLat: feed.geoLat ?? null,
          geoLng: feed.geoLng ?? null,
          regionKey: feed.regionKey ?? null,
          regionLabel: feed.regionLabel ?? null,
          countryCode: feed.countryCode ?? null,
        },
      ]),
    );

    /**
     * Sayfa açılışında CANLI RSS beklenmez. Portal/site scope beslemeleri kalıcı
     * DB havuzundan (portal_rss_items) okunur; canlı tazeleme yalnızca yekpare.net'te.
     * Kutu içi RSS (box) canlı kalır — yalnızca portal isteklerinde.
     */
    // Kutu içi RSS tüm HM sitelerde ziyaret tetiklemeli canlı kalır (DB yok); site-içi moda göre cache/DB.
    const boxLive = rssScope === "box";
    const allowHmLiveRss = siteId != null && (hmAccess?.hybridRssEnabled === true || boxLive);
    if (includeRss && rssOnly && boxLive) {
      await warmPortalRssCacheIfEmpty(feeds);
    } else if (includeRss && allowHmLiveRss && !boxLive) {
      // Site içi RSS: boş cache’te isteği bekleterek doldur (bg cooldown atlanır).
      const cachedProbe = await getPortalRssCachedItemsForFeeds(activeFeeds, categorySlug);
      if (cachedProbe.length === 0) {
        await Promise.race([
          warmPortalRssCacheIfEmpty(feeds),
          new Promise<void>((resolve) => setTimeout(resolve, 12_000)),
        ]);
      } else {
        triggerPortalRssWarmIfEmpty(feeds, siteId, allowHmLiveRss);
      }
    } else if (includeRss) {
      triggerPortalRssWarmIfEmpty(feeds, siteId, allowHmLiveRss);
    }

    if (includeRss && rssOnly && (boxLive || hmAccess?.hybridRssEnabled === true)) {
      const cacheStatus = await getPortalRssCacheStatus(activeFeeds);
      const underfilledFeeds = activeFeeds.filter((feed) => {
        const status = cacheStatus.find((row) => row.feedId === feed.id);
        return !status?.cached || status.expired || status.refreshDue || status.itemCount < feed.maxItems;
      });
      if (underfilledFeeds.length > 0) {
        await Promise.all(underfilledFeeds.map((feed) => refreshPortalRssFeed(feed).catch(() => null)));
      }
    } else if (includeRss) {
      triggerUnderfilledRssRefresh(activeFeeds, siteId, allowHmLiveRss);
    }

    const mergeRssFromCache =
      includeRss &&
      !hmAccess?.isCorporate &&
      (newsmapMode || rssScope === "box" || editorPool || !isPortalRssSyncToNewsEnabled());

    const editorPoolOpts = hmAccess ? resolveEditorScopedPoolOpts(hmAccess) : null;
    const [dbResult, initialRssItems, ctx] = await Promise.all([
      rssOnly
        ? Promise.resolve({ items: [], total: 0 })
        : editorPool
          ? loadEditorScopedDbNews({
              siteId: siteId!,
              categorySlug,
              q,
              limit: 200,
              offset: 0,
              ...(editorPoolOpts ?? {
                activatedSlugs: hmAccess?.activatedCategorySlugs,
                activationDefault: "all" as const,
                hiddenPoolNewsIds: hmAccess?.hiddenPoolNewsIds,
                excludeCentralPool: false,
              }),
            })
          : siteId != null
            ? loadHmSiteDbNews({ siteId, categorySlug, q, limit: 200, offset: 0 })
            : loadPortalDbNews({ categorySlug, q, limit: 200, offset: 0 }),
      mergeRssFromCache ? getPortalRssCachedItemsForFeeds(feeds, categorySlug) : Promise.resolve([]),
      loadNewsContext(),
    ]);
    let rssItems = initialRssItems;

    // Editör havuzu (kutu hariç): Yekpare RSS öğelerini editörün ETKİN genel
    // kategorilerine göre süz. Kurumsal sitede yalnızca açıkça etkinleştirilen
    // kategoriler (ör. savunma-sanayi) görünür; etkinleştirilmemiş genel RSS
    // (dunya, turkiye vb.) akışı boğmaz. Haber sitesinde varsayılan "all" → filtre yok.
    if (editorPool && shouldApplyActivatedPoolCategoryFilter(categorySlug)) {
      const activatedRss = resolveActivatedSet(
        hmAccess?.activatedCategorySlugs,
        editorPoolOpts?.activationDefault ?? "all",
      );
      rssItems = filterRssItemsByActivatedSet(rssItems, activatedRss);
    }
    if (foreignOnlyRss) {
      rssItems = filterForeignOnlyPortalRssItems(rssItems, feedGeoById);
    }
    if (siteId != null) {
      rssItems = filterSiteHiddenRssItems(rssItems, hmAccess?.hiddenRssItemIds);
    }

    if (
      mayTriggerLivePortalRssRefresh(siteId, allowHmLiveRss) &&
      includeRss &&
      rssOnly &&
      boxLive &&
      activeFeeds.length > 0 &&
      rssItems.length > 0 &&
      rssItems.every((item) => !String(item.imageUrl ?? "").trim())
    ) {
      await Promise.all(activeFeeds.map((feed) => refreshPortalRssFeed(feed).catch(() => null)));
      rssItems = await getPortalRssCachedItemsForFeeds(feeds, categorySlug);
    }

    // İçerik koruması: istenen kategori SPOR ise siyaset sızıntısını hem DB hem RSS'ten at.
    const merged = mergeHybridNews({
      dbItems: filterHmCategoryContentGuard(dbResult.items, categorySlug),
      rssItems: filterHmCategoryContentGuard(
        q
          ? rssItems.filter((item) => item.title.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")))
          : rssItems,
        categorySlug,
      ),
      feedLabels,
      feedGeoById,
      limit,
      offset,
      ctx: scopeNewsContextForSite(ctx, siteId),
    });

    const imageEnriched = await enrichHybridNewsListImages(merged.items);
    const enrichedRaw = await enrichHybridNewsItemsWithOrigins(imageEnriched);
    const enriched = editorPool ? applyEditorSourceAttribution(enrichedRaw, siteId!) : enrichedRaw;
    const siteGlobalPolicy = buildSiteGlobalCategoryPolicy({
      newsmapMode,
      categorySlug,
      activatedSlugs: hmAccess?.activatedCategorySlugs ?? null,
    });
    let visibleItems = filterNewsItemsForSiteGlobalPolicy(enriched, {
      ...siteGlobalPolicy,
      feedGeoById,
    });
    if (hmAccess?.isCorporate) {
      visibleItems = filterCorporatePublicNewsItems(visibleItems, { siteSlug: hmAccess.slug });
    }

    if (includeRss && rssItems.length === 0 && activeFeeds.length > 0) {
      const cacheStatus = await getPortalRssCacheStatus(feeds);
      const stale = cacheStatus.filter((row) => row.enabled && row.itemCount === 0);
      if (stale.length) {
        console.warn(
          "[portal-rss] hybrid RSS cache empty",
          stale.map((row) => ({ feedId: row.feedId, reason: row.reason, url: row.url ? "set" : "missing" })),
        );
      }
    }

    const responseBody = {
      items: visibleItems.map(sanitizeHybridNewsItemForPublic),
      total: visibleItems.length,
      limit,
      offset,
      categorySlug: categorySlug ?? null,
      siteId,
      rssOnly,
      rssScope,
      globalFeeds: includeGlobalFeeds && rssScope === "all",
      hybridRssEnabled: siteId != null ? hmAccess?.hybridRssEnabled === true : null,
      sources: {
        db: merged.dbCount,
        rss: merged.rssCount,
      },
    };

    if (cacheKey) {
      writeNewsmapHybridResponseCache(cacheKey, responseBody);
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    } else {
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    }
    res.json(responseBody);
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Hibrit haber listesi alınamadı",
    });
  }
});

router.get("/news/hybrid/infinite", async (req, res): Promise<void> => {
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim().toLowerCase() : undefined;
  const cursor = Math.max(Number(req.query.cursor ?? 0) || 0, 0);
  const excludeIds = parseHybridExcludeIds(req.query.excludeIds);
  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  const editorPool = siteId != null;

  try {
    let includeRss = true;
    let hmAccess: Awaited<ReturnType<typeof resolveHmHybridRssAccess>> = null;

    if (siteId != null) {
      hmAccess = await resolveHmHybridRssAccess(siteId);
      if (!hmAccess || !hmAccess.active) {
        res.status(404).json({ error: "Site bulunamadı" });
        return;
      }
      includeRss = hmAccess.hybridRssEnabled === true;
    }

    let feeds: Awaited<ReturnType<typeof loadPortalHybridRssFeeds>>;
    if (siteId != null && hmAccess?.hybridRssEnabled === true) {
      feeds = (await loadPortalHybridRssFeeds(siteId, "all")).filter((feed) => !isBoxScopeFeedId(feed.id));
    } else if (editorPool) {
      feeds = filterForeignOnlyPortalHybridRssFeeds(await loadPortalHybridRssFeeds(null, "site"));
      includeRss = true;
    } else {
      feeds = await loadPortalHybridRssFeeds(siteId, "all");
    }

    const activeFeeds = enabledPortalHybridRssFeeds(feeds, categorySlug);
    const feedLabels = Object.fromEntries(activeFeeds.map((feed) => [feed.id, feed.label]));
    const feedGeoById = Object.fromEntries(
      activeFeeds.map((feed) => [
        feed.id,
        { countryCode: feed.countryCode ?? null, regionKey: feed.regionKey ?? null },
      ]),
    );

    if (includeRss) {
      triggerPortalRssWarmIfEmpty(feeds, siteId, hmAccess?.hybridRssEnabled === true);
    }

    const mergeRssFromCache = includeRss && (editorPool || !isPortalRssSyncToNewsEnabled());

    const [rssItemsRaw, ctx] = await Promise.all([
      mergeRssFromCache ? getPortalRssCachedItemsForFeeds(feeds, categorySlug) : Promise.resolve([]),
      loadNewsContext(),
    ]);
    // Editör sonsuz kaydırması: RSS'i ETKİN genel kategorilere göre süz (kurumsal → yalnızca aktif).
    const rssItemsActivated =
      editorPool && shouldApplyActivatedPoolCategoryFilter(categorySlug)
        ? filterRssItemsByActivatedSet(
            rssItemsRaw,
            resolveActivatedSet(hmAccess?.activatedCategorySlugs, "all"),
          )
        : rssItemsRaw;
    const rssItemsForeignFiltered =
      editorPool && hmAccess?.hybridRssEnabled !== true
        ? filterForeignOnlyPortalRssItems(
            rssItemsActivated,
            Object.fromEntries(
              activeFeeds.map((feed) => [
                feed.id,
                { countryCode: feed.countryCode ?? null, regionKey: feed.regionKey ?? null },
              ]),
            ),
          )
        : rssItemsActivated;
    const rssItemsHiddenFiltered = filterSiteHiddenRssItems(
      rssItemsForeignFiltered,
      hmAccess?.hiddenRssItemIds,
    );
    // İçerik koruması: SPOR sonsuz akışına siyaset sızmasın.
    const rssItems = filterHmCategoryContentGuard(rssItemsHiddenFiltered, categorySlug);

    const picked = await pickNextHybridInfiniteItem({
      cursor,
      excludeIds,
      categorySlug,
      siteId,
      includeRss,
      rssItems,
      feedLabels,
      ctx,
      includePortalPool: editorPool,
      activatedSlugs: hmAccess?.activatedCategorySlugs,
      activationDefault: "all",
    });

    const [enrichedRawItem] = picked.item
      ? await enrichHybridNewsItemsWithOrigins([picked.item])
      : [null];
    const enrichedItem =
      enrichedRawItem && editorPool
        ? applyEditorSourceAttribution([enrichedRawItem], siteId!)[0] ?? null
        : enrichedRawItem;
    const siteGlobalPolicy = buildSiteGlobalCategoryPolicy({
      categorySlug,
      activatedSlugs: hmAccess?.activatedCategorySlugs ?? null,
    });
    const visibleItemRaw = enrichedItem
      ? (filterNewsItemsForSiteGlobalPolicy([enrichedItem], { ...siteGlobalPolicy, feedGeoById })[0] ?? null)
      : null;
    const visibleItem =
      visibleItemRaw && hmAccess?.isCorporate
        ? (filterCorporatePublicNewsItems([visibleItemRaw], { siteSlug: hmAccess.slug })[0] ?? null)
        : visibleItemRaw;

    res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    res.json({
      item: visibleItem ? sanitizeHybridNewsItemForPublic(visibleItem) : null,
      cursor: picked.cursor,
      source: picked.source,
      exhausted: picked.exhausted,
      rotate: HYBRID_ROTATE_SOURCES,
      pools: picked.pools,
      categorySlug: categorySlug ?? null,
      siteId,
      hybridRssEnabled: siteId != null ? hmAccess?.hybridRssEnabled === true : null,
    });
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Hibrit sonsuz haber alınamadı",
    });
  }
});

router.get("/news/hybrid/rss/:itemId", async (req, res): Promise<void> => {
  const itemId = String(req.params.itemId ?? "").trim();
  if (!itemId) {
    res.status(400).json({ error: "RSS haber kimliği gerekli" });
    return;
  }

  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;

  try {
    let hmSiteAccess: Awaited<ReturnType<typeof resolveHmHybridRssAccess>> = null;
    if (siteId != null) {
      hmSiteAccess = await resolveHmHybridRssAccess(siteId);
      if (!hmSiteAccess || !hmSiteAccess.active) {
        res.status(404).json({ error: "RSS haber bulunamadı" });
        return;
      }
    }

    // Kesinleşmiş model: editör siteleri kendi genel RSS'ini tutmaz; RSS haberleri
    // Yekpare MERKEZ havuzundan (portal feeds) gelir. Bu yüzden detay çözümü de merkez
    // beslemelerini kullanmalı. Sadece `loadPortalHybridRssFeeds(siteId)` kullanılırsa
    // editör sitesinde besleme listesi boş döner ve haber "bulunamadı" olur.
    const portalFeeds = await loadPortalHybridRssFeeds(null, "all");
    const feeds =
      siteId != null
        ? mergePortalHybridRssFeedLists(await loadPortalHybridRssFeeds(siteId, "all"), portalFeeds)
        : portalFeeds;

    /**
     * DB-FIRST DETAY: Sayfa açılışında CANLI RSS BEKLENMEZ. Öğe, 5 dk'lık arka plan
     * scheduler'ı tarafından zaten `portal_rss_items` içine yazılmıştır ve buradan
     * (bellek/Redis → kalıcı DB) ANINDA okunur. Daha önce burada `refreshAllPortalRssFeeds`
     * / `refreshPortalRssFeed` awaitleniyordu; bu, tıklama anında tüm beslemeleri canlı
     * çeken bloklayıcı bir istekti ve "tıkla → boş içerik → yenile → gelir" hatasına yol
     * açıyordu. Artık tazeleme yalnızca ARKA PLANDA tetiklenir; istek bloklanmaz.
     */
    const match = await getPortalRssItemById(itemId, feeds);
    if (!match) {
      // Öğe henüz havuzda yoksa: portal veya Site içi RSS açık HM sitelerde warm.
      triggerPortalRssWarmIfEmpty(feeds, siteId, hmSiteAccess?.hybridRssEnabled === true);
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
      res.status(404).json({ error: "RSS haber bulunamadı" });
      return;
    }

    if (
      isHmGlobalNewsCategorySlug(match.item.categorySlug) &&
      !isGlobalNewsCategoryEnabledOnSite({ activatedSlugs: hmSiteAccess?.activatedCategorySlugs ?? null })
    ) {
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
      res.status(404).json({ error: "RSS haber bulunamadı" });
      return;
    }

    const canonicalSlug = await findNewsSlugByRssSourceLink(match.item.link);
    if (canonicalSlug) {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      res.json({
        canonicalSlug,
        redirect: true,
        href: `/haber/${canonicalSlug}`,
        id: match.item.id,
        title: decodeHtmlEntities(match.item.title),
      });
      return;
    }
    // İçerik inceyse (yalnızca spot) beslemeyi ARKA PLANDA tazele — sonraki açılış zengin
    // gelir; ama bu isteği bloklamaz. Spot fallback aşağıda zaten uygulanır.
    if (mayTriggerLivePortalRssRefresh(siteId) && !String(match.item.contentHtml ?? "").trim()) {
      const thinFeed = feeds.find((row) => row.id === match.item.feedId);
      if (thinFeed?.enabled && thinFeed.url) {
        void refreshPortalRssFeed(thinFeed).catch(() => null);
      }
    }

    /**
     * BİRLEŞİK GLOBAL OKUNMA SAYACI: `itemKey` (sha1(link||titleKey)) aynı makale için
     * tüm sitelerde (Yekpare portal + TÜM editör siteleri) AYNIDIR; bu yüzden sayaç tek
     * ve ortaktır. Detay açılışı sayacı artırır. Sayaç hatası haber detayını engellemez.
     */
    let readCount: number | undefined;
    try {
      readCount = await incrementPortalRssItemView(match.item.id);
    } catch (err) {
      console.warn("[portal-rss] okunma sayacı artırılamadı", err instanceof Error ? err.message : err);
    }

    const ctx = await loadNewsContext();
    const cat = [...ctx.categories.values()].find((c) => c.slug === match.item.categorySlug);
    const feed = feeds.find((row) => row.id === match.item.feedId);
    /**
     * KAYNAK ETİKETİ/LİNKİ (kesinleşmiş model):
     *  - EDİTÖR sitelerinde makale "Yekpare Haberleri"dir → etiket "Yekpare Haberleri",
     *    link yekpare.net/haberler'e gider (ham upstream yayıncı adı Ntv vb. gösterilmez).
     *  - yekpare.net/haberler'de kaynak ORİJİNAL yayıncıya (Ntv, vb.) işaret eder.
     */
    const isEditorSite = siteId != null;
    const upstreamSourceName =
      rssSourceNameFromUrl(match.item.link) ?? rssSourceNameFromUrl(feed?.url) ?? match.feedLabel;
    const sourceName = isEditorSite ? "Yekpare Haberleri" : upstreamSourceName;
    const feedUrl = isEditorSite ? "https://yekpare.net/haberler" : (feed?.url ?? null);
    const rawContentHtml =
      normalizePortalRssCachedContentHtml(match.item.contentHtml) ||
      (match.item.spot ? `<p>${decodeHtmlEntities(match.item.spot.replace(/…$/, "").trim())}</p>` : null);
    const contentHtml = rawContentHtml ? stripExternalAnchorsFromHtml(rawContentHtml) : null;

    res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    res.json({
      id: match.item.id,
      title: decodeHtmlEntities(match.item.title),
      spot: match.item.spot
        ? sanitizeCumhaRssSpot(decodeHtmlEntities(match.item.spot), match.item.link) || null
        : null,
      contentHtml,
      imageUrl: match.item.imageUrl,
      href: portalRssInternalHref(match.item.id),
      publishedAt: match.item.publishedAt,
      categorySlug: match.item.categorySlug,
      categoryName: cat?.name ?? match.item.categorySlug,
      categoryColor: cat?.color ?? "#CC0000",
      feedId: match.item.feedId,
      feedLabel: match.feedLabel,
      sourceName,
      feedUrl,
      /** "editor" → Yekpare Haberleri kaynağı; "portal" → orijinal yayıncı. */
      sourceScope: isEditorSite ? "editor" : "portal",
      /** Birleşik global okunma sayısı (tüm siteler ortak). */
      readCount: readCount ?? null,
    });
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "RSS haber detayı alınamadı",
    });
  }
});

router.get("/news/hybrid/categories", async (_req, res): Promise<void> => {
  try {
    const feeds = await loadPortalHybridRssFeeds();
    const enabledFeeds = feeds.filter((feed) => feed.enabled && feed.url);
    const slugs = [...new Set(enabledFeeds.map((feed) => feed.categorySlug))];

    const cats = slugs.length
      ? await getNewsDbForRead()
          .select({
            slug: categoriesTable.slug,
            name: categoriesTable.name,
            color: categoriesTable.color,
          })
          .from(categoriesTable)
          .where(and(isNull(categoriesTable.exclusiveSiteId), inArray(categoriesTable.slug, slugs)))
          .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id))
      : [];

    const catMap = new Map(cats.map((c) => [String(c.slug).toLowerCase(), c]));
    const categories = slugs.map((slug) => {
      const cat = catMap.get(slug);
      const feedCount = enabledFeeds.filter((feed) => feed.categorySlug === slug).length;
      return {
        categorySlug: slug,
        categoryName: cat?.name ?? slug,
        categoryColor: cat?.color ?? "#CC0000",
        feedCount,
      };
    });

    res.json({ categories, total: categories.length });
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Hibrit kategori listesi alınamadı",
    });
  }
});

router.get("/admin/portal-rss/status", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;

  try {
    const feeds = await loadPortalHybridRssFeeds();
    const feedStatus = await getPortalRssCacheStatus(feeds);
    const enabledFeeds = feeds.filter((feed) => feed.enabled && feed.url);
    const cachedItemTotal = feedStatus.reduce((sum, row) => sum + (row.cached ? row.itemCount : 0), 0);
    const aiMeta = await getPortalRssAiMetaQueueStats();

    res.json({
      ok: true,
      feedCount: feeds.length,
      enabledFeedCount: enabledFeeds.length,
      cachedItemTotal,
      feeds: feedStatus,
      aiMeta,
      checkedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "RSS önbellek durumu alınamadı",
    });
  }
});

router.get("/admin/portal-rss/ai-meta", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const config = await getPortalRssAiMetaConfig();
    const queue = await getPortalRssAiMetaQueueStats();
    const recentJobs = await getPortalRssAiMetaRecentJobs(15);
    res.json({ ok: true, config, queue, recentJobs });
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "RSS AI meta ayarları alınamadı",
    });
  }
});

router.post("/admin/portal-rss/ai-meta/process-one", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const { result } = await adminProcessOnePortalRssMetaJob();
    const config = await getPortalRssAiMetaConfig();
    const queue = await getPortalRssAiMetaQueueStats();
    const recentJobs = await getPortalRssAiMetaRecentJobs(15);
    res.json({ ok: true, result, config, queue, recentJobs });
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "RSS AI işi çalıştırılamadı",
    });
  }
});

router.put("/admin/portal-rss/ai-meta", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const body = req.body as { enabled?: boolean; hourlyLimit?: number | null };
    const config = await updatePortalRssAiMetaConfig({
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      hourlyLimit: body.hourlyLimit,
    });
    const queue = await getPortalRssAiMetaQueueStats();
    res.json({ ok: true, config, queue });
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "RSS AI meta ayarları kaydedilemedi",
    });
  }
});

router.post("/admin/portal-rss/refresh", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;

  const REFRESH_ENDPOINT_TIMEOUT_MS = 120_000;
  let responded = false;
  const timer = setTimeout(() => {
    if (responded || res.headersSent) return;
    responded = true;
    res.status(504).json({
      ok: false,
      error: "RSS önbelleği yenileme zaman aşımı (120s). Kısmi sonuçlar kaynak bazında loglanır.",
    });
  }, REFRESH_ENDPOINT_TIMEOUT_MS);

  try {
    const feeds = await loadPortalHybridRssFeeds();
    const results = await refreshAllPortalRssFeeds(feeds);
    const newsImport = await importPortalRssNewsByCategoryBatch();
    if (responded || res.headersSent) return;
    responded = true;
    clearTimeout(timer);
    res.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      feedCount: results.length,
      failedCount: results.filter((row) => row.error).length,
      newsImport,
      results,
    });
  } catch (e: unknown) {
    if (responded || res.headersSent) return;
    responded = true;
    clearTimeout(timer);
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "RSS önbelleği yenilenemedi",
    });
  }
});

router.get("/admin/background-jobs/rss", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const status = await getRssAutomationStatus();
    res.json({ ok: true, ...status });
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "RSS otomasyon durumu alınamadı",
    });
  }
});

router.put("/admin/background-jobs/rss", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const enabled = Boolean(req.body?.enabled ?? req.body?.rssAutomationEnabled);
    const status = await setRssAutomationEnabled(enabled, logger);
    res.json({ ok: true, ...status });
  } catch (e: unknown) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "RSS otomasyon ayarı kaydedilemedi",
    });
  }
});

export default router;
