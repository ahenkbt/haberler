import { fetchArticlePageImageUrl } from "./articlePageImage.js";
import { extractRssCoverImage } from "./rssItemMedia.js";

function hasUsableCoverUrl(url: string | null | undefined): boolean {
  const v = String(url ?? "").trim();
  if (!v) return false;
  if (v.toLowerCase().startsWith("data:")) return false;
  if (v.includes("haber-gorsel-hazirlaniyor")) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (v.startsWith("/api/media/uploads/")) return true;
  return false;
}

/**
 * RSS içe aktarma kapağı: feed media/enclosure, içerik &lt;img&gt;, yoksa makale og:image.
 */
export async function resolveRssImportCoverImage(opts: {
  rawItem?: string | null;
  descriptionHtml?: string | null;
  contentHtml?: string | null;
  link: string | null | undefined;
  existing?: string | null;
}): Promise<string | null> {
  const existing = String(opts.existing ?? "").trim();
  if (hasUsableCoverUrl(existing)) return existing;

  const link = String(opts.link ?? "").trim();
  const fromRss = extractRssCoverImage(
    String(opts.rawItem ?? ""),
    String(opts.descriptionHtml ?? ""),
    link,
  );
  if (fromRss) return fromRss;

  const contentHtml = String(opts.contentHtml ?? "").trim();
  if (contentHtml) {
    const fromContent = extractRssCoverImage("", contentHtml, link);
    if (fromContent) return fromContent;
  }

  if (!link || !/^https?:\/\//i.test(link)) return null;
  return fetchArticlePageImageUrl(link);
}
