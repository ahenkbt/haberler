/**
 * HM /video — YouTube Atom RSS yedegi (Yektube Video TV UC kanallari).
 * Haber tablosuna yazmaz. Worker kenarinda container 500/bos iken kullanilir.
 */

export const HM_YEKTUBE_RSS_CHANNELS = [
  { name: "NTV", channelId: "UC9TDTjbOjFB9jADmPhSAPsw", category: "haberler" },
  { name: "CNN Türk", channelId: "UCV6zcRug6Hqp1UX_FdyUeBg", category: "haberler" },
  { name: "TRT Haber", channelId: "UCBgTP2LOFVPmq15W-RH-WXA", category: "haberler" },
  { name: "Sözcü TV", channelId: "UCOulx_rep5O4i9y6AyDqVvw", category: "haberler" },
  { name: "beIN SPORTS Türkiye", channelId: "UCPe9vNjHF1kEExT5kHwc7aw", category: "spor" },
  { name: "NTV Spor", channelId: "UCGMghpDmBAqhz2p7eLHX-eg", category: "spor" },
  { name: "Kafalar", channelId: "UCKMr-eDHmppbCCwzfWMghAg", category: "komedi" },
  { name: "Evrim Ağacı", channelId: "UCatnasFAiXUvWwH8NlSdd3A", category: "bilim" },
  { name: "DFT Tarih", channelId: "UCM6yE-Zb4l8hHyz7AsxQpRQ", category: "tarih" },
];

const YEKTUBE_ORIGIN = "https://yektube.com";
const RSS_TIMEOUT_MS = 2500;
const MAX_FEEDS = 4;

export function youtubeChannelRssUrl(channelId) {
  const id = String(channelId || "").trim();
  if (!id.startsWith("UC") || id.length !== 24) return "";
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`;
}

export function parseYoutubeAtomEntries(xml) {
  const out = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(String(xml || ""))) !== null) {
    const block = m[1] || "";
    const videoId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]?.trim() || "";
    if (!videoId) continue;
    const mediaTitle = (block.match(/<media:title[^>]*>([^<]*)<\/media:title>/) || [])[1]?.trim();
    const plainTitle = (block.match(/<title>([^<]*)<\/title>/) || [])[1]?.trim();
    const title = (mediaTitle || plainTitle || "").trim();
    if (!title || /^Deleted video$|^Private video$/i.test(title)) continue;
    const rawThumb = (block.match(/<media:thumbnail[^>]+url="([^"]+)"/) || [])[1];
    const author = (block.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/) || [])[1]?.trim() || null;
    out.push({
      videoId,
      title: title.slice(0, 500),
      thumbnail: rawThumb
        ? rawThumb.replace(/&amp;/g, "&")
        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelName: author,
    });
  }
  return out;
}

export function hmYektubeRssChannelsFor(categorySlug) {
  const slug = String(categorySlug || "").trim();
  const pool = slug
    ? HM_YEKTUBE_RSS_CHANNELS.filter((c) => c.category === slug)
    : HM_YEKTUBE_RSS_CHANNELS.filter((c) => c.category === "haberler");
  return (pool.length ? pool : HM_YEKTUBE_RSS_CHANNELS.filter((c) => c.category === "haberler")).slice(0, MAX_FEEDS);
}

function stableRssId(videoId) {
  let h = 0;
  for (let i = 0; i < videoId.length; i++) h = (Math.imul(h, 31) + videoId.charCodeAt(i)) | 0;
  return (h >>> 0) % 2_000_000_000 || 1;
}

export function mapYoutubeRssToCatalogItem(entry, categorySlug, channelName) {
  const videoId = String(entry?.videoId || "").trim();
  const title = String(entry?.title || "").trim();
  if (!videoId || !title) return null;
  const name = entry.channelName || channelName || null;
  return {
    id: stableRssId(videoId),
    sourceId: null,
    videoId,
    title,
    thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    channelName: name,
    duration: null,
    categorySlug: categorySlug || "haberler",
    isStory: false,
    platform: "youtube",
    watchUrl: `${YEKTUBE_ORIGIN}/yp/?v=${encodeURIComponent(videoId)}`,
    provider: name,
  };
}

export async function fetchHmYektubeYoutubeRssCatalog(opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 36, 1), 48);
  const categorySlug = String(opts.categorySlug || "").trim() || null;
  const channels = hmYektubeRssChannelsFor(categorySlug);
  const results = await Promise.all(
    channels.map(async (ch) => {
      const url = youtubeChannelRssUrl(ch.channelId);
      if (!url) return [];
      try {
        const res = await fetch(url, {
          headers: { accept: "application/atom+xml, application/xml, text/xml, */*" },
          signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseYoutubeAtomEntries(xml)
          .map((entry) => mapYoutubeRssToCatalogItem(entry, ch.category || categorySlug || "haberler", ch.name))
          .filter(Boolean);
      } catch {
        return [];
      }
    }),
  );
  const seen = new Set();
  const items = [];
  for (const row of results.flat()) {
    if (seen.has(row.videoId)) continue;
    seen.add(row.videoId);
    items.push(row);
    if (items.length >= limit) break;
  }
  return items;
}
