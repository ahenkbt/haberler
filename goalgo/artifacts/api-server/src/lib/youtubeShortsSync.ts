import { and, eq, inArray } from "drizzle-orm";
import {
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
  type VideoSourceRow,
} from "@workspace/db";
import { logger } from "./logger.js";
import { fetchYoutubeEmbedAllowedMap } from "./youtubeEmbedCheck.js";
import {
  isUsableYoutubeCover,
  normalizeYoutubeCoverUrl,
  youtubeVideoCoverUrl,
} from "./youtubeCoverImages.js";
import { resolveYoutubeUcChannelId, filterExistingYoutubeVideoIds } from "./youtubeVideoSync.js";
import { scrapeYoutubeChannelShorts, scrapeYoutubeTrendingShorts } from "./youtubeChannelShorts.js";
import { hideEmbedBlockedVideosByIds } from "./videoEmbeddable.js";
import { enrichAndClassifySourceVideos } from "./youtubeVideoMeta.js";

const db = getYektubeDbForRead();

export type ShortsSyncResult = {
  channels: number;
  upserted: number;
  trendingMarked: number;
  errors: number;
};

async function upsertShortRow(
  source: VideoSourceRow,
  entry: { videoId: string; title: string; publishedAt?: string; thumbnail?: string },
  embedAllowed = true,
): Promise<boolean> {
  const thumbRaw = entry.thumbnail || "";
  const thumb = isUsableYoutubeCover(thumbRaw)
    ? normalizeYoutubeCoverUrl(thumbRaw)
    : youtubeVideoCoverUrl(entry.videoId);

  const [existing] = await db
    .select({ id: videosTable.id, sourceId: videosTable.sourceId })
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, source.id), eq(videosTable.videoId, entry.videoId)))
    .limit(1);

  let row = existing;
  if (!row) {
    const [global] = await db
      .select({ id: videosTable.id, sourceId: videosTable.sourceId })
      .from(videosTable)
      .where(eq(videosTable.videoId, entry.videoId))
      .limit(1);
    row = global;
  }

  if (row) {
    await dualWriteYektubeUpdate(
      videosTable,
      {
        title: entry.title,
        thumbnail: thumb,
        categorySlug: source.categorySlug,
        channelName: source.name,
        channelId: source.channelId,
        publishedAt: entry.publishedAt || undefined,
        active: true,
        embedAllowed,
        isStory: true,
        ...(row.sourceId == null ? { sourceId: source.id } : {}),
      },
      eq(videosTable.id, row.id),
    );
    return true;
  }

  await dualWriteYektubeInsert(videosTable, {
    sourceId: source.id,
    platform: source.platform,
    videoId: entry.videoId,
    title: entry.title,
    description: null,
    thumbnail: thumb,
    channelName: source.name,
    channelId: source.channelId,
    publishedAt: entry.publishedAt || null,
    duration: null,
    categorySlug: source.categorySlug,
    active: true,
    embedAllowed,
    isStory: true,
  });
  return true;
}

export async function syncChannelShortsToDb(sourceId: number, limit = 40): Promise<{ upserted: number }> {
  const [source] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, sourceId));
  if (!source || source.platform !== "youtube") return { upserted: 0 };
  if (source.sourceType !== "channel" && source.sourceType !== "live") return { upserted: 0 };

  const input = (source.url && source.url.trim()) || source.channelId;
  await resolveYoutubeUcChannelId(source).catch(() => null);

  const entries = await scrapeYoutubeChannelShorts(input, limit);
  if (entries.length === 0) return { upserted: 0 };

  const existingOnYoutube = await filterExistingYoutubeVideoIds(entries.map((e) => e.videoId));
  const embedMap = await fetchYoutubeEmbedAllowedMap(entries.map((e) => e.videoId));
  let upserted = 0;
  for (const e of entries) {
    if (!existingOnYoutube.has(e.videoId)) {
      await dualWriteYektubeUpdate(
        videosTable,
        { active: false },
        and(eq(videosTable.sourceId, source.id), eq(videosTable.videoId, e.videoId)),
      );
      continue;
    }
    const allowed = embedMap.get(e.videoId) !== false;
    if (!allowed) await hideEmbedBlockedVideosByIds([e.videoId]);
    if (await upsertShortRow(source, e, allowed)) upserted++;
  }

  if (upserted > 0) {
    await enrichAndClassifySourceVideos(
      sourceId,
      entries.map((e) => e.videoId),
    ).catch((err) => logger.warn({ err, sourceId }, "[youtubeShortsSync] meta zenginleştirme"));
  }

  return { upserted };
}

/** Trending shorts — DB'de varsa isStory işaretle */
async function markTrendingShortsInDb(limit = 30): Promise<number> {
  const trending = await scrapeYoutubeTrendingShorts(limit);
  if (trending.length === 0) return 0;

  const ids = trending.map((t) => t.videoId);
  const rows = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .where(and(eq(videosTable.active, true), inArray(videosTable.videoId, ids)));

  let marked = 0;
  for (const row of rows) {
    await dualWriteYektubeUpdate(videosTable, { isStory: true }, eq(videosTable.id, row.id));
    marked++;
  }
  return marked;
}

let shortsSyncRunning = false;

export function isShortsSyncRunning(): boolean {
  return shortsSyncRunning;
}

export async function syncAllChannelShorts(options?: { includeTrending?: boolean }): Promise<ShortsSyncResult> {
  const channels = await db
    .select()
    .from(videoSourcesTable)
    .where(and(eq(videoSourcesTable.active, true), eq(videoSourcesTable.platform, "youtube")));

  const targets = channels.filter((s) => s.sourceType === "channel" && !s.isLive);

  let upserted = 0;
  let errors = 0;

  for (const row of targets) {
    try {
      const r = await syncChannelShortsToDb(row.id);
      upserted += r.upserted;
    } catch (err) {
      errors++;
      logger.warn({ err, sourceId: row.id }, "[youtubeShortsSync] kanal shorts hatası");
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  let trendingMarked = 0;
  if (options?.includeTrending !== false) {
    try {
      trendingMarked = await markTrendingShortsInDb(40);
    } catch (err) {
      logger.warn({ err }, "[youtubeShortsSync] trending shorts hatası");
    }
  }

  logger.info({ channels: targets.length, upserted, trendingMarked, errors }, "[youtubeShortsSync] tamam");
  return { channels: targets.length, upserted, trendingMarked, errors };
}

export function scheduleSyncAllShorts(): boolean {
  if (shortsSyncRunning) return false;
  shortsSyncRunning = true;
  setImmediate(async () => {
    try {
      await syncAllChannelShorts();
    } catch (err) {
      logger.error({ err }, "[youtubeShortsSync] toplu shorts senkronu başarısız");
    } finally {
      shortsSyncRunning = false;
    }
  });
  return true;
}
