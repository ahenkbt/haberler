export const KOSE_ARTICLE_CATEGORY_SLUG = "kose";
export const KOSE_ARTICLE_CATEGORY_NAME = "Köşe yazısı";

export type KoseArticleLike = {
  contentKind?: "news" | "makale";
  hmSyncKind?: "news" | "makale" | null;
  rssSourceUrl?: string | null;
  categorySlug?: string | null;
  authorId?: number | null;
};

/** Public vitrin URL — köşe yazıları `/makale/{slug}`, haberler `/haber/{slug}`. */
export function buildKoseArticlePublicPath(slugOrId: string | number): string {
  const raw = String(slugOrId ?? "").trim();
  return `/makale/${encodeURIComponent(raw || "0")}`;
}

export function resolveArticlePublicPath(
  item: KoseArticleLike & { slug?: string | null; id?: number | string | null },
): string {
  if (isKoseArticle(item)) {
    const slug = String(item.slug ?? "").trim();
    if (slug) return buildKoseArticlePublicPath(slug);
    const idPart = String(item.id ?? "").trim().replace(/^db:/, "");
    return buildKoseArticlePublicPath(idPart || "0");
  }
  const slug = String(item.slug ?? "").trim();
  if (slug) return `/haber/${encodeURIComponent(slug)}`;
  const idPart = String(item.id ?? "").trim().replace(/^db:/, "");
  return `/haber/${encodeURIComponent(idPart || "0")}`;
}

/** Manşet / hibrit haber akışından köşe yazılarını çıkarır. */
export function excludeKoseFromEditorialNewsList<T extends KoseArticleLike>(items: T[]): T[] {
  return items.filter((item) => !isKoseArticle(item));
}

export function parseHmSyncSourceKind(rssSourceUrl: string | null | undefined): "news" | "makale" | null {
  const source = String(rssSourceUrl ?? "").trim();
  const match = /^yekpare-hm-sync:\d+:(news|makale):\d+$/.exec(source);
  if (match?.[1] === "makale") return "makale";
  if (match?.[1] === "news") return "news";
  return null;
}

export function isKoseArticle(n: KoseArticleLike | null | undefined): boolean {
  if (!n) return false;
  if (n.contentKind === "makale") return true;
  if (n.hmSyncKind === "makale") return true;
  if (parseHmSyncSourceKind(n.rssSourceUrl) === "makale") return true;
  const cat = String(n.categorySlug ?? "").toLowerCase();
  return cat === "blog" || cat === "kose" || cat === "köşe";
}

export function hasKoseAuthorId(n: KoseArticleLike | null | undefined): boolean {
  return n?.authorId != null && n.authorId > 0;
}
