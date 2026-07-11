import { and, eq, isNotNull, isNull, not, or, sql, type SQL } from "drizzle-orm";
import {
  categoriesTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  newsTable,
} from "@workspace/db";
import { normalizeNewsCategorySlug } from "./categorySort.js";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "./hm-global-news-category.js";
import { deriveCleanCategorySlug, isHmCorporateLayout } from "./hm-editor-categories.js";
import { isKoseArticle, type KoseArticleLike } from "./kose-article.js";
import { parseHmPoolRef, parseHmSyncDedupeKey } from "./hm-sync-source.js";

/** VKD kurumsal vitrin — yalnızca bu haber kategorileri (nav, footer, editör). */
export const VKD_PUBLIC_NEWS_CATEGORY_SLUGS = ["dernegimiz", "faaliyetlerimiz", "sehit-gazi"] as const;

/** VKD editöründe eksikse otomatik oluşturulacak siteye özel kategoriler. */
export const VKD_DEFAULT_SITE_CATEGORIES = [
  { name: "Derneğimiz", slug: "dernegimiz", color: "#e61e25" },
  { name: "Faaliyetlerimiz", slug: "faaliyetlerimiz", color: "#2563eb" },
  { name: "Şehit Gazi", slug: "sehit-gazi", color: "#7c3aed" },
] as const;

/** Yekpare genel kategori olarak diğer kurumsal sitelere verilmemeli — yalnızca site tablosu (VKD). */
export const VKD_ONLY_CATEGORY_SLUGS = ["sehit-gazi"] as const;

export function isVkdHmSiteSlug(raw: string | null | undefined): boolean {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "vkd" || s === "vatankahramanlari" || s.includes("vatankahramanlari");
}

export function isYekparePoolOrSyncRef(rssSourceUrl: string | null | undefined): boolean {
  const ref = String(rssSourceUrl ?? "").trim();
  return ref.startsWith("yekpare-hm-pool:") || ref.startsWith("yekpare-hm-sync:");
}

/** Merkez havuz satırının kaynak HM site id'si (yekpare-hm-sync veya yekpare-hm-pool ref). */
export function centralNewsRefOriginSiteId(rssSourceUrl: string | null | undefined): number | null {
  const sync = parseHmSyncDedupeKey(rssSourceUrl);
  if (sync) return sync.siteId;
  const pool = parseHmPoolRef(rssSourceUrl);
  if (pool) return pool.siteId;
  return null;
}

/** Merkez havuz kaydı kurumsal HM sitesinden mi senkron/kopya? */
export function isCorporateOriginCentralNewsRef(
  rssSourceUrl: string | null | undefined,
  corporateSiteIds: ReadonlySet<number>,
): boolean {
  if (!corporateSiteIds.size) return false;
  const siteId = centralNewsRefOriginSiteId(rssSourceUrl);
  return siteId != null && corporateSiteIds.has(siteId);
}

export function filterNonCorporateOriginCentralNewsItems<
  T extends { rssSourceUrl?: string | null },
>(items: T[], corporateSiteIds: ReadonlySet<number>): T[] {
  if (!corporateSiteIds.size) return items;
  return items.filter((item) => !isCorporateOriginCentralNewsRef(item.rssSourceUrl, corporateSiteIds));
}

