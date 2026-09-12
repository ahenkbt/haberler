import { and, desc, eq, inArray, isNull, not, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getNewsDbForRead, newsTable, hmMakalelerTable, categoriesTable } from "@workspace/db";
import { loadNewsContext } from "./news-context.js";
import {
  newsListSelectFields,
  serializeHmMakaleListItem,
  serializeNewsListItem,
  type SerializedNewsListItem,
} from "./serializers.js";
import { getHmHiddenCategoryIds, yekparePoolReceiveEnabledFromLayout } from "./hm-public-layout.js";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { parseHmLayoutJson, isHmCorporateLayout } from "./hm-editor-categories.js";
import {
  strictCorporateSiteNewsScopeSql,
  filterCorporatePublicNewsItems,
  excludeYekparePoolNewsSql,
  isExternalManualEditorNewsForSite,
} from "./hm-corporate-news-policy.js";
import {
  isHmPublishGroupSharedEditorNews,
  publicHmSiteNewsScopeSql,
  resolveHmPublishGroupSiteIds,
} from "./hm-publish-groups.js";
import { excludeKoseFromEditorialNewsList } from "./kose-article.js";
import { filterPoolCopiesWhenReceiveDisabled } from "./hybrid-news-merge.js";
import { filterNewsItemsWithUsableCover, preferCoveredThenFallback } from "./news-display-image.js";
import { HM_TEPE_MANSET_ITEM_COUNT, selectTepeMansetItems } from "./hm-tepe-manset-select.js";
import {
  loadHomepageLocalPreferredNews,
  loadHomepageSharedFallbackNews,
  newsItemMatchesHomepageLocalPref,
  resolveHomepageLocalPref,
} from "./hm-homepage-local-pref.js";
import { mergeUniqueHomepageItems, preferLocalThenFill } from "./hm-homepage-section-fill.js";

type NewsReadDb = ReturnType<typeof getNewsDbForRead>;

const CENTER_HEADLINE_DEFAULT_LIMIT = 15;

/** Haber siteleri public vitrin: bu site_id + publish-group editör satırları. */
async function newsSiteScopeCondition(readDb: NewsReadDb, siteId: number, corporateStrict = false): Promise<SQL> {
  void readDb;
  if (corporateStrict) return strictCorporateSiteNewsScopeSql(siteId);
  return publicHmSiteNewsScopeSql(siteId);
}

function filterPublicEditorNewsItems(
  items: SerializedNewsListItem[],
  siteId: number,
  corporateStrict: boolean,
  _maxAgeMs: number | null = null,
  groupSiteIds?: readonly number[] | null,
): SerializedNewsListItem[] {
  void corporateStrict;
  void _maxAgeMs;
  return items.filter((item) => {
    if (isExternalManualEditorNewsForSite(item, siteId, groupSiteIds)) return false;
    if (item.siteId != null && item.siteId !== siteId && !isHmPublishGroupSharedEditorNews(item, siteId, groupSiteIds)) {
      return false;
    }
    return true;
  });
}

