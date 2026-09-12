/** Kategori sayfası: hızlı DB-first hibrit (SHA/RSS havuzu news tablosunda). */
export function buildHmCategoryHybridPath(opts: {
  slug: string;
  siteId: number | null;
  limit: number;
  offset: number;
}): string {
  const params = new URLSearchParams({
    limit: String(opts.limit),
    offset: String(opts.offset),
    includeTotal: "1",
    categorySlug: opts.slug,
    rssScope: "all",
    dbFirst: "1",
  });
  if (opts.siteId != null && opts.siteId > 0) params.set("siteId", String(opts.siteId));
  return `/api/news/hybrid?${params.toString()}`;
}

/** Hibrit 5xx/timeout olursa aynı kapsamı `/api/news` editör havuzundan oku. */
export function buildHmCategoryNewsFallbackPath(opts: {
  slug: string;
  siteId: number | null;
  limit: number;
  offset: number;
}): string {
  const params = new URLSearchParams({
    limit: String(opts.limit),
    offset: String(opts.offset),
    includeTotal: "1",
    categorySlug: opts.slug,
  });
  if (opts.siteId != null && opts.siteId > 0) params.set("siteId", String(opts.siteId));
  return `/api/news/?${params.toString()}`;
}

export function isShaTargetSiteSlug(slug: string | null | undefined): boolean {
  const s = String(slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!s) return false;
  if (s === "asg" || s === "ankarahabergundemi" || s === "ahg") return true;
  return s.includes("ankarasehirgazetesi") || s.includes("ankarahabergundemi");
}

export function shaCityNewsSlugsMatch(
  itemSlug: string | null | undefined,
  wantSlug: string | null | undefined,
  siteSlugPrefixes: readonly string[] = [],
): boolean {
  if (!siteSlugPrefixes.some((prefix) => isShaTargetSiteSlug(prefix))) return false;
  const item = String(itemSlug ?? "").trim().toLowerCase();
  const want = String(wantSlug ?? "").trim().toLowerCase();
  if (!item || !want) return false;
  const city = (slug: string) => slug === "yerel" || slug === "ankara" || slug.endsWith("-yerel") || slug.endsWith("-ankara");
  return city(item) && city(want);
}
