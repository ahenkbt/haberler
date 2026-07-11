import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { HM_STANDARD_NEWS_CATEGORIES, isHmCorporateVitrinTheme } from "@/lib/hmStandardNewsCategories";
import { isHmOptInNewsCategorySlug } from "@/lib/hmGlobalNewsCategory";
import { isVkdSiteSlug } from "@/lib/hmVkdFooterNav";

export const VKD_PUBLIC_NEWS_CATEGORY_SLUGS = ["dernegimiz", "faaliyetlerimiz", "sehit-gazi"] as const;

/** layoutJson.hmNavHiddenCategorySlugs → vitrinde kapalı site kategorileri. */
export function resolveHmPublicHiddenCategorySlugs(
  layoutPrefs: NewsSiteLayoutPrefs | null | undefined,
): Set<string> {
  return new Set(
    (layoutPrefs?.hmNavHiddenCategorySlugs ?? [])
      .map((s) => normalizeNewsCategorySlug(s))
      .filter(Boolean),
  );
}

/**
 * Aktif genel (Yekpare) kategori slug kümesi — `/api/categories` ile aynı mantık.
 * Haber sitesi: boş liste = standart genel kategoriler; opt-in (global) varsayılan kapalı.
 * Kurumsal: yalnızca editörde açıkça etkinleştirilen genel kategoriler.
 */
export function resolveHmPublicActiveGlobalSlugs(
  layoutPrefs: NewsSiteLayoutPrefs | null | undefined,
  allGlobalSlugs: readonly string[],
): Set<string> {
  const activated = (layoutPrefs?.hmActivatedCategorySlugs ?? [])
    .map((s) => normalizeNewsCategorySlug(s))
    .filter(Boolean);
  if (isHmCorporateVitrinTheme(layoutPrefs?.hmVitrinTheme)) {
    return new Set(activated);
  }
  if (activated.length > 0) {
    return new Set(activated);
  }
  const standardDefaults = new Set(
    HM_STANDARD_NEWS_CATEGORIES.map((c) => normalizeNewsCategorySlug(c.slug)).filter(Boolean),
  );
  const out = new Set<string>();
  for (const raw of allGlobalSlugs) {
    const slug = normalizeNewsCategorySlug(raw);
    if (!slug || isHmOptInNewsCategorySlug(slug)) continue;
    if (standardDefaults.has(slug)) out.add(slug);
  }
  for (const slug of standardDefaults) {
    if (!isHmOptInNewsCategorySlug(slug)) out.add(slug);
  }
  return out;
}

export function isHmPublicCategorySlugVisible(
  slugRaw: unknown,
  opts: {
    layoutPrefs: NewsSiteLayoutPrefs | null | undefined;
    hiddenSlugs: Set<string>;
    activeGlobalSlugs: Set<string>;
    exclusiveSiteId?: number | null;
    siteId?: number | null;
  },
): boolean {
  const slug = normalizeNewsCategorySlug(slugRaw);
  if (!slug || opts.hiddenSlugs.has(slug)) return false;
  if (opts.siteId != null && opts.exclusiveSiteId === opts.siteId) return true;
  if (opts.exclusiveSiteId == null) return opts.activeGlobalSlugs.has(slug);
  return false;
}

export function filterHmPublicCategoryRows<T extends { slug?: string; exclusiveSiteId?: number | null }>(
  rows: T[],
  layoutPrefs: NewsSiteLayoutPrefs | null | undefined,
  siteId?: number | null,
  siteSlug?: string | null,
): T[] {
  const hiddenSlugs = resolveHmPublicHiddenCategorySlugs(layoutPrefs);
  if (isHmCorporateVitrinTheme(layoutPrefs?.hmVitrinTheme)) {
    let filtered = rows.filter((row) => {
      if (siteId == null || row.exclusiveSiteId !== siteId) return false;
      const slug = normalizeNewsCategorySlug(row.slug);
      if (!slug || hiddenSlugs.has(slug)) return false;
      if (isHmOptInNewsCategorySlug(slug)) return false;
      return true;
    });
    if (isVkdSiteSlug(siteSlug)) {
      const allow = new Set<string>(VKD_PUBLIC_NEWS_CATEGORY_SLUGS);
      filtered = filtered.filter((row) => allow.has(normalizeNewsCategorySlug(row.slug)));
    }
    return filtered;
  }

  const globalSlugs = rows
    .filter((r) => r.exclusiveSiteId == null)
    .map((r) => normalizeNewsCategorySlug(r.slug))
    .filter(Boolean);
  const activeGlobalSlugs = resolveHmPublicActiveGlobalSlugs(layoutPrefs, globalSlugs);

  return rows.filter((row) =>
    isHmPublicCategorySlugVisible(row.slug, {
      layoutPrefs,
      hiddenSlugs,
      activeGlobalSlugs,
      exclusiveSiteId: row.exclusiveSiteId,
      siteId,
    }),
  );
}
