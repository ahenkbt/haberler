import { resolveYoutubeApiKey } from "./resolve-youtube-api-key.js";
import { scrapeYoutubeVideoSearch } from "./youtubeVideoHtmlSearch.js";
import { fetchYoutubeVideoSnippetMap } from "./youtubeVideoMeta.js";

const UA = "YekpareVideoSearch/1.0 (+https://yekpare.net)";

export type YoutubeSearchHit = {
  videoId: string;
  title: string;
  description?: string;
  channelId: string;
  channelTitle: string;
  publishedAt?: string;
  thumbnail?: string;
  duration?: string | null;
};

type SearchListResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

async function searchYoutubeVideosViaApi(
  trimmed: string,
  maxResults: number,
): Promise<YoutubeSearchHit[]> {
  const key = await resolveYoutubeApiKey();
  if (!key) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(Math.min(Math.max(maxResults, 1), 25)));
  url.searchParams.set("key", key);
  url.searchParams.set("relevanceLanguage", "tr");
  url.searchParams.set("regionCode", "TR");

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = (await res.json().catch(() => ({}))) as SearchListResponse;
  if (!res.ok) return [];

  const hits: YoutubeSearchHit[] = [];
  for (const item of json.items ?? []) {
    const videoId = item.id?.videoId?.trim();
    if (!videoId) continue;
    const sn = item.snippet;
    hits.push({
      videoId,
      title: sn?.title?.trim() || videoId,
      description: sn?.description?.trim(),
      channelId: sn?.channelId?.trim() || "",
      channelTitle: sn?.channelTitle?.trim() || "",
      publishedAt: sn?.publishedAt,
      thumbnail: sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url,
    });
  }

  if (hits.length === 0) return hits;

  const metaMap = await fetchYoutubeVideoSnippetMap(hits.map((h) => h.videoId));
  for (const h of hits) {
    const meta = metaMap.get(h.videoId);
    if (!meta) continue;
    if (meta.title) h.title = meta.title;
    if (meta.duration) h.duration = meta.duration;
    if (meta.description) h.description = meta.description;
    if (meta.thumbnail) h.thumbnail = meta.thumbnail;
  }

  return hits;
}

export async function searchYoutubeVideos(query: string, maxResults = 12): Promise<YoutubeSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const limit = Math.min(Math.max(maxResults, 1), 25);
  let hits = await searchYoutubeVideosViaApi(trimmed, limit);
  if (hits.length === 0) {
    hits = await scrapeYoutubeVideoSearch(trimmed, limit);
  }
  return hits;
}
