/** Site-içi haber kartı bağlantısı — RSS asla harici URL açmaz. */
import { resolveArticlePublicPath } from "@/lib/isKoseArticle";

export type HybridNewsLinkItem = {
  id?: number | string | null;
  slug?: string | null;
  href?: string | null;
  source?: "db" | "rss" | string | null;
  contentKind?: "news" | "makale";
  hmSyncKind?: "news" | "makale" | null;
  rssSourceUrl?: string | null;
  categorySlug?: string | null;
  authorId?: number | null;
};

export function isExternalNewsHref(href: string): boolean {
  const value = String(href ?? "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  // Protocol-relative URLs (//ntv.com.tr/...) bypass naive http checks but still leave the site.
  if (/^\/\//.test(value)) return true;
  return false;
}

function parseRssItemId(rawId: string): string | null {
  const id = String(rawId ?? "").trim();
  if (!id) return null;
  if (id.startsWith("rss:")) {
    const rssId = id.slice(4).trim();
    return rssId || null;
  }
  return id;
}

export function portalRssPreviewPath(itemId: string): string {
  const id = String(itemId ?? "").trim();
  return `/haberler/rss/${encodeURIComponent(id)}`;
}

function internalDbNewsPath(item: HybridNewsLinkItem): string {
  return resolveArticlePublicPath(item);
}

export function hybridNewsItemPath(item: HybridNewsLinkItem): string {
  const source = item.source === "rss" ? "rss" : "db";
  const rawId = String(item.id ?? "");

  if (source === "rss" || rawId.startsWith("rss:")) {
    const rssId = parseRssItemId(rawId);
    if (rssId) return portalRssPreviewPath(rssId);
  }

  const direct = String(item.href ?? "").trim();
  if (direct.startsWith("/") && !isExternalNewsHref(direct)) return direct;

  return internalDbNewsPath(item);
}

export function newsItemIsRssSource(item: HybridNewsLinkItem): boolean {
  return item.source === "rss" || String(item.id ?? "").startsWith("rss:");
}

/** Site-içi haber kartı bağlantısı — RSS asla harici URL açmaz. */
export function coercePublicHybridNewsHref(item: HybridNewsLinkItem): string {
  // RSS: item.href asla kullanılmaz (//ntv.com.tr, https://… dahil) — site içi önizleme.
  if (newsItemIsRssSource(item)) {
    const rssPath = hybridNewsItemPath({
      id: item.id,
      slug: item.slug ?? null,
      source: "rss",
      href: null,
    });
    if (!isExternalNewsHref(rssPath)) return rssPath;
  }

  const path = hybridNewsItemPath(item);
  if (!isExternalNewsHref(path)) return path;
  const fallback = hybridNewsItemPath({ ...item, href: null });
  if (!isExternalNewsHref(fallback)) return fallback;
  throw new Error(`coercePublicHybridNewsHref refused external href: ${path}`);
}

/** Hibrit API satırından güvenli kart alanları. */
export function mapPublicHybridNewsLinkFields(row: Record<string, unknown>): {
  id: string;
  slug: string | null;
  source: "db" | "rss";
  href: string;
} {
  const source = row.source === "rss" ? "rss" : "db";
  const id = String(row.id ?? "");
  const slug = (row.slug as string | null) ?? null;
  const href = coercePublicHybridNewsHref({
    id,
    slug,
    source,
    href: (row.href as string | null) ?? null,
    contentKind: (row.contentKind as "news" | "makale" | undefined) ?? undefined,
    hmSyncKind: (row.hmSyncKind as "news" | "makale" | null) ?? null,
    rssSourceUrl: (row.rssSourceUrl as string | null) ?? null,
    categorySlug: (row.categorySlug as string | null) ?? null,
    authorId: typeof row.authorId === "number" ? row.authorId : null,
  });
  return { id, slug, source, href };
}
