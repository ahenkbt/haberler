import { enabledPortalHybridRssFeeds, type PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import { getPortalRssCachedItemsForFeeds } from "./portal-rss-cache.js";
import { dedupePortalRssItemsByKey, type PortalRssItem } from "./portal-rss-fetch.js";
import { readPortalRssItemsForFeeds } from "./portal-rss-store.js";

const RSS_HYBRID_READ_TIMEOUT_MS = 2_500;

async function withTimeoutOrEmpty<T>(promise: Promise<T[]>, ms: number): Promise<T[]> {
  const safe = promise.catch((err) => {
    console.error(
      "[portal-rss-hybrid-read]",
      err instanceof Error ? err.message.slice(0, 180) : err,
    );
    return [] as T[];
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      safe,
      new Promise<T[]>((resolve) => {
        timer = setTimeout(() => resolve([]), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Hibrit haber birleşimi — bellek/Redis önbelleği + kalıcı `portal_rss_items` havuzu.
 * turk.eco portalında canlı önbellek boş olsa bile NTV vb. DB havuzundan okunur.
 * Kalıcı havuz 500/timeout olursa canlı önbellek veya boş dizi döner — kategori
 * sayfası DB haberleriyle ayakta kalır.
 */
export async function getPortalRssItemsForHybridMerge(
  feeds: PortalHybridRssFeedConfig[],
  categorySlug?: string,
  opts?: { usePersistentPool?: boolean },
): Promise<PortalRssItem[]> {
  const active = enabledPortalHybridRssFeeds(feeds, categorySlug);
  const [live, stored] = await Promise.all([
    withTimeoutOrEmpty(getPortalRssCachedItemsForFeeds(active, categorySlug), RSS_HYBRID_READ_TIMEOUT_MS),
    opts?.usePersistentPool
      ? withTimeoutOrEmpty(readPortalRssItemsForFeeds(active, { categorySlug }), RSS_HYBRID_READ_TIMEOUT_MS)
      : Promise.resolve([]),
  ]);
  if (!stored.length) return live;
  if (!live.length) return stored;
  return dedupePortalRssItemsByKey([...live, ...stored]);
}
