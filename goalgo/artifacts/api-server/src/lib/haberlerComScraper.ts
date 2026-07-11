import { haberlerEtiketSlugFromUrl } from "./rssFeedResolve.js";
import { stripHaberlerShareAndChrome } from "./haberlerArticleHtmlCleanup.js";
import { coerceNewsPublishedAt, extractHtmlArticlePublishedAt } from "./rssPublishedDate.js";

export type HaberlerScrapedArticle = {
  title: string;
  link: string;
  spot: string;
  contentHtml: string;
  imageUrl: string | null;
  publishedAt: Date;
};

export type HaberlerListingLink = {
  title: string;
  link: string;
  imageUrl: string | null;
};

const HTML_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Yekpare/1.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
};

export function isHaberlerComUrl(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase().replace(/^www\./, "");
    return host === "haberler.com";
  } catch {
    return false;
  }
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function metaContent(html: string, property: string): string {
  const re1 = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    "i",
  );
  const re3 = new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  return decodeHtmlEntities(html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? html.match(re3)?.[1] ?? "");
}

function isHaberlerArticlePath(pathname: string): boolean {
  return /-haberi\/?$/i.test(pathname) || /\/haber\//i.test(pathname);
}

/** İsteğe bağlı: kampanya etiketleriyle başlık/özet eşleşmesi (gazi, ekonomi, …). */
export function matchesHaberlerTopicTags(text: string, tags: string[]): boolean {
  if (!tags.length) return true;
  const t = text.toLocaleLowerCase("tr-TR");
  return tags.some((raw) => {
    const slug = raw.trim().toLowerCase();
    if (!slug) return false;
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-zçğıöşü0-9])${escaped}([^a-zçğıöşü0-9]|$)`, "i").test(t);
  });
}

async function fetchHtml(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
    headers: HTML_HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractHaberlerCards(html: string, baseUrl: string, limit: number): HaberlerListingLink[] {
  const items: HaberlerListingLink[] = [];
  const seen = new Set<string>();
  const cardRe =
    /<a\s+href="([^"]+-haberi\/?)"[^>]*title="([^"]*)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null && items.length < limit * 2) {
    let link: string;
    try {
      link = new URL(m[1]!, baseUrl).href;
    } catch {
      continue;
    }
    if (seen.has(link)) continue;
    seen.add(link);
    const title = decodeHtmlEntities(m[2] ?? "").slice(0, 400);
    if (title.length < 8) continue;
    const imageUrl = m[3]?.startsWith("http") ? m[3]! : null;
    items.push({ title, link, imageUrl });
  }
  return items;
}

function extractHaberlerListColumn(html: string, baseUrl: string, limit: number): HaberlerListingLink[] {
  const items: HaberlerListingLink[] = [];
  const seen = new Set<string>();
  const blockMatch = html.match(/class="new3list-card-body"[^>]*>\s*<ul>([\s\S]*?)<\/ul>/i);
  const block = blockMatch?.[1] ?? html;
  const linkRe = /<a\s+href="([^"]+-haberi\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(block)) !== null && items.length < limit * 2) {
    let link: string;
    try {
      link = new URL(m[1]!, baseUrl).href;
    } catch {
      continue;
    }
    if (seen.has(link)) continue;
    seen.add(link);
    const title = stripTags(m[2] ?? "").slice(0, 400);
    if (title.length < 8) continue;
    items.push({ title, link, imageUrl: null });
  }
  return items;
}

/** Haberler.com etiket / kategori / terim liste sayfasından haber linkleri. */
export function parseHaberlerListingLinks(
  html: string,
  pageUrl: string,
  opts?: { limit?: number; topicFilterTags?: string[] },
): HaberlerListingLink[] {
  const limit = Math.max(1, Math.min(30, opts?.limit ?? 20));
  const filterTags = opts?.topicFilterTags?.filter((t) => t.trim()) ?? [];
  const merged: HaberlerListingLink[] = [];
  const seen = new Set<string>();

  for (const row of [...extractHaberlerCards(html, pageUrl, limit), ...extractHaberlerListColumn(html, pageUrl, limit)]) {
    if (seen.has(row.link)) continue;
    const checkText = `${row.title} ${row.link}`;
    if (filterTags.length > 0 && !matchesHaberlerTopicTags(checkText, filterTags)) continue;
    seen.add(row.link);
    merged.push(row);
    if (merged.length >= limit) break;
  }
  return merged;
}

function sliceHaberlerNewsIcerik(html: string): string {
  const open = html.match(/<div[^>]*\bclass="news-icerik"[^>]*>/i);
  if (!open || open.index === undefined) {
    return html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? "";
  }
  let slice = html.slice(open.index + open[0].length);
  const endMarkers = [
    'class="new3news-related',
    'class="hbRelated',
    'id="yorumAlan',
    'class="news-tags"',
    'class="new3detail-right"',
    'id="detaySag"',
    'class="new3card-reklam-container"',
    'id="yorum_blok"',
    "</article>",
    "<footer",
    'class="footer-container"',
    ">Yeni Haberler<",
    "UYGULAMAMIZI İNDİRİN",
  ];
  const kaynak = slice.match(/<div[^>]*\beditorSade\b[^>]*>\s*Kaynak:/i);
  const ends = endMarkers.map((m) => slice.indexOf(m)).filter((i) => i > 80);
  if (kaynak?.index !== undefined) {
    const tail = slice.slice(kaynak.index);
    const closeIdx = tail.indexOf("</div>");
    if (closeIdx >= 0) ends.push(kaynak.index + closeIdx + "</div>".length);
  }
  if (ends.length) slice = slice.slice(0, Math.min(...ends));
  return slice;
}

function extractNewsIcerikHtml(html: string): string {
  const block = sliceHaberlerNewsIcerik(html);
  if (!block) return "";

  let cleaned = stripHaberlerShareAndChrome(block)
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/href="javascript:[^"]*"/gi, 'href="#"');

  const textOnly = stripTags(cleaned);
  if (textOnly.length < 40) return "";
  return cleaned.trim();
}

function buildSpotFromContent(contentHtml: string, ogDescription: string, title: string): string {
  if (ogDescription.length >= 40) return ogDescription.slice(0, 500);
  const paragraphs = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  for (const p of paragraphs) {
    const text = stripTags(p);
    if (text.length >= 60) return text.slice(0, 500);
  }
  return title.slice(0, 500);
}

/** Tek Haberler.com makalesini kazar (başlık, özet, tam HTML içerik, görsel). */
export async function scrapeHaberlerArticle(
  articleUrl: string,
  opts?: { timeoutMs?: number; listingTitle?: string; listingImage?: string | null },
): Promise<HaberlerScrapedArticle | null> {
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  try {
    const html = await fetchHtml(articleUrl, timeoutMs);
    const title =
      metaContent(html, "og:title") ||
      stripTags(html.match(/<h1[^>]*id="title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") ||
      opts?.listingTitle ||
      "";
    if (title.length < 5) return null;

    const contentHtml = extractNewsIcerikHtml(html);
    const ogDesc = metaContent(html, "og:description");
    const spot = buildSpotFromContent(contentHtml, ogDesc, title);
    const imageUrl =
      metaContent(html, "og:image") ||
      opts?.listingImage ||
      null;

    const publishedAt = coerceNewsPublishedAt(extractHtmlArticlePublishedAt(html));

    return {
      title: title.slice(0, 300),
      link: articleUrl,
      spot,
      contentHtml: contentHtml.length > 80 ? contentHtml : `<p>${spot}</p>`,
      imageUrl: imageUrl?.startsWith("http") ? imageUrl : null,
      publishedAt,
    };
  } catch {
    return null;
  }
}

const ARTICLE_FETCH_GAP_MS = 180;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Haberler.com etiket / kategori / terim sayfası → makale kazıma (RSS kullanılmaz).
 */
export async function scrapeHaberlerComCampaignItems(
  pageUrl: string,
  opts?: { limit?: number; timeoutMs?: number; topicFilterTags?: string[] },
): Promise<HaberlerScrapedArticle[]> {
  const limit = Math.max(1, Math.min(30, opts?.limit ?? 15));
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const filterTags = opts?.topicFilterTags?.map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [];

  const listHtml = await fetchHtml(pageUrl, timeoutMs);
  const links = parseHaberlerListingLinks(listHtml, pageUrl, { limit, topicFilterTags: filterTags });
  if (links.length === 0) {
    throw new Error(
      filterTags.length > 0
        ? `Sayfada «${filterTags.join(", ")}» etiketleriyle eşleşen haber bulunamadı`
        : "Haberler.com sayfasında haber linki bulunamadı",
    );
  }

  const articles: HaberlerScrapedArticle[] = [];
  for (let i = 0; i < links.length; i++) {
    const row = links[i]!;
    if (i > 0) await sleep(ARTICLE_FETCH_GAP_MS);
    const article = await scrapeHaberlerArticle(row.link, {
      timeoutMs,
      listingTitle: row.title,
      listingImage: row.imageUrl,
    });
    if (!article) continue;
    const topicCheck = `${article.title} ${article.spot}`;
    if (filterTags.length > 0 && !matchesHaberlerTopicTags(topicCheck, filterTags)) continue;
    articles.push(article);
    if (articles.length >= limit) break;
  }

  if (articles.length === 0) {
    throw new Error("Haber sayfaları kazınamadı (içerik boş veya erişim engellendi)");
  }
  return articles;
}

/** Sayfa slug'ından önerilen site etiketi (içe aktarılan haber tags[] için). */
export function suggestHaberlerSiteTagFromPageUrl(pageUrl: string): string | null {
  return haberlerEtiketSlugFromUrl(pageUrl);
}
