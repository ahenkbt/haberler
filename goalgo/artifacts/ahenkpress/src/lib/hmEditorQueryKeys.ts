/** React Query + HM editör haber listesi */
export const HM_EDITOR_NEWS_QUERY_KEY = ["/api/hm/editor/news"] as const;

export function hmEditorNewsQueryKey(categorySlug?: string, q?: string) {
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  const query = String(q ?? "").trim().toLowerCase();
  const parts: string[] = [...HM_EDITOR_NEWS_QUERY_KEY];
  if (slug) parts.push(slug);
  if (query) parts.push(query);
  return parts as readonly string[];
}

/** HM editör köşe makaleleri (hm_makaleler) */
export const HM_EDITOR_MAKALE_QUERY_KEY = ["/api/hm/editor/makale"] as const;

/** HM editör — genel + bu siteye özel haber kategorileri */
export const HM_EDITOR_CATEGORIES_QUERY_KEY = ["/api/hm/editor/categories"] as const;
