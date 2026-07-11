import { apiUrl, normalizeAiNewsHtml, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { fetchPortalRssPreview, type PortalRssPreview } from "@/hooks/useHomeHybridNews";
import { isNewsmapRssOnlyHeadline } from "@/lib/haberHaritasiOverlaySourceUrl";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { stripHtmlToPlainText } from "@/lib/hmMapCityNews";

export type NewsmapOverlayArticle = {
  title: string;
  spot: string | null;
  bodyHtml: string | null;
  imageUrl: string | null;
  feedLabel: string | null;
};

function extractRssItemId(headline: HmMapCityHeadline): string | null {
  const href = String(headline.href ?? "").trim();
  const hrefMatch = href.match(/\/haberler\/rss\/([^/?#]+)/i);
  if (hrefMatch?.[1]) {
    try {
      return decodeURIComponent(hrefMatch[1]);
    } catch {
      return hrefMatch[1];
    }
  }
  const rssUrl = String(headline.rssSourceUrl ?? "").trim();
  if (rssUrl.startsWith("rss:")) return rssUrl.slice(4).trim() || null;
  if (headline.sourceId != null && headline.sourceId > 0) return String(headline.sourceId);
  return null;
}

function extractArticleSlug(headline: HmMapCityHeadline): string | null {
  const href = String(headline.href ?? "").trim();
  const match = href.match(/\/haber\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function normalizeOverlayHtml(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (/<[a-z][\s\S]*>/i.test(value)) {
    return rewriteInlineHtmlImgSrc(normalizeAiNewsHtml(value));
  }
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped}</p>`;
}

function buildBodyFromHeadline(headline: HmMapCityHeadline): string {
  const content = String(headline.content ?? "").trim();
  if (content) return normalizeOverlayHtml(content);
  const spot = String(headline.spot ?? "").trim();
  if (spot) return normalizeOverlayHtml(spot);
  return "";
}

function mapRssPreview(preview: PortalRssPreview): NewsmapOverlayArticle {
  const spot = String(preview.spot ?? "").trim() || null;
  const contentHtml = String(preview.contentHtml ?? "").trim();
  const bodyHtml = contentHtml
    ? normalizeOverlayHtml(contentHtml)
    : spot
      ? normalizeOverlayHtml(spot)
      : null;
  return {
    title: preview.title,
    spot,
    bodyHtml,
    imageUrl: preview.imageUrl ?? null,
    feedLabel: preview.feedLabel ?? null,
  };
}

async function fetchDbArticle(slug: string, siteId?: number | null): Promise<NewsmapOverlayArticle | null> {
  const q = siteId != null && siteId > 0 ? `?siteId=${encodeURIComponent(String(siteId))}` : "";
  const { ok, data } = await fetchPublicJson<{
    article?: {
      title?: string;
      spot?: string | null;
      summary?: string | null;
      description?: string | null;
      content?: string | null;
      imageUrl?: string | null;
      authorName?: string | null;
    } | null;
  }>(apiUrl(`/api/news/page-bundle/${encodeURIComponent(slug)}${q}`), { retries: 1, timeoutMs: 12_000 });
  const article = data?.article;
  if (!ok || !article?.title) return null;
  const spot =
    String(article.spot ?? article.summary ?? article.description ?? "").trim() || null;
  const content = String(article.content ?? "").trim();
  const bodyHtml = content
    ? normalizeOverlayHtml(content)
    : spot
      ? normalizeOverlayHtml(spot)
      : null;
  return {
    title: article.title,
    spot,
    bodyHtml,
    imageUrl: article.imageUrl ?? null,
    feedLabel: article.authorName?.trim() || null,
  };
}

/** Haber haritası overlay — tam gövde içeriği (RSS veya DB). */
export async function fetchNewsmapOverlayArticle(
  headline: HmMapCityHeadline,
  siteId?: number | null,
): Promise<NewsmapOverlayArticle> {
  const fallback: NewsmapOverlayArticle = {
    title: headline.title,
    spot: String(headline.spot ?? "").trim() || null,
    bodyHtml: buildBodyFromHeadline(headline) || null,
    imageUrl: headline.thumbnail ?? null,
    feedLabel: headline.feedLabel?.trim() || null,
  };

  if (headline.kind === "video") return fallback;

  if (isNewsmapRssOnlyHeadline(headline)) {
    const itemId = extractRssItemId(headline);
    if (!itemId) return fallback;
    const preview = await fetchPortalRssPreview(itemId, siteId);
    if (!preview?.title) return fallback;
    return mapRssPreview(preview);
  }

  const slug = extractArticleSlug(headline);
  if (slug) {
    const article = await fetchDbArticle(slug, siteId);
    if (article?.title) return article;
  }

  return fallback;
}

export function newsmapOverlayHasFullBody(article: NewsmapOverlayArticle | null | undefined): boolean {
  if (!article?.bodyHtml) return false;
  const plain = stripHtmlToPlainText(article.bodyHtml);
  const spotPlain = String(article.spot ?? "").trim();
  if (!plain) return false;
  if (spotPlain && plain === spotPlain) return plain.length > 120;
  return plain.length > 40;
}

/** Haber haritası overlay — YouTube video kimliği (headline veya href'ten). */
export function resolveNewsmapOverlayVideoId(
  headline: Pick<HmMapCityHeadline, "videoId" | "href">,
): string | null {
  const direct = String(headline.videoId ?? "").trim();
  if (direct) return direct;
  const href = String(headline.href ?? "").trim();
  if (!href) return null;
  const kanalMatch = href.match(/\/kanal\/[^/]+\/([^/?#]+)/i);
  if (kanalMatch?.[1]) {
    try {
      return decodeURIComponent(kanalMatch[1]);
    } catch {
      return kanalMatch[1];
    }
  }
  const ytMatch = href.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&/?#]+)/i);
  if (ytMatch?.[1]) return ytMatch[1];
  const vParam = href.match(/[?&]v=([^&/#]+)/i);
  if (vParam?.[1]) return vParam[1];
  return null;
}

export function resolveNewsmapOverlayVideoSourceUrl(
  headline: Pick<HmMapCityHeadline, "href">,
  hmPublicHref?: (path: string) => string,
): string | null {
  const href = String(headline.href ?? "").trim();
  if (!href) return null;
  if (/^https?:\/\//i.test(href) || /^\/\//.test(href)) return href;
  const path = href.startsWith("/") ? href : `/${href}`;
  if (typeof window !== "undefined") {
    const resolved = hmPublicHref ? hmPublicHref(path) : path;
    if (/^https?:\/\//i.test(resolved)) return resolved;
    return `${window.location.origin.replace(/\/+$/, "")}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
  }
  return hmPublicHref ? hmPublicHref(path) : path;
}
