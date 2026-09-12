/**
 * Site-scoped homepage / listing preference.
 *
 * Kırşehir Haber (`kirsehirhaber`) prefers city-matching rows from the site
 * inventory and the shared central pool (site_id NULL). Other HM sites stay on
 * the shared-pool default unless layout sets `hmHomepageLocalCity`.
 */

import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { getNewsDbForRead, newsTable } from "@workspace/db";
import { loadNewsContext } from "./news-context.js";
import { excludeKoseFromEditorialNewsList } from "./kose-article.js";
import {
  newsListSelectFields,
  serializeNewsListItem,
  type SerializedNewsListItem,
} from "./serializers.js";

export type HmHomepageLocalPref = {
  cityKey: string;
  cityKeywords: readonly string[];
  categorySlugs: readonly string[];
};

const KIRSEHIR_PREF: HmHomepageLocalPref = {
  cityKey: "kirsehir",
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
};

const CITY_PACKS: Record<string, HmHomepageLocalPref> = {
  kirsehir: KIRSEHIR_PREF,
};

const SLUG_TO_CITY: Record<string, string> = {
  kirsehirhaber: "kirsehir",
  kirsehir: "kirsehir",
  kh: "kirsehir",
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

export function resolveHomepageLocalPref(
  siteSlug: string | null | undefined,
  layout?: Record<string, unknown> | null,
): HmHomepageLocalPref | null {
  const fromLayout = normalizeSlug(layout?.hmHomepageLocalCity);
  const fromSlug = SLUG_TO_CITY[normalizeSlug(siteSlug)] ?? "";
  const cityKey = fromLayout || fromSlug;
  if (!cityKey) return null;
  return CITY_PACKS[cityKey] ?? null;
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

function categoryMatchesLocal(item: { categorySlug?: string | null; categoryName?: string | null }, pref: HmHomepageLocalPref): boolean {
  const slug = foldHmNewsText(item.categorySlug);
  const name = foldHmNewsText(item.categoryName);
  return pref.categorySlugs.some((want) => {
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

/** Site-owned rows always match; central-pool rows need city/geo/category signal. */
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
  },
  pref: HmHomepageLocalPref | null | undefined,
  siteId?: number | null,
): boolean {
  if (!pref) return false;
  if (siteId != null && newsItemIsSiteOwned(item, siteId)) return true;
  if (textMatchesLocalKeywords(item, pref)) return true;
  if (categoryMatchesLocal(item, pref) && textMatchesLocalKeywords(item, pref)) return true;
  return categoryMatchesLocal(item, pref);
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
    const slugs = pref.categorySlugs.map((s) => s.toLowerCase());
    parts.push(sql`${newsTable.categoryId} IN (
      SELECT id FROM categories
      WHERE lower(slug) IN (${sql.join(slugs.map((s) => sql`${s}`), sql`, `)})
         OR lower(name) IN (${sql.join(slugs.map((s) => sql`${s}`), sql`, `)})
    )`);
  }
  if (parts.length === 0) return sql`false`;
  return or(...parts)!;
}

async function serializePublishedRows(
  rows: Array<Parameters<typeof serializeNewsListItem>[0]>,
): Promise<SerializedNewsListItem[]> {
  const ctx = await loadNewsContext();
  return excludeKoseFromEditorialNewsList(rows.map((row) => serializeNewsListItem(row, ctx)));
}

/**
 * Site-owned rows plus central-pool items that match the city preference.
 * Manual editor news and RSS imports are both eligible.
 */
export async function loadHomepageLocalPreferredNews(
  siteId: number,
  pref: HmHomepageLocalPref,
  limit: number,
): Promise<SerializedNewsListItem[]> {
  const take = Math.min(Math.max(limit, 1), 80);
  const matchSql = homepageLocalTextMatchSql(pref);
  const rows = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(
      and(
        eq(newsTable.status, "published"),
        or(
          eq(newsTable.siteId, siteId),
          eq(newsTable.ownerSiteId, siteId),
          and(isNull(newsTable.siteId), eq(newsTable.siteOnly, false), matchSql)!,
        )!,
      ),
    )
    .orderBy(desc(newsTable.createdAt), desc(newsTable.updatedAt))
    .limit(take);
  return serializePublishedRows(rows);
}

/** Shared fallback: this site + central pool latest (never used to empty a section). */
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

