import { and, eq, notInArray, sql } from "drizzle-orm";
import {
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
  type VideoSourceRow,
} from "@workspace/db";
import { logger } from "./logger";
import { resolveYoutubeApiKey, youtubeMissingApiKeyWarning } from "./resolve-youtube-api-key.js";
import { scrapeYoutubeChannelHtmlMeta } from "./youtubeChannelHtmlMeta.js";
import { scrapeYoutubeChannelVideos } from "./youtubeChannelHtmlVideos.js";
import { fetchYoutubeEmbedAllowedMap } from "./youtubeEmbedCheck.js";
import { hideEmbedBlockedVideosByIds } from "./videoEmbeddable.js";
import { enrichAndClassifySourceVideos, fetchYoutubeVideoSnippetMap, reclassifyYekcekForSource } from "./youtubeVideoMeta.js";
import { extractYoutubeVideoId, isLiveStreamSource, isYoutubeLiveVideoId } from "./youtubeLiveVideoId.js";
import {
  isUsableYoutubeCover,
  isYoutubeThumbnailForVideo,
  normalizeYoutubeCoverUrl,
  resolveVideoCoverUrl,
  resolveYoutubeSourceCoverUrl,
  youtubeVideoCoverUrl,
} from "./youtubeCoverImages.js";
import { scheduleVideoSeoResolve } from "./yektubeVideoSeo.js";
import { syncDailymotionSourceToDb } from "./dailymotionVideoSync.js";
import { isSocialPlatform, syncSocialSourceToDb } from "./socialVideoSync.js";
import { classifyAsYekcek } from "./yektubeVideoClassify.js";
import { scheduleNotifySubscribersNewVideo } from "./yektubePushNotify.js";
import { videoMatchesSyncLanguage, type SyncLanguageScope } from "./turkishContent.js";
import {
  completeYektubeSyncJobFromResult,
  createYektubeSyncBatch,
  enqueueYektubeSyncJob,
  markYektubeSyncJobRunning,
  type YektubeSyncSample,
} from "./yektubeSyncQueue.js";

const db = getYektubeDbForRead();

const UA = "YekpareVideoSync/1.0 (+https://yekpare.net)";
/** Kazıma + RSS yedeği üst sınırı (Data API tüm geçmişi çeker) */
export const SCRAPE_VIDEO_LIMIT = 200;

type ParsedEntry = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
};

type YoutubePlaylistItem = {
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
  snippet?: {
    title?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: Record<string, { url?: string }>;
  };
};

type YoutubePlaylistItemsResponse = {
  nextPageToken?: string;
  items?: YoutubePlaylistItem[];
  error?: { message?: string };
};

type YoutubeChannelsResponse = {
  items?: Array<{
    snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
  error?: { message?: string };
};

export type VideoSyncResult =
  | {
      ok: true;
      upserted: number;
      removed?: number;
      warning?: string;
      skippedEmbed?: number;
      skippedLanguage?: number;
      scraped?: number;
      samples?: YektubeSyncSample[];
      /** youtube-data-api | rss+html-scrape | html-scrape */
      syncMode?: string;
    }
  | { ok: false; error: string; scraped?: number; samples?: YektubeSyncSample[] };

export type VideoSyncOptions = {
  languageScope?: SyncLanguageScope;
};

function defaultLanguageScope(opts?: VideoSyncOptions): SyncLanguageScope {
  return opts?.languageScope ?? "tr";
}

function normalizeYoutubeThumbnailUrl(url: string | undefined, videoId: string): string {
  const t = (url || "").trim().replace(/\\u0026/g, "&");
  if (!t) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  if (t.startsWith("//")) return `https:${t}`;
  return t.replace(/^http:\/\//i, "https://");
}

function bestYoutubeThumb(
  thumbnails: Record<string, { url?: string }> | undefined,
  videoId: string,
): string {
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const u = normalizeYoutubeThumbnailUrl(thumbnails?.[key]?.url, videoId);
    if (u) return u;
  }
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

async function youtubeData<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = await resolveYoutubeApiKey();
  if (!key) throw new Error(youtubeMissingApiKeyWarning());
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message || `YouTube Data API HTTP ${res.status}`);
  }
  return json as T;
}