function normalizeCategorySlug(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function itemMatchesCategorySlug(item: SerializedNewsListItem, categorySlug: string): boolean {
  const want = normalizeCategorySlug(categorySlug);
  if (!want) return true;
  const itemSlug = normalizeCategorySlug(item.categorySlug);
  const itemName = normalizeCategorySlug(item.categoryName);
  if (itemSlug === want || itemName === want) return true;
  if (itemSlug.endsWith(`-${want}`) || want.endsWith(`-${itemSlug}`)) return true;
  return false;
}

async function resolveCategoryFilterCondition(
  readDb: NewsReadDb,
  siteId: number,
  categorySlug: string | null | undefined,
): Promise<SQL | null> {
  const slug = normalizeCategorySlug(categorySlug);
  if (!slug) return null;
  const rows = await readDb
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(
      or(
        eq(categoriesTable.exclusiveSiteId, siteId),
        inArray(categoriesTable.exclusiveSiteId, await resolveHmPublishGroupSiteIds(siteId)),
        isNull(categoriesTable.exclusiveSiteId),
      )!,
    );
  const ids = rows
    .filter((row) => {
      const rowSlug = normalizeCategorySlug(row.slug);
      return rowSlug === slug || rowSlug.endsWith(`-${slug}`) || slug.endsWith(`-${rowSlug}`);
    })
    .map((row) => row.id)
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return sql`false`;
  return inArray(newsTable.categoryId, ids);
}

async function loadFeaturedForSite(
  siteId: number,
  limit: number,
  categorySlug?: string | null,
  corporateStrict = false,
): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
  const featuredConds: SQL[] = [
    eq(newsTable.isFeatured, true),
    eq(newsTable.status, "published"),
    await newsSiteScopeCondition(readDb, siteId, corporateStrict),
    /** Tepe manşet: yalnızca editör/manuel — harici RSS ve yekpare havuz kopyası hariç. */
    or(
      eq(newsTable.isEditorManual, true),
      isNull(newsTable.rssSourceUrl),
      sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-sync:%'`,
    )!,
    or(isNull(newsTable.rssSourceUrl), not(sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-pool:%'`))!,
  ];
  if (hiddenCategoryIds.length > 0) {
    featuredConds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
  }
  const categoryCond = await resolveCategoryFilterCondition(readDb, siteId, categorySlug);
  if (categoryCond) featuredConds.push(categoryCond);

  const featured = await readDb
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(...featuredConds))
    .orderBy(desc(newsTable.updatedAt), desc(newsTable.createdAt))
    .limit(limit);

  const ranked = featured.map((r) => {
    const base = serializeNewsListItem(r, ctx);
    const hasImage = Boolean(String(base.imageUrl ?? "").trim());
    return {
      item: base,
      hasImage,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    };
  });
  ranked.sort((a, b) => {
    if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime();
  });
  return excludeKoseFromEditorialNewsList(ranked.map((e) => e.item));
}

/** Editör manuel haberler — yekpare havuz kopyası hariç (tepe/site bayrakları dahil). */
async function loadManualEditorNewsForSite(
  siteId: number,
  limit: number,
  categorySlug?: string | null,
  corporateStrict = false,
  opts?: { siteMansetOnly?: boolean; excludeFeatured?: boolean },
): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
  const conds: SQL[] = [
    eq(newsTable.status, "published"),
    await newsSiteScopeCondition(readDb, siteId, corporateStrict),
    or(isNull(newsTable.rssSourceUrl), not(sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-pool:%'`))!,
  ];
  if (opts?.siteMansetOnly) conds.push(eq(newsTable.isSiteManset, true));
  if (opts?.excludeFeatured) conds.push(eq(newsTable.isFeatured, false));
  if (hiddenCategoryIds.length > 0) {
    conds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
  }
  const categoryCond = await resolveCategoryFilterCondition(readDb, siteId, categorySlug);
  if (categoryCond) conds.push(categoryCond);

  const rows = await readDb
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(...conds))
    .orderBy(desc(newsTable.createdAt), desc(newsTable.updatedAt))
    .limit(limit);

  return excludeKoseFromEditorialNewsList(rows.map((r) => serializeNewsListItem(r, ctx)));
}

/** Haber eklenme tarihi — manşet havuzlarında tutarlı sıralama alanı. */
function newsItemAddDateMs(item: SerializedNewsListItem): number {
  const raw = item.createdAt;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortNewsItemsByAddDate(items: SerializedNewsListItem[]): SerializedNewsListItem[] {
  return [...items].sort((a, b) => newsItemAddDateMs(b) - newsItemAddDateMs(a));
}

/**
 * Homepage pick order (home-bundle):
 * - Tepe Manşet: manuel/manşet first. Site 494 (kirsehirhaber) prefers
 *   `is_tepe_manset` + Yerel/Kırşehir + city-matching rows, then shared pool.
 *   Other HM sites keep the existing tepe selector.
 * - Gündemde Öne Çıkanlar (`centerHeadlines`): site 494 uses local-preferred
 *   then mixed fill; other sites keep `buildCenterHeadlinesFromItems`.
 *
 * Orta (site) manşet:
 * 1) `isSiteManset` işaretli haberler varsa yalnızca onlar
 * 2) yoksa en son eklenenler (`isFeatured` burada elenmez — tepe ayırımı istemcide)
 */
function buildCenterHeadlinesFromItems(
  _featured: SerializedNewsListItem[],
  manual: SerializedNewsListItem[],
  limit: number,
  categorySlug?: string | null,
): SerializedNewsListItem[] {
  const slug = normalizeCategorySlug(categorySlug);
  const filterCat = (items: SerializedNewsListItem[]) =>
    slug ? items.filter((item) => itemMatchesCategorySlug(item, slug)) : items;
  const scoped = filterCat(manual);
  const siteManset = scoped.filter((item) => (item as { isSiteManset?: boolean }).isSiteManset === true);
  const pool = siteManset.length > 0 ? siteManset : scoped;
  const latest = sortNewsItemsByAddDate(pool);
  const target = Math.min(Math.max(limit, 1), 30);
  return latest.slice(0, target);
}

async function loadBreakingForSite(
  siteId: number,
  corporateStrict = false,
  poolReceiveEnabled = true,
): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
  const conds: SQL[] = [
    eq(newsTable.isBreaking, true),
    eq(newsTable.status, "published"),
    await newsSiteScopeCondition(readDb, siteId, corporateStrict),
  ];
  if (!poolReceiveEnabled) conds.push(excludeYekparePoolNewsSql());
  if (hiddenCategoryIds.length > 0) {
    conds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
  }
  const rows = await readDb
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(...conds))
    .orderBy(desc(newsTable.createdAt))
    .limit(15);
  if (rows.length > 0) {
    return filterPoolCopiesWhenReceiveDisabled(
      excludeKoseFromEditorialNewsList(rows.map((r) => serializeNewsListItem(r, ctx))),
      poolReceiveEnabled,
    );
  }

  const fallbackConds: SQL[] = [
    eq(newsTable.status, "published"),
    await newsSiteScopeCondition(readDb, siteId, corporateStrict),
  ];
  if (!poolReceiveEnabled) fallbackConds.push(excludeYekparePoolNewsSql());
  const fallback = await readDb
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(...fallbackConds))
    .orderBy(desc(newsTable.createdAt))
    .limit(15);
  return filterPoolCopiesWhenReceiveDisabled(
    fallback.map((r) => serializeNewsListItem(r, ctx)),
    poolReceiveEnabled,
  );
}

