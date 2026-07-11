import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { VideoSourceRow, VideoRow } from "@workspace/db";
import { getYektubeDbForRead, videoSourcesTable, videosTable } from "@workspace/db";
import { serializeVideo } from "./serializers.js";
import { fetchYoutubeVideoSnippetMap } from "./youtubeVideoMeta.js";
import { resolveVideoCoverUrl } from "./youtubeCoverImages.js";
import { resolveChannelLiveBroadcastVideoId } from "./youtubeChannelLiveBroadcast.js";

const db = getYektubeDbForRead();

export function isYoutubeVideoId(id: string): boolean {
  const t = id.trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(t) && !t.startsWith("UC");
}

export function isLiveSourceRow(row: VideoSourceRow): boolean {
  return Boolean(row.isLive || row.sourceType === "live");
}

/** TV kaynağı için oynatılacak YouTube video ID */
export function liveVideoIdFromSource(row: VideoSourceRow): string | null {
  const cid = row.channelId?.trim() ?? "";
  if (!cid) return null;
  if (row.sourceType === "video" || isYoutubeVideoId(cid)) return cid;
  return null;
}

function syntheticLiveVideo(row: VideoSourceRow, videoId: string): ReturnType<typeof serializeVideo> {
  const thumb =
    row.logoUrl?.trim() ||
    resolveVideoCoverUrl({ videoId, thumbnail: null, platform: "youtube" }) ||
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  return {
    id: -row.id,
    sourceId: row.id,
    platform: row.platform,
    videoId,
    title: row.name,
    description: null,
    thumbnail: thumb,
    channelName: row.name,
    sourceName: row.name,
    channelId: row.channelId,
    publishedAt: null,
    duration: null,
    categorySlug: row.categorySlug,
    isFeatured: false,
    isHeadline: false,
    isStory: false,
    sortOrder: 0,
    active: true,
    embedAllowed: true,
    streamUrl: undefined,
    createdAt: new Date().toISOString(),
  };
}

/** Kanallardan şu an canlı/upcoming yayın yapan videolar (YouTube meta) */
export async function findChannelLiveVideos(limitChannels = 24): Promise<ReturnType<typeof serializeVideo>[]> {
  const channels = await db
    .select()
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.active, true),
        eq(videoSourcesTable.sourceType, "channel"),
        eq(videoSourcesTable.isLive, false),
      ),
    )
    .orderBy(desc(videoSourcesTable.videoCount))
    .limit(limitChannels);

  if (channels.length === 0) return [];

  const channelIds = channels.map((c) => c.id);
  const latestRows = await db
    .select({
      sourceId: videosTable.sourceId,
      maxId: sql<number>`max(${videosTable.id})`.as("max_id"),
    })
    .from(videosTable)
    .where(and(eq(videosTable.active, true), inArray(videosTable.sourceId, channelIds)))
    .groupBy(videosTable.sourceId);

  const videoDbIds = latestRows.map((r) => r.maxId).filter((id) => id != null);
  if (videoDbIds.length === 0) return [];

  const videoRows = await db
    .select()
    .from(videosTable)
    .where(inArray(videosTable.id, videoDbIds));

  const channelById = new Map(channels.map((c) => [c.id, c]));
  const metaMap = await fetchYoutubeVideoSnippetMap(videoRows.map((v) => v.videoId));

  const out: ReturnType<typeof serializeVideo>[] = [];
  for (const row of videoRows) {
    if (row.sourceId == null) continue;
    const meta = metaMap.get(row.videoId);
    const lbc = meta?.liveBroadcastContent;
    if (lbc !== "live" && lbc !== "upcoming") continue;
    const ch = channelById.get(row.sourceId);
    const merged: VideoRow = {
      ...row,
      title: meta?.title?.trim() || row.title,
      thumbnail: meta?.thumbnail || row.thumbnail,
    };
    const serialized = serializeVideo(merged);
    out.push({
      ...serialized,
      channelName: ch?.name ?? serialized.channelName,
    });
  }

  return out;
}

export function buildTvLiveVideos(
  liveSources: VideoSourceRow[],
  dbVideos: ReturnType<typeof serializeVideo>[],
): ReturnType<typeof serializeVideo>[] {
  const seen = new Set<string>();
  const out: ReturnType<typeof serializeVideo>[] = [];

  for (const v of dbVideos) {
    if (!v.videoId || seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    out.push(v);
  }

  for (const row of liveSources) {
    const vid = liveVideoIdFromSource(row);
    if (!vid || seen.has(vid)) continue;
    seen.add(vid);
    out.push(syntheticLiveVideo(row, vid));
  }

  return out;
}

/** Eksik veya bitmiş yayın ID'lerini YouTube API ile günceller */
export async function enrichTvLiveVideos(
  liveSources: VideoSourceRow[],
  dbVideos: ReturnType<typeof serializeVideo>[],
): Promise<ReturnType<typeof serializeVideo>[]> {
  const base = buildTvLiveVideos(liveSources, dbVideos);
  const videoBySource = new Map<number, string>();
  for (const v of base) {
    if (v.sourceId != null && v.videoId) videoBySource.set(v.sourceId, v.videoId);
  }

  const toResolve: VideoSourceRow[] = [];
  for (const row of liveSources) {
    const current = videoBySource.get(row.id) ?? liveVideoIdFromSource(row);
    if (!current) {
      toResolve.push(row);
      continue;
    }
    videoBySource.set(row.id, current);
  }

  const verifyIds = [...new Set(videoBySource.values())];
  if (verifyIds.length > 0) {
    const metaMap = await fetchYoutubeVideoSnippetMap(verifyIds);
    for (const row of liveSources) {
      const current = videoBySource.get(row.id);
      if (!current) continue;
      const lbc = metaMap.get(current)?.liveBroadcastContent;
      if (lbc !== "live" && lbc !== "upcoming") toResolve.push(row);
    }
  }

  const uniqueResolve = [...new Map(toResolve.map((r) => [r.id, r])).values()].slice(0, 32);
  const refreshed = new Map<number, string>();
  await Promise.all(
    uniqueResolve.map(async (row) => {
      try {
        const { videoId } = await resolveChannelLiveBroadcastVideoId(row);
        if (videoId) refreshed.set(row.id, videoId);
      } catch {
        /* tek kanal hatası feed'i düşürmez */
      }
    }),
  );

  const seen = new Set<string>();
  const out: ReturnType<typeof serializeVideo>[] = [];

  for (const row of liveSources) {
    const videoId = refreshed.get(row.id) ?? videoBySource.get(row.id) ?? liveVideoIdFromSource(row);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    out.push(syntheticLiveVideo(row, videoId));
  }

  for (const v of base) {
    if (v.sourceId == null || seen.has(v.videoId)) continue;
    if (liveSources.some((s) => s.id === v.sourceId)) continue;
    seen.add(v.videoId);
    out.push(v);
  }

  return out;
}
