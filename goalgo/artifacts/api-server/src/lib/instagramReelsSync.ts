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
  extractInstagramReelShortcodes,
  fetchSocialHtml,
  formatSocialSeoDescription,
  parseInstagramInput,
  scrapeInstagramReelMeta,
  type ScrapedSocialVideo,
} from "./socialVideoMeta.js";

const db = getYektubeDbForRead();
const PROFILE_REEL_LIMIT = 50;

async function upsertInstagramReel(source: VideoSourceRow, meta: ScrapedSocialVideo): Promise<void> {
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
    platform: "instagram",
    videoId,
    ...patch,
  });
}

async function listProfileReels(source: VideoSourceRow): Promise<ScrapedSocialVideo[]> {
  const parsed = parseInstagramInput(source.url?.trim() || source.channelId.trim() || source.name);
  if (!parsed || parsed.kind !== "profile") return [];

  let html = "";
  try {
    html = await fetchSocialHtml(parsed.url);
  } catch (err) {
    logger.warn({ err, sourceId: source.id, url: parsed.url }, "[instagramReelsSync] profil HTML alınamadı");
    return [];
  }

  const shortcodes = extractInstagramReelShortcodes(html, PROFILE_REEL_LIMIT);
  const out: ScrapedSocialVideo[] = [];
  for (const code of shortcodes) {
    const meta = await scrapeInstagramReelMeta(code);
    if (meta) out.push(meta);
  }
  return out;
}

export async function syncInstagramSourceToDb(
  source: VideoSourceRow,
): Promise<{ upserted: number; warning?: string }> {
  try {
    const parsed = parseInstagramInput(source.url?.trim() || source.channelId.trim() || source.name);
    if (!parsed) {
      return { upserted: 0, warning: "Instagram URL veya kullanıcı adı çözülemedi" };
    }

    if (source.sourceType === "video" || parsed.kind === "reel") {
      const shortcode = parsed.kind === "reel" ? parsed.id : parseInstagramInput(source.channelId)?.id;
      if (!shortcode) {
        return { upserted: 0, warning: "Instagram Reel shortcode bulunamadı" };
      }
      const meta = await scrapeInstagramReelMeta(shortcode);
      if (!meta) {
        return { upserted: 0, warning: "Instagram Reels meta verisi alınamadı" };
      }
      await upsertInstagramReel(source, meta);
      await dualWriteYektubeUpdate(videoSourcesTable, { videoCount: 1 }, eq(videoSourcesTable.id, source.id));
      return { upserted: 1 };
    }

    const list = await listProfileReels(source);
    if (list.length === 0) {
      return {
        upserted: 0,
        warning: `@${parsed.handle ?? parsed.id} profilinden Reels bulunamadı (gizli hesap veya erişim engeli olabilir)`,
      };
    }

    let upserted = 0;
    for (const meta of list) {
      await upsertInstagramReel(source, meta);
      upserted += 1;
    }
    await dualWriteYektubeUpdate(videoSourcesTable, { videoCount: upserted }, eq(videoSourcesTable.id, source.id));
    logger.info({ sourceId: source.id, upserted, handle: parsed.handle }, "[instagramReelsSync] tamam");
    return { upserted };
  } catch (err) {
    logger.warn({ err, sourceId: source.id }, "[instagramReelsSync] hata");
    return {
      upserted: 0,
      warning: err instanceof Error ? err.message : "Instagram senkron hatası",
    };
  }
}
