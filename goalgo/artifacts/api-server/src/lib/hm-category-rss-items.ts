import {
  enabledPortalHybridRssFeeds,
  loadPortalHybridRssFeeds,
  resolveHmHybridRssAccess,
} from "./portal-hybrid-config.js";
import { getPortalRssCachedItemsForFeeds, isBoxScopeFeedId } from "./portal-rss-cache.js";
import { isPortalRssSyncToNewsEnabled } from "./portal-rss-auto-import.js";
import {
  applyEditorSourceAttribution,
  enrichHybridNewsListImages,
  filterRssItemsByHiddenSet,
  loadEditorScopedDbNews,
  mergeHybridNews,
  resolveEditorScopedPoolOpts,
  scopeNewsContextForSite,
  type HybridNewsItem,
} from "./hybrid-news-merge.js";
import { enrichHybridNewsItemsWithOrigins } from "./hybrid-news-origin.js";
import { loadNewsContext } from "./news-context.js";
import { filterHmCategoryContentGuard } from "./hm-category-content-guard.js";
import {
  filterNewsItemsForSiteGlobalPolicy,
  isHmGlobalNewsCategorySlug,
} from "./hm-global-news-category.js";
import { filterCorporatePublicNewsItems } from "./hm-corporate-news-policy.js";

const HM_CATEGORY_RSS_DEFAULT_LIMIT = 20;
const HM_CATEGORY_RSS_MAX_LIMIT = 50;

/**
 * HM kategori RSS — kategori sayfasındaki hibrit birleştirme ile aynı kaynaklar:
 * site manuel haberleri + Yekpare havuzu + (açıksa) hibrit RSS önbelleği.
 */
export async function loadHmCategoryRssFeedItems(opts: {
  siteId: number;
  categorySlug: string;
  limit?: number;
}): Promise<HybridNewsItem[]> {
  const categorySlug = String(opts.categorySlug ?? "").trim().toLowerCase();
  if (!categorySlug || isHmGlobalNewsCategorySlug(categorySlug)) return [];

  const limit = Math.min(
    HM_CATEGORY_RSS_MAX_LIMIT,
    Math.max(HM_CATEGORY_RSS_DEFAULT_LIMIT, Math.trunc(opts.limit ?? HM_CATEGORY_RSS_DEFAULT_LIMIT)),
  );

  const hmAccess = await resolveHmHybridRssAccess(opts.siteId);
  if (!hmAccess?.active) return [];

  const poolOpts = resolveEditorScopedPoolOpts(hmAccess);
  const fetchLimit = limit + 50;
  const ctx = scopeNewsContextForSite(await loadNewsContext(), opts.siteId);

  const loadDbItems = () =>
    loadEditorScopedDbNews({
      siteId: opts.siteId,
      categorySlug,
      limit: fetchLimit,
      offset: 0,
      ...poolOpts,
    });

  if (!hmAccess.hybridRssEnabled) {
    const dbResult = await loadDbItems();
    const merged = mergeHybridNews({
      dbItems: filterHmCategoryContentGuard(dbResult.items, categorySlug),
      rssItems: [],
      limit,
      offset: 0,
      ctx,
    });
    let items = merged.items;
    if (hmAccess.isCorporate) {
      items = filterCorporatePublicNewsItems(items, { siteSlug: hmAccess.slug });
    }
    return items;
  }

  const feeds = (await loadPortalHybridRssFeeds(opts.siteId, "all")).filter((feed) => !isBoxScopeFeedId(feed.id));
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

  const mergeRssFromCache = !hmAccess.isCorporate;

  const [dbResult, rssItemsRaw] = await Promise.all([
    loadDbItems(),
    mergeRssFromCache ? getPortalRssCachedItemsForFeeds(feeds, categorySlug) : Promise.resolve([]),
  ]);

  let rssItems = rssItemsRaw;
  if (hmAccess.hiddenRssItemIds.length) {
    rssItems = filterRssItemsByHiddenSet(rssItems, new Set(hmAccess.hiddenRssItemIds));
  }

  const merged = mergeHybridNews({
    dbItems: filterHmCategoryContentGuard(dbResult.items, categorySlug),
    rssItems: filterHmCategoryContentGuard(rssItems, categorySlug),
    feedLabels,
    feedGeoById,
    limit,
    offset: 0,
    ctx,
  });

  const imageEnriched = await enrichHybridNewsListImages(merged.items);
  const enrichedRaw = await enrichHybridNewsItemsWithOrigins(imageEnriched);
  const enriched = applyEditorSourceAttribution(enrichedRaw, opts.siteId);

  let visibleItems = filterNewsItemsForSiteGlobalPolicy(enriched, {
    newsmapMode: false,
    activatedSlugs: hmAccess.activatedCategorySlugs ?? null,
    requestedCategorySlug: categorySlug,
    feedGeoById,
  });
  if (hmAccess.isCorporate) {
    visibleItems = filterCorporatePublicNewsItems(visibleItems, { siteSlug: hmAccess.slug });
  }
  return visibleItems;
}

export function hmCategoryRssItemPublicLink(
  item: HybridNewsItem,
  siteOrigin: string,
  siteSlug: string,
): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  const slugSeg = encodeURIComponent(siteSlug);
  const rawId = String(item.id ?? "");
  if (item.source === "rss" || rawId.startsWith("rss:")) {
    const rssId = rawId.replace(/^rss:/, "").trim();
    return `${origin}/tr/${slugSeg}/haberler/rss/${encodeURIComponent(rssId)}`;
  }
  const articleSlug = String(item.slug ?? "").trim() || rawId.replace(/^db:/, "").trim();
  return `${origin}/tr/${slugSeg}/haber/${encodeURIComponent(articleSlug || "0")}`;
}
