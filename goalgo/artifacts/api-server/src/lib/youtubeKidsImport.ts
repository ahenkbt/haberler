import { and, desc, eq, or } from "drizzle-orm";
import {
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
} from "@workspace/db";
import type { VideoTvPreset } from "../data/videoTvPresets.js";
import {
  getKidsChannelPresets,
  KIDS_CATEGORY_IMPORT_QUERIES,
} from "../data/videoTvKidsChannels.js";
import { serializeVideo } from "./serializers.js";
import { embeddableVideoCondition } from "./videoEmbeddable.js";
import { fetchYoutubeEmbedAllowedMap } from "./youtubeEmbedCheck.js";
import {
  isUsableYoutubeCover,
  normalizeYoutubeCoverUrl,
  youtubeVideoCoverUrl,
} from "./youtubeCoverImages.js";
import { searchYoutubeMusicChannels, type YoutubeChannelHit } from "./youtubeMusicImport.js";
import { searchYoutubeVideos, type YoutubeSearchHit } from "./youtubeVideoSearch.js";
import { classifyAsYekcek, sanitizeDisplayTitle } from "./yektubeVideoClassify.js";
import { scheduleSyncVideoSource, syncVideoSourceToDb } from "./youtubeVideoSync.js";
import { logger } from "./logger.js";

const db = getYektubeDbForRead();
const KIDS_CATEGORY = "cocuk";

export type KidsImportResult = {
  imported: number;
  skipped: number;
  channels: number;
  errors: string[];
};

export type KidsBootstrapResult = KidsImportResult & {
  presetsAdded: number;
  presetsSkipped: number;
  synced: number;
};

async function resolveKidsSource(hit: Pick<YoutubeSearchHit, "channelId" | "channelTitle" | "videoId">) {
  const channelId = hit.channelId.trim();
  if (channelId) {
    const [byChannel] = await db
      .select()
      .from(videoSourcesTable)
      .where(and(eq(videoSourcesTable.platform, "youtube"), eq(videoSourcesTable.channelId, channelId)))
      .orderBy(desc(videoSourcesTable.id))
      .limit(1);
    if (byChannel) {
      if (byChannel.categorySlug !== KIDS_CATEGORY) {
        await dualWriteYektubeUpdate(
          videoSourcesTable,
          { categorySlug: KIDS_CATEGORY },
          eq(videoSourcesTable.id, byChannel.id),
        );
      }
      return { ...byChannel, categorySlug: KIDS_CATEGORY };
    }
  }

  const name = hit.channelTitle.trim() || channelId || "Çocuk";
  const [created] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: name.slice(0, 200),
    platform: "youtube",
    sourceType: "channel",
    channelId: channelId || `kids-${hit.videoId}`,
    url: channelId ? `https://www.youtube.com/channel/${channelId}` : null,
    logoUrl: null,
    categorySlug: KIDS_CATEGORY,
    active: true,
    isLive: false,
    useYoutubeApi: true,
  });
  return created;
}

export async function upsertKidsVideoHit(hit: YoutubeSearchHit): Promise<ReturnType<typeof serializeVideo> | null> {
  const videoId = hit.videoId.trim();
  if (!videoId) return null;

  const [existing] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.videoId, videoId))
    .orderBy(desc(videosTable.id))
    .limit(1);

  const title = sanitizeDisplayTitle(hit.title) || hit.title.trim().slice(0, 500);
  const thumbRaw = hit.thumbnail?.trim() || "";
  const thumb = isUsableYoutubeCover(thumbRaw)
    ? normalizeYoutubeCoverUrl(thumbRaw)
    : youtubeVideoCoverUrl(videoId);
  const isStory = classifyAsYekcek({ title, duration: hit.duration ?? null });
  const embedMap = await fetchYoutubeEmbedAllowedMap([videoId]);
  const embedAllowed = embedMap.get(videoId) !== false;

  if (existing) {
    const [updated] = await dualWriteYektubeUpdate(
      videosTable,
      {
        title,
        thumbnail: thumb,
        channelName: hit.channelTitle.trim() || existing.channelName,
        channelId: hit.channelId.trim() || existing.channelId,
        publishedAt: hit.publishedAt || existing.publishedAt,
        duration: hit.duration ?? existing.duration,
        description: hit.description?.slice(0, 8000) ?? existing.description,
        categorySlug: KIDS_CATEGORY,
        active: true,
        embedAllowed,
        isStory,
      },
      eq(videosTable.id, existing.id),
    );
    return serializeVideo(updated ?? { ...existing, title, thumbnail: thumb, categorySlug: KIDS_CATEGORY, isStory, embedAllowed });
  }

  const source = await resolveKidsSource(hit);
  const [inserted] = await dualWriteYektubeInsert(videosTable, {
    sourceId: source.id,
    platform: "youtube",
    videoId,
    title,
    description: hit.description?.slice(0, 8000) ?? null,
    thumbnail: thumb,
    channelName: hit.channelTitle.trim() || source.name,
    channelId: hit.channelId.trim() || source.channelId,
    publishedAt: hit.publishedAt ?? null,
    duration: hit.duration ?? null,
    categorySlug: KIDS_CATEGORY,
    active: true,
    embedAllowed,
    isStory,
  });
  return serializeVideo(inserted);
}

