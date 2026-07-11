import { createHash } from "node:crypto";
import { fetchRssFeedXml } from "./rssFeedFetch.js";
import { parseFeedItems, type RssFeedItem } from "./rssFeedParse.js";
import {
  isExcludedCumhaKoeseFeedUrl,
  isExcludedCumhaKoeseRssItem,
  sanitizeCumhaRssPortalFields,
  stripCumhaDisclaimerHtml,
} from "./rssCumhaExclude.js";
import { isExcludedNtvEvergreenDepremRssItem } from "./rssNtvExclude.js";
import { extractRssContentEncoded, extractRssCoverImage } from "./rssItemMedia.js";
import { decodeHtmlEntities } from "./decodeHtmlEntities.js";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "./hm-global-news-category.js";
import { isLikelyTurkishHeadline, shouldMoveNewsToGlobalCategory } from "./turkishContent.js";

export const PORTAL_RSS_DEFAULT_MAX_ITEMS = 10;
export const PORTAL_RSS_MAX_ITEMS_CAP = 24;
/** Besleme başına RSS getirme zaman aşımı — tek yavaş feed anasayfa/newsmap yanıtını asmasın. */
export const PORTAL_RSS_FETCH_TIMEOUT_MS = 4_000;
export const PORTAL_RSS_MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

export type PortalRssItem = {
  id: string;
  title: string;
  link: string;
  spot: string;
  /** Tam RSS gövdesi (content:encoded veya description HTML). */
  contentHtml?: string;
  imageUrl: string | null;
  publishedAt: string;
  /** ISO timestamp when item entered portal RSS cache (7-day retention). */
  cachedAt?: string;
  titleKey: string;
  feedId: string;
  categorySlug: string;
};

export function portalRssInternalHref(itemId: string): string {
  const id = String(itemId ?? "").trim();
  return `/haberler/rss/${encodeURIComponent(id)}`;
}

/**
 * Aynı makale (id = sha1(link||titleKey)) birden çok feed altında FARKLI
 * kategoriyle bulunabilir → aynı haber birden çok kategoride görünür. Global
 * olarak itemKey'e göre tekilleştir ve DETERMİNİSTİK tek kanonik kategori seç
 * (daha yeni yayın; eşitse alfabetik kategori). Böylece bir makale yalnızca TEK
 * kategoride görünür.
 */
function dedupePortalRssCandidateScore(item: PortalRssItem): number {
  let score = new Date(item.publishedAt).getTime() / 1_000_000;
  if (String(item.imageUrl ?? "").trim()) score += 10_000;
  const slug = String(item.categorySlug ?? "").trim().toLowerCase();
  const turkish = isLikelyTurkishHeadline(item.title) || isLikelyTurkishHeadline(item.spot);
  const foreign = shouldMoveNewsToGlobalCategory(item.title, item.spot);
  if (turkish) {
    if (slug !== HM_GLOBAL_NEWS_CATEGORY_SLUG) score += 5_000;
    else score -= 5_000;
  } else if (foreign) {
    if (slug === HM_GLOBAL_NEWS_CATEGORY_SLUG) score += 5_000;
    else if (slug === "dunya") score += 2_000;
  }
  return score;
}

