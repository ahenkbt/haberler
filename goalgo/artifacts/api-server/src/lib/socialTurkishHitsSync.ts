import { and, eq } from "drizzle-orm";
import {
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
  type VideoSourceRow,
} from "@workspace/db";
import {
  SOCIAL_HIT_SOURCE_KEYS,
  TURKISH_INSTAGRAM_HIT_ACCOUNTS,
  TURKISH_SOCIAL_HASHTAGS,
  TURKISH_TIKTOK_HIT_ACCOUNTS,
  type SocialHitPreset,
} from "../data/socialTurkishHitPresets.js";
import { logger } from "./logger.js";
import {
  engagementScore,
  formatSocialSeoDescription,
  scrapeInstagramHashtagReels,
  scrapeInstagramProfileReels,
  scrapeTiktokHashtagVideos,
  scrapeTiktokProfileVideos,
  type ScrapedSocialVideo,
  type SocialPlatform,
} from "./socialVideoMeta.js";
import { isLikelyTurkish, turkishContentScore } from "./turkishContent.js";
import { scheduleSyncVideoSource } from "./youtubeVideoSync.js";

const db = getYektubeDbForRead();

export type TurkishSocialHitsResult = {
  instagram: { scraped: number; upserted: number; sourcesCreated: number };
  tiktok: { scraped: number; upserted: number; sourcesCreated: number };
  warnings: string[];
};

export type TurkishSocialHitsOptions = {
  perProfileLimit?: number;
  perHashtagLimit?: number;
  maxPerPlatform?: number;
  importPresetSources?: boolean;
};

const DEFAULT_OPTS: Required<TurkishSocialHitsOptions> = {
  perProfileLimit: 12,
  perHashtagLimit: 15,
  maxPerPlatform: 120,
  importPresetSources: true,
};

function resolveOpts(opts?: TurkishSocialHitsOptions): Required<TurkishSocialHitsOptions> {
  return { ...DEFAULT_OPTS, ...opts };
}

function passesTurkishFilter(meta: ScrapedSocialVideo, fromTrustedAccount: boolean): boolean {
  if (fromTrustedAccount) return true;
  if (turkishContentScore(meta.title, meta.description, meta.authorName) > 0) return true;
  return isLikelyTurkish(meta.title) || isLikelyTurkish(meta.description) || isLikelyTurkish(meta.authorName);
}

async function ensureHitSource(platform: SocialPlatform): Promise<VideoSourceRow> {
  const channelId =
    platform === "instagram" ? SOCIAL_HIT_SOURCE_KEYS.instagram : SOCIAL_HIT_SOURCE_KEYS.tiktok;
  const [existing] = await db
    .select()
    .from(videoSourcesTable)
    .where(and(eq(videoSourcesTable.platform, platform), eq(videoSourcesTable.channelId, channelId)))
    .limit(1);
  if (existing) return existing;

  const name = platform === "instagram" ? "Instagram TR Hit" : "TikTok TR Hit";
  const inserted = await dualWriteYektubeInsert(videoSourcesTable, {
    name,
    platform,
    sourceType: "channel",
    channelId,
    url: platform === "instagram" ? "https://www.instagram.com/explore/tags/turkiye/" : "https://www.tiktok.com/tag/turkiye",
    categorySlug: "eglence",
    active: true,
    isLive: false,
    useYoutubeApi: false,
  });
  const row = inserted[0];
  if (!row) throw new Error(`${name} kaynağı oluşturulamadı`);
  return row;
}

async function upsertHitVideo(
  source: VideoSourceRow,
  platform: SocialPlatform,
  meta: ScrapedSocialVideo,
  categorySlug: string,
): Promise<boolean> {
  const videoId = meta.videoId.trim();
  const title = meta.title.trim();
  if (!videoId || !title) return false;

  const [existing] = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .where(and(eq(videosTable.platform, platform), eq(videosTable.videoId, videoId)))
    .limit(1);

  const patch = {
    sourceId: source.id,
    title,
    description: meta.sourceUrl,
    seoDescription: formatSocialSeoDescription(meta),
    thumbnail: meta.thumbnail ?? null,
    categorySlug,
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
    return true;
  }

  await dualWriteYektubeInsert(videosTable, {
    platform,
    videoId,
    ...patch,
  });
  return true;
}

async function collectInstagramHits(
  opts: Required<TurkishSocialHitsOptions>,
): Promise<Array<ScrapedSocialVideo & { trusted: boolean; categorySlug: string }>> {
  const pool = new Map<string, ScrapedSocialVideo & { trusted: boolean; categorySlug: string }>();

  for (const account of TURKISH_INSTAGRAM_HIT_ACCOUNTS) {
    const list = await scrapeInstagramProfileReels(account.handle, opts.perProfileLimit);
    for (const meta of list) {
      pool.set(meta.videoId, { ...meta, trusted: true, categorySlug: account.categorySlug });
    }
    await delay(250);
  }

  for (const tag of TURKISH_SOCIAL_HASHTAGS) {
    const list = await scrapeInstagramHashtagReels(tag, opts.perHashtagLimit);
    for (const meta of list) {
      if (!pool.has(meta.videoId)) {
        pool.set(meta.videoId, { ...meta, trusted: false, categorySlug: "eglence" });
      }
    }
    await delay(300);
  }

  return [...pool.values()]
    .filter((m) => passesTurkishFilter(m, m.trusted))
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, opts.maxPerPlatform);
}

async function collectTiktokHits(opts: Required<TurkishSocialHitsOptions>): Promise<
  Array<ScrapedSocialVideo & { trusted: boolean; categorySlug: string }>
