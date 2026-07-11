import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";

/** Yekpare /haberler ile aynı — tüm HM haber sitelerinde sabit genel kategoriler. */
export const HM_STANDARD_NEWS_CATEGORIES = [
  { label: "Gündem", slug: "gundem" },
  { label: "Dünya", slug: "dunya" },
  { label: "Ekonomi", slug: "ekonomi" },
  { label: "Politika", slug: "politika" },
  { label: "Spor", slug: "spor" },
  { label: "Teknoloji", slug: "teknoloji" },
] as const;

export type HmStandardNewsCategoryRow = {
  label: string;
  slug: string;
  sortOrder?: number | null;
};

/** Haber sitesi vitrininde API/RSS satırlarına sabit genel kategorileri ekler (kurumsal sitelerde dokunmaz). */
export function mergeHmStandardNewsCategoryRows<T extends HmStandardNewsCategoryRow>(
  rows: T[],
  opts?: {
    hiddenSlugs?: ReadonlySet<string>;
    includeStandards?: boolean;
    activeGlobalSlugs?: ReadonlySet<string>;
  },
): T[] {
  if (opts?.includeStandards === false) return rows;
  const hidden = opts?.hiddenSlugs ?? new Set<string>();
  const activeGlobal = opts?.activeGlobalSlugs;
  const bySlug = new Map<string, T>();

  for (const std of HM_STANDARD_NEWS_CATEGORIES) {
    const slug = normalizeNewsCategorySlug(std.slug);
    if (!slug || hidden.has(slug)) continue;
    if (activeGlobal && !activeGlobal.has(slug)) continue;
    bySlug.set(slug, { label: std.label, slug, sortOrder: null } as T);
  }

  for (const row of rows) {
    const slug = normalizeNewsCategorySlug(row.slug);
    if (!slug || hidden.has(slug)) continue;
    const label = String(row.label ?? row.slug ?? "").trim() || slug;
    const prev = bySlug.get(slug);
    bySlug.set(slug, {
      ...(prev ?? { slug, label, sortOrder: null }),
      ...row,
      slug,
      label,
    } as T);
  }

  return Array.from(bySlug.values());
}

export function isHmCorporateVitrinTheme(theme: unknown): boolean {
  const t = String(theme ?? "").trim().toLowerCase();
  return t === "corporate" || t === "kurumsal";
}
