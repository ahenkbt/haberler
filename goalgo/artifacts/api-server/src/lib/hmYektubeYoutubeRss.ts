/**
 * Yektube katalog son çare — mevcut Video TV UC kanallarının YouTube Atom RSS'i.
 * Haber/Neon news tablosuna yazmaz. Yalnızca okuma.
 */
import type { HmYektubeCatalogItem, HmYektubeCatalogQuery } from "./hmYektubeCatalog.js";
import { logger } from "./logger.js";

const YEKTUBE_ORIGIN = "https://yektube.com";

function rssWatchUrl(videoId: string): string {
  return `${YEKTUBE_ORIGIN}/yp/?v=${encodeURIComponent(videoId)}`;
}

function rssThumb(videoId: string): string | null {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export type HmYektubeRssChannel = {
  name: string;
  channelId: string;
  category: string;
};

/** VIDEO_TV_PRESETS içindeki UC* kimlikleri — handle RSS yok. */
export const HM_YEKTUBE_RSS_CHANNELS: readonly HmYektubeRssChannel[] = [
  { name: "NTV", channelId: "UC9TDTjbOjFB9jADmPhSAPsw", category: "haberler" },
  { name: "CNN Türk", channelId: "UCV6zcRug6Hqp1UX_FdyUeBg", category: "haberler" },
  { name: "TRT Haber", channelId: "UCBgTP2LOFVPmq15W-RH-WXA", category: "haberler" },
  { name: "Sözcü TV", channelId: "UCOulx_rep5O4i9y6AyDqVvw", category: "haberler" },
  { name: "Haber Global", channelId: "UCtc-a9ZUIg0_5HpsPxEO7Qg", category: "haberler" },
  { name: "A Haber", channelId: "UCKQhfw-lzz0uKnE1fY1PsAA", category: "haberler" },
  { name: "Habertürk", channelId: "UClGZC_r-sUcBdElAtDSrQ5g", category: "haberler" },
  { name: "beIN SPORTS Türkiye", channelId: "UCPe9vNjHF1kEExT5kHwc7aw", category: "spor" },
  { name: "NTV Spor", channelId: "UCGMghpDmBAqhz2p7eLHX-eg", category: "spor" },
  { name: "Fenerbahçe SK", channelId: "UCgqlho3-8a6FmDqQm7Q6gJw", category: "spor" },
  { name: "Galatasaray", channelId: "UCQpeujIamj2ZOKXZnrxTRhA", category: "spor" },
  { name: "Danla Bilic", channelId: "UCJXKKGzjjqnHAEkJsdC7ZKw", category: "eglence" },
  { name: "Enes Batur", channelId: "UCB3azBBFDWwIHDIAeRRfcYg", category: "eglence" },
  { name: "Kafalar", channelId: "UCKMr-eDHmppbCCwzfWMghAg", category: "komedi" },
  { name: "Evrim Ağacı", channelId: "UCatnasFAiXUvWwH8NlSdd3A", category: "bilim" },
  { name: "TÜBİTAK", channelId: "UCVnUU2RGifgyZexLW7_g9Zg", category: "bilim" },
  { name: "DFT Tarih", channelId: "UCM6yE-Zb4l8hHyz7AsxQpRQ", category: "tarih" },
];

const RSS_TIMEOUT_MS = 2_500;
const MAX_FEEDS = 4;

export function youtubeChannelRssUrl(channelId: string): string | null {
  const id = String(channelId ?? "").trim();
  if (!id.startsWith("UC") || id.length !== 24) return null;
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`;
}

export function parseYoutubeAtomEntries(xml: string): { videoId: string; title: string; thumbnail: string | null; channelName: string | null }[] {
  const out: { videoId: string; title: string; thumbnail: string | null; channelName: string | null }[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(String(xml ?? ""))) !== null) {
    const block = m[1] ?? "";
    const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim() ?? "";
    if (!videoId) continue;
    const mediaTitle = block.match(/<media:title[^>]*>([^<]*)<\/media:title>/)?.[1]?.trim();
    const plainTitle = block.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
    const title = (mediaTitle || plainTitle || "").trim();
    if (!title || /^Deleted video$|^Private video$/i.test(title)) continue;
    const rawThumb = block.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1];
    const author = block.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/)?.[1]?.trim() ?? null;
    out.push({
      videoId,
      title: title.slice(0, 500),
      thumbnail: rawThumb ? rawThumb.replace(/&amp;/g, "&") : rssThumb(videoId),
      channelName: author,
    });
  }
  return out;
}

export function hmYektubeRssChannelsFor(categorySlug: string | null): HmYektubeRssChannel[] {
  const slug = String(categorySlug ?? "").trim();
  const pool = slug
    ? HM_YEKTUBE_RSS_CHANNELS.filter((c) => c.category === slug)
    : HM_YEKTUBE_RSS_CHANNELS.filter((c) => c.category === "haberler");
  const chosen = (pool.length > 0 ? pool : HM_YEKTUBE_RSS_CHANNELS.filter((c) => c.category === "haberler")).slice(
    0,
    MAX_FEEDS,
  );
  return chosen;
}

function stableRssId(videoId: string): number {
  let h = 0;
  for (let i = 0; i < videoId.length; i++) h = (Math.imul(h, 31) + videoId.charCodeAt(i)) | 0;
  return (h >>> 0) % 2_000_000_000 || 1;
}

export function mapYoutubeRssToCatalogItem(
  entry: { videoId: string; title: string; thumbnail: string | null; channelName: string | null },
  categorySlug: string,
): HmYektubeCatalogItem | null {
  const videoId = String(entry.videoId ?? "").trim();
  const title = String(entry.title ?? "").trim();
  if (!videoId || !title) return null;
  return {
    id: stableRssId(videoId),
    sourceId: null,
    videoId,
    title,
    thumbnail: entry.thumbnail || rssThumb(videoId),
    channelName: entry.channelName,
    duration: null,
    categorySlug: categorySlug || "haberler",
    isStory: false,
    platform: "youtube",
    watchUrl: rssWatchUrl(videoId),
    provider: entry.channelName,
  };
}

export async function fetchHmYektubeYoutubeRssCatalog(query: HmYektubeCatalogQuery): Promise<HmYektubeCatalogItem[]> {
  const channels = hmYektubeRssChannelsFor(query.categorySlug);
  const categorySlug = query.categorySlug || "haberler";
  const results = await Promise.all(
    channels.map(async (ch) => {
      const url = youtubeChannelRssUrl(ch.channelId);
      if (!url) return [] as HmYektubeCatalogItem[];
      try {
        const res = await fetch(url, {
          headers: { accept: "application/atom+xml, application/xml, text/xml, */*" },
          signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseYoutubeAtomEntries(xml)
          .map((entry) =>
            mapYoutubeRssToCatalogItem(
              { ...entry, channelName: entry.channelName || ch.name },
              ch.category || categorySlug,
            ),
          )
          .filter((row): row is HmYektubeCatalogItem => row != null);
      } catch (err) {
        logger.warn({ err, channelId: ch.channelId }, "[hm-yektube] youtube rss feed failed");
        return [];
      }
    }),
  );
  const seen = new Set<string>();
  const items: HmYektubeCatalogItem[] = [];
  for (const row of results.flat()) {
    if (seen.has(row.videoId)) continue;
    seen.add(row.videoId);
    items.push(row);
    if (items.length >= query.limit) break;
  }
  return items;
}
