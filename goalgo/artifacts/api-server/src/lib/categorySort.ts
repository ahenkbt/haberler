/** Haber kategori slug'ını vitrin / gizleme listelerinde tutarlı karşılaştırma için normalize eder. */
export function normalizeNewsCategorySlug(raw: unknown): string {
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

/** HM vitrin / editör kategori listesi sıralaması. */
export function sortNewsCategoriesForDisplay<T extends { slug: string; sortOrder?: number | null }>(
  rows: T[],
  sortSlugs: string[] | null | undefined,
): T[] {
  const slugOrder = (sortSlugs ?? [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);
  const orderMap = new Map(slugOrder.map((s, i) => [s, i]));
  const fallbackBase = slugOrder.length;
  return [...rows].sort((a, b) => {
    const sa = String(a.slug).trim().toLowerCase();
    const sb = String(b.slug).trim().toLowerCase();
    const ia = orderMap.has(sa) ? orderMap.get(sa)! : fallbackBase + (a.sortOrder ?? 0);
    const ib = orderMap.has(sb) ? orderMap.get(sb)! : fallbackBase + (b.sortOrder ?? 0);
    if (ia !== ib) return ia - ib;
    return sa.localeCompare(sb, "tr");
  });
}

export function parseHmCategorySortSlugsFromLayoutJson(raw: string | null | undefined): string[] | null {
  if (!raw || !String(raw).trim()) return null;
  try {
    const j = JSON.parse(String(raw)) as { hmCategorySortSlugs?: unknown };
    if (!Array.isArray(j.hmCategorySortSlugs)) return null;
    const slugs = j.hmCategorySortSlugs
      .map((s) => String(s).trim().toLowerCase())
      .filter(Boolean);
    return slugs.length ? slugs : null;
  } catch {
    return null;
  }
}
