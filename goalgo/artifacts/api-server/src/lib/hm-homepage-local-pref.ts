/**
 * Kırşehir Haber only (hm_news_sites.id = 494, slug `kirsehirhaber`).
 *
 * Tepe Manşet / Gündemde Öne Çıkanlar prefer Neon flags
 * (`is_tepe_manset`, `is_site_manset`, `is_featured`, `is_editor_manual`)
 * plus Yerel / Kırşehir category rows on that site. Other HM sites keep
 * their existing homepage selectors.
 */

import { and, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { getNewsDbForRead, newsTable } from "@workspace/db";
import { loadNewsContext } from "./news-context.js";
import { excludeKoseFromEditorialNewsList } from "./kose-article.js";
import {
  newsListSelectFields,
  serializeNewsListItem,
  type SerializedNewsListItem,
} from "./serializers.js";

/** Live Neon `hm_news_sites.id` for kirsehirhaber.org */
export const KIRSEHIR_HABER_SITE_ID = 494;

export type HmHomepageLocalPref = {
  cityKey: string;
  siteId: number;
  cityKeywords: readonly string[];
  /** Always-local categories (pool + site). */
  categorySlugs: readonly string[];
  /** Local only when site_id / owner_site_id is this site. */
  ownedCategorySlugs: readonly string[];
};

const KIRSEHIR_PREF: HmHomepageLocalPref = {
  cityKey: "kirsehir",
  siteId: KIRSEHIR_HABER_SITE_ID,
  cityKeywords: [
    "kırşehir",
    "kirsehir",
    "kirşehir",
    "kırsehir",
    "kirsehri",
    "kırşehri",
    "mucur",
    "kaman",
    "çiçekdağı",
    "cicekdagi",
    "akpınar",
    "akpinar",
    "boztepe",
    "akçakent",
    "akcakent",
  ],
  categorySlugs: ["kirsehir"],
  ownedCategorySlugs: ["yerel", "kirsehir"],
};

const SLUG_TO_SITE_ID: Record<string, number> = {
  kirsehirhaber: KIRSEHIR_HABER_SITE_ID,
  kirsehir: KIRSEHIR_HABER_SITE_ID,
  kh: KIRSEHIR_HABER_SITE_ID,
};

export function foldHmNewsText(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizeSlug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function khPrefForViewer(siteId?: number | null): HmHomepageLocalPref {
  const id = Number.isFinite(siteId) && (siteId as number) > 0 ? Math.trunc(siteId as number) : KIRSEHIR_HABER_SITE_ID;
  return id === KIRSEHIR_HABER_SITE_ID ? KIRSEHIR_PREF : { ...KIRSEHIR_PREF, siteId: id };
}

/** Kırşehir Haber only — layout overrides on other slugs are ignored. Viewer siteId wins when provided. */
export function resolveHomepageLocalPref(
  siteSlug: string | null | undefined,
  _layout?: Record<string, unknown> | null,
  siteId?: number | null,
): HmHomepageLocalPref | null {
  void _layout;
  if (siteId === KIRSEHIR_HABER_SITE_ID) return khPrefForViewer(siteId);
  if (SLUG_TO_SITE_ID[normalizeSlug(siteSlug)] === KIRSEHIR_HABER_SITE_ID) return khPrefForViewer(siteId);
  return null;
}

export function newsItemIsSiteOwned(
  item: { siteId?: number | null; ownerSiteId?: number | null },
  siteId: number,
): boolean {
  if (!Number.isFinite(siteId) || siteId <= 0) return false;
  if (item.siteId != null && item.siteId === siteId) return true;
  if (item.ownerSiteId != null && item.ownerSiteId === siteId) return true;
  return false;
}

export function newsItemHasKhEditorialFlag(item: {
  isTepeManset?: boolean | null;
  isSiteManset?: boolean | null;
  isFeatured?: boolean | null;
  isEditorManual?: boolean | null;
}): boolean {
  return (
    item.isTepeManset === true ||
    item.isSiteManset === true ||
    item.isFeatured === true ||
    item.isEditorManual === true
  );
}

function categoryMatchesSlugs(
  item: { categorySlug?: string | null; categoryName?: string | null },
  slugs: readonly string[],
): boolean {
  const slug = foldHmNewsText(item.categorySlug);
  const name = foldHmNewsText(item.categoryName);
  return slugs.some((want) => {
    const folded = foldHmNewsText(want);
    if (!folded) return false;
    return slug === folded || name === folded || slug.endsWith(`-${folded}`) || name.includes(folded);
  });
}

function textMatchesLocalKeywords(
  item: {
    title?: string | null;
    spot?: string | null;
    content?: string | null;
    tags?: string[] | null;
    slug?: string | null;
    regionKey?: string | null;
    regionLabel?: string | null;
  },
  pref: HmHomepageLocalPref,
): boolean {
  const hay = foldHmNewsText(
    [
      item.title,
      item.spot,
      item.slug,
      item.content,
      item.regionKey,
      item.regionLabel,
      ...(Array.isArray(item.tags) ? item.tags : []),
    ]
      .filter(Boolean)
      .join(" "),
  );
  if (!hay) return false;
  return pref.cityKeywords.some((kw) => {
    const folded = foldHmNewsText(kw);
    return folded.length >= 3 && hay.includes(folded);
  });
}

/**
 * Site 494: flags / Yerel / Kırşehir / city text.
 * Central-pool rows need Kırşehir text or `kirsehir` category — generic `yerel` is not enough.
 */
export function newsItemMatchesHomepageLocalPref(
  item: {
    siteId?: number | null;
    ownerSiteId?: number | null;
    title?: string | null;
    spot?: string | null;
    content?: string | null;
    tags?: string[] | null;
    slug?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
    regionKey?: string | null;
    regionLabel?: string | null;
    isTepeManset?: boolean | null;
    isSiteManset?: boolean | null;
    isFeatured?: boolean | null;
    isEditorManual?: boolean | null;
  },
  pref: HmHomepageLocalPref | null | undefined,
  siteId?: number | null,
): boolean {
  if (!pref) return false;
  const viewerId = siteId ?? pref.siteId;
  const owned = newsItemIsSiteOwned(item, viewerId);
  const textHit = textMatchesLocalKeywords(item, pref);
  if (owned) {
    return (
      newsItemHasKhEditorialFlag(item) ||
      categoryMatchesSlugs(item, pref.ownedCategorySlugs) ||
      textHit
    );
  }
  if (textHit) return true;
  return categoryMatchesSlugs(item, pref.categorySlugs);
}

function categoryIdInSlugsSql(slugs: readonly string[]): SQL {
  const lowered = slugs.map((s) => s.toLowerCase());
  return sql`${newsTable.categoryId} IN (
    SELECT id FROM categories
    WHERE lower(slug) IN (${sql.join(lowered.map((s) => sql`${s}`), sql`, `)})
       OR lower(name) IN (${sql.join(lowered.map((s) => sql`${s}`), sql`, `)})
  )`;
}

export function homepageLocalTextMatchSql(pref: HmHomepageLocalPref): SQL {
  const parts: SQL[] = [];
  for (const raw of pref.cityKeywords) {
    const kw = String(raw ?? "").trim();
    if (kw.length < 3) continue;
    const pattern = `%${kw}%`;
    parts.push(ilike(newsTable.title, pattern));
    parts.push(ilike(newsTable.spot, pattern));
    parts.push(ilike(newsTable.slug, pattern));
    parts.push(ilike(newsTable.content, pattern));
    parts.push(sql`EXISTS (SELECT 1 FROM unnest(COALESCE(${newsTable.tags}, ARRAY[]::text[])) AS t WHERE t ILIKE ${pattern})`);
  }
  if (pref.categorySlugs.length > 0) {
    parts.push(categoryIdInSlugsSql(pref.categorySlugs));
  }
  if (parts.length === 0) return sql`false`;
  return or(...parts)!;
}

function homepageLocalOwnedMatchSql(pref: HmHomepageLocalPref): SQL {
  const parts: SQL[] = [
    eq(newsTable.isTepeManset, true),
    eq(newsTable.isFeatured, true),
    eq(newsTable.isSiteManset, true),
    eq(newsTable.isEditorManual, true),
    homepageLocalTextMatchSql(pref),
  ];
  if (pref.ownedCategorySlugs.length > 0) {
    parts.push(categoryIdInSlugsSql(pref.ownedCategorySlugs));
  }
  return or(...parts)!;
}

async function serializePublishedRows(
  rows: Array<Parameters<typeof serializeNewsListItem>[0]>,
): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  return excludeKoseFromEditorialNewsList(rows.map((row) => serializeNewsListItem(row, ctx)));
}

/**
 * Site-owned flagged / Yerel / Kırşehir rows, plus central-pool city matches.
 */
export async function loadHomepageLocalPreferredNews(
  siteId: number,
  pref: HmHomepageLocalPref,
  limit: number,
): Promise<SerializedNewsListItem[]> {
  const take = Math.min(Math.max(limit, 1), 80);
  const owned = or(eq(newsTable.siteId, siteId), eq(newsTable.ownerSiteId, siteId))!;
  const poolMatch = and(isNull(newsTable.siteId), eq(newsTable.siteOnly, false), homepageLocalTextMatchSql(pref))!;
  const rows = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(
      and(
        eq(newsTable.status, "published"),
        or(and(owned, homepageLocalOwnedMatchSql(pref))!, poolMatch)!,
      ),
    )
    .orderBy(
      desc(newsTable.isTepeManset),
      desc(newsTable.isFeatured),
      desc(newsTable.isSiteManset),
      desc(newsTable.isEditorManual),
      desc(newsTable.createdAt),
      desc(newsTable.updatedAt),
    )
    .limit(take);
  return serializePublishedRows(rows);
}

function homepageUsableCoverSql(): SQL {
  return and(
    isNotNull(newsTable.imageUrl),
    sql`length(btrim(${newsTable.imageUrl})) > 8`,
    sql`${newsTable.imageUrl} not ilike 'data:%'`,
    sql`${newsTable.imageUrl} not ilike '%haber-gorsel-hazirlaniyor%'`,
    sql`${newsTable.imageUrl} not ilike '%gorsel-hazirlan%'`,
  )!;
}

/** Shared fallback: this site + central pool latest (KH only). */
export async function loadHomepageSharedFallbackNews(
  siteId: number,
  limit: number,
): Promise<SerializedNewsListItem[]> {
  const take = Math.min(Math.max(limit, 1), 80);
  const rows = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(
      and(
        eq(newsTable.status, "published"),
        or(eq(newsTable.siteId, siteId), and(isNull(newsTable.siteId), eq(newsTable.siteOnly, false))!)!,
      ),
    )
    .orderBy(desc(newsTable.createdAt), desc(newsTable.updatedAt))
    .limit(take);
  return serializePublishedRows(rows);
}

/**
 * Photo slots only: rows that actually have a usable cover.
 * Latest-N shared fallback is often all coverless local gundem, so tepe/featured
 * stay empty and first-paint paints a black hero. This query skips those.
 * Includes central-pool + this site + other public (non-manual, not site-only) covers.
 */
export async function loadHomepageCoveredFallbackNews(
  siteId: number,
  limit: number,
): Promise<SerializedNewsListItem[]> {
  const take = Math.min(Math.max(limit, 1), 80);
  const rows = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(
      and(
        eq(newsTable.status, "published"),
        homepageUsableCoverSql(),
        or(
          eq(newsTable.siteId, siteId),
          eq(newsTable.ownerSiteId, siteId),
          and(isNull(newsTable.siteId), eq(newsTable.siteOnly, false))!,
          and(eq(newsTable.siteOnly, false), sql`coalesce(${newsTable.isEditorManual}, false) = false`)!,
        )!,
      ),
    )
    .orderBy(desc(newsTable.createdAt), desc(newsTable.updatedAt))
    .limit(take);
  return serializePublishedRows(rows);
}