export function parseYoutubeAtomEntries(xml: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const vid = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
    if (!vid) continue;
    const mediaTitle = block.match(/<media:title[^>]*>([^<]*)<\/media:title>/)?.[1]?.trim();
    const plainTitle = block.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
    const title = (mediaTitle || plainTitle || vid).slice(0, 500);
    if (/^Deleted video$|^Private video$/i.test(title)) continue;
    const publishedAt =
      block.match(/<published>([^<]+)<\/published>/)?.[1]?.trim() ||
      block.match(/<updated>([^<]+)<\/updated>/)?.[1]?.trim() ||
      "";
    const rawThumb = block.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1];
    const thumb = normalizeYoutubeThumbnailUrl(
      rawThumb ? rawThumb.replace(/&amp;/g, "&").replace(/&quot;/g, '"') : "",
      vid,
    );
    out.push({ videoId: vid, title, publishedAt, thumbnail: thumb });
  }
  return out;
}

function feedUrlForSource(source: VideoSourceRow): string | null {
  if (source.platform !== "youtube") return null;
  const id = source.channelId.trim();
  if (!id) return null;

  if (source.sourceType === "playlist" || source.sourceType === "podcast") {
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(id)}`;
  }
  if (source.sourceType === "channel" || source.sourceType === "live") {
    if (id.startsWith("UC") && id.length === 24) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`;
    }
    return null;
  }
  return null;
}

function mergeEntries(primary: ParsedEntry[], extra: ParsedEntry[], limit: number): ParsedEntry[] {
  const seen = new Set(primary.map((e) => e.videoId));
  const out = [...primary];
  for (const e of extra) {
    if (out.length >= limit) break;
    if (seen.has(e.videoId)) continue;
    seen.add(e.videoId);
    out.push(e);
  }
  return out.slice(0, limit);
}

export async function resolveYoutubeUcChannelId(source: VideoSourceRow): Promise<string | null> {
  const id = source.channelId.trim();
  if (id.startsWith("UC") && id.length === 24) return id;

  const videoId =
    extractYoutubeVideoId(source.url) ?? (isYoutubeLiveVideoId(id) ? id : null);
  if (videoId) {
    const metaMap = await fetchYoutubeVideoSnippetMap([videoId]);
    const uc = metaMap.get(videoId)?.channelId?.trim() ?? "";
    if (uc.startsWith("UC") && uc.length === 24) return uc;
  }

  const input = (source.url && source.url.trim()) || id;
  const meta = await scrapeYoutubeChannelHtmlMeta(input).catch(() => null);
  const uc = meta?.channelId?.trim() || "";
  if (uc.startsWith("UC") && uc.length === 24) {
    if (!isLiveStreamSource(source)) {
      await dualWriteYektubeUpdate(videoSourcesTable, { channelId: uc }, eq(videoSourcesTable.id, source.id));
    }
    return uc;
  }
  return null;
}

async function fetchYoutubePlaylistItemsViaApi(playlistId: string): Promise<ParsedEntry[]> {
  const out: ParsedEntry[] = [];
  let pageToken = "";

  for (let page = 0; page < 100; page++) {
    const data = await youtubeData<YoutubePlaylistItemsResponse>("playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });

    for (const item of data.items ?? []) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "";
      const title = (item.snippet?.title || videoId).trim();
      if (!videoId || /^Deleted video$|^Private video$/i.test(title)) continue;
      out.push({
        videoId,
        title: title.slice(0, 500),
        publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || "",
        thumbnail: bestYoutubeThumb(item.snippet?.thumbnails, videoId),
      });
    }

    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  return out;
}

async function fetchYoutubeChannelUploadsViaApi(source: VideoSourceRow, channelId: string): Promise<ParsedEntry[]> {
  const data = await youtubeData<YoutubeChannelsResponse>("channels", {
    part: "snippet,contentDetails",
    id: channelId,
    maxResults: "1",
  });
  const channel = data.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("YouTube kanal uploads playlisti bulunamadı");
  }

  const logoUrl = bestYoutubeThumb(channel?.snippet?.thumbnails, channelId);
  const name = channel?.snippet?.title?.trim();
  const patch: Partial<Pick<VideoSourceRow, "name" | "logoUrl">> = {};
  if (name && (!source.name || source.name === source.channelId)) patch.name = name;
  if (logoUrl && !source.logoUrl?.trim()) patch.logoUrl = logoUrl;
  if (Object.keys(patch).length > 0) {
    await dualWriteYektubeUpdate(videoSourcesTable, patch, eq(videoSourcesTable.id, source.id));
  }

  return fetchYoutubePlaylistItemsViaApi(uploadsPlaylistId);
}