async function loadPopularForSite(
  siteId: number,
  limit: number,
  corporateStrict = false,
  poolReceiveEnabled = true,
): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
  const hiddenCond =
    hiddenCategoryIds.length > 0
      ? or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))
      : undefined;
  const newsWhere = and(
    eq(newsTable.status, "published"),
    await newsSiteScopeCondition(readDb, siteId, corporateStrict),
    hiddenCond,
    poolReceiveEnabled ? undefined : excludeYekparePoolNewsSql(),
  );
  const newsRows = await readDb
    .select(newsListSelectFields)
    .from(newsTable)
    .where(newsWhere)
    .orderBy(desc(newsTable.views))
    .limit(limit);
  const makRows = await readDb
    .select()
    .from(hmMakalelerTable)
    .where(and(eq(hmMakalelerTable.status, "published"), eq(hmMakalelerTable.siteId, siteId)))
    .orderBy(desc(hmMakalelerTable.views))
    .limit(limit);
  const merged = [
    ...newsRows.map((r) => serializeNewsListItem(r, ctx)),
    ...makRows.map((m) => serializeHmMakaleListItem(m, ctx)),
  ];
  merged.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  return filterPoolCopiesWhenReceiveDisabled(
    excludeKoseFromEditorialNewsList(merged.slice(0, limit) as SerializedNewsListItem[]),
    poolReceiveEnabled,
  );
}

