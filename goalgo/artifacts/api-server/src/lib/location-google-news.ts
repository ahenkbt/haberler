import { fetchRssFeedXml } from "../lib/rssFeedFetch.js";
import { googleNewsRssUrl, parseFeedItems } from "../lib/rssFeedParse.js";
import { decodeHtmlEntities } from "../lib/decodeHtmlEntities.js";
import { pickFirstNewsImageUrl } from "../lib/newsImageHeuristics.js";
import { extractRssImageUrls } from "../lib/rssItemMedia.js";

const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Yekpare/1.0";

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; items: LocationGoogleNewsItem[] }>();

export type LocationGoogleNewsItem = {
  id: string;
  title: string;
  spot: string | null;
  href: string;
  publishedAt: string | null;
  imageUrl: string | null;
  sourceName: string | null;
  externalUrl: string;
};

function buildLocationGoogleNewsQuery(country: string, city: string): string {
  const c = String(country ?? "").trim();
  const cityLabel = String(city ?? "").trim();
  if (c && c.toLocaleLowerCase("tr-TR") !== cityLabel.toLocaleLowerCase("tr-TR")) {
    return `${c} ${cityLabel} son dakika haberleri`.trim();
  }
  return `${cityLabel} son dakika haberleri`.trim();
}

async function fetchFeedXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": FETCH_UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function rssItemToLocationNews(
  item: ReturnType<typeof parseFeedItems>[number],
  idx: number,
): LocationGoogleNewsItem | null {
  const title = decodeHtmlEntities(item.title ?? "").trim();
  const link = String(item.link ?? "").trim();
  if (!title || !link) return null;
  const images = extractRssImageUrls(item.rawInner, item.descHtml, link, 4);
  const imageUrl = pickFirstNewsImageUrl(images, link) ?? null;
  const publishedAt =
    item.publishedAt instanceof Date
      ? item.publishedAt.toISOString()
      : item.publishedAt
        ? String(item.publishedAt)
        : null;
  return {
    id: `gn-${idx}-${link.slice(-24)}`,
    title,
    spot: item.desc ? decodeHtmlEntities(item.desc).trim().slice(0, 280) : null,
    href: link,
    publishedAt,
    imageUrl,
    sourceName: null,
    externalUrl: link,
  };
}

/** Google News RSS — konum odaklı `{ülke} {şehir} son dakika haberleri` sorgusu. */
export async function fetchLocationGoogleNews(input: {
  country?: string | null;
  city?: string | null;
  q?: string | null;
  limit?: number;
}): Promise<LocationGoogleNewsItem[]> {
  const country = String(input.country ?? "").trim();
  const city = String(input.city ?? "").trim();
  const explicitQ = String(input.q ?? "").trim();
  const query = explicitQ || buildLocationGoogleNewsQuery(country, city);
  if (!query) return [];

  const limit = Math.min(Math.max(Number(input.limit ?? 24) || 24, 1), 36);
  const cacheKey = `${query}|${limit}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.items;

  const url = googleNewsRssUrl(query, "tr", "TR");
  const xml = await fetchFeedXml(url);
  if (!xml) return [];

  const parsed = parseFeedItems(xml, limit + 5);
  const items: LocationGoogleNewsItem[] = [];
  for (let i = 0; i < parsed.length && items.length < limit; i += 1) {
    const row = rssItemToLocationNews(parsed[i]!, i);
    if (row) items.push(row);
  }

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, items });
  if (cache.size > 48) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0]?.[0];
    if (oldest) cache.delete(oldest);
  }
  return items;
}
