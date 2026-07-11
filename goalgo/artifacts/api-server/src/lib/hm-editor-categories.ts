import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import { categoriesTable, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";
import { normalizeNewsCategorySlug } from "./categorySort";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG, isHmOptInNewsCategorySlug } from "./hm-global-news-category.js";
import { HM_STANDARD_NEWS_CATEGORIES } from "./hm-standard-news-categories.js";
import { filterCorporatePublicCategoryRows } from "./hm-corporate-news-policy.js";

/** layoutJson.hmActivatedCategorySlugs → normalize edilmiş, tekilleştirilmiş slug listesi. */
export function parseHmActivatedCategorySlugs(layout: Record<string, unknown>): string[] {
  const raw = (layout as { hmActivatedCategorySlugs?: unknown }).hmActivatedCategorySlugs;
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const v of raw) {
    const s = normalizeNewsCategorySlug(v);
    if (s) out.add(s);
  }
  return [...out];
}

export function parseHmLayoutJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function isHmCorporateLayout(layout: Record<string, unknown>): boolean {
  const theme = String(layout.hmVitrinTheme ?? "").trim().toLowerCase();
  return theme === "corporate" || theme === "kurumsal";
}

/** KURUMSAL vitrinde köşe yazarları; tanımsızsa kapalı. */
export function resolveHmCorporateAuthorsEnabledFromLayout(layout: Record<string, unknown>): boolean {
  return layout.hmCorporateAuthorsEnabled === true;
}

/** HM editör haber formu — aktif Yekpare (genel) + bu siteye özel kategoriler. */
export function hmEditorFormCategoriesWhere(siteId: number, layout: Record<string, unknown>): SQL {
  if (isHmCorporateLayout(layout)) {
    return eq(categoriesTable.exclusiveSiteId, siteId);
  }
  return or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, siteId))!;
}

/**
 * HM vitrin — aktif genel (Yekpare) kategori slug kümesi.
 * Haber sitesi: boş layout = standart genel kategoriler aktif, opt-in (global) hariç.
 * Kurumsal: yalnızca editörde açıkça etkinleştirilen genel kategoriler.
 */
export function resolveHmPublicActiveGlobalSlugs(
  layout: Record<string, unknown>,
  allGlobalSlugs: readonly string[],
): Set<string> {
  const activated = parseHmActivatedCategorySlugs(layout);
  if (isHmCorporateLayout(layout)) {
    return new Set(activated.map((s) => normalizeNewsCategorySlug(s)).filter(Boolean));
  }
  if (activated.length > 0) {
    return new Set(activated.map((s) => normalizeNewsCategorySlug(s)).filter(Boolean));
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

/** Aktif genel kategori slug kümesi (editör haber formu + vitrin). */
export function hmEditorActivatedGlobalSlugs(
  layout: Record<string, unknown>,
  allGlobalSlugs: string[],
): Set<string> {
  return resolveHmPublicActiveGlobalSlugs(layout, allGlobalSlugs);
}

export function parseHiddenCategorySlugsFromLayout(layout: Record<string, unknown>): Set<string> {
  const raw = (layout as { hmNavHiddenCategorySlugs?: unknown }).hmNavHiddenCategorySlugs;
  if (!Array.isArray(raw)) return new Set();
  return new Set(
    raw
      .map((s) => normalizeNewsCategorySlug(s))
      .filter(Boolean),
  );
}

/** HM vitrin `/api/categories?siteId=` — site + aktif genel kategoriler; pasif/vitrinden gizli elenir. */
export function filterHmPublicCategoryRows<
  T extends { slug: string; exclusiveSiteId?: number | null },
>(categories: T[], siteId: number, siteSlug: string, layout: Record<string, unknown>): T[] {
  const hiddenSlugs = parseHiddenCategorySlugsFromLayout(layout);
  if (isHmCorporateLayout(layout)) {
    const siteRows = categories.filter((c) => {
      if (c.exclusiveSiteId !== siteId) return false;
      const dbSlug = normalizeNewsCategorySlug(c.slug);
      const cleanSlug = deriveCleanCategorySlug(c.slug, siteSlug);
      if (hiddenSlugs.has(dbSlug) || hiddenSlugs.has(cleanSlug)) return false;
      const slug = cleanSlug || dbSlug;
      if (isHmOptInNewsCategorySlug(slug)) return false;
      return true;
    });
    return filterCorporatePublicCategoryRows(siteRows, siteId, siteSlug);
  }

  const globalSlugs = categories
    .filter((c) => c.exclusiveSiteId == null)
    .map((c) => normalizeNewsCategorySlug(c.slug))
    .filter(Boolean);
  const activeGlobal = resolveHmPublicActiveGlobalSlugs(layout, globalSlugs);

  return categories.filter((c) => {
    const dbSlug = normalizeNewsCategorySlug(c.slug);
    const cleanSlug = deriveCleanCategorySlug(c.slug, siteSlug);
    if (hiddenSlugs.has(dbSlug) || hiddenSlugs.has(cleanSlug)) return false;
    if (c.exclusiveSiteId === siteId) return true;
    if (c.exclusiveSiteId == null) {
      return activeGlobal.has(dbSlug) || activeGlobal.has(cleanSlug);
    }
    return false;
  });
}

/** HM editör paneli — yalnızca bu siteye özel kategoriler (genel / başka site / kurumsal karışmaz). */
export function hmEditorCategoriesWhere(siteId: number, _layout?: Record<string, unknown>): SQL {
  return eq(categoriesTable.exclusiveSiteId, siteId);
}

/**
 * HM vitrin `/api/categories?siteId=` — kurumsal siteler yalnızca kendi kategorilerini görür;
 * haber siteleri genel + siteye özel kategorileri görür.
 */
export function hmPublicCategoriesWhere(siteId: number, layout: Record<string, unknown>): SQL {
  if (isHmCorporateLayout(layout)) {
    return eq(categoriesTable.exclusiveSiteId, siteId);
  }
  return or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, siteId))!;
}