export type HmHomeBundle = {
  siteId: number;
  featured: SerializedNewsListItem[];
  tepeManset: SerializedNewsListItem[];
  manualEditor: SerializedNewsListItem[];
  centerHeadlines: SerializedNewsListItem[];
  breaking: SerializedNewsListItem[];
  popular: SerializedNewsListItem[];
};

export async function buildHmHomeBundle(
  siteId: number,
  sliderLimit = CENTER_HEADLINE_DEFAULT_LIMIT,
  categorySlug?: string | null,
): Promise<HmHomeBundle> {
  const limit = Math.min(Math.max(sliderLimit, 1), 30);
  const fetchLimit = Math.min(limit * 2, 40);
  const site = await getHmNewsSiteByIdCompat(siteId);
  const layout = parseHmLayoutJson(site?.layoutJson != null ? String(site.layoutJson) : null);
  const corporateStrict = isHmCorporateLayout(layout);
  const poolReceiveEnabled = yekparePoolReceiveEnabledFromLayout(layout);
  const siteSlug = String(site?.slug ?? "").trim().toLowerCase();
  const localPref = corporateStrict ? null : resolveHomepageLocalPref(siteSlug, layout, siteId);
  const settle = <T,>(label: string, p: Promise<T[]>) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T[]>((resolve) => {
      timer = setTimeout(() => {
        console.error(`[hm-home-bundle] ${label} timeout`);
        resolve([] as T[]);
      }, 4_000);
    });
    return Promise.race([
      p.catch((err) => {
        console.error(`[hm-home-bundle] ${label}`, err instanceof Error ? err.message : err);
        return [] as T[];
      }),
      timeout,
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  };
  let [featured, siteMansetEditor, latestEditor, breaking, popular, localPreferred, sharedFallback] = await Promise.all([
    settle("featured", loadFeaturedForSite(siteId, fetchLimit, categorySlug, corporateStrict)),
    settle(
      "site-manset",
      loadManualEditorNewsForSite(siteId, fetchLimit, categorySlug, corporateStrict, { siteMansetOnly: true }),
    ),
    settle(
      "latest-editor",
      loadManualEditorNewsForSite(siteId, fetchLimit, categorySlug, corporateStrict, { excludeFeatured: true }),
    ),
    settle("breaking", loadBreakingForSite(siteId, corporateStrict, poolReceiveEnabled)),
    settle("popular", loadPopularForSite(siteId, 12, corporateStrict, poolReceiveEnabled)),
    settle(
      "local-pref",
      localPref ? loadHomepageLocalPreferredNews(siteId, localPref, 40) : Promise.resolve([]),
    ),
    settle(
      "shared-fallback",
      localPref ? loadHomepageSharedFallbackNews(siteId, 40) : Promise.resolve([]),
    ),
  ]);
  let manualEditor = siteMansetEditor.length > 0 ? siteMansetEditor : latestEditor;
  if (corporateStrict) {
    const corpOpts = { siteSlug };
    featured = filterCorporatePublicNewsItems(featured, corpOpts);
    siteMansetEditor = filterCorporatePublicNewsItems(siteMansetEditor, corpOpts);
    latestEditor = filterCorporatePublicNewsItems(latestEditor, corpOpts);
    manualEditor = siteMansetEditor.length > 0 ? siteMansetEditor : latestEditor;
    breaking = filterCorporatePublicNewsItems(breaking, corpOpts);
    popular = filterCorporatePublicNewsItems(popular, corpOpts);
  } else {
    const groupSiteIds = await resolveHmPublishGroupSiteIds(siteId);
    featured = filterPublicEditorNewsItems(featured, siteId, false, null, groupSiteIds);
    siteMansetEditor = filterPublicEditorNewsItems(siteMansetEditor, siteId, false, null, groupSiteIds);
    latestEditor = filterPublicEditorNewsItems(latestEditor, siteId, false, null, groupSiteIds);
    manualEditor = siteMansetEditor.length > 0 ? siteMansetEditor : latestEditor;
    breaking = filterPublicEditorNewsItems(breaking, siteId, false, null, groupSiteIds);
    popular = filterPublicEditorNewsItems(popular, siteId, false, null, groupSiteIds);
    localPreferred = filterPublicEditorNewsItems(localPreferred, siteId, false, null, groupSiteIds);
    sharedFallback = filterPublicEditorNewsItems(sharedFallback, siteId, false, null, groupSiteIds);
  }
  const sectionPool = mergeUniqueHomepageItems(
    localPreferred,
    featured,
    siteMansetEditor,
    latestEditor,
    manualEditor,
    sharedFallback,
    breaking,
    popular,
  );
  const centerFromLegacy = buildCenterHeadlinesFromItems(featured, manualEditor, limit, categorySlug);
  const centerHeadlines = localPref
    ? preferLocalThenFill(
        mergeUniqueHomepageItems(centerFromLegacy, sectionPool),
        localPref,
        siteId,
        limit,
      )
    : centerFromLegacy;
  const tepeManset = (() => {
    const fallbackPool = [...featured, ...siteMansetEditor, ...latestEditor, ...breaking, ...popular];
    if (!localPref) return selectTepeMansetItems(fallbackPool, HM_TEPE_MANSET_ITEM_COUNT);
    const localRows = sectionPool.filter((item) => newsItemMatchesHomepageLocalPref(item, localPref, siteId));
    const flagged = localRows.filter((item) => item.isTepeManset === true);
    const flaggedPicks = selectTepeMansetItems(flagged, HM_TEPE_MANSET_ITEM_COUNT);
    if (flaggedPicks.length >= HM_TEPE_MANSET_ITEM_COUNT) return flaggedPicks;
    const used = new Set(flaggedPicks.map((item) => String(item.id ?? item.slug ?? "")));
    const localRest = selectTepeMansetItems(
      localRows.filter((item) => !used.has(String(item.id ?? item.slug ?? ""))),
      HM_TEPE_MANSET_ITEM_COUNT - flaggedPicks.length,
    );
    const localPicks = [...flaggedPicks, ...localRest];
    if (localPicks.length >= HM_TEPE_MANSET_ITEM_COUNT) return localPicks;
    localPicks.forEach((item) => used.add(String(item.id ?? item.slug ?? "")));
    const rest = selectTepeMansetItems(
      sectionPool.filter((item) => !used.has(String(item.id ?? item.slug ?? ""))),
      HM_TEPE_MANSET_ITEM_COUNT - localPicks.length,
    );
    return [...localPicks, ...rest];
  })();
  const featuredOut = localPref
    ? preferCoveredThenFallback(featured.length > 0 ? featured : sectionPool).slice(0, limit)
    : filterNewsItemsWithUsableCover(featured);
  const tepeOut = localPref
    ? preferCoveredThenFallback(tepeManset.length > 0 ? tepeManset : sectionPool).slice(
        0,
        HM_TEPE_MANSET_ITEM_COUNT,
      )
    : filterNewsItemsWithUsableCover(tepeManset);
  const breakingOut = localPref
    ? preferCoveredThenFallback(breaking.length > 0 ? breaking : sectionPool).slice(0, 15)
    : filterNewsItemsWithUsableCover(breaking);
  const popularOut = localPref
    ? preferCoveredThenFallback(popular.length > 0 ? popular : sectionPool).slice(0, 12)
    : filterNewsItemsWithUsableCover(popular);
  return {
    siteId,
    featured: featuredOut,
    tepeManset: tepeOut,
    manualEditor: localPref
      ? preferCoveredThenFallback(manualEditor.length > 0 ? manualEditor : sectionPool).slice(0, limit)
      : filterNewsItemsWithUsableCover(manualEditor),
    // Text list: keep items without covers so Öne Çıkanlar can still fill.
    centerHeadlines,
    breaking: breakingOut,
    popular: popularOut,
  };
}
