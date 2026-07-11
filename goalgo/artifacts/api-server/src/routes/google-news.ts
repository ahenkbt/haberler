import { createHash } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { fetchRssFeedXml } from "../lib/rssFeedFetch.js";
import { parseFeedItems, type RssFeedItem } from "../lib/rssFeedParse.js";
import { extractRssImageUrls } from "../lib/rssItemMedia.js";
import { pickFirstNewsImageUrl } from "../lib/newsImageHeuristics.js";
import { getHmNewsSiteByIdCompat } from "../lib/hm-site-compat";
import { rssSourceNameFromUrl } from "../lib/portal-rss-fetch.js";

type RssBreakingFeedCategoryId =
  | "turkiye"
  | "dunya"
  | "ekonomi"
  | "teknoloji"
  | "saglik"
  | "spor"
  | "yasam"
  | "otomobil"
  | "para"
  | "egitim"
  | "savunmaSanayi";
type RssBreakingCategoryId = "mixed" | string;

type RssBreakingFeedRow = {
  id: string;
  label: string;
  url: string;
};

type RssBreakingItem = {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  summary: string;
  contentHtml: string;
  contentText: string;
  contentIsLimited: boolean;
  url: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
};

type CacheEntry = {
  expiresAt: number;
  fetchedAt: string;
  items: RssBreakingItem[];
};

const router: IRouter = Router();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_ITEMS = 10;
const RSS_BREAKING_CATEGORIES: Record<RssBreakingFeedCategoryId, { label: string; defaultUrl: string }> = {
  turkiye: { label: "Türkiye", defaultUrl: "https://www.ntv.com.tr/turkiye.rss" },
  dunya: { label: "Dünya", defaultUrl: "https://www.ntv.com.tr/dunya.rss" },
  ekonomi: { label: "Ekonomi", defaultUrl: "https://www.ntv.com.tr/ekonomi.rss" },
  teknoloji: { label: "Teknoloji", defaultUrl: "https://www.ntv.com.tr/teknoloji.rss" },
  saglik: { label: "Sağlık", defaultUrl: "https://www.ntv.com.tr/saglik.rss" },
  spor: { label: "Spor", defaultUrl: "" },
  yasam: { label: "Yaşam", defaultUrl: "https://www.ntv.com.tr/yasam.rss" },
  otomobil: { label: "Otomobil", defaultUrl: "https://www.ntv.com.tr/otomobil.rss" },
  para: { label: "Para", defaultUrl: "https://www.ntv.com.tr/ntvpara.rss" },
  egitim: { label: "Eğitim", defaultUrl: "https://www.ntv.com.tr/egitim.rss" },
  savunmaSanayi: { label: "Savunma Sanayi", defaultUrl: "https://www.dirilispostasi.com/rss/savunma-sanayi" },
};

const CATEGORY_ORDER = Object.keys(RSS_BREAKING_CATEGORIES) as RssBreakingFeedCategoryId[];
const cache = new Map<string, CacheEntry>();