/** Editör haber formu: slug → genel veya siteye özel kategori id. */
export async function resolveHmEditorCategoryId(
  siteId: number,
  rawSlug: unknown,
  opts?: { siteExclusiveOnly?: boolean },
): Promise<number | null> {
  const slug = normalizeNewsCategorySlug(rawSlug);
  if (!slug) return null;
  if (opts?.siteExclusiveOnly && slug === HM_GLOBAL_NEWS_CATEGORY_SLUG) return null;

  const [siteRow] = await getNewsDbForRead()
    .select({ slug: hmNewsSitesTable.slug })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  const siteSlug = String(siteRow?.slug ?? "").trim().toLowerCase();
  const cleanSlug = siteSlug ? deriveCleanCategorySlug(slug, siteSlug) : slug;

  const slugCandidates = [...new Set([slug, cleanSlug].filter(Boolean))];

  for (const candidate of slugCandidates) {
    const [siteCat] = await getNewsDbForRead()
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.slug, candidate), eq(categoriesTable.exclusiveSiteId, siteId)))
      .limit(1);
    if (siteCat) return siteCat.id;
  }

  if (opts?.siteExclusiveOnly) return null;

  for (const candidate of slugCandidates) {
    const [globalCat] = await getNewsDbForRead()
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.slug, candidate), isNull(categoriesTable.exclusiveSiteId)))
      .limit(1);
    if (globalCat) return globalCat.id;
  }

  return null;
}

export function cleanCategoryDisplayName(name: string, siteDisplayName: string, siteSlug: string): string {
  let out = String(name ?? "").trim();
  const dn = String(siteDisplayName ?? "").trim();
  if (dn) {
    const sep = `${dn} · `;
    if (out.startsWith(sep)) out = out.slice(sep.length).trim();
    if (out.toLowerCase().startsWith(dn.toLowerCase())) {
      out = out.slice(dn.length).replace(/^[\s·\-–—]+/, "").trim();
    }
  }
  const slugPrefix = `${String(siteSlug ?? "").trim().toLowerCase()}-`;
  const slugUpper = slugPrefix.toUpperCase();
  if (out.toLowerCase().startsWith(slugPrefix)) out = out.slice(slugPrefix.length).trim();
  if (out.startsWith(slugUpper)) out = out.slice(slugUpper.length).trim();
  return out || String(name ?? "").trim();
}

export function deriveCleanCategorySlug(rawSlug: string, siteSlug: string): string {
  const slug = normalizeNewsCategorySlug(rawSlug);
  const prefix = `${String(siteSlug ?? "").trim().toLowerCase()}-`;
  if (slug.startsWith(prefix)) return slug.slice(prefix.length) || slug;
  return slug;
}

export function categorySlugLooksSitePrefixed(rawSlug: string, siteSlugs: readonly string[]): string | null {
  const slug = normalizeNewsCategorySlug(rawSlug);
  for (const siteSlug of siteSlugs) {
    const s = String(siteSlug ?? "").trim().toLowerCase();
    if (!s) continue;
    const prefix = `${s}-`;
    if (slug.startsWith(prefix)) return s;
  }
  return null;
}

/** Yekpare admin listesi — site adı · kategori adı (çapraz site yönetimi). */
export function formatAdminCategoryDisplayName(
  cat: { name: string; slug: string; exclusiveSiteId: number | null },
  siteNameById: Map<number, string>,
  siteDisplayNameBySlug: Map<string, string>,
  allSiteSlugs: readonly string[],
): string {
  const baseName = String(cat.name ?? "").trim();
  if (cat.exclusiveSiteId != null) {
    const siteName = siteNameById.get(cat.exclusiveSiteId);
    if (siteName) {
      const siteSlug =
        [...siteDisplayNameBySlug.entries()].find(([, dn]) => dn === siteName)?.[0] ?? "";
      const cleaned = cleanCategoryDisplayName(baseName, siteName, siteSlug);
      return `${siteName} · ${cleaned || baseName}`;
    }
  }
  const matchedSlug = categorySlugLooksSitePrefixed(cat.slug, allSiteSlugs);
  if (matchedSlug) {
    const siteName = siteDisplayNameBySlug.get(matchedSlug) ?? matchedSlug;
    const cleaned = cleanCategoryDisplayName(baseName, siteName, matchedSlug);
    const label = cleaned || deriveCleanCategorySlug(cat.slug, matchedSlug) || baseName;
    return `${siteName} · ${label}`;
  }
  return baseName;
}

export function mapHmEditorCategoryRowForSite<
  T extends { name: string; slug: string; exclusiveSiteId: number | null },
>(cat: T, siteSlug: string, siteDisplayName: string): T {
  return {
    ...cat,
    name: cleanCategoryDisplayName(cat.name, siteDisplayName, siteSlug) || cat.name,
    slug: deriveCleanCategorySlug(cat.slug, siteSlug) || cat.slug,
  };
}
