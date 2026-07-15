import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import { enabledPortalHybridRssFeeds, feedMatchesCategorySlug } from "./portal-hybrid-config.js";
import {
  dedupePortalRssItemsByKey,
  fetchPortalRssItems,
  PORTAL_RSS_FETCH_TIMEOUT_MS,
  type PortalRssItem,
} from "./portal-rss-fetch.js";
import { mirrorPortalRssItemsImages } from "./portal-rss-image-mirror.js";
import { isExcludedCumhaKoesePortalItem } from "./rssCumhaExclude.js";
import { isExcludedNtvEvergreenDepremPortalItem } from "./rssNtvExclude.js";
import {
  readPortalRssItemByKey,
  readPortalRssItemsForFeed,
  PORTAL_RSS_POOL_RETENTION_MS,
  siteIdFromFeedId,
  upsertPortalRssItems,
} from "./portal-rss-store.js";
import { hmRssIntegrationModeFromLayout, readHmPublicLayout, type HmRssIntegrationMode } from "./hm-public-layout.js";

/**
 * "Kutu içi RSS" (box scope) beslemeleri kalıcı DB havuzuna YAZILMAZ — canlı kalır.
 * Yalnızca portal + site scope beslemeleri DB'ye upsert edilir.
 */
export function isBoxScopeFeedId(feedId: string): boolean {
  return /-box-/.test(String(feedId ?? ""));
}

export function isSiteScopeFeedId(feedId: string): boolean {
  return /-site-/.test(String(feedId ?? ""));
}

async function rssIntegrationModeForFeed(feedId: string): Promise<HmRssIntegrationMode | "portal"> {
  if (isBoxScopeFeedId(feedId)) return "live";
  const siteId = siteIdFromFeedId(feedId);
  if (siteId != null && isSiteScopeFeedId(feedId)) {
    const layout = await readHmPublicLayout(siteId);
    return hmRssIntegrationModeFromLayout(layout);
  }
  return "portal";
}

/** Kutu içi RSS «anlık» — kalıcı DB'ye yazılmaz. Site içi feed’ler her zaman DB’de (çok instance / cold start). */
export async function shouldSkipRssDbForFeed(feedId: string): Promise<boolean> {
  if (isBoxScopeFeedId(feedId)) return true;
  // Site içi RSS: layout «live» olsa bile portal_rss_items’a yaz/oku —
  // aksi halde bellek/Redis boşken vitrin sürekli RSS’siz kalır.
  if (isSiteScopeFeedId(feedId)) return false;
  const mode = await rssIntegrationModeForFeed(feedId);
  return mode === "live";
}

/** Site-içi RSS ziyaret tetiklemeli yenileme — manuel modda otomatik fetch yok. */
export async function shouldAutoRefreshRssFeedOnVisit(feedId: string): Promise<boolean> {
  if (isBoxScopeFeedId(feedId)) return true;
  const mode = await rssIntegrationModeForFeed(feedId);
  if (mode === "manual") return false;
  return true;
}

/** Besleme önbelleğinin «tazeleme gerekli» sayılması için üst sınır (öğe silme değil). */
const FEED_CACHE_STALE_MS = 7 * 24 * 60 * 60_000;
/** Besleme tazelik eşiği — günde 3× slot arası (~8 saat); 1 saatlik döngüyü engeller. */
const DEFAULT_REFRESH_AGE_MS = 7 * 60 * 60_000;
const PER_FEED_REFRESH_TIMEOUT_MS = PORTAL_RSS_FETCH_TIMEOUT_MS + 3_000;
const MAX_STORED_PER_FEED = 200;
const REDIS_KEY_PREFIX = "portal-hybrid-rss:";

type FeedCachePayload = {
  feedId: string;
  categorySlug: string;
  items: PortalRssItem[];
  lastFetchedAt: string;
  expiresAt: number;
};

const memoryCache = new Map<string, FeedCachePayload>();

function cacheKey(feedId: string): string {
  return `${REDIS_KEY_PREFIX}${feedId}`;
}

function dedupeKey(item: PortalRssItem): string {
  const link = item.link.trim().toLowerCase();
  if (link) return `link:${link}`;
  return `title:${item.titleKey}`;
}