async function insertKidsChannelPreset(preset: VideoTvPreset): Promise<{ id: number; created: boolean } | null> {
  const channelId = preset.channelId.trim();
  if (!channelId) return null;

  const [existing] = await db
    .select()
    .from(videoSourcesTable)
    .where(and(eq(videoSourcesTable.platform, "youtube"), eq(videoSourcesTable.channelId, channelId)))
    .orderBy(desc(videoSourcesTable.id))
    .limit(1);

  if (existing) {
    await dualWriteYektubeUpdate(
      videoSourcesTable,
      {
        categorySlug: KIDS_CATEGORY,
        active: true,
        name: preset.name.slice(0, 200),
        ...(preset.logoUrl ? { logoUrl: preset.logoUrl } : {}),
      },
      eq(videoSourcesTable.id, existing.id),
    );
    scheduleSyncVideoSource(existing.id);
    return { id: existing.id, created: false };
  }

  const url = channelId.startsWith("@")
    ? `https://www.youtube.com/${channelId}`
    : channelId.startsWith("UC")
      ? `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`
      : null;

  const [row] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: preset.name.slice(0, 200),
    platform: "youtube",
    sourceType: "channel",
    channelId,
    url,
    logoUrl: preset.logoUrl ?? null,
    categorySlug: KIDS_CATEGORY,
    active: true,
    isLive: false,
    useYoutubeApi: true,
  });
  scheduleSyncVideoSource(row.id);
  return { id: row.id, created: true };
}

export async function importKidsChannel(channel: YoutubeChannelHit): Promise<{ sourceId: number; created: boolean }> {
  const channelId = channel.channelId.trim();
  const [existing] = await db
    .select()
    .from(videoSourcesTable)
    .where(and(eq(videoSourcesTable.platform, "youtube"), eq(videoSourcesTable.channelId, channelId)))
    .orderBy(desc(videoSourcesTable.id))
    .limit(1);

  if (existing) {
    await dualWriteYektubeUpdate(
      videoSourcesTable,
      {
        categorySlug: KIDS_CATEGORY,
        active: true,
        ...(channel.title ? { name: channel.title.slice(0, 200) } : {}),
        ...(channel.thumbnail ? { logoUrl: channel.thumbnail } : {}),
      },
      eq(videoSourcesTable.id, existing.id),
    );
    return { sourceId: existing.id, created: false };
  }

  const [created] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: channel.title.slice(0, 200) || channelId,
    platform: "youtube",
    sourceType: "channel",
    channelId,
    url: `https://www.youtube.com/channel/${channelId}`,
    logoUrl: channel.thumbnail ?? null,
    categorySlug: KIDS_CATEGORY,
    active: true,
    isLive: false,
    useYoutubeApi: true,
  });
  return { sourceId: created.id, created: true };
}

