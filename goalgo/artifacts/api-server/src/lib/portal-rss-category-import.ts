import { and, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import { enabledPortalHybridRssFeeds, loadPortalHybridRssFeeds } from "./portal-hybrid-config.js";
import { isBoxScopeFeedId } from "./portal-rss-cache.js";
import { readPortalRssItemsForFeeds } from "./portal-rss-store.js";
import {
  isPortalRssSyncToNewsEnabled,
  syncPortalRssItemsToNewsTable,
} from "./portal-rss-auto-import.js";
import { getTurkeyDayStartUtc } from "./rss-automation-control.js";
import { logger } from "./logger.js";
import { schedulePortalNewsSitemapPing } from "./sitemap-search-engine-ping.js";
import {
  allocateRssImportDailyBudget,
  capRssItemsPerFeed,
  dedupeCategoryRssBatchItems,
  groupPortalRssItemsByCategory,
  PORTAL_RSS_NEWS_IMPORT_DAILY_BUDGET,
  PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY,
  PORTAL_RSS_NEWS_IMPORT_PER_FEED,
} from "./portal-rss-import-select.js";

export {
  allocateRssImportDailyBudget,
  capRssItemsPerFeed,
  dedupeCategoryRssBatchItems,
  groupPortalRssItemsByCategory,
  PORTAL_RSS_NEWS_IMPORT_DAILY_BUDGET,
  PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY,
  PORTAL_RSS_NEWS_IMPORT_PER_FEED,
} from "./portal-rss-import-select.js";

export async function remainingPortalRssDailyBudget(
  now = new Date(),
  dailyBudget = PORTAL_RSS_NEWS_IMPORT_DAILY_BUDGET,
): Promise<number> {
  const start = getTurkeyDayStartUtc(now);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsTable)
    .where(
      and(
        isNull(newsTable.siteId),
        isNotNull(newsTable.rssSourceUrl),
        gte(newsTable.createdAt, start),
      ),
    );
  const used = Number(row?.count ?? 0);
  return Math.max(0, dailyBudget - (Number.isFinite(used) ? used : 0));
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
      maxItems: PORTAL_RSS_NEWS_IMPORT_PER_FEED,
    }
  );
}

/**
 * RSS havuzundan her kategoriye haber aktarır (çapraz kaynak tekil, günlük ~100).
 * Aynı gündem / farklı kaynak başlıkları tek makale olarak yayınlanır.
 */
export async function importPortalRssNewsByCategoryBatch(
  limitPerCategory = PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY,
): Promise<{ categories: number; inserted: number; skipped: number; dailyRemaining: number }> {
  if (!isPortalRssSyncToNewsEnabled()) {
    return { categories: 0, inserted: 0, skipped: 0, dailyRemaining: 0 };
  }

  const feeds = (await loadPortalHybridRssFeeds(null, "all")).filter(
    (feed) => feed.enabled && feed.url && !isBoxScopeFeedId(feed.id),
  );
  const activeFeeds = enabledPortalHybridRssFeeds(feeds);
  if (!activeFeeds.length) return { categories: 0, inserted: 0, skipped: 0, dailyRemaining: 0 };

  const items = await readPortalRssItemsForFeeds(activeFeeds);
  const perFeedCapped = capRssItemsPerFeed(items, PORTAL_RSS_NEWS_IMPORT_PER_FEED);
  const crossSource = dedupeCategoryRssBatchItems(perFeedCapped);
  const byCategory = groupPortalRssItemsByCategory(crossSource);

  const dailyRemaining = await remainingPortalRssDailyBudget();
  const allocated = allocateRssImportDailyBudget(byCategory, dailyRemaining, limitPerCategory);

  let inserted = 0;
  let skipped = 0;
  let categories = 0;

  for (const [categorySlug, batch] of allocated) {
    if (!batch.length) continue;
    categories += 1;
    const feed = pickFeedForCategory(activeFeeds, categorySlug);
    const res = await syncPortalRssItemsToNewsTable(feed, batch);
    inserted += res.inserted;
    skipped += res.skipped;
  }

  if (inserted > 0) {
    logger.info(
      {
        categories,
        inserted,
        skipped,
        limitPerCategory,
        perFeed: PORTAL_RSS_NEWS_IMPORT_PER_FEED,
        dailyBudget: PORTAL_RSS_NEWS_IMPORT_DAILY_BUDGET,
        dailyRemainingBefore: dailyRemaining,
      },
      "[portal-rss] kategori batch news import",
    );
    schedulePortalNewsSitemapPing();
  }

  return { categories, inserted, skipped, dailyRemaining: Math.max(0, dailyRemaining - inserted) };
}