function portalRssRefreshAgeMs(): number {
  const raw = Number(process.env.PORTAL_RSS_REFRESH_AGE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REFRESH_AGE_MS;
}

function isPortalRssRefreshDue(payload: FeedCachePayload, now = Date.now()): boolean {
  const lastFetchedAtMs = new Date(payload.lastFetchedAt).getTime();
  if (!Number.isFinite(lastFetchedAtMs)) return true;
  return now - lastFetchedAtMs >= portalRssRefreshAgeMs();
}

function itemCachedAtMs(item: PortalRssItem): number {
  const raw = item.cachedAt ?? item.publishedAt;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function sweepPoolRetentionItems(items: PortalRssItem[], now = Date.now()): PortalRssItem[] {
  const cutoff = now - PORTAL_RSS_POOL_RETENTION_MS;
  return items.filter(
    (item) =>
      itemCachedAtMs(item) > cutoff &&
      !isExcludedCumhaKoesePortalItem(item) &&
      !isExcludedNtvEvergreenDepremPortalItem(item),
  );
}

function mergePortalRssItems(prev: PortalRssItem[], incoming: PortalRssItem[], maxStored: number): PortalRssItem[] {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const seen = new Set<string>();
  const merged: PortalRssItem[] = [];

  const freshIncoming = incoming.map((item) => ({ ...item, cachedAt: nowIso }));
  const freshPrev = sweepPoolRetentionItems(prev, now);

  for (const item of [...freshIncoming, ...freshPrev]) {
    const key = dedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= maxStored) break;
  }

  return merged;
}

function upstashConfigured(): boolean {
  return Boolean(
    String(process.env.UPSTASH_REDIS_REST_URL ?? "").trim() &&
      String(process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
  );
}

async function upstashCommand<T>(command: unknown[]): Promise<T | null> {
  const baseUrl = String(process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/+$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  if (!baseUrl || !token) return null;

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return data.result ?? null;
  } catch {
    return null;
  }
}

async function readCache(feedId: string): Promise<FeedCachePayload | null> {
  const key = cacheKey(feedId);
  const mem = memoryCache.get(key);
  if (mem) {
    const filtered = sweepPoolRetentionItems(mem.items);
    if (filtered.length !== mem.items.length) {
      mem.items = filtered;
      memoryCache.set(key, mem);
    }
    return mem;
  }

  if (upstashConfigured()) {
    const raw = await upstashCommand<string>(["GET", key]);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as FeedCachePayload;
        parsed.items = sweepPoolRetentionItems(parsed.items);
        memoryCache.set(key, parsed);
        return parsed;
      } catch {
        /* fall through to DB */
      }
    }
  }

  /**
   * Soğuk başlangıç kalıcılığı: bellek/Redis boşsa kalıcı DB havuzundan doldur.
   * Bu sayede sayfa açılışında canlı RSS beklenmez (5 dk sorunu). Box scope
   * beslemeleri DB'de olmadığından null döner → canlı davranış korunur.
   */
  if (await shouldSkipRssDbForFeed(feedId)) return null;
  try {
    const dbItems = sweepPoolRetentionItems(await readPortalRssItemsForFeed(feedId));
    if (dbItems.length === 0) return null;
    const payload: FeedCachePayload = {
      feedId,
      categorySlug: dbItems[0]?.categorySlug ?? "",
      items: dbItems,
      lastFetchedAt: dbItems[0]?.cachedAt ?? new Date().toISOString(),
      expiresAt: Date.now() + FEED_CACHE_STALE_MS,
    };
    memoryCache.set(key, payload);
    return payload;
  } catch {
    return null;
  }
}

