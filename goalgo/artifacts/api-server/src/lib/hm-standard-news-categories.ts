import { eq } from "drizzle-orm";
import { categoriesTable, dualWriteInsert, getNewsDbForRead } from "@workspace/db";
import { normalizeNewsCategorySlug } from "./categorySort";
import { isHmCorporateLayout, resolveHmPublicActiveGlobalSlugs } from "./hm-editor-categories";

/** Yekpare /haberler ile aynı — tüm HM haber sitelerinde sabit genel kategoriler. */
export const HM_STANDARD_NEWS_CATEGORIES = [
  { name: "Gündem", slug: "gundem", color: "#e61e25" },
  { name: "Dünya", slug: "dunya", color: "#2563eb" },
  { name: "Ekonomi", slug: "ekonomi", color: "#f97316" },
  { name: "Politika", slug: "politika", color: "#7c3aed" },
  { name: "Spor", slug: "spor", color: "#16a34a" },
  { name: "Teknoloji", slug: "teknoloji", color: "#9333ea" },
] as const;

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  color: string;
  exclusiveSiteId: number | null;
  sortOrder: number;
  newsCount?: number;
};

export function ensureHmStandardNewsCategories(
  categories: CategoryRow[],
  layout: Record<string, unknown>,
  hiddenSlugs: Set<string>,
): CategoryRow[] {
  if (isHmCorporateLayout(layout)) return categories;
  const globalSlugs = categories
    .filter((c) => c.exclusiveSiteId == null)
    .map((c) => normalizeNewsCategorySlug(c.slug))
    .filter(Boolean);
  const activeGlobal = resolveHmPublicActiveGlobalSlugs(layout, [
    ...globalSlugs,
    ...HM_STANDARD_NEWS_CATEGORIES.map((c) => normalizeNewsCategorySlug(c.slug)).filter(Boolean),
  ]);
  const bySlug = new Map(categories.map((c) => [normalizeNewsCategorySlug(c.slug), c]));

  for (const std of HM_STANDARD_NEWS_CATEGORIES) {
    const slug = normalizeNewsCategorySlug(std.slug);
    if (!slug || hiddenSlugs.has(slug) || !activeGlobal.has(slug)) continue;
    if (bySlug.has(slug)) continue;
    bySlug.set(slug, {
      id: 0,
      name: std.name,
      slug,
      color: std.color,
      exclusiveSiteId: null,
      sortOrder: 0,
      newsCount: 0,
    });
  }

  return Array.from(bySlug.values()).filter((c) => {
    const slug = normalizeNewsCategorySlug(c.slug);
    if (!slug || hiddenSlugs.has(slug)) return false;
    if (c.exclusiveSiteId == null && !activeGlobal.has(slug)) return false;
    return true;
  });
}

/** HM editör haber formu — siteye özel varsayılan kategorileri yoksa oluşturur. */
export async function ensureHmEditorSiteDefaultCategories(
  siteId: number,
  layout: Record<string, unknown>,
): Promise<void> {
  if (isHmCorporateLayout(layout)) return;

  const existing = await getNewsDbForRead()
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));

  const have = new Set(existing.map((r) => normalizeNewsCategorySlug(r.slug)));
  let sortOrder = existing.length;

  for (const std of HM_STANDARD_NEWS_CATEGORIES) {
    const slug = normalizeNewsCategorySlug(std.slug);
    if (!slug || have.has(slug)) continue;
    sortOrder += 1;
    try {
      await dualWriteInsert(categoriesTable, {
        name: std.name,
        slug,
        color: std.color,
        exclusiveSiteId: siteId,
        sortOrder,
      });
      have.add(slug);
    } catch {
      /* slug çakışması — başka site/global kayıt olabilir, atla */
    }
  }
}
