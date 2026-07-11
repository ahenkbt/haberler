import { and, eq, isNull } from "drizzle-orm";
import { categoriesTable, categoryAliasesTable, getNewsDbForRead, hmNewsSitesTable } from "@workspace/db";

/** Birleştirme (merge) sonrası eski slug → hedef kategori id eşlemesi. */
export async function resolveCategoryAliasTargetId(slug: string): Promise<number | null> {
  const s = normalizePortalCategorySlug(slug);
  if (!s) return null;
  try {
    const [row] = await getNewsDbForRead()
      .select({ toCategoryId: categoryAliasesTable.toCategoryId })
      .from(categoryAliasesTable)
      .where(eq(categoryAliasesTable.fromSlug, s))
      .limit(1);
    return row?.toCategoryId ?? null;
  } catch {
    return null;
  }
}

export function normalizePortalCategorySlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

let cachedHmSiteSlugs: string[] | null = null;
let cachedHmSiteSlugsAt = 0;
const HM_SITE_SLUG_CACHE_MS = 60_000;

export async function loadHmSiteSlugPrefixes(): Promise<string[]> {
  const now = Date.now();
  if (cachedHmSiteSlugs && now - cachedHmSiteSlugsAt < HM_SITE_SLUG_CACHE_MS) {
    return cachedHmSiteSlugs;
  }
  const rows = await getNewsDbForRead()
    .select({ slug: hmNewsSitesTable.slug })
    .from(hmNewsSitesTable);
  cachedHmSiteSlugs = rows
    .map((row) => normalizePortalCategorySlug(row.slug))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  cachedHmSiteSlugsAt = now;
  return cachedHmSiteSlugs;
}

/** Eski sync `{siteSlug}-{categorySlug}` biçimini canonical slug'a indirger. */
export function resolveCanonicalPortalCategorySlug(categorySlug: string, siteSlugs: string[]): string {
  const slug = normalizePortalCategorySlug(categorySlug);
  if (!slug) return "";
  for (const prefix of siteSlugs) {
    const needle = `${prefix}-`;
    if (slug.startsWith(needle) && slug.length > needle.length) {
      return slug.slice(needle.length);
    }
  }
  return slug;
}

export function portalCategorySlugMatches(
  requestedSlug: string,
  categorySlug: string,
  siteSlugs: string[],
): boolean {
  const canonical = resolveCanonicalPortalCategorySlug(requestedSlug, siteSlugs);
  const candidate = resolveCanonicalPortalCategorySlug(categorySlug, siteSlugs);
  return Boolean(canonical && candidate && canonical === candidate);
}

type PortalCategoryRow = {
  id: number;
  name: string;
  slug: string;
  color: string;
  exclusiveSiteId: number | null;
  sortOrder: number;
};

/** Portal nav: aynı canonical slug altında tek satır (ör. `asg-ankara` + `ankara` → `ankara`). */
export function dedupePortalCategoriesByCanonicalSlug<T extends PortalCategoryRow>(
  categories: T[],
  siteSlugs: string[],
): T[] {
  const byCanonical = new Map<string, T>();
  for (const row of categories) {
    const canonical = resolveCanonicalPortalCategorySlug(String(row.slug ?? ""), siteSlugs);
    if (!canonical) continue;
    const prev = byCanonical.get(canonical);
    if (!prev) {
      byCanonical.set(canonical, { ...row, slug: canonical, name: pickPortalCategoryDisplayName(row.name, canonical) });
      continue;
    }
    const prevSlug = normalizePortalCategorySlug(prev.slug);
    const nextSlug = normalizePortalCategorySlug(row.slug);
    const preferNext =
      nextSlug === canonical ||
      (prevSlug !== canonical && nextSlug.length < prevSlug.length);
    if (preferNext) {
      byCanonical.set(canonical, { ...row, slug: canonical, name: pickPortalCategoryDisplayName(row.name, canonical) });
    }
  }
  return Array.from(byCanonical.values());
}

export function pickPortalCategoryDisplayName(name: string, canonicalSlug: string): string {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) {
    return canonicalSlug
      .split("-")
      .filter(Boolean)
      .map((part) => part.slice(0, 1).toLocaleUpperCase("tr-TR") + part.slice(1))
      .join(" ");
  }
  const dotParts = trimmed.split(" ┬À ").map((part) => part.trim()).filter(Boolean);
  if (dotParts.length >= 2) return dotParts[dotParts.length - 1]!;
  const dashParts = trimmed.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 2) return dashParts[dashParts.length - 1]!;
  return trimmed;
}

/** Portal haber yanıtında kategori slug/adını canonical forma indirger. */
export function normalizePortalCategoryFields(
  categorySlug: string,
  categoryName: string,
  siteSlugs: string[],
): { categorySlug: string; categoryName: string } {
  const canonical = resolveCanonicalPortalCategorySlug(categorySlug, siteSlugs) || normalizePortalCategorySlug(categorySlug);
  return {
    categorySlug: canonical || categorySlug,
    categoryName: pickPortalCategoryDisplayName(categoryName, canonical || categorySlug) || categoryName,
  };
}

