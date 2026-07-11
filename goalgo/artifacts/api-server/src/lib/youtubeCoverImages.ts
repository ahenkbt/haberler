import type { VideoRow, VideoSourceRow } from "@workspace/db";
import { extractYoutubeVideoId, isYoutubeLiveVideoId } from "./youtubeLiveVideoId.js";
import { scrapeYoutubeChannelHtmlMeta } from "./youtubeChannelHtmlMeta.js";
import { fetchYoutubePlaylistRssPreview } from "./youtubeVideoSync";

export function normalizeYoutubeCoverUrl(url: string | undefined | null): string {
  const t = (url ?? "").trim().replace(/\\u0026/g, "&");
  if (!t) return "";
  if (t.startsWith("//")) return `https:${t}`;
  return t.replace(/^http:\/\//i, "https://");
}

/** data: URI ve boş URL kapak olarak kullanılmaz */
export function isUsableYoutubeCover(url: string | undefined | null): boolean {
  const t = normalizeYoutubeCoverUrl(url);
  if (!t) return false;
  if (t.startsWith("data:")) return false;
  return true;
}

/** Saklanan kapak URL'si gerçekten bu YouTube videosuna ait mi? */
export function isYoutubeThumbnailForVideo(videoId: string, url: string | undefined | null): boolean {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return false;
  const t = normalizeYoutubeCoverUrl(url).toLowerCase();
  if (!t) return false;
  if (t.includes("ytimg.com") || t.includes("youtube.com/vi/") || t.includes("img.youtube.com")) {
    return t.includes(`/vi/${id.toLowerCase()}/`) || t.includes(`/vi/${id.toLowerCase}.`);
  }
  return true;
}

export function youtubeVideoCoverUrl(
  videoId: string,
  quality: "maxresdefault" | "hqdefault" | "mqdefault" | "sddefault" | "default" | "oardefault" | "hq720" = "hqdefault",
): string {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return "";
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
}

export function resolveVideoCoverUrl(row: Pick<VideoRow, "videoId" | "thumbnail" | "platform">): string {
  if (row.platform === "youtube") {
    const id = row.videoId.trim();
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return "";
    const stored = normalizeYoutubeCoverUrl(row.thumbnail);
    if (
      isUsableYoutubeCover(stored) &&
      !stored.includes("maxresdefault") &&
      !stored.includes("oardefault") &&
      isYoutubeThumbnailForVideo(id, stored)
    ) {
      return stored;
    }
    return youtubeVideoCoverUrl(id, "mqdefault") || youtubeVideoCoverUrl(id, "hqdefault");
  }
  const stored = normalizeYoutubeCoverUrl(row.thumbnail);
  return isUsableYoutubeCover(stored) ? stored : "";
}

export async function fetchYoutubePlaylistCover(playlistId: string): Promise<string> {
  const id = playlistId.trim();
  if (!id) return "";
  const rss = await fetchYoutubePlaylistRssPreview(id, 1).catch(() => []);
  const first = rss[0];
  if (!first) return "";
  if (first.thumbnail && isUsableYoutubeCover(first.thumbnail)) {
    return normalizeYoutubeCoverUrl(first.thumbnail);
  }
  return first.videoId ? youtubeVideoCoverUrl(first.videoId) : "";
}

export async function fetchYoutubeChannelCover(input: string): Promise<string> {
  const slug = (input || "").trim();
  if (!slug) return "";
  const meta = await scrapeYoutubeChannelHtmlMeta(slug).catch(() => null);
  const logo = normalizeYoutubeCoverUrl(meta?.logoUrl);
  return isUsableYoutubeCover(logo) ? logo : "";
}

export async function resolveYoutubeSourceCoverUrl(
  source: VideoSourceRow,
  dbVideoThumb?: string | null,
): Promise<string> {
  const stored = normalizeYoutubeCoverUrl(source.logoUrl);
  if (isUsableYoutubeCover(stored)) return stored;

  if (source.platform !== "youtube") {
    const db = normalizeYoutubeCoverUrl(dbVideoThumb);
    return isUsableYoutubeCover(db) ? db : "";
  }

  const liveVideoId =
    extractYoutubeVideoId(source.channelId) ?? extractYoutubeVideoId(source.url ?? "");
  if (
    liveVideoId &&
    (source.sourceType === "live" || source.isLive || source.sourceType === "video")
  ) {
    const storedLive = normalizeYoutubeCoverUrl(source.logoUrl);
    if (isUsableYoutubeCover(storedLive) && isYoutubeThumbnailForVideo(liveVideoId, storedLive)) {
      return storedLive;
    }
    return youtubeVideoCoverUrl(liveVideoId, "mqdefault") || youtubeVideoCoverUrl(liveVideoId);
  }

  if (source.sourceType === "video") {
    return youtubeVideoCoverUrl(source.channelId);
  }

  const db = normalizeYoutubeCoverUrl(dbVideoThumb);
  if (isUsableYoutubeCover(db)) return db;

  if (source.sourceType === "playlist" || source.sourceType === "podcast") {
    return fetchYoutubePlaylistCover(source.channelId);
  }

  if (source.sourceType === "channel" || source.sourceType === "live") {
    const input = (source.url && source.url.trim()) || source.channelId;
    const fromYt = await fetchYoutubeChannelCover(input);
    if (fromYt) return fromYt;
  }

  return "";
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
}

export type CoverBackfillStats = {
  sourcesChecked: number;
  sourcesUpdated: number;
  videosChecked: number;
  videosUpdated: number;
  errors: string[];
};

/** Eksik / bozuk kapakları YouTube'dan alıp DB'ye yazar */
export async function backfillYoutubeCovers(options?: {
  sourceIds?: number[];
  limit?: number;
  updateDb: (table: "sources" | "videos", id: number, coverUrl: string) => Promise<void>;
  loadSources: () => Promise<VideoSourceRow[]>;
  loadVideos: (sourceIds?: number[]) => Promise<VideoRow[]>;
  firstVideoThumbBySourceIds: (ids: number[]) => Promise<Map<number, string>>;
}): Promise<CoverBackfillStats> {
  const stats: CoverBackfillStats = {
    sourcesChecked: 0,
    sourcesUpdated: 0,
    videosChecked: 0,
    videosUpdated: 0,
    errors: [],
  };

  const limit = options?.limit ?? 500;
  let sources = await options!.loadSources();
  if (options?.sourceIds?.length) {
    const idSet = new Set(options.sourceIds);
    sources = sources.filter((s) => idSet.has(s.id));
  }
  sources = sources.slice(0, limit);

  const needThumbIds = sources.filter((s) => !isUsableYoutubeCover(s.logoUrl)).map((s) => s.id);
  const dbThumbs = await options!.firstVideoThumbBySourceIds(needThumbIds);

  await mapPool(sources, 6, async (source) => {
    stats.sourcesChecked++;
    if (isUsableYoutubeCover(source.logoUrl)) return;
    try {
      const cover = await resolveYoutubeSourceCoverUrl(source, dbThumbs.get(source.id));
      if (!cover) return;
      await options!.updateDb("sources", source.id, cover);
      stats.sourcesUpdated++;
    } catch (e) {
      stats.errors.push(`source:${source.id}:${e instanceof Error ? e.message : "hata"}`);
    }
  });

  let videos = await options!.loadVideos(options?.sourceIds);
  videos = videos.slice(0, limit * 20);

  await mapPool(videos, 12, async (video) => {
    stats.videosChecked++;
    if (video.platform !== "youtube") return;
    if (isUsableYoutubeCover(video.thumbnail)) return;
    const cover = resolveVideoCoverUrl(video);
    if (!cover) return;
    try {
      await options!.updateDb("videos", video.id, cover);
      stats.videosUpdated++;
    } catch (e) {
      stats.errors.push(`video:${video.id}:${e instanceof Error ? e.message : "hata"}`);
    }
  });

  return stats;
}
