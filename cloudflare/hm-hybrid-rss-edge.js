/**
 * /api/news/hybrid kenar RSS doldurma — origin 5xx veya dolu DB havuzunda
 * canlı feed çekerek TTFB'yi 10-70sn şişirme.
 */

export const HM_SITE_RSS_EDGE_FETCH_TIMEOUT_MS = 2_000;
export const HM_SITE_RSS_EDGE_MIN_DB_ITEMS = 8;
export const HM_SITE_RSS_EDGE_MIN_CATEGORY_HITS = 4;

/**
 * @param {{
 *   method?: string,
 *   pathname?: string,
 *   upstreamOk?: boolean,
 *   dbFirst?: boolean,
 *   rssCount?: number,
 *   itemCount?: number,
 *   categorySlug?: string,
 *   categoryHitCount?: number,
 * }} opts
 */
export function shouldFillHybridSiteRssAtEdge(opts = {}) {
  const method = String(opts.method || "GET").toUpperCase();
  if (method !== "GET") return false;
  if (String(opts.pathname || "").split("?")[0] !== "/api/news/hybrid") return false;
  if (!opts.upstreamOk) return false;
  const categorySlug = String(opts.categorySlug || "").trim();
  const rssCount = Number(opts.rssCount || 0);
  const itemCount = Number(opts.itemCount || 0);
  const categoryHitCount = Number(opts.categoryHitCount || 0);
  if (rssCount > 0 && (!categorySlug || categoryHitCount > 0)) return false;
  if (!categorySlug && itemCount >= HM_SITE_RSS_EDGE_MIN_DB_ITEMS) return false;
  if (categorySlug && categoryHitCount >= HM_SITE_RSS_EDGE_MIN_CATEGORY_HITS) return false;
  if (opts.dbFirst && !categorySlug && itemCount > 0) return false;
  return true;
}

/** Origin 5xx olsa bile doldurulmuş öğe varsa istemci 200 görsün. */
export function hybridEdgeFillHttpStatus(upstreamOk, filledItemCount) {
  if (upstreamOk) return 200;
  return Number(filledItemCount) > 0 ? 200 : 502;
}
