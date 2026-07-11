import { logger } from "./logger.js";
import { resolveYoutubeApiKey } from "./resolve-youtube-api-key.js";
import { scrapeYoutubeLiveSearch } from "./youtubeLiveHtmlSearch.js";
import { fetchYoutubeVideoSnippetMap } from "./youtubeVideoMeta.js";

const UA = "YekpareLiveSearch/1.0 (+https://yekpare.net)";

export type YoutubeLiveSearchHit = {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnail?: string;
  liveBroadcastContent?: "live" | "upcoming" | "none";
};

type SearchListResponse = {
  error?: { message?: string; errors?: Array<{ reason?: string }> };
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelId?: string;
      channelTitle?: string;
      liveBroadcastContent?: "live" | "upcoming" | "none";
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

async function searchYoutubeLiveViaApi(
  query: string,
  maxResults: number,
): Promise<YoutubeLiveSearchHit[]> {
  const key = await resolveYoutubeApiKey();
  if (!key) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("eventType", "live");
  url.searchParams.set("maxResults", String(Math.min(Math.max(maxResults, 1), 50)));
  url.searchParams.set("key", key);
  url.searchParams.set("relevanceLanguage", "tr");
  url.searchParams.set("regionCode", "TR");

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = (await res.json().catch(() => ({}))) as SearchListResponse;
  if (!res.ok) {
    logger.warn(
      {
        query,
        status: res.status,
        reason: json.error?.errors?.[0]?.reason,
        message: json.error?.message,
      },
      "[youtubeLiveSearch] YouTube API search failed",
    );
    return [];
  }

  const hits: YoutubeLiveSearchHit[] = [];
  for (const item of json.items ?? []) {
    const videoId = item.id?.videoId?.trim();
    if (!videoId) continue;
    const sn = item.snippet;
    hits.push({
      videoId,
      title: sn?.title?.trim() || videoId,
      channelId: sn?.channelId?.trim() || "",
      channelTitle: sn?.channelTitle?.trim() || sn?.title?.trim() || videoId,
      thumbnail: sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url,
      liveBroadcastContent: sn?.liveBroadcastContent,
    });
  }

  return hits;
}

async function enrichLiveSearchHits(hits: YoutubeLiveSearchHit[]): Promise<YoutubeLiveSearchHit[]> {
  if (hits.length === 0) return hits;

  const metaMap = await fetchYoutubeVideoSnippetMap(hits.map((h) => h.videoId));
  for (const h of hits) {
    const meta = metaMap.get(h.videoId);
    if (!meta) continue;
    if (meta.title) h.title = meta.title;
    if (meta.thumbnail) h.thumbnail = meta.thumbnail;
    if (meta.liveBroadcastContent) h.liveBroadcastContent = meta.liveBroadcastContent;
    if (meta.channelId && !h.channelId) h.channelId = meta.channelId;
    if (meta.channelTitle && !h.channelTitle) h.channelTitle = meta.channelTitle;
  }

  return hits;
}

export async function searchYoutubeLiveVideos(query: string, maxResults = 15): Promise<YoutubeLiveSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const limit = Math.min(Math.max(maxResults, 1), 50);
  let hits = await searchYoutubeLiveViaApi(trimmed, limit);

  if (hits.length === 0) {
    const key = await resolveYoutubeApiKey();
    if (!key) {
      logger.info({ query: trimmed }, "[youtubeLiveSearch] no API key — using HTML live search fallback");
    } else {
      logger.info({ query: trimmed }, "[youtubeLiveSearch] API returned no hits — trying HTML live search fallback");
    }
    hits = await scrapeYoutubeLiveSearch(trimmed, limit);
    if (hits.length > 0) {
      logger.info({ query: trimmed, count: hits.length }, "[youtubeLiveSearch] HTML fallback found live hits");
    }
  }

  return enrichLiveSearchHits(hits);
}
