import { fetchArticlePageImageUrl } from "./articlePageImage.js";
import { extractRssCoverImage } from "./rssItemMedia.js";

/**
 * RSS içe aktarma kapağı: feed media/enclosure, yoksa makale sayfası og:image.
 */
export async function resolveRssImportCoverImage(opts: {
  rawItem?: string | null;
  descriptionHtml?: string | null;
  link: string | null | undefined;
  existing?: string | null;
}): Promise<string | null> {
  const existing = String(opts.existing ?? "").trim();
  if (existing && /^https?:\/\//i.test(existing)) return existing;

  const link = String(opts.link ?? "").trim();
  const fromRss = extractRssCoverImage(String(opts.rawItem ?? ""), String(opts.descriptionHtml ?? ""), link);
  if (fromRss) return fromRss;
  if (!link || !/^https?:\/\//i.test(link)) return null;
  return fetchArticlePageImageUrl(link);
}
