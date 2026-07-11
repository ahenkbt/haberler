import { and, eq } from "drizzle-orm";
import {
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
  type VideoSourceRow,
} from "@workspace/db";
import { logger } from "./logger.js";

const db = getYektubeDbForRead();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type DmVideo = {
  id?: string;
  title?: string;
  thumbnail_360_url?: string;
  created_time?: number;
};

function resolveDailymotionUser(source: VideoSourceRow): string {
  const raw = (source.url?.trim() || source.channelId?.trim() || source.name?.trim() || "").replace(
    /^https?:\/\/(www\.)?dailymotion\.com\//i,
    "",
  );
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "video" && parts[1]) return parts[1];
  if (parts[0]?.startsWith("@")) return parts[0].slice(1);
  if (parts[0] === "user" && parts[1]) return parts[1];
  return raw.replace(/^@+/, "").split(/[/?#]/)[0] ?? "";
}

function resolveDailymotionVideoId(source: VideoSourceRow): string {
  const raw = (source.channelId?.trim() || source.url?.trim() || "").replace(
    /^https?:\/\/(www\.)?dailymotion\.com\/video\//i,
    "",
  );
  return raw.split(/[/?#]/)[0] ?? "";
}

async function fetchDailymotionUserVideos(user: string, limit = 100): Promise<DmVideo[]> {
  if (!user) return [];
  const url = new URL(`https://api.dailymotion.com/user/${encodeURIComponent(user)}/videos`);
  url.searchParams.set("fields", "id,title,thumbnail_360_url,created_time");
  url.searchParams.set("limit", String(Math.min(limit, 100)));
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { list?: DmVideo[] };
  return data.list ?? [];
}

async function fetchDailymotionVideoMeta(videoId: string): Promise<DmVideo | null> {
  if (!videoId) return null;
  const url = new URL(`https://api.dailymotion.com/video/${encodeURIComponent(videoId)}`);
  url.searchParams.set("fields", "id,title,thumbnail_360_url,created_time");
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as DmVideo;
}

async function upsertDailymotionVideo(source: VideoSourceRow, v: DmVideo): Promise<void> {
  const videoId = v.id?.trim();
  const title = v.title?.trim();
  if (!videoId || !title) return;
  const thumb = v.thumbnail_360_url?.trim() || `https://www.dailymotion.com/thumbnail/video/${videoId}`;
  const publishedAt = v.created_time ? new Date(v.created_time * 1000).toISOString() : null;

  const [existing] = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, source.id), eq(videosTable.videoId, videoId)))
    .limit(1);

  const patch = {
    title,
    thumbnail: thumb,
    categorySlug: source.categorySlug,
    channelName: source.name,
    channelId: source.channelId,
    publishedAt,
    active: true,
    embedAllowed: true,
  };

  if (existing) {
    await dualWriteYektubeUpdate(videosTable, patch, eq(videosTable.id, existing.id));
    return;
  }

  await dualWriteYektubeInsert(videosTable, {
    sourceId: source.id,
    platform: "dailymotion",
    videoId,
    title,
    description: `https://www.dailymotion.com/video/${videoId}`,
    thumbnail: thumb,
    channelName: source.name,
    channelId: source.channelId,
    publishedAt,
    duration: null,
    categorySlug: source.categorySlug,
    active: true,
    embedAllowed: true,
  });
}

export async function syncDailymotionSourceToDb(
  source: VideoSourceRow,
): Promise<{ upserted: number; warning?: string }> {
  try {
    if (source.sourceType === "video") {
      const vid = resolveDailymotionVideoId(source);
      const meta = await fetchDailymotionVideoMeta(vid);
      if (!meta?.id) {
        return { upserted: 0, warning: "Dailymotion videosu bulunamadı" };
      }
      await upsertDailymotionVideo(source, meta);
      await dualWriteYektubeUpdate(videoSourcesTable, { videoCount: 1 }, eq(videoSourcesTable.id, source.id));
      return { upserted: 1 };
    }

    const user = resolveDailymotionUser(source);
    const list = await fetchDailymotionUserVideos(user, 100);
    if (list.length === 0) {
      return {
        upserted: 0,
        warning: user
          ? `Dailymotion kullanıcı/kanal "${user}" için video bulunamadı`
          : "Dailymotion kanal kimliği çözülemedi",
      };
    }

    let upserted = 0;
    for (const v of list) {
      await upsertDailymotionVideo(source, v);
      upserted += 1;
    }
    await dualWriteYektubeUpdate(videoSourcesTable, { videoCount: upserted }, eq(videoSourcesTable.id, source.id));
    logger.info({ sourceId: source.id, upserted, user }, "[dailymotionVideoSync] tamam");
    return { upserted };
  } catch (err) {
    logger.warn({ err, sourceId: source.id }, "[dailymotionVideoSync] hata");
    return {
      upserted: 0,
      warning: err instanceof Error ? err.message : "Dailymotion senkron hatası",
    };
  }
}