function decodeXmlText(s: string): string {
  return String(s ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => {
      const code = Number.parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .trim();
}

function stripHtml(html: string): string {
  return decodeXmlText(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeHtmlUrl(raw: string, { image = false }: { image?: boolean } = {}): string | null {
  const value = decodeXmlText(raw).trim();
  if (!/^https?:\/\//i.test(value)) return null;
  if (image && !/\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value)) {
    if (!/(?:^|[/])(?:images?|img|media|uploads?|static|cdn|photo|gallery|content|wp-content|files)(?:\/|$)/i.test(value)) {
      return null;
    }
  }
  return value.slice(0, 1000);
}

function normalizeImageUrlForCompare(raw: string): string {
  try {
    const url = new URL(String(raw ?? "").trim());
    let path = url.pathname.replace(/\/+$/, "").toLowerCase();
    path = path
      .replace(/[-_/]?\d{2,4}x\d{2,4}(?=\/|$)/gi, "")
      .replace(/\/w\d+-h\d+(?=\/|$)/gi, "")
      .replace(/\/resize\/\d+\/\d+(?=\/|$)/gi, "");
    const file = path.split("/").pop() ?? path;
    return `${url.hostname.replace(/^www\./i, "").toLowerCase()}|${file}`;
  } catch {
    return String(raw ?? "").trim().toLowerCase();
  }
}

function imageUrlsMatch(a: string, b: string): boolean {
  const left = normalizeImageUrlForCompare(a);
  const right = normalizeImageUrlForCompare(b);
  if (left === right) return true;
  const leftFile = left.split("|")[1] ?? "";
  const rightFile = right.split("|")[1] ?? "";
  return leftFile.length > 8 && leftFile === rightFile;
}

function pickRssBreakingImageUrl(candidates: string[], pageUrl?: string): string | null {
  const strict = pickFirstNewsImageUrl(candidates, pageUrl);
  if (strict) return strict;
  for (const u of candidates) {
    const t = String(u ?? "").trim();
    if (!t || !/^https?:\/\//i.test(t)) continue;
    if (/\.svg(\?|#|$)/i.test(t)) continue;
    if (/(?:^|[/_.-])(?:logo|favicon|icon|sprite|placeholder)(?:[._-]|$)/i.test(t)) continue;
    return t.slice(0, 1000);
  }
  return null;
}

function stripDuplicateLeadImage(contentHtml: string, imageUrl: string | null): string {
  if (!contentHtml.trim() || !imageUrl) return contentHtml;
  let html = contentHtml.replace(/<img\b[^>]*>/gi, (match) => {
    const src = match.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src) return match;
    return imageUrlsMatch(src, imageUrl) ? "" : match;
  });
  html = html
    .replace(/<figure>\s*<\/figure>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return html;
}

function sanitizeHtmlAttrs(tagName: string, rawAttrs: string): string {
  const attrs: string[] = [];
  const attrMatches = rawAttrs.matchAll(/\s+([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g);
  for (const match of attrMatches) {
    const name = String(match[1] ?? "").toLowerCase();
    const value = String(match[2] ?? match[3] ?? match[4] ?? "");
    if (!name || name.startsWith("on") || name === "style" || name === "class") continue;

    if (tagName === "a" && name === "href") {
      const href = sanitizeHtmlUrl(value);
      if (href) attrs.push(`href="${escapeHtmlAttr(href)}" rel="nofollow noopener noreferrer"`);
      continue;
    }

    if (tagName === "img" && name === "src") {
      const src = sanitizeHtmlUrl(value, { image: true });
      if (src) attrs.push(`src="${escapeHtmlAttr(src)}" loading="lazy"`);
      continue;
    }

    if ((tagName === "img" && (name === "alt" || name === "title")) || (tagName === "a" && name === "title")) {
      attrs.push(`${name}="${escapeHtmlAttr(value).slice(0, 300)}"`);
    }
  }
  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

function sanitizeRssContentHtml(rawHtml: string): string {
  const allowed = new Set(["b", "blockquote", "br", "em", "figcaption", "figure", "h2", "h3", "h4", "i", "img", "li", "ol", "p", "strong", "u", "ul"]);
  const voidTags = new Set(["br", "img"]);
  return decodeXmlText(rawHtml)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|iframe|object|embed|form|input|button|link|meta|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(script|style|iframe|object|embed|form|input|button|link|meta|template)\b[^>]*\/?>/gi, " ")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9:-]*)(\s[^>]*)?>/g, (match, rawTagName: string, rawAttrs: string = "") => {
      const tagName = rawTagName.toLowerCase();
      if (!allowed.has(tagName)) return "";
      const isClosing = /^<\//.test(match);
      if (isClosing) return voidTags.has(tagName) ? "" : `</${tagName}>`;
      return `<${tagName}${sanitizeHtmlAttrs(tagName, rawAttrs)}>`;
    })
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function compactText(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function titleKey(value: string): string {
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

function sanitizeDisplayedNewsText(value: string): string {
  return value
    .replace(/\b(?:www\.)?ntv\.com\.tr\b/gi, " ")
    .replace(/\s+[-|]\s*(?:NTV|NTV Haber)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagText(raw: string, tag: string): string {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i");
  return decodeXmlText(raw.match(re)?.[1] ?? "");
}

function extractTagHtml(raw: string, tag: string): string {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i");
  return decodeXmlText(raw.match(re)?.[1] ?? "");
}

function normalizeTitle(item: RssFeedItem): string {
  return compactText(sanitizeDisplayedNewsText(stripHtml(item.title)), 180);
}

function extractPublishedAt(item: RssFeedItem): string | null {
  if (item.publishedAt) return item.publishedAt.toISOString();
  const raw = item.rawInner ?? "";
  const dateRaw =
    extractTagText(raw, "pubDate") ||
    extractTagText(raw, "dc:date") ||
    extractTagText(raw, "updated") ||
    extractTagText(raw, "published");
  if (!dateRaw) return null;
  const time = Date.parse(dateRaw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function extractSummary(item: RssFeedItem, title: string): string {
  const raw = item.rawInner ?? "";
  const html =
    extractTagHtml(raw, "summary") ||
    extractTagHtml(raw, "description") ||
    item.desc ||
    "";
  if (!html.trim()) return "";
  const summary = sanitizeDisplayedNewsText(stripHtml(html));
  const titleNorm = titleKey(title);
  const summaryNorm = titleKey(summary);
  if (!summaryNorm || summaryNorm === titleNorm || summaryNorm.startsWith(titleNorm)) return "";
  return compactText(summary, 220);
}

function extractContent(item: RssFeedItem, summary: string): { contentHtml: string; contentText: string; contentIsLimited: boolean } {
  const raw = item.rawInner ?? "";
  const candidates = [
    { source: "content:encoded", html: extractTagHtml(raw, "content:encoded") },
    { source: "content", html: extractTagHtml(raw, "content") },
    { source: "yandex:full-text", html: extractTagHtml(raw, "yandex:full-text") },
    { source: "fulltext", html: extractTagHtml(raw, "fulltext") },
    { source: "full-text", html: extractTagHtml(raw, "full-text") },
    { source: "turbo:content", html: extractTagHtml(raw, "turbo:content") },
    { source: "description", html: extractTagHtml(raw, "description") || item.descHtml },
    { source: "summary", html: extractTagHtml(raw, "summary") },
    { source: "desc", html: item.descHtml || item.desc },
  ];

  for (const candidate of candidates) {
    const html = String(candidate.html ?? "").trim();
    if (!html) continue;
    const contentText = sanitizeDisplayedNewsText(stripHtml(html));
    if (!contentText) continue;
    const contentHtml = sanitizeRssContentHtml(html);
    const contentKey = titleKey(contentText);
    const summaryKey = titleKey(summary);
    const isFullContentSource =
      candidate.source === "content:encoded" ||
      candidate.source === "content" ||
      candidate.source === "yandex:full-text" ||
      candidate.source === "fulltext" ||
      candidate.source === "full-text" ||
      candidate.source === "turbo:content";
    const isSummaryOnly =
      candidate.source === "summary" ||
      (!!summaryKey ? contentKey === summaryKey : contentText.length <= 260);
    return {
      contentHtml,
      contentText,
      contentIsLimited: !isFullContentSource && isSummaryOnly,
    };
  }

  return { contentHtml: "", contentText: "", contentIsLimited: true };
}

function fullItemId(category: string, title: string, publishedAt: string | null): string {
  return createHash("sha1")
    .update([category, title, publishedAt ?? ""].join("|"))
    .digest("hex");
}

function itemId(category: RssBreakingFeedCategoryId, title: string, publishedAt: string | null): string {
  return fullItemId(category, title, publishedAt).slice(0, 16);
}

function rssItemMatchesId(item: RssBreakingItem, rawId: string): boolean {
  const wanted = rawId.trim();
  if (!wanted) return false;
  if (item.id === wanted) return true;
  const legacyFullId = fullItemId(item.category, item.title, item.publishedAt);
  return legacyFullId === wanted || legacyFullId.startsWith(wanted) || wanted.startsWith(item.id);
}

function normalizeItem(category: string, categoryLabel: string, item: RssFeedItem): RssBreakingItem | null {
  const title = normalizeTitle(item);
  if (!title) return null;
  const publishedAt = extractPublishedAt(item);
  const summary = extractSummary(item, title);
  const content = extractContent(item, summary);
  const imageCandidates = extractRssImageUrls(item.rawInner, item.descHtml, item.link, 8);
  const imageUrl = pickRssBreakingImageUrl(imageCandidates, item.link) ?? null;
  const contentHtml = stripDuplicateLeadImage(content.contentHtml, imageUrl);
  const contentText = contentHtml ? sanitizeDisplayedNewsText(stripHtml(contentHtml)) : content.contentText;
  return {
    id: itemId(category as RssBreakingFeedCategoryId, title, publishedAt),
    category,
    categoryLabel,
    title,
    summary,
    contentHtml,
    contentText,
    contentIsLimited: content.contentIsLimited,
    url: sanitizeArticleUrl(item.link),
    imageUrl,
    publishedAt,
  };
}

function sanitizeRssUrl(raw: unknown): string {
  const url = String(raw ?? "").trim();
  return /^https?:\/\//i.test(url) ? url.slice(0, 500) : "";
}

function sanitizeArticleUrl(raw: unknown): string | null {
  const url = String(raw ?? "").trim();
  return /^https?:\/\//i.test(url) ? url.slice(0, 1000) : null;
}

function parseLayoutJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function sanitizeRssLabel(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, 40);
}

function resolveCategoryLabel(categoryId: string, labels: Record<string, string>): string {
  const custom = sanitizeRssLabel(labels[categoryId]);
  if (custom) return custom;
  if (Object.prototype.hasOwnProperty.call(RSS_BREAKING_CATEGORIES, categoryId)) {
    return RSS_BREAKING_CATEGORIES[categoryId as RssBreakingFeedCategoryId].label;
  }
  return categoryId;
}

function configuredCategoryIds(feeds: Record<string, string>): string[] {
  return Object.keys(feeds).filter((id) => !!sanitizeRssUrl(feeds[id]));
}

function buildLegacyCategoryAliasMap(availableIds: Set<string>): Map<string, string> {
  const pairs: Array<[string, RssBreakingFeedCategoryId]> = [
    ["türkiye", "turkiye"],
    ["turkiye", "turkiye"],
    ["dünya", "dunya"],
    ["dunya", "dunya"],
    ["sağlık", "saglik"],
    ["saglik", "saglik"],
    ["yaşam", "yasam"],
    ["yasam", "yasam"],
    ["eğitim", "egitim"],
    ["egitim", "egitim"],
    ["savunmasanayi", "savunmaSanayi"],
    ["savunma-sanayi", "savunmaSanayi"],
  ];
  const map = new Map<string, string>();
  for (const [alias, id] of pairs) {
    if (availableIds.has(id)) map.set(alias, id);
  }
  return map;
}

function normalizeCategory(raw: unknown, availableIds: Set<string>, aliasMap: Map<string, string>): string {
  const category = String(raw ?? "mixed").trim();
  if (!category || category === "mixed") return "mixed";
  if (availableIds.has(category)) return category;
  const alias = aliasMap.get(category.toLowerCase());
  if (alias && availableIds.has(alias)) return alias;
  return "mixed";
}

function defaultFeedRows(): RssBreakingFeedRow[] {
  return CATEGORY_ORDER.map((category) => ({
    id: category,
    label: RSS_BREAKING_CATEGORIES[category].label,
    url: RSS_BREAKING_CATEGORIES[category].defaultUrl,
  }));
}

function normalizeFeedRows(rawRows: unknown, legacyFeeds?: Record<string, unknown> | null): RssBreakingFeedRow[] {
  if (Array.isArray(rawRows) && rawRows.length > 0) {
    const seen = new Set<string>();
    const out: RssBreakingFeedRow[] = [];
    for (const item of rawRows) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<RssBreakingFeedRow>;
      const id = String(row.id ?? "").trim().slice(0, 48);
      const label = sanitizeRssLabel(row.label) || "Kategori";
      const url = sanitizeRssUrl(row.url);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, label, url });
    }
    if (out.length) return out;
  }

  if (legacyFeeds && typeof legacyFeeds === "object" && !Array.isArray(legacyFeeds)) {
    return CATEGORY_ORDER.map((category) => ({
      id: category,
      label: RSS_BREAKING_CATEGORIES[category].label,
      url: Object.prototype.hasOwnProperty.call(legacyFeeds, category)
        ? sanitizeRssUrl(legacyFeeds[category])
        : RSS_BREAKING_CATEGORIES[category].defaultUrl,
    }));
  }

  return defaultFeedRows();
}

async function resolveFeedRows(siteIdRaw: unknown): Promise<RssBreakingFeedRow[]> {
  const siteId = Number(siteIdRaw);
  if (!Number.isFinite(siteId) || siteId <= 0) return defaultFeedRows();

  try {
    const site = await getHmNewsSiteByIdCompat(Math.floor(siteId));
    const layout = parseLayoutJson(site?.layoutJson != null ? String(site.layoutJson) : null);
    return normalizeFeedRows(layout.hmNewsBreakingRssFeedRows, layout.hmNewsBreakingRssFeeds as Record<string, unknown>);
  } catch {
    return defaultFeedRows();
  }
}

function rowsToFeedMap(rows: RssBreakingFeedRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) out[row.id] = sanitizeRssUrl(row.url);
  return out;
}

function rowsToLabelMap(rows: RssBreakingFeedRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const label = sanitizeRssLabel(row.label);
    if (label) out[row.id] = label;
  }
  return out;
}

async function resolveFeedUrls(siteIdRaw: unknown): Promise<Record<string, string>> {
  const rows = await resolveFeedRows(siteIdRaw);
  return rowsToFeedMap(rows);
}

async function resolveFeedLabels(siteIdRaw: unknown): Promise<Record<string, string>> {
  const rows = await resolveFeedRows(siteIdRaw);
  return rowsToLabelMap(rows);
}

function emptyEntry(): CacheEntry {
  const now = Date.now();
  return {
    expiresAt: now + CACHE_TTL_MS,
    fetchedAt: new Date(now).toISOString(),
    items: [],
  };
}

async function fetchCategory(categoryId: string, url: string, labelMap: Record<string, string>): Promise<CacheEntry> {
  const feedUrl = sanitizeRssUrl(url);
  if (!feedUrl) return emptyEntry();

  const now = Date.now();
  const cacheKey = `${categoryId}:${feedUrl}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached;

  const { xml } = await fetchRssFeedXml(feedUrl, { timeoutMs: 12_000 });
  const seen = new Set<string>();
  const categoryLabel = resolveCategoryLabel(categoryId, labelMap);
  const items = parseFeedItems(xml, MAX_ITEMS * 3)
    .map((item) => normalizeItem(categoryId, categoryLabel, item))
    .filter((item): item is RssBreakingItem => item != null)
    .filter((item) => {
      const key = titleKey(item.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ITEMS);

  const entry: CacheEntry = {
    expiresAt: now + CACHE_TTL_MS,
    fetchedAt: new Date(now).toISOString(),
    items,
  };
  cache.set(cacheKey, entry);
  return entry;
}

async function fetchMixed(feeds: Record<string, string>, labelMap: Record<string, string>): Promise<CacheEntry> {
  const now = Date.now();
  const categories = configuredCategoryIds(feeds);
  if (!categories.length) return emptyEntry();
  const settled = await Promise.allSettled(
    categories.map((category) => fetchCategory(category, feeds[category] ?? "", labelMap)),
  );
  const categoryEntries = settled
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((entry): entry is CacheEntry => entry != null);
  if (!categoryEntries.length) return emptyEntry();
  const seen = new Set<string>();
  const items: RssBreakingItem[] = [];
  for (let index = 0; items.length < MAX_ITEMS && index < MAX_ITEMS; index += 1) {
    for (const entry of categoryEntries) {
      const item = entry.items[index];
      if (!item) continue;
      const key = titleKey(item.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= MAX_ITEMS) break;
    }
  }

  const entry: CacheEntry = {
    expiresAt: Math.min(...categoryEntries.map((item) => item.expiresAt), now + CACHE_TTL_MS),
    fetchedAt: categoryEntries[0]?.fetchedAt ?? new Date(now).toISOString(),
    items,
  };
  return entry;
}

async function handleRssBreakingRequest(req: Request, res: Response): Promise<void> {
  const limitRaw = Number(req.query.limit ?? MAX_ITEMS);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(MAX_ITEMS, Math.floor(limitRaw))) : MAX_ITEMS;
  try {
    const rows = await resolveFeedRows(req.query.siteId);
    const feeds = rowsToFeedMap(rows);
    const labels = rowsToLabelMap(rows);
    const availableIds = new Set(configuredCategoryIds(feeds));
    const category = normalizeCategory(req.query.category, availableIds, buildLegacyCategoryAliasMap(availableIds));
    const entry =
      category === "mixed"
        ? await fetchMixed(feeds, labels)
        : await fetchCategory(category, feeds[category] ?? "", labels);
    const categories = configuredCategoryIds(feeds).map((id) => ({
      id,
      label: resolveCategoryLabel(id, labels),
    }));
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.json({
      ok: true,
      category,
      categories: [{ id: "mixed", label: "Genel" }, ...categories],
      fetchedAt: entry.fetchedAt,
      cacheTtlSeconds: Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000)),
      items: entry.items.slice(0, limit).map((item) => ({
        ...item,
        categoryLabel: resolveCategoryLabel(item.category, labels),
        // Harici kaynak URL'si istemciye verilmez; kartlar site içi önizlemeye gider.
        url: null,
        previewHref: `/haberler/rss/${encodeURIComponent(item.id)}`,
      })),
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "RSS son dakika haberleri alınamadı.",
      detail: err instanceof Error ? err.message : String(err),
      items: [],
    });
  }
}

async function findRssBreakingItemById(siteIdRaw: unknown, itemIdRaw: unknown): Promise<RssBreakingItem | null> {
  const itemId = String(itemIdRaw ?? "").trim();
  if (!itemId) return null;
  const rows = await resolveFeedRows(siteIdRaw);
  const feeds = rowsToFeedMap(rows);
  const labels = rowsToLabelMap(rows);
  const categories = configuredCategoryIds(feeds);

  for (const category of categories) {
    const entry = await fetchCategory(category, feeds[category] ?? "", labels);
    const item = entry.items.find((row) => rssItemMatchesId(row, itemId));
    if (item) {
      return {
        ...item,
        categoryLabel: resolveCategoryLabel(item.category, labels),
      };
    }
  }

  const mixed = await fetchMixed(feeds, labels);
  const item = mixed.items.find((row) => rssItemMatchesId(row, itemId));
  return item
    ? {
        ...item,
        categoryLabel: resolveCategoryLabel(item.category, labels),
      }
    : null;
}

async function handleRssBreakingItemRequest(req: Request, res: Response): Promise<void> {
  try {
    const item = await findRssBreakingItemById(req.query.siteId, req.params.itemId);
    if (!item) {
      res.status(404).json({ error: "RSS haber bulunamadı" });
      return;
    }

    const feedRows = await resolveFeedRows(req.query.siteId);
    const feeds = rowsToFeedMap(feedRows);
    const feedUrl = feeds[item.category] ?? null;
    const sourceName = rssSourceNameFromUrl(feedUrl) ?? item.categoryLabel ?? null;

    const contentHtml =
      String(item.contentHtml ?? "").trim() ||
      (item.contentText ? `<p>${escapeHtmlAttr(item.contentText)}</p>` : "") ||
      (item.summary ? `<p>${escapeHtmlAttr(item.summary)}</p>` : "");

    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    res.json({
      id: item.id,
      title: item.title,
      spot: item.summary || item.contentText || null,
      contentHtml: contentHtml || null,
      imageUrl: item.imageUrl,
      href: `/haberler/rss/${encodeURIComponent(item.id)}`,
      publishedAt: item.publishedAt,
      categorySlug: item.category,
      categoryName: item.categoryLabel,
      categoryColor: "#CC0000",
      feedId: item.category,
      feedLabel: item.categoryLabel,
      sourceName,
      feedUrl,
    });
  } catch (err) {
    res.status(502).json({
      error: "RSS haber detayı alınamadı.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

router.get("/hm/rss-breaking/item/:itemId", handleRssBreakingItemRequest);
router.get("/hm/google-news/item/:itemId", handleRssBreakingItemRequest);
router.get("/hm/rss-breaking", handleRssBreakingRequest);
router.get("/hm/google-news", handleRssBreakingRequest);

export default router;
