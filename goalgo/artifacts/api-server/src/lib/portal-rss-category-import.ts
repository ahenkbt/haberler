import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import { enabledPortalHybridRssFeeds, loadPortalHybridRssFeeds } from "./portal-hybrid-config.js";
import { isBoxScopeFeedId } from "./portal-rss-cache.js";
import { portalRssTitleKey, type PortalRssItem } from "./portal-rss-fetch.js";
import { readPortalRssItemsForFeeds } from "./portal-rss-store.js";
import {
  isPortalRssSyncToNewsEnabled,
  syncPortalRssItemsToNewsTable,
} from "./portal-rss-auto-import.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";
import { logger } from "./logger.js";
import { schedulePortalNewsSitemapPing } from "./sitemap-search-engine-ping.js";

/** Kategori başına gece RSS → news hedefi (benzersiz yayın). */
export const PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY = 20;

function titleKeyWords(key: string): Set<string> {
  return new Set(key.split(/\s+/).filter((w) => w.length >= 3));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

/** Aynı kategori batch'inde URL + başlık benzerliği ile tekilleştir. */
export function dedupeCategoryRssBatchItems(items: PortalRssItem[]): PortalRssItem[] {
  const seenLinks = new Set<string>();
  const seenTitleKeys: string[] = [];
  const seenTitleWordSets: Set<string>[] = [];
  const sorted = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const out: PortalRssItem[] = [];

  for (const item of sorted) {
    const link = normalizeRssSourceUrl(item.link);
    if (link && seenLinks.has(link)) continue;

    const titleKey = portalRssTitleKey(item.title);
    if (titleKey && seenTitleKeys.includes(titleKey)) continue;

    if (titleKey) {
      const words = titleKeyWords(titleKey);
      let fuzzyDup = false;
      for (const prev of seenTitleWordSets) {
        if (jaccardSimilarity(words, prev) >= 0.78) {
          fuzzyDup = true;
          break;
        }
      }
      if (fuzzyDup) continue;
      seenTitleKeys.push(titleKey);
      seenTitleWordSets.push(words);
    }

    if (link) seenLinks.add(link);
    out.push(item);
  }

  return out;
}

function pickFeedForCategory(
  feeds: PortalHybridRssFeedConfig[],
  categorySlug: string,
): PortalHybridRssFeedConfig {
  const slug = categorySlug.trim().toLowerCase();
  return (
    feeds.find((f) => f.categorySlug === slug) ?? {
      id: `portal-batch-${slug}`,
      categorySlug: slug,
      label: slug,
      url: "",
      enabled: true,
      maxItems: PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY,
    }
  );
}

/**
 * RSS havuzundan kategori başına en fazla N benzersiz haberi `news` tablosuna aktarır.
 * Aynı gündem kaynağından gelen yinelenen başlıklar tek makale olarak yayınlanır.
 */
export async function importPortalRssNewsByCategoryBatch(
  limitPerCategory = PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY,
): Promise<{ categories: number; inserted: number; skipped: number }> {
  if (!isPortalRssSyncToNewsEnabled()) return { categories: 0, inserted: 0, skipped: 0 };

  const feeds = (await loadPortalHybridRssFeeds(null, "all")).filter(
    (feed) => feed.enabled && feed.url && !isBoxScopeFeedId(feed.id),
  );
  const activeFeeds = enabledPortalHybridRssFeeds(feeds);
  if (!activeFeeds.length) return { categories: 0, inserted: 0, skipped: 0 };

  const items = await readPortalRssItemsForFeeds(activeFeeds);
  const byCategory = new Map<string, PortalRssItem[]>();
  for (const item of items) {
    const cat = String(item.categorySlug ?? "gundem").trim().toLowerCase() || "gundem";
    const list = byCategory.get(cat) ?? [];
    list.push(item);
    byCategory.set(cat, list);
  }

  let inserted = 0;
  let skipped = 0;
  let categories = 0;

  for (const [categorySlug, catItems] of byCategory) {
    if (!catItems.length) continue;
    categories += 1;
    const deduped = dedupeCategoryRssBatchItems(catItems);
    const feed = pickFeedForCategory(activeFeeds, categorySlug);
    const batch = deduped.slice(0, limitPerCategory);
    if (!batch.length) continue;
    const res = await syncPortalRssItemsToNewsTable(feed, batch);
    inserted += res.inserted;
    skipped += res.skipped;
  }

  if (inserted > 0) {
    logger.info({ categories, inserted, skipped, limitPerCategory }, "[portal-rss] kategori batch news import");
    schedulePortalNewsSitemapPing();
  }

  return { categories, inserted, skipped };
}
