import { and, desc, eq, or } from "drizzle-orm";
import { getYektubeDbForRead, videoSourcesTable } from "@workspace/db";
import { findChannelLiveVideos, buildTvLiveVideos, isLiveSourceRow } from "./yektubeLiveFeed.js";
import { logger } from "./logger.js";

const db = getYektubeDbForRead();

export type LiveStatusSnapshot = {
  tvLiveCount: number;
  channelLiveCount: number;
  totalLiveCount: number;
  liveVideoIds: string[];
  updatedAt: string;
};

let cache: { at: number; data: LiveStatusSnapshot } | null = null;
const CACHE_MS = 45_000;

export async function getLiveStatusSnapshot(force = false): Promise<LiveStatusSnapshot> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) {
    return cache.data;
  }

  try {
    const liveSources = await db
      .select()
      .from(videoSourcesTable)
      .where(
        and(
          eq(videoSourcesTable.active, true),
          or(eq(videoSourcesTable.isLive, true), eq(videoSourcesTable.sourceType, "live")),
        ),
      )
      .orderBy(desc(videoSourcesTable.videoCount));

    const tvLiveCount = liveSources.filter(isLiveSourceRow).length;

    let channelLiveVideos: Awaited<ReturnType<typeof findChannelLiveVideos>> = [];
    try {
      channelLiveVideos = await findChannelLiveVideos(16);
    } catch (err) {
      logger.warn({ err }, "[live-status] channel scan failed");
    }

    const tvVideos = buildTvLiveVideos(liveSources, []);
    const ids = new Set<string>();
    for (const v of [...tvVideos, ...channelLiveVideos]) {
      if (v.videoId) ids.add(v.videoId);
    }

    const data: LiveStatusSnapshot = {
      tvLiveCount,
      channelLiveCount: channelLiveVideos.length,
      totalLiveCount: ids.size,
      liveVideoIds: [...ids].slice(0, 48),
      updatedAt: new Date().toISOString(),
    };

    cache = { at: now, data };
    return data;
  } catch (err) {
    logger.error({ err }, "[live-status] snapshot failed");
    if (cache) return cache.data;
    return {
      tvLiveCount: 0,
      channelLiveCount: 0,
      totalLiveCount: 0,
      liveVideoIds: [],
      updatedAt: new Date().toISOString(),
    };
  }
}
