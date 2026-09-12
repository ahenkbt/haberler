/**
 * HM kategori vitrinleri (`/kategori/:slug`) tam hibrit RSS birleşiminde
 * `portal_rss_items` sorgusu yüzünden 500/timeout olabiliyor. DB-first yol
 * merkez havuzdaki SHA/RSS haberlerini zaten döndürür; RSS arka planda ısınır.
 */
export function shouldDefaultHybridCategoryDbFirst(opts: {
  rssOnly?: boolean;
  newsmapMode?: boolean;
  poolBrowse?: boolean;
  rssScope?: string | null;
  siteId?: number | null;
  categorySlug?: string | null;
}): boolean {
  if (opts.rssOnly) return false;
  if (opts.newsmapMode) return false;
  if (opts.poolBrowse) return false;
  if (opts.rssScope === "box") return false;
  if (opts.siteId == null || !(opts.siteId > 0)) return false;
  return Boolean(String(opts.categorySlug ?? "").trim());
}

export function resolveHybridDbFirstFlag(opts: {
  dbFirstQuery?: string | null;
  rssOnly?: boolean;
  newsmapMode?: boolean;
  poolBrowse?: boolean;
  rssScope?: string | null;
  siteId?: number | null;
  categorySlug?: string | null;
}): boolean {
  const explicit = String(opts.dbFirstQuery ?? "").trim().toLowerCase();
  if (explicit === "0" || explicit === "false") return false;
  if (opts.rssOnly) return false;
  if (explicit === "1" || explicit === "true") return true;
  return shouldDefaultHybridCategoryDbFirst(opts);
}
