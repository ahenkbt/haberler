import { eq } from "drizzle-orm";
import type { VideoSourceRow } from "@workspace/db";
import { dualWriteYektubeUpdate, videoSourcesTable } from "@workspace/db";
import { logger } from "./logger.js";
import { resolveYoutubeApiKey } from "./resolve-youtube-api-key.js";
import { searchYoutubeLiveVideos } from "./youtubeLiveSearch.js";
import { extractYoutubeVideoId, isYoutubeLiveVideoId } from "./youtubeLiveVideoId.js";
import { fetchYoutubeVideoSnippetMap } from "./youtubeVideoMeta.js";
import { resolveYoutubeUcChannelId } from "./youtubeVideoSync.js";

const UA = "YekpareChannelLive/1.0 (+https://yekpare.net)";
const CACHE_MS = 120_000;

type CacheEntry = { at: number; videoId: string | null; ucChannelId: string | null };

const cache = new Map<string, CacheEntry>();

function isUcChannelId(id: string): boolean {
  return id.startsWith("UC") && id.length >= 22;
}

function cacheKey(sourceId: number): string {
  return String(sourceId);
}

async function searchLiveOnChannel(ucChannelId: string): Promise<string | null> {
  const key = await resolveYoutubeApiKey();
  if (!key) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", ucChannelId);
  url.searchParams.set("eventType", "live");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const json = (await res.json().catch(() => ({}))) as {
      items?: Array<{ id?: { videoId?: string } }>;
    };
    if (!res.ok) return null;
    const videoId = json.items?.[0]?.id?.videoId?.trim();
    return videoId && isYoutubeLiveVideoId(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

async function searchLiveByName(name: string, ucChannelId?: string | null): Promise<string | null> {
  const hits = await searchYoutubeLiveVideos(name, 8);
  if (hits.length === 0) return null;
  if (ucChannelId) {
    const match = hits.find((h) => h.channelId === ucChannelId && h.liveBroadcastContent !== "none");
    if (match?.videoId) return match.videoId;
  }
  const live = hits.find((h) => h.liveBroadcastContent === "live");
  return live?.videoId ?? hits[0]?.videoId ?? null;
}

async function verifyLiveVideoId(videoId: string): Promise<boolean> {
  const metaMap = await fetchYoutubeVideoSnippetMap([videoId]);
  const lbc = metaMap.get(videoId)?.liveBroadcastContent;
  return lbc === "live" || lbc === "upcoming";
}

export type ChannelLiveBroadcastResult = {
  videoId: string | null;
  ucChannelId: string | null;
  refreshed: boolean;
};

/** Canlı TV kaynağı için güncel YouTube yayın video ID'si (API + önbellek). */
export async function resolveChannelLiveBroadcastVideoId(
  source: VideoSourceRow,
  opts?: { force?: boolean },
): Promise<ChannelLiveBroadcastResult> {
  const key = cacheKey(source.id);
  const now = Date.now();
  if (!opts?.force) {
    const hit = cache.get(key);
    if (hit && now - hit.at < CACHE_MS) {
      return { videoId: hit.videoId, ucChannelId: hit.ucChannelId, refreshed: false };
    }
  }

  const cid = source.channelId?.trim() ?? "";
  const storedVideoId = extractYoutubeVideoId(source.url) ?? extractYoutubeVideoId(cid);
  let ucChannelId: string | null = isUcChannelId(cid) ? cid : null;

  if (!ucChannelId && storedVideoId) {
    const metaMap = await fetchYoutubeVideoSnippetMap([storedVideoId]);
    const uc = metaMap.get(storedVideoId)?.channelId?.trim() ?? "";
    if (isUcChannelId(uc)) ucChannelId = uc;
  }

  if (!ucChannelId && source.useYoutubeApi !== false) {
    const resolved = await resolveYoutubeUcChannelId(source).catch(() => null);
    if (resolved && isUcChannelId(resolved)) ucChannelId = resolved;
  }

  const useApi = source.useYoutubeApi !== false;
  let videoId: string | null = storedVideoId;

  if (videoId && (await verifyLiveVideoId(videoId))) {
    const result = { videoId, ucChannelId, refreshed: false };
    cache.set(key, { at: now, ...result });
    return result;
  }

  videoId = null;
  if (useApi) {
    if (ucChannelId) {
      videoId = await searchLiveOnChannel(ucChannelId);
    }
    if (!videoId && source.name?.trim()) {
      videoId = await searchLiveByName(source.name.trim(), ucChannelId);
    }
  }

  const result = { videoId, ucChannelId, refreshed: true };
  cache.set(key, { at: now, ...result });

  if (videoId && videoId !== storedVideoId && isYoutubeLiveVideoId(videoId)) {
    setImmediate(() => {
      void dualWriteYektubeUpdate(
        videoSourcesTable,
        {
          channelId: videoId,
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
          sourceType: "live",
          isLive: true,
        },
        eq(videoSourcesTable.id, source.id),
      ).catch((err) => logger.warn({ err, sourceId: source.id }, "[live-broadcast] DB patch failed"));
    });
  }

  return result;
}

export function invalidateChannelLiveBroadcastCache(sourceId?: number): void {
  if (sourceId != null) cache.delete(cacheKey(sourceId));
  else cache.clear();
}
