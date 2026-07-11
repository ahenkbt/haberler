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
import {
  extractTiktokVideoIds,
  fetchSocialHtml,
  formatSocialSeoDescription,
  parseTiktokInput,
  resolveTiktokCanonicalUrl,
  scrapeTiktokVideoMeta,
  type ScrapedSocialVideo,
} from "./socialVideoMeta.js";

const db = getYektubeDbForRead();
const PROFILE_VIDEO_LIMIT = 50;

async function upsertTiktokVideo(source: VideoSourceRow, meta: ScrapedSocialVideo): Promise<void> {
  const videoId = meta.videoId.trim();
  const title = meta.title.trim();
  if (!videoId || !title) return;

  const [existing] = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, source.id), eq(videosTable.videoId, videoId)))
    .limit(1);

  const patch = {
    title,
    description: meta.sourceUrl,
    seoDescription: formatSocialSeoDescription(meta),
    thumbnail: meta.thumbnail ?? null,
    categorySlug: source.categorySlug,
    channelName: meta.authorName ?? source.name,
    channelId: meta.authorHandle ?? source.channelId,
    publishedAt: meta.publishedAt ?? null,
    duration: meta.duration ?? null,
    active: true,
    embedAllowed: true,
    isStory: true,
  };

  if (existing) {
    await dualWriteYektubeUpdate(videosTable, patch, eq(videosTable.id, existing.id));
    return;
  }

  await dualWriteYektubeInsert(videosTable, {
    sourceId: source.id,
    platform: "tiktok",
    videoId,
    ...patch,
  });
}

async function listProfileVideos(source: VideoSourceRow): Promise<ScrapedSocialVideo[]> {
  const parsed = parseTiktokInput(source.url?.trim() || source.channelId.trim() || source.name);
  if (!parsed || parsed.kind !== "profile") return [];

  let html = "";
  try {
    html = await fetchSocialHtml(parsed.url);
  } catch (err) {
    logger.warn({ err, sourceId: source.id, url: parsed.url }, "[tiktokVideoSync] profil HTML alınamadı");
    return [];
  }

  const videoIds = extractTiktokVideoIds(html, PROFILE_VIDEO_LIMIT);
  const handle = parsed.handle ?? parsed.id;
  const out: ScrapedSocialVideo[] = [];
  for (const id of videoIds) {
    const sourceUrl = `https://www.tiktok.com/@${handle}/video/${id}`;
    const meta = await scrapeTiktokVideoMeta({ videoId: id, sourceUrl });
    if (meta) out.push(meta);
  }
  return out;
}

export async function syncTiktokSourceToDb(
  source: VideoSourceRow,
): Promise<{ upserted: number; warning?: string }> {
  try {
    const parsed = parseTiktokInput(source.url?.trim() || source.channelId.trim() || source.name);
    if (!parsed) {
      return { upserted: 0, warning: "TikTok URL veya kullanıcı adı çözülemedi" };
    }

    if (source.sourceType === "video" || parsed.kind === "video") {
      let sourceUrl = source.url?.trim() || parsed.url;
      sourceUrl = await resolveTiktokCanonicalUrl(sourceUrl);
      const videoId =
        sourceUrl.match(/\/video\/(\d+)/)?.[1] ??
        (parsed.kind === "video" ? parsed.id : source.channelId.trim());
      if (!videoId) {
        return { upserted: 0, warning: "TikTok video ID bulunamadı" };
      }
      const meta = await scrapeTiktokVideoMeta({ videoId, sourceUrl });
      if (!meta) {
        return { upserted: 0, warning: "TikTok video meta verisi alınamadı" };
      }
      await upsertTiktokVideo(source, meta);
      await dualWriteYektubeUpdate(videoSourcesTable, { videoCount: 1 }, eq(videoSourcesTable.id, source.id));
      return { upserted: 1 };
    }

    const list = await listProfileVideos(source);
    if (list.length === 0) {
      return {
        upserted: 0,
        warning: `@${parsed.handle ?? parsed.id} profilinden video bulunamadı (gizli hesap veya erişim engeli olabilir)`,
      };
    }

    let upserted = 0;
    for (const meta of list) {
      await upsertTiktokVideo(source, meta);
      upserted += 1;
    }
    await dualWriteYektubeUpdate(videoSourcesTable, { videoCount: upserted }, eq(videoSourcesTable.id, source.id));
    logger.info({ sourceId: source.id, upserted, handle: parsed.handle }, "[tiktokVideoSync] tamam");
    return { upserted };
  } catch (err) {
    logger.warn({ err, sourceId: source.id }, "[tiktokVideoSync] hata");
    return {
      upserted: 0,
      warning: err instanceof Error ? err.message : "TikTok senkron hatası",
    };
  }
}
