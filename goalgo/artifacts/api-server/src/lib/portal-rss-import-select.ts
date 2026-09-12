import { portalRssTitleKey, type PortalRssItem } from "./portal-rss-fetch.js";
import {
  normalizeRssSourceUrl,
  rssTitleJaccardSimilarity,
  rssTitleKeyWords,
  RSS_TITLE_NEAR_DUPLICATE_THRESHOLD,
} from "./rssImportDedupeCore.js";

/**
 * ~100 benzersiz RSS haberi / gün:
 * - Persist slotları: 02:00 ve 09:00 TR (~20 dk pencere). Saatlik canlı önbellek ayrı.
 * - Her koşuda besleme başına en fazla 10 öğe.
 * - Çapraz kaynak URL + başlık benzerliği sonrası kategori başına en fazla 10.
 * - Teorik tavan (ör. 12 kategori × 10 × 2 slot = 240) günlük bütçe ile kesilir:
 *   100 unique insert/gün; kalan kota kategoriler arasında round-robin.
 */
export const PORTAL_RSS_NEWS_IMPORT_PER_FEED = 10;
export const PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY = 10;
export const PORTAL_RSS_NEWS_IMPORT_DAILY_BUDGET = 100;

/** Aynı koşu + tüm kategoriler: URL + başlık benzerliği ile tekilleştir. */
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
      const words = rssTitleKeyWords(titleKey);
      let fuzzyDup = false;
      for (const prev of seenTitleWordSets) {
        if (rssTitleJaccardSimilarity(words, prev) >= RSS_TITLE_NEAR_DUPLICATE_THRESHOLD) {
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

/** Besleme başına en yeni N öğeyi bırak (yayın tarihi). */
export function capRssItemsPerFeed(
  items: PortalRssItem[],
  perFeed = PORTAL_RSS_NEWS_IMPORT_PER_FEED,
): PortalRssItem[] {
  const limit = Math.max(1, perFeed);
  const byFeed = new Map<string, number>();
  const sorted = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const out: PortalRssItem[] = [];
  for (const item of sorted) {
    const feedId = String(item.feedId ?? "").trim() || "_";
    const used = byFeed.get(feedId) ?? 0;
    if (used >= limit) continue;
    byFeed.set(feedId, used + 1);
    out.push(item);
  }
  return out;
}

export function groupPortalRssItemsByCategory(items: PortalRssItem[]): Map<string, PortalRssItem[]> {
  const byCategory = new Map<string, PortalRssItem[]>();
  for (const item of items) {
    const cat = String(item.categorySlug ?? "gundem").trim().toLowerCase() || "gundem";
    const list = byCategory.get(cat) ?? [];
    list.push(item);
    byCategory.set(cat, list);
  }
  return byCategory;
}

/**
 * Kategori başına üst sınır + günlük kalan kota.
 * Kota bitmeden her kategoriye sırayla 1 öğe verilir (round-robin).
 */
export function allocateRssImportDailyBudget(
  byCategory: Map<string, PortalRssItem[]>,
  remainingBudget: number,
  perCategory = PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY,
): Map<string, PortalRssItem[]> {
  const allocated = new Map<string, PortalRssItem[]>();
  if (remainingBudget <= 0) return allocated;

  const queues = [...byCategory.entries()].map(([categorySlug, items]) => ({
    categorySlug,
    items: items.slice(0, Math.max(1, perCategory)),
    index: 0,
  }));

  let used = 0;
  let progressed = true;
  while (used < remainingBudget && progressed) {
    progressed = false;
    for (const queue of queues) {
      if (used >= remainingBudget) break;
      const item = queue.items[queue.index];
      if (!item) continue;
      const list = allocated.get(queue.categorySlug) ?? [];
      list.push(item);
      allocated.set(queue.categorySlug, list);
      queue.index += 1;
      used += 1;
      progressed = true;
    }
  }
  return allocated;
}
