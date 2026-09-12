/** `/haber/{slug}` ve `/tr/{site}/haber/{slug}` — wouter :id boş kalsa da son segment. */

export function decodeHmHaberPathSegment(raw: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeHmNewsArticleSlug(raw: string): string {
  return decodeHmHaberPathSegment(raw).replace(/^\/+|\/+$/g, "").trim();
}

/** Kampanya / merkez havuz: `...-1789220219760-5-m` */
export function isHmCentralPoolCampaignSlug(slug: string): boolean {
  return /-\d{10,}-\d+-m$/i.test(normalizeHmNewsArticleSlug(slug));
}

export function hmNewsArticleSlugFromPath(pathWithQuery: string): string {
  const path = String(pathWithQuery ?? "").split("?")[0] ?? "";
  const m = path.match(/\/(?:haber|makale)\/([^/]+)\/?$/i);
  return m?.[1] ? normalizeHmNewsArticleSlug(m[1]) : "";
}

export function resolveHmHaberPathSlug(
  params: { id?: string; slug?: string } | null | undefined,
  pathWithQuery: string,
): string {
  const fromParam = normalizeHmNewsArticleSlug(params?.id ?? "");
  if (fromParam && fromParam !== "haber" && fromParam !== "makale") return fromParam;
  return hmNewsArticleSlugFromPath(pathWithQuery);
}

export function hmNewsArticleSlugsMatch(a: string, b: string): boolean {
  const left = normalizeHmNewsArticleSlug(a).toLowerCase();
  const right = normalizeHmNewsArticleSlug(b).toLowerCase();
  return Boolean(left && right && left === right);
}