export async function importKidsFromPresets(): Promise<{ added: number; skipped: number; errors: string[] }> {
  const presets = getKidsChannelPresets();
  const existingRows = await db
    .select({ channelId: videoSourcesTable.channelId, name: videoSourcesTable.name })
    .from(videoSourcesTable)
    .where(eq(videoSourcesTable.platform, "youtube"));
  const existingIds = new Set(
    existingRows.map((r) => String(r.channelId ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const existingNames = new Set(existingRows.map((r) => String(r.name ?? "").trim().toLowerCase()).filter(Boolean));

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const preset of presets) {
    const key = preset.channelId.trim().toLowerCase();
    const nameKey = preset.name.trim().toLowerCase();
    if (existingIds.has(key) || existingNames.has(nameKey)) {
      skipped++;
      try {
        await insertKidsChannelPreset(preset);
      } catch (err) {
        errors.push(`${preset.name}: ${err instanceof Error ? err.message : "hata"}`);
      }
      continue;
    }
    try {
      const result = await insertKidsChannelPreset(preset);
      if (result) {
        added++;
        existingIds.add(key);
        existingNames.add(nameKey);
      }
    } catch (err) {
      errors.push(`${preset.name}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }

  return { added, skipped, errors };
}

export async function importKidsFromYoutubeSearch(opts: {
  query?: string;
  limit?: number;
  importVideos?: boolean;
  importChannels?: boolean;
  syncChannels?: boolean;
}): Promise<KidsImportResult> {
  const query = (opts.query ?? "çocuk videoları türkçe").trim();
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
  const importVideos = opts.importVideos !== false;
  const importChannels = opts.importChannels !== false;
  const syncChannels = opts.syncChannels === true;
  const result: KidsImportResult = { imported: 0, skipped: 0, channels: 0, errors: [] };

  if (importChannels) {
    const channels = await searchYoutubeMusicChannels(query, Math.min(limit, 12));
    for (const ch of channels) {
      try {
        const { created, sourceId } = await importKidsChannel(ch);
        if (created) result.channels++;
        if (syncChannels) {
          await syncVideoSourceToDb(sourceId).catch((err) =>
            logger.warn({ err, channelId: ch.channelId }, "[kids] channel sync failed"),
          );
        }
      } catch (err) {
        result.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  if (importVideos) {
    const hits = await searchYoutubeVideos(query, limit);
    for (const hit of hits) {
      try {
        if (classifyAsYekcek({ title: hit.title, duration: hit.duration ?? null })) {
          result.skipped++;
          continue;
        }
        const row = await upsertKidsVideoHit(hit);
        if (!row || row.embedAllowed === false || row.isStory) {
          result.skipped++;
          continue;
        }
        result.imported++;
      } catch (err) {
        result.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return result;
}

export async function importKidsBootstrap(opts?: {
  videosPerQuery?: number;
  syncPresets?: boolean;
}): Promise<KidsBootstrapResult> {
  const videosPerQuery = Math.min(Math.max(opts?.videosPerQuery ?? 12, 4), 24);
  const syncPresets = opts?.syncPresets !== false;

  const presetResult = await importKidsFromPresets();
  const aggregate: KidsBootstrapResult = {
    imported: 0,
    skipped: 0,
    channels: 0,
    errors: [...presetResult.errors],
    presetsAdded: presetResult.added,
    presetsSkipped: presetResult.skipped,
    synced: 0,
  };

  if (syncPresets) {
    const kidsSources = await db
      .select()
      .from(videoSourcesTable)
      .where(
        and(
          eq(videoSourcesTable.active, true),
          or(
            eq(videoSourcesTable.categorySlug, KIDS_CATEGORY),
            eq(videoSourcesTable.categorySlug, "kids"),
            eq(videoSourcesTable.categorySlug, "çocuk"),
          ),
        ),
      );
    for (const row of kidsSources) {
      if (row.isLive || row.sourceType === "live") continue;
      const res = await syncVideoSourceToDb(row.id);
      if (res.ok) aggregate.synced++;
      else aggregate.errors.push(`${row.name}: ${res.error ?? "senkron hatası"}`);
    }
  }

  for (const queries of Object.values(KIDS_CATEGORY_IMPORT_QUERIES)) {
    for (const query of queries.slice(0, 2)) {
      const part = await importKidsFromYoutubeSearch({
        query,
        limit: videosPerQuery,
        importVideos: true,
        importChannels: true,
      });
      aggregate.imported += part.imported;
      aggregate.skipped += part.skipped;
      aggregate.channels += part.channels;
      aggregate.errors.push(...part.errors);
    }
  }

  return aggregate;
}

export async function syncKidsSources(): Promise<{ synced: number; failed: number }> {
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.active, true),
        or(
          eq(videoSourcesTable.categorySlug, KIDS_CATEGORY),
          eq(videoSourcesTable.categorySlug, "kids"),
          eq(videoSourcesTable.categorySlug, "çocuk"),
        ),
      ),
    );
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    if (row.isLive || row.sourceType === "live") continue;
    const res = await syncVideoSourceToDb(row.id);
    if (res.ok) synced++;
    else failed++;
  }
  return { synced, failed };
}

export async function getKidsAdminStats(): Promise<{ sources: number; videos: number }> {
  const sources = await db
    .select({ id: videoSourcesTable.id })
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.active, true),
        or(
          eq(videoSourcesTable.categorySlug, KIDS_CATEGORY),
          eq(videoSourcesTable.categorySlug, "kids"),
          eq(videoSourcesTable.categorySlug, "çocuk"),
        ),
      ),
    );
  const videos = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .where(
      and(
        eq(videosTable.active, true),
        embeddableVideoCondition,
        eq(videosTable.isStory, false),
        or(
          eq(videosTable.categorySlug, KIDS_CATEGORY),
          eq(videosTable.categorySlug, "kids"),
          eq(videosTable.categorySlug, "çocuk"),
        ),
      ),
    );
  return { sources: sources.length, videos: videos.length };
}
