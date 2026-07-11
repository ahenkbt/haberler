import { filterNewsDisplayTags } from "./newsAutoTags.js";
import { isRecentGoogleNewsArticle } from "./sitemap-validation.js";

/** Haber site haritası satırı — SEO genişletmeleri için zengin alanlar. */
export type NewsSitemapRow = {
  slug: string;
  title: string;
  spot: string | null;
  imageUrl: string | null;
  tags: string[] | null;
  categorySlug: string | null;
  categoryName: string | null;
  updatedAt: Date | null;
  createdAt: Date;
};

export const NEWS_SITEMAP_GEO_LABEL = "Türkiye";
export const NEWS_SITEMAP_HREFLANG = "tr-TR";
export const NEWS_SITEMAP_LANGUAGE = "tr";

export const NEWS_URLSET_ATTRS =
  'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
  'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
  'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ' +
  'xmlns:xhtml="http://www.w3.org/1999/xhtml"';

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** GSC image:loc mutlak URL ister; göreli /api/media yollarını site köküne çevirir. */
export function absoluteSitemapMediaUrl(raw: string | null | undefined, origin: string): string | null {
  const url = String(raw ?? "").trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = String(origin ?? "").replace(/\/+$/, "");
  if (!base) return url.startsWith("/") ? url : null;
  if (url.startsWith("//")) return `https:${url}`;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function newsPublicationDateIso(createdAt: Date | null | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function stripTags(s: string | null | undefined, max = 800): string {
  const t = String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** news:keywords — otomatik etiketler + spot + kategori (Türkçe korunur). */
export function newsSitemapKeywords(row: NewsSitemapRow): string {
  const tagPart = filterNewsDisplayTags(row.tags).slice(0, 10).join(", ");
  const spotPart = stripTags(row.spot, 240);
  const catPart = String(row.categoryName ?? row.categorySlug ?? "").trim();
  const parts = [tagPart, spotPart, catPart].filter((p) => p.length > 0);
  const merged = parts.join(", ");
  return merged.length > 0 ? merged : stripTags(row.title, 200);
}

function newsGenreFromCategory(categorySlug: string | null): string | null {
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  if (!slug) return null;
  if (slug.includes("kose") || slug.includes("yazar") || slug === "makale") return "Opinion";
  if (slug.includes("blog")) return "Blog";
  return "PressRelease";
}

export function buildNewsUrlXmlBlock(
  loc: string,
  row: NewsSitemapRow,
  publicationName: string,
  withNewsExtension: boolean,
  opts?: { priority?: string; changefreq?: string; mediaOrigin?: string },
): string {
  const lastmod = row.updatedAt ? new Date(row.updatedAt).toISOString().split("T")[0] : "";
  const pubDate = newsPublicationDateIso(row.createdAt);
  const titleEsc = escXml(row.title);
  const kw = escXml(newsSitemapKeywords(row));
  const priority = opts?.priority ?? "0.7";
  const changefreq = opts?.changefreq ?? "weekly";
  const genre = newsGenreFromCategory(row.categorySlug);
  const mediaOrigin = opts?.mediaOrigin ?? (() => {
    try {
      return new URL(loc).origin;
    } catch {
      return "";
    }
  })();
  const imageAbs = absoluteSitemapMediaUrl(row.imageUrl, mediaOrigin);

  const lines = [
    "  <url>",
    `    <loc>${escXml(loc)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="${NEWS_SITEMAP_HREFLANG}" href="${escXml(loc)}" />`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
  ];

  if (imageAbs) {
    lines.push("    <image:image>");
    lines.push(`      <image:loc>${escXml(imageAbs)}</image:loc>`);
    lines.push(`      <image:title>${titleEsc}</image:title>`);
    lines.push(`      <image:geo_location>${escXml(NEWS_SITEMAP_GEO_LABEL)}</image:geo_location>`);
    lines.push("    </image:image>");
  }

  if (withNewsExtension && pubDate && isRecentGoogleNewsArticle(row.createdAt)) {
    lines.push("    <news:news>");
    lines.push("      <news:publication>");
    lines.push(`        <news:name>${escXml(publicationName)}</news:name>`);
    lines.push(`        <news:language>${NEWS_SITEMAP_LANGUAGE}</news:language>`);
    lines.push("      </news:publication>");
    lines.push(`      <news:publication_date>${pubDate}</news:publication_date>`);
    lines.push(`      <news:title>${titleEsc}</news:title>`);
    if (genre) lines.push(`      <news:genres>${genre}</news:genres>`);
    if (kw) lines.push(`      <news:keywords>${kw}</news:keywords>`);
    lines.push("    </news:news>");
  }

  lines.push("  </url>");
  return lines.filter(Boolean).join("\n");
}

/** Drizzle select parçası — kategori join ile birlikte kullanın. */
export function newsSitemapSelectShape() {
  return {
    slug: true as const,
    title: true as const,
    spot: true as const,
    imageUrl: true as const,
    tags: true as const,
    updatedAt: true as const,
    createdAt: true as const,
  };
}

export function mapJoinedNewsSitemapRow(row: {
  slug: string;
  title: string;
  spot: string | null;
  imageUrl: string | null;
  tags: string[] | null;
  updatedAt: Date | null;
  createdAt: Date;
  categorySlug?: string | null;
  categoryName?: string | null;
}): NewsSitemapRow {
  return {
    slug: row.slug,
    title: row.title,
    spot: row.spot,
    imageUrl: row.imageUrl,
    tags: row.tags,
    categorySlug: row.categorySlug ?? null,
    categoryName: row.categoryName ?? null,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}
