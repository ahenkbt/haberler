import type { NewsSitemapRow } from "./news-sitemap-xml.js";

/** Google News sitemap: yalnızca son 2 gün içindeki makaleler. */
export const GOOGLE_NEWS_SITEMAP_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function isValidNewsSitemapSlug(slug: string | null | undefined): boolean {
  const s = String(slug ?? "").trim();
  if (!s || s.length > 200) return false;
  if (/^https?:\/\//i.test(s)) return false;
  if (/[\s<>"{}|\\^`[\]]/.test(s)) return false;
  return true;
}

function isWithinGoogleNewsWindow(value: Date | null | undefined): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= GOOGLE_NEWS_SITEMAP_MAX_AGE_MS;
}

/** Yayın veya güncelleme son 48 saat içindeyse Google News sitemap'e girer. */
export function isRecentGoogleNewsArticle(
  createdAt: Date | null | undefined,
  updatedAt?: Date | null,
): boolean {
  return isWithinGoogleNewsWindow(createdAt) || isWithinGoogleNewsWindow(updatedAt);
}

/** Geçerli slug + yinelenenleri at; sitemap'e uygun satırlar. */
export function filterNewsSitemapRows(rows: NewsSitemapRow[]): NewsSitemapRow[] {
  const seen = new Set<string>();
  const out: NewsSitemapRow[] = [];
  for (const row of rows) {
    const key = String(row.slug ?? "").trim().toLowerCase();
    if (!isValidNewsSitemapSlug(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
