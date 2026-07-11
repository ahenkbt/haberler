/** HM vitrin kategori şeridi sırası (editörde kaydedilen slug listesi). */
export function sortHmCategoriesForNav<T extends { slug: string; sortOrder?: number | null }>(
  rows: readonly T[] | null | undefined,
  sortSlugs: string[] | null | undefined,
): T[] {
  const source = Array.isArray(rows) ? rows : [];
  const slugOrder = (Array.isArray(sortSlugs) ? sortSlugs : [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);
  const orderMap = new Map(slugOrder.map((s, i) => [s, i]));
  const fallbackBase = slugOrder.length;
  return [...source].sort((a, b) => {
    const sa = String(a.slug).trim().toLowerCase();
    const sb = String(b.slug).trim().toLowerCase();
    const ia = orderMap.has(sa) ? orderMap.get(sa)! : fallbackBase + (a.sortOrder ?? 0);
    const ib = orderMap.has(sb) ? orderMap.get(sb)! : fallbackBase + (b.sortOrder ?? 0);
    if (ia !== ib) return ia - ib;
    return sa.localeCompare(sb, "tr");
  });
}