export async function findPortalCategoryIdsBySlug(slug: string): Promise<number[]> {
  const siteSlugs = await loadHmSiteSlugPrefixes();
  const canonical = resolveCanonicalPortalCategorySlug(slug, siteSlugs);
  if (!canonical) return [];

  const rows = await getNewsDbForRead()
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(isNull(categoriesTable.exclusiveSiteId));

  const matched = rows
    .filter((row) => portalCategorySlugMatches(canonical, String(row.slug ?? ""), siteSlugs))
    .map((row) => row.id);
  if (matched.length > 0) return matched;

  // Doğrudan eşleşme yoksa, birleştirilmiş eski slug alias'ını dene.
  const aliasTarget = await resolveCategoryAliasTargetId(canonical);
  return aliasTarget != null ? [aliasTarget] : [];
}

/** Tüm kategori satırları (siteye özel dahil) — canonical slug eşleşmesi. */
export async function findAllCategoryIdsByCanonicalSlug(slug: string): Promise<number[]> {
  const siteSlugs = await loadHmSiteSlugPrefixes();
  const canonical = resolveCanonicalPortalCategorySlug(slug, siteSlugs);
  if (!canonical) return [];

  const rows = await getNewsDbForRead()
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable);

  const matched = rows
    .filter((row) => portalCategorySlugMatches(canonical, String(row.slug ?? ""), siteSlugs))
    .map((row) => row.id);
  if (matched.length > 0) return matched;

  const aliasTarget = await resolveCategoryAliasTargetId(canonical);
  return aliasTarget != null ? [aliasTarget] : [];
}

/** Batch: spor category id → gündem category id. */
export async function buildSporToGundemCategoryIdMap(
  sporCategoryIds: readonly number[],
): Promise<Map<number, number>> {
  const siteSlugs = await loadHmSiteSlugPrefixes();
  const rows = await getNewsDbForRead()
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable);
  const defaultGundem =
    rows.find((row) => normalizePortalCategorySlug(row.slug) === "gundem") ??
    rows.find((row) => resolveCanonicalPortalCategorySlug(String(row.slug ?? ""), siteSlugs) === "gundem");
  const defaultGundemId = defaultGundem?.id ?? null;

  const gundemBySlug = new Map<string, number>();
  for (const row of rows) {
    const norm = normalizePortalCategorySlug(row.slug);
    if (resolveCanonicalPortalCategorySlug(String(row.slug ?? ""), siteSlugs) === "gundem") {
      gundemBySlug.set(norm, row.id);
    }
  }

  const out = new Map<number, number>();
  for (const sporId of sporCategoryIds) {
    const sporRow = rows.find((row) => row.id === sporId);
    if (!sporRow || defaultGundemId == null) continue;
    const sporNorm = normalizePortalCategorySlug(sporRow.slug);
    const pairedSlug = sporNorm.endsWith("-spor") ? `${sporNorm.slice(0, -5)}-gundem` : "gundem";
    out.set(sporId, gundemBySlug.get(pairedSlug) ?? defaultGundemId);
  }
  return out;
}

export async function findPortalGlobalCategoryBySlug(
  slug: string,
): Promise<{ id: number; slug: string; name: string } | null> {
  const siteSlugs = await loadHmSiteSlugPrefixes();
  const canonical = resolveCanonicalPortalCategorySlug(slug, siteSlugs);
  if (!canonical) return null;

  const rows = await getNewsDbForRead()
    .select({
      id: categoriesTable.id,
      slug: categoriesTable.slug,
      name: categoriesTable.name,
    })
    .from(categoriesTable)
    .where(and(isNull(categoriesTable.exclusiveSiteId)));

  const hit =
    rows.find((row) => normalizePortalCategorySlug(row.slug) === canonical) ??
    rows.find((row) => resolveCanonicalPortalCategorySlug(String(row.slug ?? ""), siteSlugs) === canonical);
  if (hit) {
    return {
      id: hit.id,
      slug: canonical,
      name: pickPortalCategoryDisplayName(hit.name, canonical),
    };
  }

  // Alias (merge sonrası eski slug) → hedef genel kategori.
  const aliasTarget = await resolveCategoryAliasTargetId(canonical);
  if (aliasTarget != null) {
    const aliased = rows.find((row) => row.id === aliasTarget);
    if (aliased) {
      const aliasedCanonical = resolveCanonicalPortalCategorySlug(String(aliased.slug ?? ""), siteSlugs) || canonical;
      return {
        id: aliased.id,
        slug: aliasedCanonical,
        name: pickPortalCategoryDisplayName(aliased.name, aliasedCanonical),
      };
    }
  }
  return null;
}
