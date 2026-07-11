export type NewsListImageEnrichInput = {
  id: number;
  siteId?: number | null;
  imageUrl?: string | null;
  rssSourceUrl?: string | null;
  isEditorManual?: boolean | null;
  tags?: string[] | null;
};

/** Site-local haber satırları asla havuz/sync/RSS ile zenginleştirilmez. */
export function isSiteLocalNewsRow(item: { siteId?: number | null }): boolean {
  const siteId = item.siteId;
  return siteId != null && siteId > 0;
}

function isRssHybridCacheItem(item: NewsListImageEnrichInput): boolean {
  const tags = item.tags ?? [];
  if (tags.includes("rss-auto") || tags.includes("rss-hybrid")) return true;
  const rssUrl = String(item.rssSourceUrl ?? "").trim();
  return /^https?:\/\//i.test(rssUrl);
}

/**
 * Yalnızca merkez havuz (siteId null) ve saf RSS önbellek satırları kaynak görseli ile hizalanır.
 * siteId dolu satırlar, editör manuel yüklemeler ve yekpare-hm-sync ref'leri hariç tutulur.
 */
export function shouldRefreshNewsListImageFromSource(item: NewsListImageEnrichInput): boolean {
  if (item.isEditorManual === true) return false;
  if (isSiteLocalNewsRow(item)) return false;
  const ref = String(item.rssSourceUrl ?? "").trim();
  if (ref.startsWith("yekpare-hm-sync:")) return false;
  if (ref.startsWith("yekpare-hm-pool:")) return true;
  return isRssHybridCacheItem(item);
}