/** SQL: merkez havuz kopyası (pool/sync ref) satırlarını hariç tut. */
export function excludeYekparePoolNewsSql(): SQL {
  return and(
    or(isNull(newsTable.rssSourceUrl), not(sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-pool:%'`))!,
    or(isNull(newsTable.rssSourceUrl), not(sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-sync:%'`))!,
  )!;
}

/** Kurumsal vitrin: yalnızca site-yerel satırlar (merkez havuz / pool kopyası yok). */
export function strictCorporateSiteNewsScopeSql(siteId: number): SQL {
  return and(eq(newsTable.siteId, siteId), excludeYekparePoolNewsSql())!;
}

export function isCorporateSiteLocalNewsRow(row: {
  siteId?: number | null;
  publishedOnSiteId?: number | null;
  rssSourceUrl?: string | null;
  source?: string | null;
}): boolean {
  if (isYekparePoolOrSyncRef(row.rssSourceUrl)) return false;
  const siteId = row.siteId ?? row.publishedOnSiteId;
  if (siteId != null && siteId > 0) return true;
  if (String(row.source ?? "").trim().toLowerCase() === "rss") return true;
  return false;
}

export function filterCorporatePublicNewsItems<
  T extends {
    siteId?: number | null;
    publishedOnSiteId?: number | null;
    categorySlug?: string | null;
    rssSourceUrl?: string | null;
    source?: string | null;
  },
>(items: T[], opts?: { siteSlug?: string | null }): T[] {
  const siteSlug = opts?.siteSlug ?? null;
  return items.filter((item) => {
    if (!isCorporateSiteLocalNewsRow(item)) return false;
    const cat = normalizeNewsCategorySlug(item.categorySlug);
    if (cat === HM_GLOBAL_NEWS_CATEGORY_SLUG) return false;
    return isAllowedCorporateCategorySlug(cat, siteSlug);
  });
}

export function resolveVkdAllowedCategorySlugs(siteSlug: string | null | undefined): readonly string[] | null {
  return isVkdHmSiteSlug(siteSlug) ? VKD_PUBLIC_NEWS_CATEGORY_SLUGS : null;
}

export function isAllowedCorporateCategorySlug(
  slugRaw: unknown,
  siteSlug: string | null | undefined,
): boolean {
  const slug = normalizeNewsCategorySlug(slugRaw);
  if (!slug || slug === HM_GLOBAL_NEWS_CATEGORY_SLUG) return false;
  const allowed = resolveVkdAllowedCategorySlugs(siteSlug);
  if (!allowed) return true;
  return new Set<string>(allowed).has(slug);
}

export function isVkdOnlyGlobalCategorySlug(slugRaw: unknown): boolean {
  const slug = normalizeNewsCategorySlug(slugRaw);
  return (VKD_ONLY_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function filterVkdPublicCategoryRows<T extends { slug: string }>(rows: T[], siteSlug: string): T[] {
  if (!isVkdHmSiteSlug(siteSlug)) return rows;
  const allow = new Set<string>(VKD_PUBLIC_NEWS_CATEGORY_SLUGS);
  return rows.filter((r) => allow.has(normalizeNewsCategorySlug(r.slug)));
}

/** VKD kurumsal editör — dernegimiz / faaliyetlerimiz / sehit-gazi site kategorilerini garanti eder. */
export async function ensureVkdCorporateSiteCategories(siteId: number, siteSlug: string): Promise<void> {
  if (!isVkdHmSiteSlug(siteSlug)) return;

  const readDb = getNewsDbForRead();
  const existing = await readDb
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));

  const have = new Set(existing.map((row) => normalizeNewsCategorySlug(row.slug)));
  let sortOrder = existing.length;

  for (const def of VKD_DEFAULT_SITE_CATEGORIES) {
    const slug = normalizeNewsCategorySlug(def.slug);
    if (!slug || have.has(slug)) continue;

    // Migration 0101 promoted sehit-gazi to GENEL; reclaim VKD-only slugs for this site.
    if (isVkdOnlyGlobalCategorySlug(slug)) {
      const [globalRow] = await readDb
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(and(eq(categoriesTable.slug, slug), isNull(categoriesTable.exclusiveSiteId)))
        .limit(1);
      if (globalRow) {
        await dualWriteUpdate(
          categoriesTable,
          { exclusiveSiteId: siteId },
          eq(categoriesTable.id, globalRow.id),
        );
        have.add(slug);
        continue;
      }
    }

    sortOrder += 1;
    try {
      await dualWriteInsert(categoriesTable, {
        name: def.name,
        slug,
        color: def.color,
        exclusiveSiteId: siteId,
        sortOrder,
      });
      have.add(slug);
    } catch {
      const [conflict] = await readDb
        .select({ id: categoriesTable.id, exclusiveSiteId: categoriesTable.exclusiveSiteId })
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, slug))
        .limit(1);
      if (conflict?.exclusiveSiteId == null && isVkdOnlyGlobalCategorySlug(slug)) {
        await dualWriteUpdate(
          categoriesTable,
          { exclusiveSiteId: siteId },
          eq(categoriesTable.id, conflict.id),
        );
        have.add(slug);
      }
    }
  }
}

/** Kurumsal vitrin — yalnızca siteye özel kategoriler; VKD slug süzgeci uygulanır. */
export function filterCorporatePublicCategoryRows<
  T extends { slug: string; exclusiveSiteId?: number | null },
>(rows: T[], siteId: number, siteSlug: string): T[] {
  const siteOnly = rows.filter((r) => {
    if (r.exclusiveSiteId !== siteId) return false;
    const slug = normalizeNewsCategorySlug(r.slug);
    if (!slug || slug === HM_GLOBAL_NEWS_CATEGORY_SLUG) return false;
    if (isVkdOnlyGlobalCategorySlug(slug) && r.exclusiveSiteId !== siteId) return false;
    return true;
  });
  return filterVkdPublicCategoryRows(siteOnly, siteSlug);
}

export function shouldUseStrictCorporateNewsScope(layout: Record<string, unknown>): boolean {
  return isHmCorporateLayout(layout);
}

/** VKD: bilinen slug → site kategorisi (yanlış global atamasını düzeltmek için). */
const VKD_SLUG_CATEGORY_HINTS: Record<string, string> = {
  belgeler: "dernegimiz",
};

export function resolveCorporateRepairCategorySlug(opts: {
  siteSlug: string;
  articleSlug: string;
  portalCategorySlug: string | null | undefined;
  fallbackSlug?: string | null;
}): string | null {
  const siteSlug = String(opts.siteSlug ?? "").trim().toLowerCase();
  const articleSlug = normalizeNewsCategorySlug(opts.articleSlug);
  if (isVkdHmSiteSlug(siteSlug) && articleSlug && VKD_SLUG_CATEGORY_HINTS[articleSlug]) {
    return VKD_SLUG_CATEGORY_HINTS[articleSlug]!;
  }
  const portalSlug = normalizeNewsCategorySlug(opts.portalCategorySlug);
  if (portalSlug && portalSlug !== HM_GLOBAL_NEWS_CATEGORY_SLUG) {
    const clean = siteSlug ? deriveCleanCategorySlug(portalSlug, siteSlug) : portalSlug;
    if (clean && clean !== HM_GLOBAL_NEWS_CATEGORY_SLUG) return clean;
  }
  const fallback = normalizeNewsCategorySlug(opts.fallbackSlug);
  if (fallback && fallback !== HM_GLOBAL_NEWS_CATEGORY_SLUG) return fallback;
  if (isVkdHmSiteSlug(siteSlug)) return "dernegimiz";
  return null;
}

/**
 * HM haber sitesi: merkez havuzdaki köşe/makale yalnızca kaynak sitede görünür.
 * Genel haber sync (yekpare-hm-sync:*:news:*) diğer sitelerin etkin havuzunda kalır.
 */
/** Başka HM editör sitesinde manuel eklenip merkez havuza sync/pool ile gelen haber. */
export function isExternalManualEditorNewsForSite(
  row: {
    siteId?: number | null;
    rssSourceUrl?: string | null;
    isEditorManual?: boolean | null;
  },
  editorSiteId: number,
): boolean {
  if (!Number.isFinite(editorSiteId) || editorSiteId <= 0) return false;
  if (row.siteId != null && row.siteId === editorSiteId) return false;

  const rssUrl = String(row.rssSourceUrl ?? "").trim();
  const sync = parseHmSyncDedupeKey(rssUrl);
  if (sync) {
    if (sync.kind !== "news") return false;
    return sync.siteId !== editorSiteId;
  }

  const pool = parseHmPoolRef(rssUrl);
  if (pool) return pool.siteId !== editorSiteId;

  return row.siteId != null && row.siteId !== editorSiteId && row.isEditorManual === true;
}

export function centralNewsRowVisibleOnHmEditorSite(
  row: {
    siteId?: number | null;
    rssSourceUrl?: string | null;
    authorId?: number | null;
  } & KoseArticleLike,
  editorSiteId: number,
): boolean {
  if (row.siteId != null) return row.siteId === editorSiteId;

  const sync = parseHmSyncDedupeKey(String(row.rssSourceUrl ?? "").trim());
  if (sync) {
    if (sync.kind === "makale") return sync.siteId === editorSiteId;
    if (isKoseArticle(row)) return sync.siteId === editorSiteId;
    return true;
  }

  const pool = parseHmPoolRef(String(row.rssSourceUrl ?? "").trim());
  if (pool) return pool.siteId === editorSiteId;

  if (isKoseArticle(row) || (row.authorId != null && row.authorId > 0)) return false;
  return true;
}

/** Kurumsal sitede merkez havuz satırı yalnızca bu siteye sync edilmişse görünür. */
export function centralNewsRowBelongsToCorporateSite(
  row: {
    siteId?: number | null;
    rssSourceUrl?: string | null;
    categoryExclusiveSiteId?: number | null;
    categorySlug?: string | null;
  },
  siteId: number,
): boolean {
  if (row.siteId != null) return row.siteId === siteId;
  const catSlug = normalizeNewsCategorySlug(row.categorySlug);
  if (catSlug === HM_GLOBAL_NEWS_CATEGORY_SLUG) return false;
  if (row.categoryExclusiveSiteId === siteId) return true;
  const sync = parseHmSyncDedupeKey(String(row.rssSourceUrl ?? "").trim());
  return sync?.siteId === siteId && sync.kind === "news";
}

/**
 * Kurumsal site-yerel haberlerde global / portal kategori atamasını site kategorisine taşır.
 * (post-migrate reclassify veya sync sonrası yanlış categoryId düzeltmesi)
 */
export async function repairCorporateSiteLocalNewsCategories(opts: {
  siteId: number;
  siteSlug: string;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  repaired: number;
  items: Array<{ id: number; slug: string; fromCategorySlug: string; toCategorySlug: string }>;
}> {
  const siteId = opts.siteId;
  const siteSlug = String(opts.siteSlug ?? "").trim().toLowerCase();
  const readDb = getNewsDbForRead();
  const rows = await readDb
    .select({
      id: newsTable.id,
      slug: newsTable.slug,
      categoryId: newsTable.categoryId,
      categorySlug: categoriesTable.slug,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(newsTable)
    .leftJoin(categoriesTable, eq(newsTable.categoryId, categoriesTable.id))
    .where(and(eq(newsTable.siteId, siteId), isNotNull(newsTable.siteId)));

  const siteCategories = await readDb
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));

  const siteCatBySlug = new Map(
    siteCategories.map((c) => [normalizeNewsCategorySlug(c.slug), c.id] as const),
  );
  const defaultSlug = resolveCorporateRepairCategorySlug({
    siteSlug,
    articleSlug: "",
    portalCategorySlug: null,
    fallbackSlug: "dernegimiz",
  });

  const items: Array<{ id: number; slug: string; fromCategorySlug: string; toCategorySlug: string }> = [];
  for (const row of rows) {
    const fromSlug = normalizeNewsCategorySlug(row.categorySlug);
    const isSiteCategory = row.exclusiveSiteId === siteId;
    if (isSiteCategory && fromSlug !== HM_GLOBAL_NEWS_CATEGORY_SLUG) continue;

    const targetSlug = resolveCorporateRepairCategorySlug({
      siteSlug,
      articleSlug: String(row.slug ?? ""),
      portalCategorySlug: fromSlug || null,
      fallbackSlug: defaultSlug,
    });
    if (!targetSlug) continue;
    const targetId = siteCatBySlug.get(targetSlug);
    if (!targetId || targetId === row.categoryId) continue;

    items.push({
      id: row.id,
      slug: String(row.slug ?? ""),
      fromCategorySlug: fromSlug || "(none)",
      toCategorySlug: targetSlug,
    });
  }

  if (!opts.dryRun && items.length > 0) {
    for (const item of items) {
      const targetId = siteCatBySlug.get(item.toCategorySlug);
      if (!targetId) continue;
      await dualWriteUpdate(newsTable, { categoryId: targetId }, eq(newsTable.id, item.id));
    }
  }

  return { scanned: rows.length, repaired: items.length, items };
}
