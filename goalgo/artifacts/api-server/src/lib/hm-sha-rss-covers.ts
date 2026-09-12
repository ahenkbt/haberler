import { fetchRssFeedXml } from "./rssFeedFetch.js";
import { parseFeedItems } from "./rssFeedParse.js";
import { extractRssCoverImage } from "./rssItemMedia.js";
import { isShaHost, shaFeedUrls } from "./hm-sha-rss-feeds.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";

const SHA_COVER_CACHE_TTL_MS = 10 * 60 * 1000;
const SHA_COVER_FETCH_TIMEOUT_MS = 3_500;

type ShaCoverCache = { at: number; map: Map<string, string> };

let shaCoverCache: ShaCoverCache | null = null;
let shaCoverInflight: Promise<Map<string, string>> | null = null;

export function rssSourceNeedsShaCoverLookup(rssSourceUrl: string | null | undefined): boolean {
  return isShaHost(rssSourceUrl);
}

/** SHA RSS XML → makale URL → enclosure/media:content kapak. */
export function indexShaRssCoversFromXml(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of parseFeedItems(xml, 80)) {
    const img = extractRssCoverImage(item.rawInner, item.descHtml || item.desc, item.link);
    const key = (normalizeRssSourceUrl(item.link) ?? String(item.link ?? "").trim()).toLowerCase();
    if (!img || !key) continue;
    map.set(key, img);
  }
  return map;
}

function mergeCoverMaps(into: Map<string, string>, from: Map<string, string>): void {
  for (const [key, value] of from) {
    if (key && value) into.set(key, value);
  }
}

async function fetchShaRssCoverMap(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(
    shaFeedUrls().map(async (url) => {
      try {
        const fetched = await fetchRssFeedXml(url, { timeoutMs: SHA_COVER_FETCH_TIMEOUT_MS });
        mergeCoverMaps(out, indexShaRssCoversFromXml(fetched.xml));
      } catch {
        /* tek feed kaçmasın — liste yine dolu kalsın */
      }
    }),
  );
  return out;
}

export async function loadShaRssCoverByArticleUrl(): Promise<Map<string, string>> {
  if (shaCoverCache && Date.now() - shaCoverCache.at < SHA_COVER_CACHE_TTL_MS) {
    return shaCoverCache.map;
  }
  if (shaCoverInflight) return shaCoverInflight;
  shaCoverInflight = fetchShaRssCoverMap()
    .then((map) => {
      if (map.size > 0) shaCoverCache = { at: Date.now(), map };
      return map;
    })
    .finally(() => {
      shaCoverInflight = null;
    });
  return shaCoverInflight;
}

export function lookupShaRssCover(
  map: ReadonlyMap<string, string>,
  rssSourceUrl: string | null | undefined,
): string | null {
  const key = (normalizeRssSourceUrl(String(rssSourceUrl ?? "")) ?? String(rssSourceUrl ?? "").trim()).toLowerCase();
  if (!key) return null;
  return map.get(key) ?? null;
}
