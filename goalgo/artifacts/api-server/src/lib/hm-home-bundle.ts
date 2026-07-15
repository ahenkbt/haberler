import { and, desc, eq, inArray, isNull, not, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getNewsDbForRead, newsTable, hmMakalelerTable, categoriesTable } from "@workspace/db";
import { loadNewsContext } from "./news-context.js";
import {
  newsListSelectFields,
  serializeHmMakaleListItem,
  serializeNewsListItem,
  type SerializedNewsListItem,
} from "./serializers.js";
import { getHmHiddenCategoryIds } from "./hm-public-layout.js";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { parseHmLayoutJson, isHmCorporateLayout } from "./hm-editor-categories.js";
import { strictCorporateSiteNewsScopeSql, filterCorporatePublicNewsItems } from "./hm-corporate-news-policy.js";
import { excludeKoseFromEditorialNewsList } from "./kose-article.js";

type NewsReadDb = ReturnType<typeof getNewsDbForRead>;

const CENTER_HEADLINE_DEFAULT_LIMIT = 15;

async function newsSiteScopeCondition(readDb: NewsReadDb, siteId: number, corporateStrict = false): Promise<SQL> {
  if (corporateStrict) return strictCorporateSiteNewsScopeSql(siteId);
  const ownedCategories = await readDb
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));
  const ownedCategoryIds = ownedCategories.map((row) => row.id).filter((id) => Number.isFinite(id) && id > 0);
  if (ownedCategoryIds.length === 0) return eq(newsTable.siteId, siteId);
  return or(eq(newsTable.siteId, siteId), and(isNull(newsTable.siteId), inArray(newsTable.categoryId, ownedCategoryIds)))!;
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

/** Editör manuel haberler — isFeatured=false, yekpare havuz kopyası hariç. */
async function loadManualEditorNewsForSite(
  siteId: number,
  limit: number,
  categorySlug?: string | null,
  corporateStrict = false,
): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
  const conds: SQL[] = [
    eq(newsTable.isFeatured, false),
    eq(newsTable.status, "published"),
    await newsSiteScopeCondition(readDb, siteId, corporateStrict),
    or(isNull(newsTable.rssSourceUrl), not(sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-pool:%'`))!,
  ];
  if (hiddenCategoryIds.length > 0) {
    conds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
  }
  const categoryCond = await resolveCategoryFilterCondition(readDb, siteId, categorySlug);
  if (categoryCond) conds.push(categoryCond);

  const rows = await readDb
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(...conds))
    .orderBy(desc(newsTable.updatedAt), desc(newsTable.createdAt))
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

/** Orta manşet: en son eklenen manuel/DB haberler — tepe manşet `isFeatured` ile ayrı. */
function buildCenterHeadlinesFromItems(
  _featured: SerializedNewsListItem[],
  manual: SerializedNewsListItem[],
  limit: number,
  categorySlug?: string | null,
): SerializedNewsListItem[] {
  const slug = normalizeCategorySlug(categorySlug);
  const filterCat = (items: SerializedNewsListItem[]) =>
    slug ? items.filter((item) => itemMatchesCategorySlug(item, slug)) : items;
  const latest = sortNewsItemsByAddDate(filterCat(manual));
  const target = Math.min(Math.max(limit, 1), 30);
  return latest.slice(0, target);
}

async function loadBreakingForSite(siteId: number, corporateStrict = false): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
  const conds: SQL[] = [
    eq(newsTable.isBreaking, true),
    eq(newsTable.status, "published"),
    await newsSiteScopeCondition(readDb, siteId, corporateStrict),
  ];
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
    return excludeKoseFromEditorialNewsList(rows.map((r) => serializeNewsListItem(r, ctx)));
  }

  const fallback = await readDb
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(eq(newsTable.status, "published"), await newsSiteScopeCondition(readDb, siteId, corporateStrict)))
    .orderBy(desc(newsTable.createdAt))
    .limit(15);
  return fallback.map((r) => serializeNewsListItem(r, ctx));
}

async function loadPopularForSite(siteId: number, limit: number, corporateStrict = false): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
  const hiddenCond =
    hiddenCategoryIds.length > 0
      ? or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))
      : undefined;
  const newsWhere = hiddenCond
    ? and(eq(newsTable.status, "published"), await newsSiteScopeCondition(readDb, siteId, corporateStrict), hiddenCond)
    : and(eq(newsTable.status, "published"), await newsSiteScopeCondition(readDb, siteId, corporateStrict));
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
  return excludeKoseFromEditorialNewsList(merged.slice(0, limit) as SerializedNewsListItem[]);
}

export type HmHomeBundle = {
  siteId: number;
  featured: SerializedNewsListItem[];
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
  const siteSlug = String(site?.slug ?? "").trim().toLowerCase();
  let [featured, manualEditor, breaking, popular] = await Promise.all([
    loadFeaturedForSite(siteId, fetchLimit, categorySlug, corporateStrict),
    loadManualEditorNewsForSite(siteId, fetchLimit, categorySlug, corporateStrict),
    loadBreakingForSite(siteId, corporateStrict),
    loadPopularForSite(siteId, 12, corporateStrict),
  ]);
  if (corporateStrict) {
    const corpOpts = { siteSlug };
    featured = filterCorporatePublicNewsItems(featured, corpOpts);
    manualEditor = filterCorporatePublicNewsItems(manualEditor, corpOpts);
    breaking = filterCorporatePublicNewsItems(breaking, corpOpts);
    popular = filterCorporatePublicNewsItems(popular, corpOpts);
  }
  const centerHeadlines = buildCenterHeadlinesFromItems(featured, manualEditor, limit, categorySlug);
  return { siteId, featured, manualEditor, centerHeadlines, breaking, popular };
}