async function fetchViaScrapeFallback(source: VideoSourceRow, sourceForRows: VideoSourceRow): Promise<ParsedEntry[]> {
  let entries: ParsedEntry[] = [];
  const url = feedUrlForSource(sourceForRows);
  if (url) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const xml = await res.text();
      entries = parseYoutubeAtomEntries(xml);
    } else {
      logger.warn({ sourceId: source.id, status: res.status, url }, "[youtubeVideoSync] RSS yanıtı başarısız");
    }
  }

  if (entries.length < SCRAPE_VIDEO_LIMIT) {
    const input = (sourceForRows.url && sourceForRows.url.trim()) || sourceForRows.channelId;
    const scraped = await scrapeYoutubeChannelVideos(input, SCRAPE_VIDEO_LIMIT).catch(() => []);
    entries = mergeEntries(entries, scraped, SCRAPE_VIDEO_LIMIT);
  }

  return entries.slice(0, SCRAPE_VIDEO_LIMIT);
}

async function upsertVideoRow(
  source: VideoSourceRow,
  e: ParsedEntry | { videoId: string; title: string; publishedAt?: string; thumbnail?: string },
  embedAllowed = true,
): Promise<void> {
  const thumbRaw = "thumbnail" in e && e.thumbnail ? e.thumbnail : "";
  const normalized = isUsableYoutubeCover(thumbRaw) ? normalizeYoutubeCoverUrl(thumbRaw) : "";
  const thumb =
    normalized && isYoutubeThumbnailForVideo(e.videoId, normalized) && !normalized.includes("maxresdefault")
      ? normalized
      : youtubeVideoCoverUrl(e.videoId);
  const publishedAt = "publishedAt" in e ? e.publishedAt ?? "" : "";
  const entryDuration = "duration" in e && typeof e.duration === "string" ? e.duration : null;
  const isStory = classifyAsYekcek({ title: e.title, duration: entryDuration });

  const [existing] = await db
    .select({ id: videosTable.id, categorySlug: videosTable.categorySlug })
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, source.id), eq(videosTable.videoId, e.videoId)))
    .limit(1);

  if (existing) {
    const preservedCategory =
      existing.categorySlug?.trim() || source.categorySlug;
    const patch: Record<string, unknown> = {
      title: e.title,
      thumbnail: thumb,
      channelName: source.name,
      channelId: source.channelId,
      publishedAt: publishedAt || undefined,
      active: true,
      embedAllowed,
      isStory,
      seoTitle: null,
      seoDescription: null,
      seoUpdatedAt: null,
    };
    await dualWriteYektubeUpdate(videosTable, patch, eq(videosTable.id, existing.id));
    scheduleVideoSeoResolve({
      dbId: existing.id,
      youtubeVideoId: e.videoId,
      title: e.title,
      channelName: source.name,
      thumbnail: thumb,
      publishedAt: publishedAt || null,
      categorySlug: preservedCategory,
    });
    return;
  }

  const [inserted] = await dualWriteYektubeInsert(videosTable, {
    sourceId: source.id,
    platform: source.platform,
    videoId: e.videoId,
    title: e.title,
    description: `https://www.youtube.com/watch?v=${e.videoId}`,
    thumbnail: thumb,
    channelName: source.name,
    channelId: source.channelId,
    publishedAt: publishedAt || null,
    duration: entryDuration,
    categorySlug: source.categorySlug,
    active: true,
    embedAllowed,
    isStory,
  });
  if (inserted?.id) {
    scheduleVideoSeoResolve({
      dbId: inserted.id,
      youtubeVideoId: e.videoId,
      title: e.title,
      channelName: source.name,
      thumbnail: thumb,
      publishedAt: publishedAt || null,
      categorySlug: source.categorySlug,
    });
    scheduleNotifySubscribersNewVideo({
      sourceId: source.id,
      channelName: source.name,
      videoTitle: e.title,
      youtubeVideoId: e.videoId,
      isStory: classifyAsYekcek({ title: e.title, duration: null }),
    });
  }
}

