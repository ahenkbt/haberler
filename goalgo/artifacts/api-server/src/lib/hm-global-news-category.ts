import { normalizeNewsCategorySlug } from "./categorySort.js";
import { shouldMoveNewsToGlobalCategory } from "./turkishContent.js";

/** İngilizce / uluslararası küresel RSS — yalnızca haber haritasında veya editör etkinleştirmesinde. */
export const HM_GLOBAL_NEWS_CATEGORY_SLUG = "global";

/** Editör panelinde varsayılan kapalı; açık etkinleştirme gerektirir. */
export const HM_OPT_IN_NEWS_CATEGORY_SLUGS = new Set<string>([HM_GLOBAL_NEWS_CATEGORY_SLUG]);

export function isHmGlobalNewsCategorySlug(raw: unknown): boolean {
  return normalizeNewsCategorySlug(raw) === HM_GLOBAL_NEWS_CATEGORY_SLUG;
}

export function isHmOptInNewsCategorySlug(raw: unknown): boolean {
  const slug = normalizeNewsCategorySlug(raw);
  return slug.length > 0 && HM_OPT_IN_NEWS_CATEGORY_SLUGS.has(slug);
}

/** Global kategori haber sitesinde görünür mü? (Harita modu her zaman açık.) */
export function isGlobalNewsCategoryEnabledOnSite(opts: {
  newsmapMode?: boolean;
  activatedSlugs?: string[] | null | undefined;
}): boolean {
  if (opts.newsmapMode) return true;
  if (!opts.activatedSlugs?.length) return false;
  return opts.activatedSlugs.some((s) => isHmGlobalNewsCategorySlug(s));
}

export type FeedGeoForGlobalPolicy = {
  countryCode?: string | null;
  regionKey?: string | null;
};

export type NewsItemForSiteGlobalPolicy = {
  categorySlug?: string | null;
  source?: string | null;
  feedId?: string | null;
};

/** Cumha il/KKTC ve Türkçe dünya özeti — haber sitesinde dünya olarak kalır. */
export function isTurkishDunyaRssFeedGeo(geo?: FeedGeoForGlobalPolicy | null): boolean {
  const cc = String(geo?.countryCode ?? "").trim().toUpperCase();
  const regionKey = String(geo?.regionKey ?? "").trim().toLowerCase();
  if (cc === "TR" || cc === "CY") return true;
  if (regionKey.startsWith("tr-") || regionKey.startsWith("cy-")) return true;
  if (regionKey === "global-dunya") return true;
  return false;
}

/** Harita RSS feed satırı → kategori slug (TR/KKTC dünya, yabancı → global). */
export function resolveGlobalMapFeedCategorySlug(opts: {
  category?: unknown;
  regionKey?: unknown;
  countryCode?: unknown;
}): string {
  const category = String(opts.category ?? "").trim().toLowerCase();
  if (category === "video") return "video";
  if (
    isTurkishDunyaRssFeedGeo({
      countryCode: opts.countryCode == null ? null : String(opts.countryCode),
      regionKey: opts.regionKey == null ? null : String(opts.regionKey),
    })
  ) {
    return "dunya";
  }
  return HM_GLOBAL_NEWS_CATEGORY_SLUG;
}

/** Yabancı bölge pin RSS'i dünya etiketiyle gelse bile site için global (opt-in) sayılır. */
export function isForeignDunyaRssTreatedAsGlobal(
  item: NewsItemForSiteGlobalPolicy,
  feedGeoById?: Record<string, FeedGeoForGlobalPolicy | null | undefined> | null,
): boolean {
  if (normalizeNewsCategorySlug(item.categorySlug) !== "dunya") return false;
  if (String(item.source ?? "").trim().toLowerCase() !== "rss") return false;
  const feedId = String(item.feedId ?? "").trim();
  if (!feedId.startsWith("gmn-")) return false;
  const geo = feedGeoById?.[feedId] ?? null;
  return !isTurkishDunyaRssFeedGeo(geo);
}

export function effectiveNewsCategorySlugForSiteGlobalPolicy(
  item: NewsItemForSiteGlobalPolicy,
  feedGeoById?: Record<string, FeedGeoForGlobalPolicy | null | undefined> | null,
): string {
  if (isForeignDunyaRssTreatedAsGlobal(item, feedGeoById)) {
    return HM_GLOBAL_NEWS_CATEGORY_SLUG;
  }
  return normalizeNewsCategorySlug(item.categorySlug);
}

export type NewsSiteGlobalCategoryPolicyOpts = {
  newsmapMode?: boolean;
  activatedSlugs?: string[] | null | undefined;
  requestedCategorySlug?: string | null | undefined;
  feedGeoById?: Record<string, FeedGeoForGlobalPolicy | null | undefined> | null;
};

/** Haber sitesi / portal listelerinden global kategoriyi süzer; haritada dokunmaz. */
export function filterNewsItemsForSiteGlobalPolicy<T extends NewsItemForSiteGlobalPolicy>(
  items: T[],
  opts: NewsSiteGlobalCategoryPolicyOpts,
): T[] {
  const requested = normalizeNewsCategorySlug(opts.requestedCategorySlug);
  /** Global yalnızca haber haritasında — kategori sayfası / menü asla. */
  if (requested === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
    if (!opts.newsmapMode) return [];
    return filterGlobalCategoryNewsItems(
      items as Array<{ title?: string | null; spot?: string | null; lang?: string | null }>,
    ) as T[];
  }
  if (opts.newsmapMode) return items;
  return items.filter(
    (item) =>
      effectiveNewsCategorySlugForSiteGlobalPolicy(item, opts.feedGeoById) !== HM_GLOBAL_NEWS_CATEGORY_SLUG,
  );
}

/** Global kategori listesi — yalnızca Türkçe dışı (EN/AR/FR vb.) haberler. */
export function belongsInGlobalNewsCategory(
  title: string | null | undefined,
  spot?: string | null,
  lang?: string | null,
): boolean {
  return shouldMoveNewsToGlobalCategory(title, spot, lang);
}

export function filterGlobalCategoryNewsItems<
  T extends { title?: string | null; spot?: string | null; lang?: string | null },
>(items: T[]): T[] {
  return items.filter((item) => belongsInGlobalNewsCategory(item.title, item.spot, item.lang));
}

