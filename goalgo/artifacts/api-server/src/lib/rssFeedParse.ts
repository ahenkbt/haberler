import { decodeHtmlEntities } from "./decodeHtmlEntities.js";
import { extractRssItemPublishedAt } from "./rssPublishedDate.js";

export type RssFeedItem = {
  title: string;
  desc: string;
  descHtml: string;
  link: string;
  rawInner: string;
  publishedAt: Date | null;
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXmlText(s: string): string {
  return decodeHtmlEntities(s);
}

/** RSS 2.0 `<item>` listesi (Google News dahil). */
export function parseRssFeedItems(xml: string, maxItems: number): RssFeedItem[] {
  const items: RssFeedItem[] = [];
  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
  for (const m of itemMatches) {
    const inner = m[1] ?? "";
    const title = decodeXmlText(
      (inner.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
        inner.match(/<title[^>]*>([\s\S]*?)<\/title>/i))?.[1] ?? "",
    );
    const descHtml = decodeXmlText(
      (inner.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
        inner.match(/<description[^>]*>([\s\S]*?)<\/description>/i))?.[1] ?? "",
    );
    const desc = stripTags(descHtml);
    const link = decodeXmlText((inner.match(/<link[^>]*>([\s\S]*?)<\/link>/i))?.[1] ?? "");
    if (title)
      items.push({
        title,
        desc,
        descHtml,
        link,
        rawInner: inner,
        publishedAt: extractRssItemPublishedAt(inner),
      });
    if (items.length >= maxItems) break;
  }
  return items;
}

/** Atom `<entry>` (NTV vb.). */
export function parseAtomFeedEntries(xml: string, maxItems: number): RssFeedItem[] {
  const items: RssFeedItem[] = [];
  const entryMatches = xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);
  for (const m of entryMatches) {
    const inner = m[1] ?? "";
    const title = decodeXmlText(
      (inner.match(/<title[^>]*>([\s\S]*?)<\/title>/i))?.[1] ?? "",
    );
    const link =
      inner.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1]?.trim() ||
      inner.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i)?.[1]?.trim() ||
      inner.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim() ||
      inner.match(/<id[^>]*>(https?:\/\/[^<]+)<\/id>/i)?.[1]?.trim() ||
      "";
    const contentHtml = decodeXmlText(
      (inner.match(/<content[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content>/i) ||
        inner.match(/<content[^>]*>([\s\S]*?)<\/content>/i))?.[1] ?? "",
    );
    const summaryHtml = decodeXmlText(
      (inner.match(/<summary[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/summary>/i) ||
        inner.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i))?.[1] ?? "",
    );
    const descHtml = contentHtml || summaryHtml;
    const desc = stripTags(descHtml);
    if (title)
      items.push({
        title,
        desc,
        descHtml,
        link,
        rawInner: inner,
        publishedAt: extractRssItemPublishedAt(inner),
      });
    if (items.length >= maxItems) break;
  }
  return items;
}

/** RSS veya Atom beslemesinden öğe listesi. */
export function parseFeedItems(xml: string, maxItems: number): RssFeedItem[] {
  const rss = parseRssFeedItems(xml, maxItems);
  if (rss.length) return rss;
  return parseAtomFeedEntries(xml, maxItems);
}

export function googleNewsRssUrl(topic: string, hl = "tr", gl = "TR"): string {
  const ceid = `${gl}:${hl}`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(topic.trim())}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;
}