> {
  const pool = new Map<string, ScrapedSocialVideo & { trusted: boolean; categorySlug: string }>();

  for (const account of TURKISH_TIKTOK_HIT_ACCOUNTS) {
    const list = await scrapeTiktokProfileVideos(account.handle, opts.perProfileLimit);
    for (const meta of list) {
      pool.set(meta.videoId, { ...meta, trusted: true, categorySlug: account.categorySlug });
    }
    await delay(250);
  }

  for (const tag of TURKISH_SOCIAL_HASHTAGS) {
    const list = await scrapeTiktokHashtagVideos(tag, opts.perHashtagLimit);
    for (const meta of list) {
      if (!pool.has(meta.videoId)) {
        pool.set(meta.videoId, { ...meta, trusted: false, categorySlug: "eglence" });
      }
    }
    await delay(300);
  }

  return [...pool.values()]
    .filter((m) => passesTurkishFilter(m, m.trusted))
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, opts.maxPerPlatform);
}

async function ensurePresetSource(
  platform: SocialPlatform,
  preset: SocialHitPreset,
): Promise<{ created: boolean; sourceId: number }> {
  const url =
    platform === "instagram"
      ? `https://www.instagram.com/${preset.handle}/`
      : `https://www.tiktok.com/@${preset.handle}`;

  const [existing] = await db
    .select({ id: videoSourcesTable.id })
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.platform, platform),
        eq(videoSourcesTable.channelId, preset.handle),
      ),
    )
    .limit(1);

  if (existing) return { created: false, sourceId: existing.id };

  const inserted = await dualWriteYektubeInsert(videoSourcesTable, {
    name: preset.name,
    platform,
    sourceType: "channel",
    channelId: preset.handle,
    url,
    categorySlug: preset.categorySlug,
    active: true,
    isLive: false,
    useYoutubeApi: false,
  });
  const row = inserted[0];
  if (!row) throw new Error(`${preset.name} kaynağı oluşturulamadı`);
  scheduleSyncVideoSource(row.id, { sourceName: row.name });
  return { created: true, sourceId: row.id };
}

async function importPresetSources(platform: SocialPlatform): Promise<number> {
  const presets =
    platform === "instagram" ? TURKISH_INSTAGRAM_HIT_ACCOUNTS : TURKISH_TIKTOK_HIT_ACCOUNTS;
  let created = 0;
  for (const preset of presets) {
    try {
      const r = await ensurePresetSource(platform, preset);
      if (r.created) created += 1;
    } catch (err) {
      logger.warn({ err, platform, handle: preset.handle }, "[socialTurkishHitsSync] preset kaynak hatası");
    }
    await delay(80);
  }
  return created;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncTurkishSocialHits(
  opts?: TurkishSocialHitsOptions,
): Promise<TurkishSocialHitsResult> {
  const options = resolveOpts(opts);
  const warnings: string[] = [];
  const result: TurkishSocialHitsResult = {
    instagram: { scraped: 0, upserted: 0, sourcesCreated: 0 },
    tiktok: { scraped: 0, upserted: 0, sourcesCreated: 0 },
    warnings,
  };

  try {
    if (options.importPresetSources) {
      result.instagram.sourcesCreated = await importPresetSources("instagram");
      result.tiktok.sourcesCreated = await importPresetSources("tiktok");
    }

    const igSource = await ensureHitSource("instagram");
    const igHits = await collectInstagramHits(options);
    result.instagram.scraped = igHits.length;
    for (const meta of igHits) {
      if (await upsertHitVideo(igSource, "instagram", meta, meta.categorySlug)) {
        result.instagram.upserted += 1;
      }
    }
    await dualWriteYektubeUpdate(
      videoSourcesTable,
      { videoCount: result.instagram.upserted },
      eq(videoSourcesTable.id, igSource.id),
    );
  } catch (err) {
    warnings.push(`Instagram: ${err instanceof Error ? err.message : "hata"}`);
    logger.warn({ err }, "[socialTurkishHitsSync] Instagram hit kazıma hatası");
  }

  try {
    const ttSource = await ensureHitSource("tiktok");
    const ttHits = await collectTiktokHits(options);
    result.tiktok.scraped = ttHits.length;
    for (const meta of ttHits) {
      if (await upsertHitVideo(ttSource, "tiktok", meta, meta.categorySlug)) {
        result.tiktok.upserted += 1;
      }
    }
    await dualWriteYektubeUpdate(
      videoSourcesTable,
      { videoCount: result.tiktok.upserted },
      eq(videoSourcesTable.id, ttSource.id),
    );
  } catch (err) {
    warnings.push(`TikTok: ${err instanceof Error ? err.message : "hata"}`);
    logger.warn({ err }, "[socialTurkishHitsSync] TikTok hit kazıma hatası");
  }

  logger.info(result, "[socialTurkishHitsSync] Türkçe hit toplu kazıma tamam");
  return result;
}

let turkishHitsRunning = false;

export function isTurkishSocialHitsRunning(): boolean {
  return turkishHitsRunning;
}

export function scheduleTurkishSocialHits(opts?: TurkishSocialHitsOptions): boolean {
  if (turkishHitsRunning) return false;
  turkishHitsRunning = true;
  setImmediate(async () => {
    try {
      await syncTurkishSocialHits(opts);
    } catch (err) {
      logger.error({ err }, "[socialTurkishHitsSync] arka plan hatası");
    } finally {
      turkishHitsRunning = false;
    }
  });
  return true;
}

/** Hazır TR hesap listesi — admin önizleme */
export function listTurkishSocialHitPresets() {
  return {
    instagram: TURKISH_INSTAGRAM_HIT_ACCOUNTS,
    tiktok: TURKISH_TIKTOK_HIT_ACCOUNTS,
    hashtags: [...TURKISH_SOCIAL_HASHTAGS],
  };
}
