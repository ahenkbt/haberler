import { enabledPortalHybridRssFeeds, type PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import { getPortalRssCachedItemsForFeeds } from "./portal-rss-cache.js";
import { dedupePortalRssItemsByKey, type PortalRssItem } from "./portal-rss-fetch.js";
import { readPortalRssItemsForFeeds } from "./portal-rss-store.js";

/**
 * Hibrit haber birleşimi — bellek/Redis önbelleği + kalıcı `portal_rss_items` havuzu.
 * turk.eco portalında canlı önbellek boş olsa bile NTV vb. DB havuzundan okunur.
 */
export async function getPortalRssItemsForHybridMerge(
  feeds: PortalHybridRssFeedConfig[],
  categorySlug?: string,
  opts?: { usePersistentPool?: boolean },
): Promise<PortalRssItem[]> {
  const active = enabledPortalHybridRssFeeds(feeds, categorySlug);
  const [live, stored] = await Promise.all([
    getPortalRssCachedItemsForFeeds(active, categorySlug),
    opts?.usePersistentPool ? readPortalRssItemsForFeeds(active, { categorySlug }) : Promise.resolve([]),
  ]);
  if (!stored.length) return live;
  if (!live.length) return stored;
  return dedupePortalRssItemsByKey([...live, ...stored]);
}