export function dedupePortalRssItemsByKey(items: PortalRssItem[]): PortalRssItem[] {
  const byKey = new Map<string, PortalRssItem>();
  for (const item of items) {
    const key = String(item.id ?? "").trim() || `${item.link ?? ""}|${item.title ?? ""}`;
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    if (dedupePortalRssCandidateScore(item) > dedupePortalRssCandidateScore(existing)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function compactText(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function sanitizePortalRssHtml(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .trim();
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Düz metin RSS gövdelerini paragraflara çevirir (Patronlar Dünyası vb.). */
function formatRssBodyHtml(html: string): string {
  const sanitized = sanitizePortalRssHtml(html);
  if (!sanitized) return "";
  if (/<(?:p|div|br|h[1-6]|ul|ol|li|figure|img|blockquote)\b/i.test(sanitized)) {
    return sanitized;
  }
  return sanitized
    .split(/\r?\n\r?\n+/)
    .map((block) => block.replace(/\r?\n/g, " ").trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtmlText(block)}</p>`)
    .join("");
}

export function resolvePortalRssContentHtml(item: RssFeedItem): string {
  const contentEncoded = extractRssContentEncoded(item.rawInner);
  if (contentEncoded && contentEncoded.length > 200) {
    return formatRssBodyHtml(contentEncoded);
  }
  const descHtml = String(item.descHtml ?? "").trim();
  if (descHtml.length > 80) {
    const body = descHtml.includes("<") ? formatRssBodyHtml(descHtml) : `<p>${escapeHtmlText(decodeHtmlEntities(descHtml))}</p>`;
    return body;
  }
  const desc = String(item.desc ?? "").trim();
  if (desc) return `<p>${escapeHtmlText(decodeHtmlEntities(desc))}</p>`;
  return "";
}

/** Önbellekteki eski RSS gövdelerini gösterim için normalize eder. */
export function normalizePortalRssCachedContentHtml(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const formatted = formatRssBodyHtml(value);
  const cleaned = stripCumhaDisclaimerHtml(formatted);
  return cleaned || null;
}

export function portalRssTitleKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function portalRssItemId(link: string, titleKey: string): string {
  const seed = link.trim() || titleKey;
  return createHash("sha1").update(seed).digest("hex").slice(0, 16);
}

function resolvePublishedAt(raw: Date | null): string {
  if (raw && !Number.isNaN(raw.getTime())) return raw.toISOString();
  return new Date().toISOString();
}

export async function fetchPortalRssItems(opts: {
  feedId: string;
  categorySlug: string;
  url: string;
  maxItems?: number;
  timeoutMs?: number;
}): Promise<PortalRssItem[]> {
  const maxItems = Math.min(
    PORTAL_RSS_MAX_ITEMS_CAP,
    Math.max(1, Number(opts.maxItems ?? PORTAL_RSS_DEFAULT_MAX_ITEMS) || PORTAL_RSS_DEFAULT_MAX_ITEMS),
  );
  const feedUrl = String(opts.url ?? "").trim();
  if (!feedUrl || isExcludedCumhaKoeseFeedUrl(feedUrl)) return [];

  const isCumhaFeed = /cumha\.com\.tr/i.test(feedUrl);
  const fetchItemLimit = isCumhaFeed ? Math.min(PORTAL_RSS_MAX_ITEMS_CAP * 4, maxItems * 6) : maxItems;

  const { xml } = await fetchRssFeedXml(feedUrl, {
    timeoutMs: opts.timeoutMs ?? PORTAL_RSS_FETCH_TIMEOUT_MS,
    maxBytes: PORTAL_RSS_MAX_RESPONSE_BYTES,
    stopAfterItems: fetchItemLimit,
  });
  const parsed = parseFeedItems(xml, fetchItemLimit);
  const out: PortalRssItem[] = [];

  for (const item of parsed) {
    if (isExcludedCumhaKoeseRssItem(item)) continue;
    if (isExcludedNtvEvergreenDepremRssItem(item)) continue;
    const title = compactText(decodeHtmlEntities(item.title), 220);
    if (!title) continue;
    const link = String(item.link ?? "").trim();
    const titleKey = portalRssTitleKey(title);
    const imageUrl = extractRssCoverImage(item.rawInner, item.descHtml, link) ?? null;
    const sanitized = sanitizeCumhaRssPortalFields({
      spot: compactText(decodeHtmlEntities(item.desc), 360),
      contentHtml: resolvePortalRssContentHtml(item),
      link,
    });
    out.push({
      id: portalRssItemId(link, titleKey),
      title,
      link,
      spot: sanitized.spot,
      contentHtml: sanitized.contentHtml,
      imageUrl,
      publishedAt: resolvePublishedAt(item.publishedAt),
      titleKey,
      feedId: opts.feedId,
      categorySlug: opts.categorySlug,
    });
    if (out.length >= maxItems) break;
  }

  return out;
}

/** RSS besleme veya haber linkinden okunabilir kaynak adı (ör. cumha.com → Cumha). */
export function rssSourceNameFromUrl(rawUrl: string | null | undefined): string | null {
  const raw = String(rawUrl ?? "").trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "");
    const base = host.split(".").filter(Boolean)[0] ?? "";
    const text = base
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return host;
    return text.replace(/\b\w/g, (ch) => ch.toLocaleUpperCase("tr-TR"));
  } catch {
    return null;
  }
}