async function upsertEntriesWithEmbedPolicy(
  source: VideoSourceRow,
  entries: ParsedEntry[],
  useApi: boolean,
  syncOpts?: VideoSyncOptions,
): Promise<{ upserted: number; skippedEmbed: number; skippedLanguage: number; removedMissing: number }> {
  const languageScope = defaultLanguageScope(syncOpts);
  const existingOnYoutube = useApi
    ? await filterExistingYoutubeVideoIds(entries.map((e) => e.videoId))
    : new Set(entries.map((e) => e.videoId));
  const embedMap = await fetchYoutubeEmbedAllowedMap(entries.map((e) => e.videoId));
  let upserted = 0;
  let skippedEmbed = 0;
  let skippedLanguage = 0;
  let removedMissing = 0;

  for (const e of entries) {
    if (!existingOnYoutube.has(e.videoId)) {
      removedMissing += await deactivateVideoByYoutubeId(source.id, e.videoId);
      continue;
    }
    if (!videoMatchesSyncLanguage(languageScope, e.title, undefined, source.name)) {
      skippedLanguage++;
      continue;
    }
    const allowed = embedMap.get(e.videoId) !== false;
    if (!allowed) skippedEmbed++;
    await upsertVideoRow(source, e, allowed);
    upserted++;
  }

  return { upserted, skippedEmbed, skippedLanguage, removedMissing };
}

/** YouTube'da artık olmayan videoları Yektube'den gizler (active=false). */
async function deactivateVideosNotInSet(sourceId: number, keepVideoIds: Set<string>): Promise<number> {
  const stale =
    keepVideoIds.size === 0
      ? await db
          .select({ id: videosTable.id })
          .from(videosTable)
          .where(and(eq(videosTable.sourceId, sourceId), eq(videosTable.active, true)))
      : await db
          .select({ id: videosTable.id })
          .from(videosTable)
          .where(
            and(
              eq(videosTable.sourceId, sourceId),
              eq(videosTable.active, true),
              notInArray(videosTable.videoId, [...keepVideoIds]),
            ),
          );

  for (const row of stale) {
    await dualWriteYektubeUpdate(videosTable, { active: false }, eq(videosTable.id, row.id));
  }
  return stale.length;
}

async function refreshActiveVideoCount(sourceId: number): Promise<void> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, sourceId), eq(videosTable.active, true)));
  await dualWriteYektubeUpdate(
    videoSourcesTable,
    { videoCount: row?.count ?? 0 },
    eq(videoSourcesTable.id, sourceId),
  );
}

async function deactivateVideoByYoutubeId(sourceId: number, videoId: string): Promise<number> {
  const [row] = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, sourceId), eq(videosTable.videoId, videoId), eq(videosTable.active, true)))
    .limit(1);
  if (!row) return 0;
  await dualWriteYektubeUpdate(videosTable, { active: false }, eq(videosTable.id, row.id));
  return 1;
}

/** YouTube'da hâlâ var olan video ID'lerini toplu doğrular (API veya oEmbed). */
export async function filterExistingYoutubeVideoIds(videoIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
  const existing = new Set<string>();
  if (unique.length === 0) return existing;

  const key = await resolveYoutubeApiKey();
  if (key) {
    for (let i = 0; i < unique.length; i += 50) {
      const chunk = unique.slice(i, i + 50);
      try {
        const data = await youtubeData<{ items?: Array<{ id?: string }> }>("videos", {
          part: "id",
          id: chunk.join(","),
        });
        for (const item of data.items ?? []) {
          if (item.id) existing.add(item.id);
        }
      } catch (err) {
        logger.warn({ err, chunkSize: chunk.length }, "[youtubeVideoSync] batch video existence check failed");
      }
    }
  }

  for (const id of unique) {
    if (existing.has(id)) continue;
    if (await youtubeVideoExistsOnPlatform(id)) existing.add(id);
  }
  return existing;
}