async function writeCache(payload: FeedCachePayload): Promise<void> {
  const key = cacheKey(payload.feedId);
  memoryCache.set(key, payload);
  if (!upstashConfigured()) return;

  const ttlSeconds = Math.max(60, Math.ceil(FEED_CACHE_STALE_MS / 1000));
  await upstashCommand(["SET", key, JSON.stringify(payload), "EX", ttlSeconds]);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} zaman aşımı (${ms}ms)`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

export async function refreshPortalRssFeed(
  feed: PortalHybridRssFeedConfig,
): Promise<{ feedId: string; fetched: number; stored: number; lastFetchedAt: string }> {
  const incoming = await fetchPortalRssItems({
    feedId: feed.id,
    categorySlug: feed.categorySlug,
    url: feed.url,
    maxItems: feed.maxItems,
    timeoutMs: PORTAL_RSS_FETCH_TIMEOUT_MS,
  });

  const now = Date.now();
  const prev = await readCache(feed.id);
  const merged = mergePortalRssItems(prev?.items ?? [], incoming, MAX_STORED_PER_FEED);
  const payload: FeedCachePayload = {
    feedId: feed.id,
    categorySlug: feed.categorySlug,
    items: merged,
    lastFetchedAt: new Date(now).toISOString(),
    expiresAt: now + FEED_CACHE_STALE_MS,
  };
  await writeCache(payload);

  /**
   * Kalıcı DB havuzu: portal + site scope beslemeleri UPSERT edilir (dedupe by URL/guid).
   * "Kutu içi RSS" (box scope) DB'ye yazılmaz — canlı kalır. DB hatası bellek yolunu bozmaz.
   */
  if (!(await shouldSkipRssDbForFeed(feed.id)) && incoming.length > 0) {
    try {
      await upsertPortalRssItems(feed, incoming);
    } catch (err) {
      console.warn(
        "[portal-rss] DB upsert başarısız",
        feed.id,
        err instanceof Error ? err.message : err,
      );
    }
    /* news senkronu: kategori batch (importPortalRssNewsByCategoryBatch) — feed başına değil. */
  }

  return {
    feedId: feed.id,
    fetched: incoming.length,
    stored: merged.length,
    lastFetchedAt: payload.lastFetchedAt,
  };
}

export async function refreshPortalRssFeedSafe(
  feed: PortalHybridRssFeedConfig,
): Promise<{ feedId: string; fetched: number; stored: number; lastFetchedAt: string; error?: string }> {
  try {
    return await withTimeout(
      refreshPortalRssFeed(feed),
      PER_FEED_REFRESH_TIMEOUT_MS,
      `RSS kaynağı ${feed.id}`,
    );
  } catch (e: unknown) {
    return {
      feedId: feed.id,
      fetched: 0,
      stored: (await readCache(feed.id))?.items.length ?? 0,
      lastFetchedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function refreshAllPortalRssFeeds(
  feeds: PortalHybridRssFeedConfig[],
): Promise<Array<{ feedId: string; fetched: number; stored: number; lastFetchedAt: string; error?: string }>> {
  const enabled = feeds.filter((feed) => feed.enabled && feed.url);
  const concurrency = Math.min(
    10,
    Math.max(1, Number(process.env.PORTAL_RSS_REFRESH_CONCURRENCY ?? 10) || 10),
  );
  return mapWithConcurrency(enabled, concurrency, (feed) => refreshPortalRssFeedSafe(feed));
}

async function collectCachedItems(
  feeds: PortalHybridRssFeedConfig[],
  opts?: { categorySlug?: string; feedId?: string },
): Promise<PortalRssItem[]> {
  const categorySlug = opts?.categorySlug?.trim().toLowerCase();
  const feedId = opts?.feedId?.trim();
  const all: PortalRssItem[] = [];

  // Kategori kutusu isteğinde YALNIZCA o kategoriye bağlı feed'lerden oku.
  // Tüm feed'leri birleştirip global tekilleştirmek, başka kategorideki öğelerin
  // yanlış slug ile bu kutuya sızmasına yol açar (ör. Politika RSS → SPOR kutusu).
  const scopedFeeds = categorySlug ? enabledPortalHybridRssFeeds(feeds, categorySlug) : feeds;
  const activeFeeds = scopedFeeds.filter((feed) => {
    if (!feed.enabled || !feed.url) return false;
    if (feedId && feed.id !== feedId) return false;
    return true;
  });

  const cachedFeeds = await Promise.all(activeFeeds.map(async (feed) => ({ feed, cached: await readCache(feed.id) })));
  for (const { cached } of cachedFeeds) {
    if (!cached) continue;
    for (const item of cached.items) all.push(item);
  }

  // Önce GLOBAL tekilleştir (tek kategori/haber), sonra istenen kategoriye göre süz.
  const deduped = dedupePortalRssItemsByKey(all).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  if (!categorySlug) return deduped;
  return deduped.filter((item) =>
    feedMatchesCategorySlug(String(item.categorySlug ?? "").trim(), categorySlug),
  );
}

export async function getPortalRssCachedItems(opts?: {
  categorySlug?: string;
  feedId?: string;
  feeds?: PortalHybridRssFeedConfig[];
}): Promise<PortalRssItem[]> {
  if (opts?.feeds?.length) {
    return collectCachedItems(opts.feeds, opts);
  }

  const all: PortalRssItem[] = [];
  const categorySlug = opts?.categorySlug?.trim().toLowerCase();
  const feedId = opts?.feedId?.trim();

  for (const entry of memoryCache.values()) {
    if (feedId && entry.feedId !== feedId) continue;
    for (const item of entry.items) all.push(item);
  }

  const deduped = dedupePortalRssItemsByKey(all).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  if (!categorySlug) return deduped;
  return deduped.filter((item) =>
    feedMatchesCategorySlug(String(item.categorySlug ?? "").trim(), categorySlug),
  );
}

export type PortalRssFeedCacheStatus = {
  feedId: string;
  categorySlug: string;
  label: string;
  url: string;
  enabled: boolean;
  cached: boolean;
  itemCount: number;
  lastFetchedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  refreshDue: boolean;
  reason: string | null;
};

export async function getPortalRssCacheStatus(
  feeds: PortalHybridRssFeedConfig[],
): Promise<PortalRssFeedCacheStatus[]> {
  const now = Date.now();
  const out: PortalRssFeedCacheStatus[] = [];

  for (const feed of feeds) {
    const base = {
      feedId: feed.id,
      categorySlug: feed.categorySlug,
      label: feed.label,
      url: feed.url,
      enabled: feed.enabled,
    };

    if (!feed.enabled) {
      out.push({
        ...base,
        cached: false,
        itemCount: 0,
        lastFetchedAt: null,
        expiresAt: null,
        expired: false,
        refreshDue: false,
        reason: "disabled",
      });
      continue;
    }

    if (!feed.url) {
      out.push({
        ...base,
        cached: false,
        itemCount: 0,
        lastFetchedAt: null,
        expiresAt: null,
        expired: false,
        refreshDue: false,
        reason: "missing_url",
      });
      continue;
    }

    const cached = await readCache(feed.id);
    if (!cached) {
      out.push({
        ...base,
        cached: false,
        itemCount: 0,
        lastFetchedAt: null,
        expiresAt: null,
        expired: false,
        refreshDue: false,
        reason: "cache_miss",
      });
      continue;
    }

    const expired = cached.expiresAt <= now;
    const refreshDue = isPortalRssRefreshDue(cached, now);
    out.push({
      ...base,
      cached: !expired && cached.items.length > 0,
      itemCount: cached.items.length,
      lastFetchedAt: cached.lastFetchedAt,
      expiresAt: new Date(cached.expiresAt).toISOString(),
      expired,
      refreshDue,
      reason: expired ? "expired" : cached.items.length === 0 ? "empty_feed" : refreshDue ? "refresh_due" : null,
    });
  }

  return out;
}

export async function getPortalRssCachedItemsForFeeds(
  feeds: PortalHybridRssFeedConfig[],
  categorySlug?: string,
): Promise<PortalRssItem[]> {
  return collectCachedItems(feeds, { categorySlug });
}

/** RSS yönetim panelinden silinen öğeyi bellek/Redis önbelleğinden kaldırır. */
export async function removePortalRssCachedItem(itemId: string, feedId: string): Promise<boolean> {
  const id = String(itemId ?? "").trim();
  const feed = String(feedId ?? "").trim();
  if (!id || !feed) return false;
  const cached = await readCache(feed);
  if (!cached) return false;
  const before = cached.items.length;
  cached.items = cached.items.filter((row) => row.id !== id);
  if (cached.items.length === before) return false;
  await writeCache(cached);
  return true;
}

export async function getPortalRssItemById(
  itemId: string,
  feeds: PortalHybridRssFeedConfig[],
): Promise<{ item: PortalRssItem; feedLabel: string } | null> {
  const id = String(itemId ?? "").trim();
  if (!id) return null;

  for (const feed of feeds) {
    if (!feed.enabled || !feed.url) continue;
    const cached = await readCache(feed.id);
    if (!cached) continue;
    const item = cached.items.find((row) => row.id === id);
    if (item) return { item, feedLabel: feed.label };
  }

  // Kalıcı DB havuzundan geri dolgu (yeniden başlatma sonrası detay linkleri).
  try {
    const dbMatch = await readPortalRssItemByKey(id, feeds);
    if (dbMatch) return dbMatch;
  } catch {
    /* yoksay */
  }

  return null;
}