async function youtubeVideoExistsOnPlatform(videoId: string): Promise<boolean> {
  const id = videoId.trim();
  if (!id) return false;

  const key = await resolveYoutubeApiKey();
  if (key) {
    try {
      const data = await youtubeData<{ items?: Array<{ id?: string }> }>("videos", {
        part: "id",
        id,
      });
      return (data.items?.length ?? 0) > 0;
    } catch {
      // oEmbed yedeği
    }
  }

  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
    { headers: { "User-Agent": UA } },
  );
  return res.ok;
}

function languageSkipWarning(skipped: number, scope: SyncLanguageScope): string | undefined {
  if (skipped <= 0 || scope === "global") return undefined;
  return `${skipped} video Türkçe değil — eklenmedi (mevcut kayıtlar korunur)`;
}

async function finishSourceSync(
  sourceId: number,
  entries: ParsedEntry[],
  upserted: number,
  skippedEmbed: number,
  fullCatalog: boolean,
  baseWarning?: string,
  removedMissing = 0,
  syncMode?: string,
  skippedLanguage = 0,
  languageScope: SyncLanguageScope = "tr",
): Promise<VideoSyncResult> {
  let removed = removedMissing;
  if (fullCatalog) {
    removed += await deactivateVideosNotInSet(sourceId, new Set(entries.map((e) => e.videoId)));
  }
  await refreshActiveVideoCount(sourceId);

  const parts = [
    baseWarning,
    embedSkipWarning(skippedEmbed),
    languageSkipWarning(skippedLanguage, languageScope),
    removed > 0 ? `${removed} video YouTube'da yok — Yektube'den kaldırıldı` : undefined,
  ].filter(Boolean);

  return {
    ok: true,
    upserted,
    removed: removed || undefined,
    skippedEmbed: skippedEmbed || undefined,
    skippedLanguage: skippedLanguage || undefined,
    warning: parts.length ? parts.join(" · ") : undefined,
    syncMode,
    scraped: entries.length,
    samples: entries.slice(0, 10).map((e) => ({ videoId: e.videoId, title: e.title.slice(0, 200) })),
  };
}

function embedSkipWarning(skipped: number): string | undefined {
  if (skipped <= 0) return undefined;
  return `${skipped} video embed kapalı — API ile eklenmedi (kazıma ile eklenebilir).`;
}

function sourceWantsApi(source: VideoSourceRow): boolean {
  return source.useYoutubeApi !== false;
}

async function patchSourceCoverAfterSync(sourceId: number): Promise<void> {
  const [source] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, sourceId));
  if (!source || isUsableYoutubeCover(source.logoUrl)) return;

  const [firstVideo] = await db
    .select({
      thumbnail: videosTable.thumbnail,
      videoId: videosTable.videoId,
      platform: videosTable.platform,
    })
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, sourceId), eq(videosTable.active, true)))
    .limit(1);

  const dbThumb = firstVideo ? resolveVideoCoverUrl(firstVideo) : null;
  const cover = await resolveYoutubeSourceCoverUrl(source, dbThumb);
  if (!cover) return;
  await dualWriteYektubeUpdate(videoSourcesTable, { logoUrl: cover }, eq(videoSourcesTable.id, sourceId));
}

/**
 * Kaynak için YouTube videolarını senkronlar.
 * API açık + anahtar varsa: Data API ile tüm yükleme geçmişi.
 * Aksi halde: Atom RSS + HTML kazıma yedeği (en fazla {@link SCRAPE_VIDEO_LIMIT} video).
 */
export async function syncVideoSourceToDb(sourceId: number, syncOpts?: VideoSyncOptions): Promise<VideoSyncResult> {
  const languageScope = defaultLanguageScope(syncOpts);
  const [source] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, sourceId));
  if (!source) return { ok: false, error: "Kaynak bulunamadı" };

  try {
    if (source.platform === "youtube" && source.sourceType === "video") {
      const vid = source.channelId.trim();
      if (!vid) return { ok: false, error: "Video ID boş" };

      const exists = await youtubeVideoExistsOnPlatform(vid);
      if (!exists) {
        const removed = await deactivateVideosNotInSet(sourceId, new Set());
        await refreshActiveVideoCount(sourceId);
        return {
          ok: true,
          upserted: 0,
          removed: removed || undefined,
          warning: "Video YouTube'da bulunamadı — Yektube'den kaldırıldı.",
        };
      }

      const useApi = sourceWantsApi(source) && Boolean(await resolveYoutubeApiKey());
      const embedMap = await fetchYoutubeEmbedAllowedMap([vid]);
      const embedAllowed = embedMap.get(vid) ?? true;
      if (!embedAllowed) {
        await hideEmbedBlockedVideosByIds([vid]);
      }
      await upsertVideoRow(
        source,
        {
          videoId: vid,
          title: source.name || `Video ${vid}`,
          publishedAt: "",
          thumbnail: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
        },
        embedAllowed,
      );
      await refreshActiveVideoCount(sourceId);
      return {
        ok: true,
        upserted: 1,
        scraped: 1,
        samples: [{ videoId: vid, title: (source.name || vid).slice(0, 200) }],
        skippedEmbed: embedAllowed ? 0 : 1,
        warning: embedAllowed ? undefined : "Video embed kısıtlı — yine de listelenir, oynatıcı dener.",
      };
    }

    const apiKey = await resolveYoutubeApiKey();
    const useApi = sourceWantsApi(source) && Boolean(apiKey);
    let warning: string | undefined;
    let sourceForRows = source;

    if (source.platform === "youtube" && (source.sourceType === "playlist" || source.sourceType === "podcast") && useApi) {
      try {
        const entries = await fetchYoutubePlaylistItemsViaApi(source.channelId.trim());
        const { upserted, skippedEmbed, skippedLanguage, removedMissing } = await upsertEntriesWithEmbedPolicy(
          sourceForRows,
          entries,
          true,
          syncOpts,
        );
        logger.info({ sourceId, upserted, skippedEmbed, sourceType: source.sourceType }, "[youtubeVideoSync] Data API tamam");
        return finishSourceSync(
          sourceId,
          entries,
          upserted,
          skippedEmbed,
          true,
          undefined,
          removedMissing,
          "youtube-data-api",
          skippedLanguage,
          languageScope,
        );
      } catch (err) {
        logger.warn({ err, sourceId, sourceType: source.sourceType }, "[youtubeVideoSync] playlist API başarısız, RSS yedeği");
        warning =
          err instanceof Error
            ? `${err.message} — RSS/kazıma deneniyor`
            : "YouTube API hatası — RSS/kazıma deneniyor";
      }
    }

    if (source.platform === "youtube" && (source.sourceType === "channel" || source.sourceType === "live")) {
      const uc = await resolveYoutubeUcChannelId(source);
      if (uc) sourceForRows = { ...source, channelId: uc };
      if (uc && useApi) {
        try {
          const entries = await fetchYoutubeChannelUploadsViaApi(sourceForRows, uc);
          const { upserted, skippedEmbed, skippedLanguage, removedMissing } = await upsertEntriesWithEmbedPolicy(
            sourceForRows,
            entries,
            true,
            syncOpts,
          );
          logger.info({ sourceId, upserted, skippedEmbed, sourceType: source.sourceType }, "[youtubeVideoSync] Data API tamam");
          return finishSourceSync(
            sourceId,
            entries,
            upserted,
            skippedEmbed,
            true,
            warning,
            removedMissing,
            "youtube-data-api",
            skippedLanguage,
            languageScope,
          );
        } catch (err) {
          logger.warn({ err, sourceId, uc }, "[youtubeVideoSync] kanal API başarısız, RSS/kazıma yedeği");
          warning =
            err instanceof Error
              ? `${err.message} — RSS/kazıma deneniyor`
              : "YouTube API hatası — RSS/kazıma deneniyor";
        }
      } else if (!apiKey) {
        warning = youtubeMissingApiKeyWarning();
      } else if (!sourceWantsApi(source)) {
        warning = "YouTube Data API kapalı; RSS ve HTML kazıma kullanılıyor.";
      }
    }

    if (source.platform === "youtube") {
      if (source.sourceType === "channel" || source.sourceType === "live") {
        const uc = await resolveYoutubeUcChannelId(source);
        if (uc) sourceForRows = { ...source, channelId: uc };
      }

      const entries = await fetchViaScrapeFallback(source, sourceForRows);
      if (entries.length === 0 && !feedUrlForSource(sourceForRows)) {
        await refreshActiveVideoCount(sourceId);
        return warning ? { ok: true, upserted: 0, warning } : { ok: true, upserted: 0 };
      }

      const { upserted, skippedEmbed, skippedLanguage, removedMissing } = await upsertEntriesWithEmbedPolicy(
        sourceForRows,
        entries,
        false,
        syncOpts,
      );
      logger.info({ sourceId, upserted, mode: "scrape" }, "[youtubeVideoSync] kazıma tamam");
      const scrapeMode = feedUrlForSource(sourceForRows) ? "rss+html-scrape" : "html-scrape";
      return finishSourceSync(
        sourceId,
        entries,
        upserted,
        skippedEmbed,
        false,
        warning,
        removedMissing,
        scrapeMode,
        skippedLanguage,
        languageScope,
      );
    }

    if (source.platform === "dailymotion") {
      const dm = await syncDailymotionSourceToDb(source);
      return {
        ok: true,
        upserted: dm.upserted,
        warning: dm.warning,
      };
    }

    if (isSocialPlatform(source.platform)) {
      const social = await syncSocialSourceToDb(source);
      return {
        ok: true,
        upserted: social.upserted,
        warning: social.warning,
        syncMode: `${source.platform}-scrape`,
        scraped: social.upserted,
      };
    }

    await refreshActiveVideoCount(sourceId);
    return { ok: true, upserted: 0 };
  } catch (err) {
    logger.error({ err, sourceId }, "[youtubeVideoSync] hata");
    return { ok: false, error: err instanceof Error ? err.message : "Senkron hatası" };
  } finally {
    const [sourceRow] = await db
      .select({ platform: videoSourcesTable.platform })
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.id, sourceId));
    const skipYoutubeMeta = sourceRow?.platform != null && isSocialPlatform(sourceRow.platform);

    if (!skipYoutubeMeta) {
      await patchSourceCoverAfterSync(sourceId).catch((err) =>
        logger.warn({ err, sourceId }, "[youtubeVideoSync] kapak güncellenemedi"),
      );
      await enrichAndClassifySourceVideos(sourceId).catch((err) =>
        logger.warn({ err, sourceId }, "[youtubeVideoSync] meta zenginleştirme"),
      );
      await reclassifyYekcekForSource(sourceId).catch((err) =>
        logger.warn({ err, sourceId }, "[youtubeVideoSync] yekçek sınıflandırma"),
      );
    }
  }
}

export function scheduleSyncVideoSource(
  sourceId: number,
  opts?: { batchId?: string; sourceName?: string; jobId?: string; languageScope?: SyncLanguageScope },
): { jobId: string; batchId: string } {
  const batchId = opts?.batchId ?? createYektubeSyncBatch();
  const syncOpts: VideoSyncOptions = { languageScope: opts?.languageScope ?? "tr" };
  const jobId =
    opts?.jobId ??
    enqueueYektubeSyncJob({
      batchId,
      kind: "source",
      sourceId,
      sourceName: opts?.sourceName,
    }).id;

  setImmediate(async () => {
    markYektubeSyncJobRunning(jobId);
    try {
      const result = await syncVideoSourceToDb(sourceId, syncOpts);
      completeYektubeSyncJobFromResult(jobId, {
        ok: result.ok,
        upserted: result.ok ? result.upserted : 0,
        removed: result.ok ? result.removed : 0,
        skippedEmbed: result.ok ? result.skippedEmbed : 0,
        skippedLanguage: result.ok ? result.skippedLanguage : 0,
        warning: result.ok ? result.warning : undefined,
        error: result.ok ? undefined : result.error,
        syncMode: result.ok ? result.syncMode : undefined,
        scraped: result.scraped,
        samples: result.samples,
      });
    } catch (err) {
      completeYektubeSyncJobFromResult(jobId, {
        ok: false,
        error: err instanceof Error ? err.message : "Senkron hatası",
      });
      logger.error({ err, sourceId }, "[youtubeVideoSync] arka plan senkronu başarısız");
    }
  });
  return { jobId, batchId };
}

/** Playlist RSS — mozaik / önizleme (DB kaynağı olmasa bile). */
export async function fetchYoutubePlaylistRssPreview(playlistId: string, limit = 12): Promise<ParsedEntry[]> {
  const id = playlistId.trim();
  if (!id) return [];
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  return parseYoutubeAtomEntries(await res.text()).slice(0, limit);
}
