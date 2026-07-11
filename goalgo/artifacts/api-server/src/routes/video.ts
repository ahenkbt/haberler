import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, sql, ilike, asc, inArray, notInArray, or } from "drizzle-orm";
import type { VideoSourceRow } from "@workspace/db";
import {
  dualWriteYektubeDelete,
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
} from "@workspace/db";
import { CreateVideoSourceBody } from "@workspace/api-zod";
import { serializeVideoSource, serializeVideo, serializeVideosBatch } from "../lib/serializers";
import {
  fetchYoutubePlaylistRssPreview,
  resolveYoutubeUcChannelId,
  scheduleSyncVideoSource,
  syncVideoSourceToDb,
} from "../lib/youtubeVideoSync";
import { scrapeYoutubeChannelHtmlMeta } from "../lib/youtubeChannelHtmlMeta";
import { scrapeYoutubeChannelVideos } from "../lib/youtubeChannelHtmlVideos.js";
import { scrapeYoutubeChannelPlaylists } from "../lib/youtubeChannelHtmlPlaylists.js";
import { scrapeYoutubeChannelCommunity } from "../lib/youtubeChannelCommunity.js";
import { fetchYoutubeTurkishCaptionsVtt } from "../lib/youtubeCaptionsTr.js";
import { readYektubeCache, writeYektubeCache } from "../lib/yektubeRedisCache.js";
import { resolveYoutubeApiKey, youtubeMissingApiKeyWarning } from "../lib/resolve-youtube-api-key.js";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { logger } from "../lib/logger.js";
import {
  createYektubeSyncBatch,
  enqueueYektubeSyncJob,
  getYektubeSyncQueue,
  completeYektubeSyncJobFromResult,
  markYektubeSyncJobRunning,
} from "../lib/yektubeSyncQueue.js";
import { VIDEO_TV_PRESETS, type VideoTvPreset } from "../data/videoTvPresets.js";
import { VIDEO_TV_LIVE_PRESETS, livePresetThumbnail, type VideoTvLivePreset } from "../data/videoTvLivePresets.js";
import { LIVE_TV_SEARCH_CATEGORIES } from "../data/videoTvLiveCategories.js";
import {
  bootstrapLiveTv,
  importAllLiveCategories,
  importLiveFromYoutubeSearch,
  normalizeLiveVideoSources,
} from "../lib/youtubeLiveImport.js";
import { isBlockedLiveBirthContent, resolveLiveSourceCategorySlug } from "../lib/liveTvCategoryGuess.js";
import { extractYoutubeVideoId, isLiveStreamSource, isYoutubeLiveVideoId } from "../lib/youtubeLiveVideoId.js";
import { searchYoutubeLiveVideos } from "../lib/youtubeLiveSearch.js";
import { mergeVideoTvChannelPresets, VIDEO_TV_TOP_CHANNEL_SUPPLEMENT, VIDEO_TV_TOP_PODCAST_CHANNEL_SUPPLEMENT } from "../data/videoTvTopChannels.js";
import { VIDEO_TV_KIDS_CHANNEL_SUPPLEMENT } from "../data/videoTvKidsChannels.js";
import { buildTopChannelCandidatesAllCategories } from "../lib/youtubeCategoryTopChannels.js";
import { looksLikeVideoPlaylistNotPodcast, shouldImportAsPodcast } from "../lib/youtubePodcastFilter.js";
import { deleteSourceById, dedupeDuplicateVideoRows, runVideoTvCleanup } from "../lib/videoTvCleanup.js";
import { embeddableVideoCondition, auditAndHideNonEmbeddableVideos } from "../lib/videoEmbeddable.js";
import { dedupeVideosByVideoId, isNewsLikeVideo, mixVideosForHomeFeed, mixVideosForNewsSiteFeed, mixVideosNewsOnly, mixShortsFeed, mixShortsFeedPersonalized, parseShortsSessionSeed, shuffleBySeed } from "../lib/videoMix.js";
import { resolveShortsPersonalization } from "../lib/yektubeShortsPersonalization.js";
import { sortByTurkishPriority, turkishContentScore, parseSyncLanguageScope, type SyncLanguageScope } from "../lib/turkishContent.js";
import { classifyAsYekcek, isLongFormVideo } from "../lib/yektubeVideoClassify.js";
import { fetchYoutubeEmbedAllowedMap } from "../lib/youtubeEmbedCheck.js";
import { isShortsSyncRunning, scheduleSyncAllShorts, syncAllChannelShorts, syncChannelShortsToDb } from "../lib/youtubeShortsSync.js";
import { isSocialSyncRunning, scheduleSyncAllSocial, syncAllSocialSources } from "../lib/socialVideoSync.js";
import {
  isTurkishSocialHitsRunning,
  listTurkishSocialHitPresets,
  scheduleTurkishSocialHits,
  syncTurkishSocialHits,
} from "../lib/socialTurkishHitsSync.js";
import { parseInstagramInput, parseTiktokInput } from "../lib/socialVideoMeta.js";
import { enrichAndClassifySourceVideos, reclassifyYekcekForSource, enrichPlaceholderTitles, fetchYoutubeVideoSnippetMap, hydrateVideoDurationsAndClassify, reclassifyRecentYekcekPool } from "../lib/youtubeVideoMeta.js";
import { getYoutubeVideoEngagement, getYoutubeVideoCommentsOnly, readYoutubeVideoEngagementCache, refreshYoutubeVideoEngagementBackground } from "../lib/youtubeVideoEngagement.js";
import { resolveYoutubeStreamUrl, resolveYoutubeLiveStreamUrl, fetchYoutubeStreamUpstream, invalidateStreamCache, normalizeYoutubeVideoId } from "../lib/youtubeStreamResolve.js";
import { logYoutubeStreamMetric } from "../lib/youtubeStreamMetrics.js";
import { buildTvLiveVideos, enrichTvLiveVideos, findChannelLiveVideos } from "../lib/yektubeLiveFeed.js";
import { resolveChannelLiveBroadcastVideoId } from "../lib/youtubeChannelLiveBroadcast.js";
import { getLiveStatusSnapshot } from "../lib/yektubeLiveStatus.js";
import { renderWatchOgHtml } from "../lib/yektubeOgHtml.js";
import { renderYektubeWatchOgByPath, isYektubeWatchOgPath } from "../lib/yektubeWatchOg.js";
import { applyConditionalJsonEtag, buildVideoSourceEtag } from "../lib/yektubeChannelCache.js";
import { isMusicCatalogVideo } from "../lib/musicContentFilter.js";
import { resolveVideoSeoMeta } from "../lib/yektubeVideoSeo.js";
import { googleTranslateConfigured } from "../lib/googleTranslate.js";
import { classifyVideosWithGemini } from "../lib/yektubeGeminiClassify.js";
import { enrichSerializedVideoTitles, importYoutubeVideoById, searchYektubeVideos } from "../lib/yektubeVideoSearch.js";
import {
  browseYoutubeMusicHome,
  getMusicAdminStats,
  importMusicFromYoutubeSearch,
  importMusicFromYtm,
  searchYoutubeMusic,
  searchYoutubeMusicChannels,
  syncMusicSources,
} from "../lib/youtubeMusicImport.js";
import {
  getKidsAdminStats,
  importKidsBootstrap,
  importKidsFromPresets,
  importKidsFromYoutubeSearch,
  syncKidsSources,
} from "../lib/youtubeKidsImport.js";
import {
  backfillYoutubeCovers,
  fetchYoutubeChannelCover,
  fetchYoutubePlaylistCover,
  isUsableYoutubeCover,
  normalizeYoutubeCoverUrl,
  resolveVideoCoverUrl,
  resolveYoutubeSourceCoverUrl,
  youtubeVideoCoverUrl,
} from "../lib/youtubeCoverImages";
import {
  getVideoCategoryCatalog,
  mergeDuplicateCategorySlugs,
  categoryVideoFilterCondition,
  categoryFeedFilterCondition,
  getActiveSourceIdsForCategory,
  videoMatchesCategoryFeed,
  rawSlugsForCategory,
  reconcileVideoCategoriesFromSources,
  seedEmptyCategoryChannels,
  slugifyVideoCategory,
} from "../lib/yektubeCategoryCatalog.js";
import {
  getAdminSectionStats,
  getPublicSectionCategories,
  loadSectionConfig,
  saveSectionConfig,
  type SectionConfigStore,
} from "../lib/yektubeSectionConfig.js";
import {
  createStaticPage,
  deleteStaticPage,
  getStaticPageBySlug,
  listSidebarStaticPages,
  loadStaticPages,
  updateStaticPage,
} from "../lib/yektubeStaticPages.js";
import { resolveVideoSourceByRef, sourcePathSlug } from "../lib/yektubeSourceResolve.js";
import {
  noteYoutubeResolveFailure,
  noteYoutubeResolveSuccess,
  proxyYoutubeRequestToFallback,
  shouldSkipLocalYoutubeResolve,
  withLocalResolveBudget,
} from "../lib/youtubeStreamFallback.js";

const router: IRouter = Router();
const db = getYektubeDbForRead();

/** Toplu güncelleme — aynı anda tek iş */
let bulkVideoUpdateRunning = false;
let pendingSyncGeminiClassify = false;
let lastPublicVideoRefreshAt = 0;
let lastYektubeAutoRefreshAt = 0;
const PUBLIC_VIDEO_REFRESH_MS = 15 * 60 * 1000;
const YEKTUBE_AUTO_REFRESH_MS = 60 * 60 * 1000;

async function syncAllChannelPlaylistsAndPodcasts(): Promise<{ channels: number; created: number }> {
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(and(eq(videoSourcesTable.active, true), eq(videoSourcesTable.platform, "youtube")));
  const channels = rows.filter((s) => s.sourceType === "channel" && !s.isLive);
  let created = 0;
  for (const row of channels) {
    try {
      const result = await importYoutubePlaylistsForSource(row);
      created += result.created;
    } catch (err) {
      logger.warn({ err, sourceId: row.id }, "[video] podcast/playlist toplu import hatası");
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return { channels: channels.length, created };
}

async function loadVideoSourceRow(sourceId: number): Promise<VideoSourceRow | null> {
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, sourceId));
  return row ?? null;
}

/** Kanal: UC çöz → videolar → playlist/podcast → shorts */
async function syncChannelFullContent(sourceId: number): Promise<void> {
  let row = await loadVideoSourceRow(sourceId);
  if (!row || row.platform !== "youtube") return;

  if (row.sourceType === "playlist" || row.sourceType === "podcast") {
    await syncVideoSourceToDb(sourceId);
    return;
  }

  if (row.sourceType !== "channel" && row.sourceType !== "live") {
    await syncVideoSourceToDb(sourceId);
    return;
  }

  await resolveYoutubeUcChannelId(row).catch(() => null);
  row = (await loadVideoSourceRow(sourceId)) ?? row;

  const input = (row.url && row.url.trim()) || row.channelId;
  const meta = await scrapeYoutubeChannelHtmlMeta(input).catch(() => null);
  if (meta?.channelId?.startsWith("UC")) {
    const liveStream = isLiveStreamSource(row);
    const patch: Record<string, unknown> = {
      ...(meta.channelName?.trim() ? { name: meta.channelName.trim().slice(0, 200) } : {}),
      ...(meta.logoUrl?.trim() && !row.logoUrl?.trim()
        ? { logoUrl: normalizeYoutubeImageUrl(meta.logoUrl) }
        : {}),
    };
    if (!liveStream) patch.channelId = meta.channelId;
    if (Object.keys(patch).length > 0) {
      await dualWriteYektubeUpdate(videoSourcesTable, patch, eq(videoSourcesTable.id, sourceId));
    }
    row = (await loadVideoSourceRow(sourceId)) ?? row;
  }

  await syncVideoSourceToDb(sourceId);

  if (row.sourceType === "channel" && !row.isLive) {
    await importYoutubePlaylistsForSource(row).catch((err) =>
      logger.warn({ err, sourceId }, "[video] playlist/podcast import hatası"),
    );
    await syncChannelShortsToDb(sourceId).catch((err) =>
      logger.warn({ err, sourceId }, "[video] shorts sync hatası"),
    );
    await enrichAndClassifySourceVideos(sourceId).catch((err) =>
      logger.warn({ err, sourceId }, "[video] yekçek meta zenginleştirme hatası"),
    );
    await reclassifyYekcekForSource(sourceId).catch((err) =>
      logger.warn({ err, sourceId }, "[video] yekçek sınıflandırma hatası"),
    );
  }
}

function scheduleChannelFullContentSync(sourceId: number): void {
  setImmediate(() => {
    syncChannelFullContent(sourceId).catch((err) =>
      logger.warn({ err, sourceId }, "[video] tam kanal senkronu hatası"),
    );
  });
}

async function runFullVideoTvUpdate(opts?: { languageScope?: SyncLanguageScope }): Promise<{
  synced: number;
  playlistsCreated: number;
  deduped: number;
  shortsUpserted: number;
  podcastListsCreated: number;
  batchId: string;
}> {
  const syncOpts = { languageScope: opts?.languageScope ?? "tr" };
  const rows = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.active, true));
  const syncTargets = rows.filter((s) => !s.isLive && s.sourceType !== "live");

  let synced = 0;
  const batchId = createYektubeSyncBatch();
  for (const row of syncTargets) {
    const job = enqueueYektubeSyncJob({
      batchId,
      kind: "source",
      sourceId: row.id,
      sourceName: row.name,
    });
    markYektubeSyncJobRunning(job.id);
    const result = await syncVideoSourceToDb(row.id, syncOpts);
    completeYektubeSyncJobFromResult(job.id, {
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
    if (result.ok) synced++;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  let playlistsCreated = 0;
  const channels = rows.filter((s) => s.platform === "youtube" && s.sourceType === "channel");
  for (const row of channels) {
    try {
      const imported = await importYoutubePlaylistsForSource(row);
      playlistsCreated += imported.created;
    } catch (err) {
      logger.warn({ err, sourceId: row.id }, "[video] bulk playlist import failed");
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const deduped = await dedupeDuplicateVideoRows(false);

  let shortsUpserted = 0;
  try {
    const shorts = await syncAllChannelShorts();
    shortsUpserted = shorts.upserted;
  } catch (err) {
    logger.warn({ err }, "[video] bulk shorts sync failed");
  }

  let podcastListsCreated = 0;
  try {
    const pods = await syncAllChannelPlaylistsAndPodcasts();
    podcastListsCreated = pods.created;
  } catch (err) {
    logger.warn({ err }, "[video] bulk podcast sync failed");
  }

  try {
    await reclassifyRecentYekcekPool(2500);
  } catch (err) {
    logger.warn({ err }, "[video] bulk yekçek reclassify failed");
  }

  logger.info({ synced, playlistsCreated, deduped, shortsUpserted, podcastListsCreated, batchId }, "[video] bulk update completed");
  return { synced, playlistsCreated, deduped, shortsUpserted, podcastListsCreated, batchId };
}

function scheduleFullVideoTvUpdate(opts?: {
  geminiClassify?: boolean;
  batchId?: string;
  bulkJobId?: string;
  languageScope?: SyncLanguageScope;
}): boolean {
  if (opts?.geminiClassify) pendingSyncGeminiClassify = true;
  if (bulkVideoUpdateRunning) return false;
  bulkVideoUpdateRunning = true;
  const batchId = opts?.batchId;
  const bulkJobId = opts?.bulkJobId;
  setImmediate(async () => {
    const geminiClassify = pendingSyncGeminiClassify;
    pendingSyncGeminiClassify = false;
    try {
      const stats = await runFullVideoTvUpdate({ languageScope: opts?.languageScope ?? "tr" });
      if (geminiClassify) {
        const classified = await classifyVideosWithGemini({ limit: 150 }).catch((err) => {
          logger.warn({ err }, "[video] gemini classify after sync failed");
          return null;
        });
        if (classified) {
          logger.info(
            { moved: classified.moved, scanned: classified.scanned },
            "[video] gemini classify after sync done",
          );
        }
      }
      if (bulkJobId) {
        completeYektubeSyncJobFromResult(bulkJobId, {
          ok: true,
          upserted: stats.synced,
          scraped: stats.synced,
          syncMode: "bulk",
          warning: `Playlist: ${stats.playlistsCreated}, Shorts: ${stats.shortsUpserted}`,
        });
      }
      void batchId;
    } catch (err) {
      logger.error({ err }, "[video] bulk update failed");
      if (bulkJobId) {
        completeYektubeSyncJobFromResult(bulkJobId, {
          ok: false,
          error: err instanceof Error ? err.message : "Toplu güncelleme hatası",
        });
      }
    } finally {
      bulkVideoUpdateRunning = false;
    }
  });
  return true;
}

export function scheduleYektubeContentRefresh(opts?: { geminiClassify?: boolean }): {
  videosStarted: boolean;
  shortsStarted: boolean;
} {
  scheduleSyncAllSocial();
  return {
    videosStarted: scheduleFullVideoTvUpdate(opts),
    shortsStarted: scheduleSyncAllShorts(),
  };
}

export function scheduleYektubeStartupRefresh(reason = "startup"): {
  scheduled: boolean;
  videosStarted: boolean;
  shortsStarted: boolean;
} {
  const now = Date.now();
  if (now - lastYektubeAutoRefreshAt < YEKTUBE_AUTO_REFRESH_MS) {
    return { scheduled: false, videosStarted: false, shortsStarted: false };
  }
  lastYektubeAutoRefreshAt = now;
  const result = scheduleYektubeContentRefresh({ geminiClassify: false });
  logger.info({ reason, ...result }, "[video] Yektube otomatik içerik yenileme planlandı");
  return { scheduled: result.videosStarted || result.shortsStarted, ...result };
}

type YoutubePlaylistSummary = { playlistId: string; title: string; thumbnail?: string };

type UpdateVideoSourceInput = {
  name?: string;
  channelId?: string;
  url?: string | null;
  logoUrl?: string | null;
  categorySlug?: string;
  active?: boolean;
  isLive?: boolean;
  useYoutubeApi?: boolean;
};

type UpdateVideoInput = {
  title?: string;
  thumbnail?: string | null;
  categorySlug?: string;
  active?: boolean;
  embedAllowed?: boolean;
  isFeatured?: boolean;
};

type SyncVideoSourceInput = {
  useYoutubeApi?: boolean;
  async?: boolean;
  languageScope?: SyncLanguageScope;
};

function parseUpdateVideoSourceBody(body: unknown): UpdateVideoSourceInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Geçersiz gövde" };
  const b = body as Record<string, unknown>;
  const out: UpdateVideoSourceInput = {};
  if (b.name !== undefined) {
    if (typeof b.name !== "string" || !b.name.trim()) return { error: "name geçersiz" };
    out.name = b.name.trim();
  }
  if (b.channelId !== undefined) {
    if (typeof b.channelId !== "string" || !b.channelId.trim()) return { error: "channelId geçersiz" };
    out.channelId = b.channelId.trim();
  }
  if (b.url !== undefined) out.url = b.url == null ? null : String(b.url).trim() || null;
  if (b.logoUrl !== undefined) out.logoUrl = b.logoUrl == null ? null : String(b.logoUrl);
  if (b.categorySlug !== undefined) {
    if (typeof b.categorySlug !== "string" || !b.categorySlug.trim()) return { error: "categorySlug geçersiz" };
    out.categorySlug = b.categorySlug.trim();
  }
  if (b.active !== undefined) out.active = Boolean(b.active);
  if (b.isLive !== undefined) out.isLive = Boolean(b.isLive);
  if (b.useYoutubeApi !== undefined) out.useYoutubeApi = Boolean(b.useYoutubeApi);
  return out;
}

function applyYoutubeSourcePatch(
  current: Pick<VideoSourceRow, "platform" | "sourceType" | "isLive">,
  patch: UpdateVideoSourceInput,
): UpdateVideoSourceInput {
  if (current.platform !== "youtube") return patch;
  if (patch.channelId === undefined && patch.url === undefined) return patch;

  const raw = (patch.url ?? patch.channelId ?? "").trim();
  if (!raw) return patch;

  const isLiveLike = current.sourceType === "live" || current.isLive;
  const isVideo = current.sourceType === "video";

  if (isLiveLike || isVideo) {
    const norm = normalizeYoutubeSourceId(raw, isVideo ? "video" : "live");
    const videoId = norm.id?.trim();
    if (!videoId) {
      return { ...patch, channelId: raw, url: /^https?:\/\//i.test(raw) ? raw : patch.url };
    }
    const watchUrl = norm.url ?? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const next: UpdateVideoSourceInput = { ...patch, channelId: videoId, url: watchUrl };
    if (isLiveLike && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      next.logoUrl = livePresetThumbnail(videoId);
    }
    return next;
  }

  if (current.sourceType === "channel") {
    const norm = normalizeYoutubeSourceId(raw, "channel");
    if (norm.id) {
      return { ...patch, channelId: norm.id, url: norm.url ?? patch.url ?? null };
    }
  }

  return patch;
}

function parseUpdateVideoBody(body: unknown): UpdateVideoInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Geçersiz gövde" };
  const b = body as Record<string, unknown>;
  const out: UpdateVideoInput = {};
  if (b.title !== undefined) {
    if (typeof b.title !== "string" || !b.title.trim()) return { error: "title geçersiz" };
    out.title = b.title.trim();
  }
  if (b.thumbnail !== undefined) out.thumbnail = b.thumbnail == null ? null : String(b.thumbnail);
  if (b.categorySlug !== undefined) {
    if (typeof b.categorySlug !== "string" || !b.categorySlug.trim()) return { error: "categorySlug geçersiz" };
    const norm = slugifyVideoCategory(b.categorySlug.trim());
    if (!norm) return { error: "categorySlug geçersiz" };
    out.categorySlug = norm;
  }
  if (b.active !== undefined) out.active = Boolean(b.active);
  if (b.embedAllowed !== undefined) out.embedAllowed = Boolean(b.embedAllowed);
  if (b.isFeatured !== undefined) out.isFeatured = Boolean(b.isFeatured);
  return out;
}

type BulkUpdateVideosInput = {
  ids: number[];
  categorySlug: string;
};

function parseBulkUpdateVideosBody(body: unknown): BulkUpdateVideosInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Geçersiz gövde" };
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.ids) || b.ids.length === 0) return { error: "En az bir video seçin" };
  const ids = [...new Set(b.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) return { error: "ids geçersiz" };
  if (ids.length > 200) return { error: "En fazla 200 video seçilebilir" };
  if (typeof b.categorySlug !== "string" || !b.categorySlug.trim()) return { error: "categorySlug geçersiz" };
  const norm = slugifyVideoCategory(b.categorySlug.trim());
  if (!norm) return { error: "categorySlug geçersiz" };
  return { ids, categorySlug: norm };
}

function parseSyncVideoSourceBody(body: unknown): SyncVideoSourceInput {
  if (!body || typeof body !== "object") return { languageScope: "tr" };
  const b = body as Record<string, unknown>;
  return {
    useYoutubeApi: typeof b.useYoutubeApi === "boolean" ? b.useYoutubeApi : undefined,
    async: typeof b.async === "boolean" ? b.async : undefined,
    languageScope: parseSyncLanguageScope(b.languageScope ?? b.global),
  };
}

const SCRAPE_PLAYLIST_LIMIT = 50;

async function appendCategoryFilter(
  conds: Parameters<typeof and>[0][],
  categorySlug: string | undefined,
  opts?: { feedAligned?: boolean },
) {
  if (!categorySlug || categorySlug === "all") return;
  const cond = opts?.feedAligned
    ? await categoryFeedFilterCondition(categorySlug)
    : await categoryVideoFilterCondition(categorySlug);
  if (cond) conds.push(cond);
}

function normalizeYoutubeImageUrl(url: string | undefined): string {
  const t = (url || "").trim().replace(/\\u0026/g, "&");
  if (!t) return "";
  if (t.startsWith("//")) return `https:${t}`;
  return t.replace(/^http:\/\//i, "https://");
}

function bestYoutubeImage(thumbnails: Record<string, { url?: string }> | undefined): string {
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const u = normalizeYoutubeImageUrl(thumbnails?.[key]?.url);
    if (u) return u;
  }
  return "";
}

function normalizeYoutubeSourceId(rawValue: string, sourceType: string): { id: string; url?: string } {
  const raw = rawValue.trim();
  if (!raw) return { id: "" };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : "";
  if (withScheme) {
    try {
      const url = new URL(withScheme);
      const host = url.hostname.toLowerCase();
      const parts = url.pathname.split("/").filter(Boolean);
      if (host.includes("youtube.com") || host.includes("youtu.be")) {
        const list = url.searchParams.get("list");
        const video = url.searchParams.get("v");
        if (sourceType === "playlist" && list) return { id: list.trim(), url: raw };
        if (sourceType === "video" || sourceType === "live") {
          const videoId =
            video ||
            (host.includes("youtu.be") ? parts[0] : "") ||
            (["shorts", "embed", "live"].includes(parts[0] ?? "") ? parts[1] : "");
          if (videoId?.trim()) return { id: videoId.trim(), url: raw };
        }
        if (sourceType === "video") {
          return { id: (video || parts[0] || raw).trim(), url: raw };
        }
        const idx = parts.findIndex((p) => p === "channel" || p === "c" || p === "user");
        if (idx >= 0 && parts[idx + 1]) return { id: `${parts[idx]}/${parts[idx + 1]}`, url: raw };
        if (parts[0]?.startsWith("@")) return { id: parts[0], url: raw };
        if (parts[0] && /^UC[a-zA-Z0-9_-]{20,}$/.test(parts[0])) return { id: parts[0], url: raw };
        return { id: (parts[0] || raw).trim(), url: raw };
      }
    } catch {
      /* keep raw below */
    }
  }
  const clean = raw.replace(/^@(?=[^/]+$)/, "@").replace(/^\/+|\/+$/g, "");
  if ((sourceType === "channel" || sourceType === "live") && /^UC[a-zA-Z0-9_-]{20,}$/.test(clean)) return { id: clean };
  return { id: clean };
}

async function youtubeData<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = await resolveYoutubeApiKey();
  if (!key) throw new Error(youtubeMissingApiKeyWarning());
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "YekpareVideoSync/1.0 (+https://yekpare.net)",
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `YouTube Data API HTTP ${res.status}`);
  return json as T;
}

async function listYoutubePlaylistsViaApi(channelId: string): Promise<YoutubePlaylistSummary[]> {
  const items: YoutubePlaylistSummary[] = [];
  let pageToken = "";
  for (let page = 0; page < 100; page++) {
    const data = await youtubeData<{
      nextPageToken?: string;
      items?: Array<{ id?: string; snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> } }>;
    }>("playlists", {
      part: "snippet",
      channelId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of data.items ?? []) {
      const playlistId = item.id?.trim() || "";
      const title = item.snippet?.title?.trim() || playlistId;
      if (!playlistId) continue;
      items.push({ playlistId, title, thumbnail: bestYoutubeImage(item.snippet?.thumbnails) });
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }
  return items;
}

async function scrapeYoutubePlaylistsFromPath(
  channelInput: string,
  pathSuffix: "playlists" | "podcasts",
): Promise<YoutubePlaylistSummary[]> {
  return scrapeYoutubeChannelPlaylists(channelInput, pathSuffix, SCRAPE_PLAYLIST_LIMIT);
}

async function loadPlaylistsFromDbForParent(parentSourceId: number): Promise<{
  playlists: YoutubePlaylistSummary[];
  podcasts: YoutubePlaylistSummary[];
}> {
  const marker = `yektubeParent=${parentSourceId}`;
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.platform, "youtube"),
        inArray(videoSourcesTable.sourceType, ["playlist", "podcast"]),
        sql`${videoSourcesTable.url} LIKE ${`%${marker}%`}`,
      ),
    );

  const playlists: YoutubePlaylistSummary[] = [];
  const podcasts: YoutubePlaylistSummary[] = [];
  for (const row of rows) {
    const playlistId = String(row.channelId ?? "").trim();
    if (!playlistId) continue;
    const item: YoutubePlaylistSummary = {
      playlistId,
      title: row.name,
      thumbnail: row.logoUrl ?? undefined,
    };
    if (row.sourceType === "podcast") podcasts.push(item);
    else playlists.push(item);
  }
  return { playlists, podcasts };
}

async function fetchChannelPlaylistsAndPodcasts(row: VideoSourceRow): Promise<{
  playlists: YoutubePlaylistSummary[];
  podcasts: YoutubePlaylistSummary[];
}> {
  const input = (row.url && row.url.trim()) || row.channelId;
  const uc = await resolveYoutubeUcChannelId(row).catch(() => null);
  const apiKey = await resolveYoutubeApiKey();
  const useApi = row.useYoutubeApi !== false && Boolean(apiKey) && Boolean(uc);

  let playlists: YoutubePlaylistSummary[] = [];

  if (useApi && uc) {
    try {
      playlists = await listYoutubePlaylistsViaApi(uc);
    } catch (err) {
      logger.warn({ err, sourceId: row.id, uc }, "[video] playlist API failed, scrape fallback");
    }
  }

  const scrapeInputs = [...new Set([input, uc].filter((x): x is string => Boolean(x?.trim())))];
  const runScrape = async (suffix: "playlists" | "podcasts"): Promise<YoutubePlaylistSummary[]> => {
    for (const inp of scrapeInputs) {
      const scraped = await scrapeYoutubeChannelPlaylists(inp, suffix, SCRAPE_PLAYLIST_LIMIT).catch(() => []);
      if (scraped.length > 0) return scraped;
    }
    return [];
  };

  if (playlists.length === 0) {
    playlists = await runScrape("playlists");
  }

  const podcasts = await runScrape("podcasts");
  const filteredPodcasts = podcasts.filter((p) => shouldImportAsPodcast(p.title));
  return { playlists, podcasts: filteredPodcasts };
}

/** logo_url boşsa — ilk videonun küçük resmini kapak olarak kullan. */
async function firstVideoThumbBySourceIds(sourceIds: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (sourceIds.length === 0) return out;

  const vrows = await db
    .select({
      sourceId: videosTable.sourceId,
      thumbnail: videosTable.thumbnail,
      videoId: videosTable.videoId,
      platform: videosTable.platform,
      sortOrder: videosTable.sortOrder,
      publishedAt: videosTable.publishedAt,
    })
    .from(videosTable)
    .where(
      and(
        inArray(videosTable.sourceId, sourceIds),
        eq(videosTable.active, true),
      ),
    )
    .orderBy(asc(videosTable.sourceId), asc(videosTable.sortOrder), desc(videosTable.publishedAt));

  for (const v of vrows) {
    if (v.sourceId == null) continue;
    if (out.has(v.sourceId)) continue;
    const fromDb = resolveVideoCoverUrl({
      videoId: v.videoId,
      thumbnail: v.thumbnail,
      platform: v.platform,
    });
    if (fromDb) out.set(v.sourceId, fromDb);
  }
  return out;
}

async function resolveSourceCoverMap(rows: VideoSourceRow[]): Promise<Map<number, string>> {
  const covers = new Map<number, string>();
  const needDbThumb: number[] = [];

  const liveVideoIds = rows
    .map((row) => extractYoutubeVideoId(row.url) ?? extractYoutubeVideoId(row.channelId))
    .filter((id): id is string => Boolean(id && isYoutubeLiveVideoId(id)));
  const liveMetaMap = await fetchYoutubeVideoSnippetMap([...new Set(liveVideoIds)]);

  for (const row of rows) {
    const liveVideoId =
      row.platform === "youtube"
        ? extractYoutubeVideoId(row.channelId) ?? extractYoutubeVideoId(row.url ?? "")
        : null;
    const isLiveRow =
      liveVideoId != null &&
      isYoutubeLiveVideoId(liveVideoId) &&
      (row.sourceType === "live" || row.isLive || row.sourceType === "video");

    if (isLiveRow && liveVideoId) {
      const meta = liveMetaMap.get(liveVideoId);
      const apiThumb = meta?.thumbnail?.trim();
      if (apiThumb && isUsableYoutubeCover(apiThumb)) {
        covers.set(row.id, apiThumb);
        continue;
      }
      if (meta?.channelId) {
        const chCover = await fetchYoutubeChannelCover(meta.channelId).catch(() => "");
        if (chCover) {
          covers.set(row.id, chCover);
          continue;
        }
      }
      const stored = row.logoUrl?.trim() ?? "";
      if (stored && isUsableYoutubeCover(stored) && !stored.includes(`/vi/${liveVideoId}/`)) {
        covers.set(row.id, stored);
        continue;
      }
      const cover = youtubeVideoCoverUrl(liveVideoId);
      if (cover) covers.set(row.id, cover);
      continue;
    }

    if (isUsableYoutubeCover(row.logoUrl)) continue;
    if (row.platform === "youtube" && row.sourceType === "video") {
      const cover = youtubeVideoCoverUrl(row.channelId);
      if (cover) covers.set(row.id, cover);
      continue;
    }
    needDbThumb.push(row.id);
  }

  const fromVideos = await firstVideoThumbBySourceIds(needDbThumb);
  for (const [id, url] of fromVideos) {
    if (!covers.has(id)) covers.set(id, url);
  }

  const needRss = rows.filter(
    (row) =>
      !covers.has(row.id) &&
      !isUsableYoutubeCover(row.logoUrl) &&
      row.platform === "youtube" &&
      (row.sourceType === "playlist" || row.sourceType === "podcast"),
  );

  const rssBatch = needRss.slice(0, 120);
  let rssIdx = 0;
  const rssWorkers = Array.from({ length: Math.min(10, rssBatch.length) }, async () => {
    while (rssIdx < rssBatch.length) {
      const row = rssBatch[rssIdx++]!;
      const cover = await fetchYoutubePlaylistCover(row.channelId).catch(() => "");
      if (cover) covers.set(row.id, cover);
    }
  });
  await Promise.all(rssWorkers);

  const needChannel = rows.filter(
    (row) =>
      !covers.has(row.id) &&
      !isUsableYoutubeCover(row.logoUrl) &&
      row.platform === "youtube" &&
      (row.sourceType === "channel" ||
        (row.sourceType === "live" &&
          !extractYoutubeVideoId(row.channelId) &&
          !extractYoutubeVideoId(row.url ?? ""))),
  );
  const channelBatch = needChannel.slice(0, 40);
  let chIdx = 0;
  const chWorkers = Array.from({ length: Math.min(6, channelBatch.length) }, async () => {
    while (chIdx < channelBatch.length) {
      const row = channelBatch[chIdx++]!;
      const input = (row.url && row.url.trim()) || row.channelId;
      const cover = await fetchYoutubeChannelCover(input).catch(() => "");
      if (cover) covers.set(row.id, cover);
    }
  });
  await Promise.all(chWorkers);

  return covers;
}

async function persistResolvedSourceCovers(
  rows: VideoSourceRow[],
  covers: Map<number, string>,
): Promise<void> {
  for (const row of rows) {
    const cover = covers.get(row.id);
    if (!cover || isUsableYoutubeCover(row.logoUrl)) continue;
    await dualWriteYektubeUpdate(videoSourcesTable, { logoUrl: cover }, eq(videoSourcesTable.id, row.id)).catch(
      () => undefined,
    );
  }
}

function serializeSourceWithCoverFallback(row: VideoSourceRow, thumbs: Map<number, string>) {
  const override = thumbs.get(row.id);
  return serializeVideoSource(row, override ?? null);
}

function serializeLiveSourceWithCoverFallback(row: VideoSourceRow, thumbs: Map<number, string>) {
  const base = serializeSourceWithCoverFallback(row, thumbs);
  return {
    ...base,
    categorySlug: resolveLiveSourceCategorySlug(row.name, null, row.categorySlug),
  };
}

function isServeableLiveSource(row: Pick<VideoSourceRow, "isLive" | "sourceType" | "name">): boolean {
  if (!row.isLive && row.sourceType !== "live") return true;
  return !isBlockedLiveBirthContent({ name: row.name });
}

async function listYoutubePodcastsViaApi(channelId: string): Promise<YoutubePlaylistSummary[]> {
  const items: YoutubePlaylistSummary[] = [];
  let pageToken = "";
  for (let page = 0; page < 100; page++) {
    const data = await youtubeData<{
      nextPageToken?: string;
      items?: Array<{ id?: { playlistId?: string }; snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> } }>;
    }>("search", {
      part: "snippet",
      channelId,
      type: "playlist",
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of data.items ?? []) {
      const playlistId = item.id?.playlistId?.trim() || "";
      const title = item.snippet?.title?.trim() || playlistId;
      if (!playlistId) continue;
      items.push({ playlistId, title, thumbnail: bestYoutubeImage(item.snippet?.thumbnails) });
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }
  return items;
}

async function ensureYoutubeListsInDb(
  row: VideoSourceRow,
  lists: YoutubePlaylistSummary[],
  listKind: "playlist" | "podcast",
): Promise<number> {
  if (lists.length === 0) return 0;

  const existing = await db
    .select({
      id: videoSourcesTable.id,
      channelId: videoSourcesTable.channelId,
      sourceType: videoSourcesTable.sourceType,
    })
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.platform, "youtube"),
        inArray(videoSourcesTable.sourceType, ["playlist", "podcast"]),
      ),
    );
  const byPlaylistId = new Map<string, { id: number; sourceType: string }>();
  for (const x of existing) {
    const key = String(x.channelId ?? "").trim();
    if (key) byPlaylistId.set(key, { id: x.id, sourceType: x.sourceType });
  }

  let created = 0;
  for (const pl of lists) {
    if (listKind === "podcast" && !shouldImportAsPodcast(pl.title)) continue;

    const ex = byPlaylistId.get(pl.playlistId);
    const parentUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(pl.playlistId)}&yektubeParent=${row.id}`;
    if (ex) {
      await dualWriteYektubeUpdate(videoSourcesTable, { url: parentUrl }, eq(videoSourcesTable.id, ex.id)).catch(
        () => undefined,
      );
      if (ex.sourceType === "podcast" && !shouldImportAsPodcast(pl.title)) {
        await dualWriteYektubeUpdate(videoSourcesTable, { sourceType: "playlist" }, eq(videoSourcesTable.id, ex.id));
        ex.sourceType = "playlist";
      }
      if (listKind === "podcast" && ex.sourceType === "playlist") {
        continue;
      }
      if (listKind === "playlist" && ex.sourceType === "podcast" && !shouldImportAsPodcast(pl.title)) {
        await dualWriteYektubeUpdate(videoSourcesTable, { sourceType: "playlist" }, eq(videoSourcesTable.id, ex.id));
      } else if (ex.sourceType !== listKind && listKind === "playlist") {
        await dualWriteYektubeUpdate(videoSourcesTable, { sourceType: listKind }, eq(videoSourcesTable.id, ex.id));
      }
      continue;
    }
    const [ins] = await dualWriteYektubeInsert(videoSourcesTable, {
      name: pl.title.slice(0, 200),
      platform: "youtube",
      sourceType: listKind,
      channelId: pl.playlistId,
      url: `https://www.youtube.com/playlist?list=${encodeURIComponent(pl.playlistId)}&yektubeParent=${row.id}`,
      logoUrl: pl.thumbnail || null,
      categorySlug: row.categorySlug,
      active: true,
      isLive: false,
      useYoutubeApi: row.useYoutubeApi,
    });
    byPlaylistId.set(pl.playlistId, { id: ins.id, sourceType: listKind });
    created++;
    scheduleSyncVideoSource(ins.id);
  }
  return created;
}

async function playlistIdToSourceMap(): Promise<Map<string, number>> {
  const dbPlaylists = await db
    .select({ id: videoSourcesTable.id, channelId: videoSourcesTable.channelId })
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.platform, "youtube"),
        inArray(videoSourcesTable.sourceType, ["playlist", "podcast"]),
      ),
    );
  const idByPlaylist = new Map<string, number>();
  for (const x of dbPlaylists) {
    const key = String(x.channelId ?? "").trim();
    if (key) idByPlaylist.set(key, x.id);
  }
  return idByPlaylist;
}

async function scheduleSyncForEmptyPlaylistSources(sourceIds: number[]): Promise<void> {
  if (sourceIds.length === 0) return;
  const rows = await db
    .select({ id: videoSourcesTable.id, videoCount: videoSourcesTable.videoCount })
    .from(videoSourcesTable)
    .where(inArray(videoSourcesTable.id, sourceIds));
  for (const r of rows) {
    if ((r.videoCount ?? 0) === 0) scheduleSyncVideoSource(r.id);
  }
}

type EnrichedPlaylist = YoutubePlaylistSummary & {
  sourceId: number | null;
  previewVideos: Array<ReturnType<typeof serializeVideo>>;
};

async function enrichPlaylistsForChannel(
  row: VideoSourceRow,
  items: YoutubePlaylistSummary[],
  listKind: "playlist" | "podcast",
): Promise<EnrichedPlaylist[]> {
  if (items.length === 0) return [];

  await ensureYoutubeListsInDb(row, items, listKind);
  const idByPlaylist = await playlistIdToSourceMap();

  const sourceIds = items
    .map((p) => idByPlaylist.get(p.playlistId))
    .filter((id): id is number => typeof id === "number" && id > 0);
  await scheduleSyncForEmptyPlaylistSources(sourceIds);

  return Promise.all(
    items.map(async (p) => {
      const sourceId = idByPlaylist.get(p.playlistId) ?? null;
      let previewVideos: ReturnType<typeof serializeVideo>[] = [];

      if (sourceId) {
        const dbVideos = await db
          .select()
          .from(videosTable)
          .where(and(eq(videosTable.sourceId, sourceId), eq(videosTable.active, true)))
          .orderBy(desc(videosTable.id))
          .limit(12);
        previewVideos = dbVideos.map((row) => serializeVideo(row));
      }

      if (previewVideos.length === 0) {
        const rss = await fetchYoutubePlaylistRssPreview(p.playlistId, 12).catch(() => []);
        previewVideos = rss.map((e, i) => ({
          id: sourceId ? -(sourceId * 100 + i) : -(i + 1),
          sourceId,
          platform: "youtube" as const,
          videoId: e.videoId,
          title: e.title,
          thumbnail: e.thumbnail ?? `https://img.youtube.com/vi/${e.videoId}/mqdefault.jpg`,
          description: null,
          channelName: row.name,
          sourceName: row.name,
          channelId: p.playlistId,
          publishedAt: e.publishedAt || null,
          duration: null,
          categorySlug: row.categorySlug,
          isFeatured: false,
          isHeadline: false,
          isStory: false,
          sortOrder: i,
          active: true,
          embedAllowed: true,
          streamUrl: undefined,
          createdAt: new Date().toISOString(),
        }));
      }

      return { ...p, sourceId, previewVideos };
    }),
  );
}

async function importYoutubePlaylistsForSource(row: VideoSourceRow): Promise<{ created: number; warning?: string }> {
  if (row.platform !== "youtube" || (row.sourceType !== "channel" && row.sourceType !== "live")) {
    return { created: 0 };
  }

  const uc = await resolveYoutubeUcChannelId(row).catch(() => null);
  let warning: string | undefined;

  let regularPlaylists: YoutubePlaylistSummary[] = [];
  let podcastLists: YoutubePlaylistSummary[] = [];
  try {
    const fetched = await fetchChannelPlaylistsAndPodcasts(row);
    regularPlaylists = fetched.playlists;
    podcastLists = fetched.podcasts;
  } catch (err) {
    logger.warn({ err, sourceId: row.id }, "[video] playlist fetch failed during import");
    warning = err instanceof Error ? err.message : "Playlist listesi alınamadı";
  }

  if (regularPlaylists.length === 0 && podcastLists.length === 0) {
    if (!warning) {
      if (!uc) warning = "Kanal UC kimliği çözülemedi; playlist kazıması başarısız olabilir.";
      else if (!(await resolveYoutubeApiKey())) warning = youtubeMissingApiKeyWarning();
      else warning = "YouTube'dan oynatma listesi bulunamadı.";
    }
    return { created: 0, warning };
  }

  const createdPl = await ensureYoutubeListsInDb(row, regularPlaylists, "playlist");
  const createdPod = await ensureYoutubeListsInDb(row, podcastLists, "podcast");
  const created = createdPl + createdPod;
  logger.info({ sourceId: row.id, created, playlists: regularPlaylists.length, podcasts: podcastLists.length }, "[video] playlist import");
  return warning ? { created, warning } : { created };
}

router.get("/video/categories", async (_req, res): Promise<void> => {
  try {
    await mergeDuplicateCategorySlugs().catch(() => undefined);
    const items = await getVideoCategoryCatalog();
    res.json({ items });
  } catch (err) {
    logger.error({ err }, "[video] categories failed");
    res.status(500).json({ error: "Kategoriler yüklenemedi" });
  }
});

router.get("/video/live", async (_req, res): Promise<void> => {
  try {
    const liveSources = (
      await db
        .select()
        .from(videoSourcesTable)
        .where(
          and(
            eq(videoSourcesTable.active, true),
            or(eq(videoSourcesTable.isLive, true), eq(videoSourcesTable.sourceType, "live")),
          ),
        )
        .orderBy(desc(videoSourcesTable.videoCount))
    ).filter(isServeableLiveSource);

    const liveSourceIds = liveSources.map((s) => s.id);
    const liveDbVideos =
      liveSourceIds.length > 0
        ? await db
            .select()
            .from(videosTable)
            .where(and(eq(videosTable.active, true), inArray(videosTable.sourceId, liveSourceIds)))
            .orderBy(desc(videosTable.id))
            .limit(48)
        : [];

    const tvVideos = (await enrichTvLiveVideos(
      liveSources,
      liveDbVideos.map((row) => serializeVideo(row)),
    )).filter(
      (v) => !isBlockedLiveBirthContent({ name: v.channelName, title: v.title, channelName: v.channelName }),
    );
    let channelLiveVideos: ReturnType<typeof serializeVideo>[] = [];
    try {
      channelLiveVideos = (await findChannelLiveVideos(24)).filter(
        (v) => !isBlockedLiveBirthContent({ name: v.channelName, title: v.title, channelName: v.channelName }),
      );
    } catch (err) {
      logger.warn({ err }, "[video] channel live scan failed");
    }

    const thumbs = await resolveSourceCoverMap(liveSources);
    res.json({
      sources: liveSources.map((row) => serializeLiveSourceWithCoverFallback(row, thumbs)),
      tvVideos,
      channelLiveVideos,
      videos: [...tvVideos, ...channelLiveVideos],
    });
  } catch (err) {
    logger.error({ err }, "[video] live feed failed");
    res.status(500).json({ error: "Canlı yayınlar yüklenemedi" });
  }
});

/** Hafif canlı durum — polling / rozet (45 sn sunucu önbelleği) */
router.get("/video/live/status", async (_req, res): Promise<void> => {
  try {
    const snapshot = await getLiveStatusSnapshot();
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json(snapshot);
  } catch (err) {
    logger.error({ err }, "[video] live status failed");
    res.status(500).json({ error: "Canlı durum alınamadı" });
  }
});

/** OG ön-render HTML — paylaşım / bot önizlemesi (Faz 9) */
router.get("/video/og/watch", async (req, res): Promise<void> => {
  const title = typeof req.query.title === "string" ? req.query.title.trim() : "Yektube";
  const description = typeof req.query.description === "string" ? req.query.description.trim() : "";
  const image = typeof req.query.thumb === "string" ? req.query.thumb.trim() : "";
  const pageUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";

  if (!pageUrl.startsWith("http://") && !pageUrl.startsWith("https://")) {
    res.status(400).send("Geçerli url parametresi gerekli (https://...).");
    return;
  }

  const html = renderWatchOgHtml({
    title: title || "Video",
    description: description || `${title} — Yektube'de izleyin.`,
    image: image || null,
    pageUrl,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.send(html);
});

/** Bot SSR — izleme URL'sinden OG HTML (Faz 9) */
router.get("/video/og/watch-by-path", async (req, res): Promise<void> => {
  const pathname = typeof req.query.path === "string" ? req.query.path.trim() : "";
  const origin = typeof req.query.origin === "string" ? req.query.origin.trim() : "";
  if (!pathname.startsWith("/") || !isYektubeWatchOgPath(pathname)) {
    res.status(400).send("Geçerli Yektube izleme path gerekli (/yp/kanal/.../...).");
    return;
  }
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
    res.status(400).send("Geçerli origin parametresi gerekli.");
    return;
  }
  try {
    const html = await renderYektubeWatchOgByPath({ pathname, origin });
    if (!html) {
      res.status(404).send("Video bulunamadı.");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
    res.send(html);
  } catch (err) {
    logger.error({ err, pathname }, "[video] og watch-by-path failed");
    res.status(500).send("OG HTML üretilemedi.");
  }
});

router.get("/video/sources/by-ref/:ref", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.ref) ? req.params.ref[0] : req.params.ref;
  const ref = String(raw ?? "").trim();
  if (!ref) {
    res.status(400).json({ error: "Geçersiz referans" });
    return;
  }
  const row = await resolveVideoSourceByRef(ref);
  if (!row) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  const thumbs = await resolveSourceCoverMap([row]);
  const payload = serializeSourceWithCoverFallback(row, thumbs);
  const etag = buildVideoSourceEtag(row);
  if (applyConditionalJsonEtag(req, res, etag)) return;
  res.json(payload);
});

router.get("/video/sources", async (_req, res): Promise<void> => {
  const rows = (await db
    .select()
    .from(videoSourcesTable)
    .orderBy(videoSourcesTable.id)).filter(isServeableLiveSource);
  const thumbs = await resolveSourceCoverMap(rows);
  void persistResolvedSourceCovers(rows, thumbs);
  const missingCount = rows.filter((r) => !isUsableYoutubeCover(r.logoUrl) && !thumbs.has(r.id)).length;
  if (missingCount >= 8) {
    setImmediate(() => {
      backfillYoutubeCovers({
        limit: 200,
        loadSources: async () => db.select().from(videoSourcesTable).orderBy(videoSourcesTable.id),
        loadVideos: async () =>
          db.select().from(videosTable).where(eq(videosTable.active, true)).orderBy(desc(videosTable.id)).limit(4000),
        firstVideoThumbBySourceIds,
        updateDb: async (table, id, coverUrl) => {
          const url = normalizeYoutubeCoverUrl(coverUrl);
          if (!url) return;
          if (table === "sources") {
            await dualWriteYektubeUpdate(videoSourcesTable, { logoUrl: url }, eq(videoSourcesTable.id, id));
          } else {
            await dualWriteYektubeUpdate(videosTable, { thumbnail: url }, eq(videosTable.id, id));
          }
        },
      }).catch(() => undefined);
    });
  }
  res.json(rows.map((row) => serializeLiveAwareSource(row, thumbs)));
});

function serializeLiveAwareSource(row: VideoSourceRow, thumbs: Map<number, string>) {
  const base = serializeSourceWithCoverFallback(row, thumbs);
  if (!row.isLive && row.sourceType !== "live") return base;
  return {
    ...base,
    categorySlug: resolveLiveSourceCategorySlug(row.name, null, row.categorySlug),
  };
}

router.get("/video/sources/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  let coverOverride: string | null = null;
  if (!isUsableYoutubeCover(row.logoUrl)) {
    const dbThumbs = await firstVideoThumbBySourceIds([id]);
    coverOverride = await resolveYoutubeSourceCoverUrl(row, dbThumbs.get(id)).catch(() => "");
    if (!coverOverride) {
      const map = await resolveSourceCoverMap([row]);
      coverOverride = map.get(id) ?? "";
    }
    if (coverOverride && !isUsableYoutubeCover(row.logoUrl)) {
      setImmediate(() => {
        dualWriteYektubeUpdate(videoSourcesTable, { logoUrl: coverOverride }, eq(videoSourcesTable.id, id)).catch(
          () => undefined,
        );
      });
    }
  }
  const thumbs = coverOverride ? new Map([[id, coverOverride]]) : new Map<number, string>();
  res.json(serializeSourceWithCoverFallback(row, thumbs));
});

/**
 * Kanal kapak + logo (YouTube Data API yok) — HTML sayfasından ytInitialData.
 * WordPress video-tv eklentisindeki VTV_Fetch::yt_kanal_meta ile aynı fikir.
 */
router.get("/video/sources/:id/channel-html-meta", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  if (row.platform !== "youtube") {
    res.status(400).json({ error: "Yalnızca YouTube kaynakları desteklenir" });
    return;
  }
  if (row.sourceType === "playlist" || row.sourceType === "podcast") {
    res.json({
      ok: true,
      skip: true,
      logoUrl: "",
      bannerUrl: "",
      channelName: "",
      description: "",
      subscriberText: "",
    });
    return;
  }

  const input = (row.url && row.url.trim()) || row.channelId;
  const cacheSuffix = `channel-meta:${id}`;
  try {
    const cached = await readYektubeCache<Record<string, unknown>>(cacheSuffix);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      res.json(cached);
      return;
    }

    const meta = await scrapeYoutubeChannelHtmlMeta(input);
    if (!meta) {
      res.status(502).json({ ok: false, error: "YouTube sayfası okunamadı" });
      return;
    }
    const payload = { ok: true, ...meta };
    await writeYektubeCache(cacheSuffix, payload, 600);
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json(payload);
  } catch (e) {
    res.status(502).json({
      ok: false,
      error: e instanceof Error ? e.message : "Bilinmeyen hata",
    });
  }
});

/** Kanal sayfası mozaik kapağı — son videolar (kazıma, DB'den bağımsız) */
router.get("/video/sources/:id/recent-videos", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  if (row.platform !== "youtube") {
    res.json({ ok: true, items: [] });
    return;
  }
  const input = (row.url && row.url.trim()) || row.channelId;
  try {
    const scraped = await scrapeYoutubeChannelVideos(input, 12);
    const embedMap = await fetchYoutubeEmbedAllowedMap(scraped.map((e) => e.videoId));
    const playable = scraped.filter((e) => embedMap.get(e.videoId) !== false);
    res.json({
      ok: true,
      items: playable.map((e, i) => ({
        id: -(id * 1000 + i),
        sourceId: row.id,
        platform: "youtube",
        videoId: e.videoId,
        title: e.title,
        thumbnail: e.thumbnail,
        categorySlug: row.categorySlug,
        isFeatured: false,
      })),
    });
  } catch {
    res.json({ ok: true, items: [] });
  }
});

/** Canlı TV — güncel YouTube yayın video ID (yenileme / oynatıcı yedeği) */
router.get("/video/sources/:id/live-broadcast", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ ok: false, error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!row) {
    res.status(404).json({ ok: false, error: "Kaynak bulunamadı" });
    return;
  }
  if (!row.isLive && row.sourceType !== "live") {
    res.status(400).json({ ok: false, error: "Kaynak canlı TV değil" });
    return;
  }
  const force = req.query.refresh === "1" || req.query.force === "1";
  try {
    const result = await resolveChannelLiveBroadcastVideoId(row, { force });
    res.setHeader("Cache-Control", force ? "no-store" : "public, max-age=60, stale-while-revalidate=120");
    res.json({
      ok: true,
      sourceId: row.id,
      videoId: result.videoId,
      ucChannelId: result.ucChannelId,
      refreshed: result.refreshed,
    });
  } catch (err) {
    logger.warn({ err, sourceId: id }, "[video] live-broadcast resolve failed");
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "Canlı yayın kimliği alınamadı",
      videoId: null,
    });
  }
});

/** Kanalın oynatma listelerini ve podcastlerini döner (API veya HTML kazıma). */
router.get("/video/sources/:id/playlists", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  if (row.platform !== "youtube" || (row.sourceType !== "channel" && row.sourceType !== "live")) {
    res.json({ ok: true, playlists: [], podcasts: [] });
    return;
  }

  try {
    const cacheSuffix = `channel-playlists:${id}`;
    const cached = await readYektubeCache<{
      ok: boolean;
      playlists: unknown[];
      podcasts: unknown[];
    }>(cacheSuffix);
    const cachedTotal = (cached?.playlists?.length ?? 0) + (cached?.podcasts?.length ?? 0);
    if (cached && cachedTotal > 0) {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      res.json(cached);
      return;
    }

    let { playlists, podcasts } = await fetchChannelPlaylistsAndPodcasts(row);

    if (playlists.length + podcasts.length === 0) {
      await importYoutubePlaylistsForSource(row).catch(() => undefined);
      const retry = await fetchChannelPlaylistsAndPodcasts(row);
      playlists = retry.playlists;
      podcasts = retry.podcasts;
    }

    if (playlists.length + podcasts.length === 0) {
      const fromDb = await loadPlaylistsFromDbForParent(id);
      playlists = fromDb.playlists;
      podcasts = fromDb.podcasts;
    }

    const enrichedPlaylists = await enrichPlaylistsForChannel(row, playlists, "playlist");
    const enrichedPodcasts = await enrichPlaylistsForChannel(row, podcasts, "podcast");

    if (playlists.length + podcasts.length > 0) {
      setImmediate(() => {
        importYoutubePlaylistsForSource(row).catch(() => undefined);
      });
    }

    const payload = { ok: true, playlists: enrichedPlaylists, podcasts: enrichedPodcasts };
    const total = enrichedPlaylists.length + enrichedPodcasts.length;
    if (total > 0) {
      await writeYektubeCache(cacheSuffix, payload, 300);
    }
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json(payload);
  } catch (err) {
    logger.error({ err, sourceId: row.id }, "[video] playlists fetch failed");
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "Playlist listesi alınamadı",
      playlists: [],
      podcasts: [],
    });
  }
});

/** Kanal topluluk gönderileri (community/posts sekmesi) */
router.get("/video/sources/:id/community", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  if (row.platform !== "youtube" || (row.sourceType !== "channel" && row.sourceType !== "live")) {
    res.json({ ok: true, posts: [] });
    return;
  }

  const cacheSuffix = `channel-community:${id}`;
  try {
    const cached = await readYektubeCache<{ ok: boolean; posts: unknown[] }>(cacheSuffix);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      res.json(cached);
      return;
    }

    const input = (row.url && row.url.trim()) || row.channelId;
    const posts = await scrapeYoutubeChannelCommunity(input, 24);
    const payload = { ok: true, posts };
    await writeYektubeCache(cacheSuffix, payload, 300);
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json(payload);
  } catch (err) {
    logger.error({ err, sourceId: row.id }, "[video] community fetch failed");
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "Topluluk gönderileri alınamadı",
      posts: [],
    });
  }
});

/** Kanalın playlistlerini kaynak olarak ekler (playlist sourceType) ve RSS senkronu tetikler. */
router.post("/video/sources/:id/sync-playlists", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const row = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id)).then((r) => r[0]);
  if (!row) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  setImmediate(() => {
    importYoutubePlaylistsForSource(row)
      .then((result) => {
        if (result.warning) {
          logger.warn({ sourceId: row.id, ...result }, "[video] playlist import warning");
        }
      })
      .catch((err) => logger.error({ err, sourceId: row.id }, "[video] playlist import failed"));
  });
  res.json({ ok: true, scheduled: true, message: "Playlist içe aktarma arka planda başladı" });
});

router.post("/video/sources", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const parsed = CreateVideoSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
  const d = parsed.data;
  const normalized = normalizeYoutubeSourceId((d.url || d.channelId || "").trim(), d.sourceType);
  let channelId = normalized.id || d.channelId.trim();
  let sourceUrl = d.url ?? normalized.url ?? null;
  let sourceName = d.name.trim();
  let logoUrl = d.logoUrl?.trim() || null;
  let effectiveSourceType = d.sourceType;
  const categorySlug = slugifyVideoCategory(d.categorySlug || "muzik") || "muzik";

  if (d.platform === "youtube") {
    if (!channelId) {
      res.status(400).json({ error: "YouTube URL / ID boş olamaz" });
      return;
    }

    if (d.sourceType === "channel" || d.sourceType === "live") {
      // @handle veya URL kabul et — UC çözümlemesi arka planda yapılır
    }

    if (d.sourceType === "playlist") {
      const listFromUrl = normalizeYoutubeSourceId(sourceUrl || channelId, "playlist").id;
      channelId = listFromUrl || channelId;
      if (!sourceUrl) sourceUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(channelId)}`;
    }

    if (d.sourceType === "video") {
      channelId = normalizeYoutubeSourceId(sourceUrl || channelId, "video").id || channelId;
    }

    if (d.sourceType === "live") {
      const liveNorm = normalizeYoutubeSourceId(sourceUrl || channelId, "live");
      if (liveNorm.id && liveNorm.id !== "live") {
        channelId = liveNorm.id;
      }
      if (isYoutubeLiveVideoId(channelId)) {
        sourceUrl = liveNorm.url ?? `https://www.youtube.com/watch?v=${encodeURIComponent(channelId)}`;
        if (!logoUrl) logoUrl = livePresetThumbnail(channelId);
      }
    }
  } else if (d.platform === "instagram") {
    const ig = parseInstagramInput(d.url?.trim() || d.channelId.trim());
    if (!ig) {
      res.status(400).json({ error: "Instagram profil veya Reels URL'si geçersiz" });
      return;
    }
    channelId = ig.id;
    sourceUrl = ig.url;
    if (!sourceName) sourceName = ig.handle ? `@${ig.handle}` : ig.id;
    if (ig.kind === "reel") effectiveSourceType = "video";
  } else if (d.platform === "tiktok") {
    const tt = parseTiktokInput(d.url?.trim() || d.channelId.trim());
    if (!tt) {
      res.status(400).json({ error: "TikTok profil veya video URL'si geçersiz" });
      return;
    }
    channelId = tt.id;
    sourceUrl = tt.url;
    if (!sourceName) sourceName = tt.handle ? `@${tt.handle}` : tt.id;
    if (tt.kind === "video") effectiveSourceType = "video";
  }

  const inserted = await dualWriteYektubeInsert(videoSourcesTable, {
      name: sourceName || channelId,
      platform: d.platform,
      sourceType: effectiveSourceType,
      channelId,
      url: sourceUrl,
      logoUrl,
      categorySlug,
      active: d.active ?? true,
      isLive: d.isLive ?? d.sourceType === "live",
      useYoutubeApi: d.platform === "youtube" ? (d.useYoutubeApi ?? true) : false,
    });
  const row = inserted[0];
  if (!row) {
    res.status(500).json({ error: "Kaynak oluşturulamadı" });
    return;
  }

  const sourceId = row.id;

  if (effectiveSourceType !== "live" && !d.isLive) {
    if (d.platform === "youtube" && d.sourceType === "channel") {
      scheduleChannelFullContentSync(sourceId);
    } else {
      scheduleSyncVideoSource(sourceId);
    }
  }
  if (d.platform === "youtube" && d.sourceType === "live" && !isYoutubeLiveVideoId(channelId)) {
    setImmediate(() => {
      scrapeYoutubeChannelHtmlMeta(sourceUrl || channelId)
        .then(async (meta) => {
          if (!meta?.channelId) return;
          await dualWriteYektubeUpdate(
            videoSourcesTable,
            {
              channelId: meta.channelId,
              ...(meta.channelName && (!sourceName || sourceName === channelId)
                ? { name: meta.channelName.slice(0, 200) }
                : {}),
              ...(meta.logoUrl && !logoUrl ? { logoUrl: normalizeYoutubeImageUrl(meta.logoUrl) } : {}),
            },
            eq(videoSourcesTable.id, sourceId),
          );
        })
        .catch(() => undefined);
    });
  }

  res.status(201).json({
    ...serializeVideoSource(row),
    sync: { scheduled: true, message: "Video senkronu arka planda başladı" },
    playlists:
      d.platform === "youtube" && d.sourceType === "channel"
        ? { scheduled: true, message: "Playlist içe aktarma arka planda başladı" }
        : undefined,
  });
  } catch (err) {
    logger.error({ err }, "[video] create source failed");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Kaynak eklenemedi",
    });
  }
});

router.patch("/video/sources/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = parseUpdateVideoSourceBody(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [current] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Kaynak bulunamadı" });
    return;
  }
  const patch = applyYoutubeSourcePatch(current, parsed);
  const [updated] = await dualWriteYektubeUpdate(videoSourcesTable, patch, eq(videoSourcesTable.id, id));
  const nextCategory = patch.categorySlug ? slugifyVideoCategory(patch.categorySlug) : "";
  const prevCategory = slugifyVideoCategory(current.categorySlug ?? "");
  if (nextCategory && nextCategory !== prevCategory) {
    await dualWriteYektubeUpdate(
      videosTable,
      { categorySlug: nextCategory },
      eq(videosTable.sourceId, id),
    );
    logger.info({ sourceId: id, from: prevCategory, to: nextCategory }, "[video] cascaded category to source videos");
  }
  res.json(serializeVideoSource(updated ?? { ...current, ...patch }));
});

router.post("/video/sources/:id/sync", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (row.sourceType === "live" || row.isLive) {
    res.json({ ok: true, upserted: 0, warning: "Canlı yayın kaynakları /canlitv playlistinde listelenir; video senkronu atlandı." });
    return;
  }

  const body = parseSyncVideoSourceBody(req.body ?? {});
  const languageScope = body.languageScope ?? "tr";
  if (typeof body.useYoutubeApi === "boolean") {
    await dualWriteYektubeUpdate(
      videoSourcesTable,
      { useYoutubeApi: body.useYoutubeApi },
      eq(videoSourcesTable.id, id),
    );
  }

  const runAsync = body.async !== false;
  if (runAsync) {
    const { jobId, batchId } = scheduleSyncVideoSource(id, { sourceName: row.name, languageScope });
    if (row.platform === "youtube" && row.sourceType === "channel") {
      setImmediate(() => {
        importYoutubePlaylistsForSource(row).catch(() => undefined);
      });
    }
    res.json({
      ok: true,
      scheduled: true,
      jobId,
      batchId,
      message: "Güncelleme arka planda başladı — kuyruk panelinden izleyin",
    });
    return;
  }

  const batchId = createYektubeSyncBatch();
  const job = enqueueYektubeSyncJob({
    batchId,
    kind: "source",
    sourceId: id,
    sourceName: row.name,
  });
  markYektubeSyncJobRunning(job.id);
  const result = await syncVideoSourceToDb(id, { languageScope });
  completeYektubeSyncJobFromResult(job.id, {
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
  if (!result.ok) {
    res.status(400).json({ error: result.error, jobId: job.id, batchId });
    return;
  }
  res.json({
    ok: true,
    jobId: job.id,
    batchId,
    upserted: result.upserted,
    scraped: result.scraped,
    samples: result.samples,
    warning: result.warning,
    skippedEmbed: result.skippedEmbed,
    syncMode: result.syncMode,
  });
});

/** Admin: tüm kanal ve playlist kaynaklarını + playlist içe aktarmayı toplu güncelle */
router.post("/video/sync-all", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const geminiClassify = body.geminiClassify !== false;
  const languageScope = parseSyncLanguageScope(body.languageScope ?? body.global);
  const rows = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.active, true));
  const count = rows.filter((s) => !s.isLive && s.sourceType !== "live").length;
  const batchId = createYektubeSyncBatch();
  const bulkJob = enqueueYektubeSyncJob({ batchId, kind: "bulk", sourceName: "Tüm kaynaklar" });
  markYektubeSyncJobRunning(bulkJob.id);
  const videosStarted = scheduleFullVideoTvUpdate({ geminiClassify, batchId, bulkJobId: bulkJob.id, languageScope });
  if (!videosStarted) {
    completeYektubeSyncJobFromResult(bulkJob.id, {
      ok: false,
      error: "Toplu güncelleme zaten çalışıyor",
    });
  }
  res.json({
    ok: true,
    scheduled: videosStarted,
    batchId,
    bulkJobId: bulkJob.id,
    videosScheduled: videosStarted,
    shortsScheduled: false,
    geminiClassify,
    languageScope,
    sourceCount: count,
    message: videosStarted
      ? `${count} kaynak için toplu güncelleme arka planda başladı${geminiClassify ? " (Gemini kategori + SEO)" : ""}${languageScope === "global" ? " · Global dil" : " · Yalnızca Türkçe"}`
      : "Toplu güncelleme zaten çalışıyor",
  });
});

router.post("/video/gemini/classify", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const limit = typeof body.limit === "number" ? body.limit : Number(body.limit) || 120;
  const asyncRun = body.async !== false;
  if (asyncRun) {
    setImmediate(() => {
      classifyVideosWithGemini({ limit }).catch((err) =>
        logger.warn({ err }, "[video] gemini classify async failed"),
      );
    });
    res.json({ ok: true, scheduled: true, limit, message: "Gemini kategori sınıflandırması arka planda başladı" });
    return;
  }
  try {
    const result = await classifyVideosWithGemini({ limit });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.warn({ err }, "[video] gemini classify failed");
    res.status(500).json({ error: "Gemini sınıflandırma başarısız" });
  }
});

/** Herkese açık: Yektube girişinde arka planda tüm kanallardan yeni videoları çek (throttle'lı) */
router.post("/video/refresh", async (_req, res): Promise<void> => {
  const now = Date.now();
  if (now - lastPublicVideoRefreshAt < PUBLIC_VIDEO_REFRESH_MS) {
    res.json({ ok: true, skipped: true, message: "Yakın zamanda güncellendi" });
    return;
  }
  if (bulkVideoUpdateRunning) {
    res.json({ ok: true, skipped: true, message: "Güncelleme devam ediyor" });
    return;
  }
  lastPublicVideoRefreshAt = now;
  const scheduled = scheduleYektubeContentRefresh({ geminiClassify: false });
  res.json({
    ok: true,
    scheduled: scheduled.videosStarted || scheduled.shortsStarted,
    videosScheduled: scheduled.videosStarted,
    shortsScheduled: scheduled.shortsStarted,
    message: "Videolar ve Yekçek arka planda güncelleniyor",
  });
});

/** Admin: Instagram Reels & TikTok kaynaklarını senkronla (Yekçek akışına ekler) */
router.post("/video/sync-social", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const asyncRun = req.body?.async !== false;
  if (isSocialSyncRunning()) {
    res.json({ ok: true, scheduled: false, message: "Sosyal medya senkronu zaten çalışıyor" });
    return;
  }
  if (asyncRun) {
    const started = scheduleSyncAllSocial();
    res.json({
      ok: true,
      scheduled: started,
      message: started
        ? "Instagram/TikTok kazıma arka planda başladı — videolar kaynak linkleriyle Yekçek akışına eklenir"
        : "Sosyal medya senkronu zaten çalışıyor",
    });
    return;
  }
  try {
    const result = await syncAllSocialSources();
    res.json({
      ok: true,
      ...result,
      message: `${result.upserted} sosyal video eklendi/güncellendi (${result.sources} kaynak)`,
    });
  } catch (err) {
    logger.error({ err }, "[video] sync-social failed");
    res.status(500).json({ error: "Sosyal medya senkronu başarısız" });
  }
});

/** Admin: Türkçe hit sosyal medya toplu kazıma (preset hesaplar + hashtag) */
router.get("/video/social-hit-presets", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  res.json(listTurkishSocialHitPresets());
});

router.post("/video/sync-social-hits", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const asyncRun = body.async !== false;
  const importPresetSources = body.importPresetSources !== false;
  const maxPerPlatform =
    typeof body.maxPerPlatform === "number" ? body.maxPerPlatform : Number(body.maxPerPlatform) || 120;

  if (isTurkishSocialHitsRunning()) {
    res.json({ ok: true, scheduled: false, message: "Türkçe hit kazıması zaten çalışıyor" });
    return;
  }

  const syncOpts = { importPresetSources, maxPerPlatform: Math.min(Math.max(maxPerPlatform, 20), 250) };

  if (asyncRun) {
    const started = scheduleTurkishSocialHits(syncOpts);
    res.json({
      ok: true,
      scheduled: started,
      message: started
        ? "Türkçe hit toplu kazıma başladı — popüler TR hesapları + #turkiye #kesfet hashtag'leri taranıyor"
        : "Türkçe hit kazıması zaten çalışıyor",
    });
    return;
  }

  try {
    const result = await syncTurkishSocialHits(syncOpts);
    const total = result.instagram.upserted + result.tiktok.upserted;
    res.json({
      ok: true,
      ...result,
      message: `✅ ${total} Türkçe hit video eklendi (IG: ${result.instagram.upserted}, TikTok: ${result.tiktok.upserted})`,
    });
  } catch (err) {
    logger.error({ err }, "[video] sync-social-hits failed");
    res.status(500).json({ error: "Türkçe hit kazıması başarısız" });
  }
});

/** Admin: tüm kanallardan shorts + hit akışı çek */
router.post("/video/sync-shorts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const asyncRun = req.body?.async !== false;
  if (isShortsSyncRunning()) {
    res.json({ ok: true, scheduled: false, message: "Shorts güncellemesi zaten çalışıyor" });
    return;
  }
  if (asyncRun) {
    const started = scheduleSyncAllShorts();
    res.json({
      ok: true,
      scheduled: started,
      message: started
        ? "Hit Shorts çekimi arka planda başladı — kanallardan ve popüler akıştan shorts alınıyor"
        : "Shorts güncellemesi zaten çalışıyor",
    });
    return;
  }
  try {
    const result = await syncAllChannelShorts();
    res.json({ ok: true, ...result, message: `${result.upserted} shorts eklendi/güncellendi` });
  } catch (err) {
    logger.error({ err }, "[video] sync-shorts failed");
    res.status(500).json({ error: "Shorts senkronu başarısız" });
  }
});

/** Shorts akışı — dikey kaydırma için (≤3 dk Yekçek videolar) */
router.get("/video/shorts", async (req, res): Promise<void> => {
  try {
  const limit = Math.min(Number(req.query.limit ?? 40) || 40, 100);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const categorySlug =
    typeof req.query.categorySlug === "string" && req.query.categorySlug.trim()
      ? req.query.categorySlug.trim()
      : undefined;
  const sourceId =
    typeof req.query.sourceId === "string" ? parseInt(req.query.sourceId, 10) : undefined;
  const mixChannels = req.query.mixChannels === "true" || req.query.mix === "true";
  const sessionSeed = parseShortsSessionSeed(
    typeof req.query.seed === "string" ? req.query.seed : undefined,
  ) ?? Math.floor(Math.random() * 1_000_000_000);
  const personalization = await resolveShortsPersonalization(
    req,
    typeof req.query.exclude === "string" ? req.query.exclude : undefined,
  );
  const excludeIds = personalization.excludeIds;
  const startVideoIdRaw =
    (typeof req.query.videoId === "string" ? req.query.videoId : typeof req.query.v === "string" ? req.query.v : "")
      .trim();
  const startVideoId = /^[a-zA-Z0-9_-]{11}$/.test(startVideoIdRaw) ? startVideoIdRaw : undefined;

  /** Global Yekçek — isStory indeksli hızlı yol (ağır havuz sorgusu ~20s sürüyordu) */
  if (mixChannels && !sourceId && !categorySlug && !startVideoId) {
    const cacheSuffix = offset === 0 ? `shorts-mix-fast:${limit}` : null;
    type ShortsPayload = {
      items: Awaited<ReturnType<typeof serializeVideosBatch>>;
      total: number;
      hasMore: boolean;
    };
    if (cacheSuffix) {
      const cached = await readYektubeCache<ShortsPayload>(cacheSuffix);
      if (cached?.items?.length) {
        let batch = cached.items;
        if (excludeIds.size > 0) {
          const narrowed = batch.filter((r) => !excludeIds.has(r.videoId));
          if (narrowed.length >= Math.min(limit, 3)) batch = narrowed;
        }
        if (personalization.personalized) {
          res.setHeader("x-yektube-shorts-personalized", "1");
        }
        res.setHeader("Cache-Control", "public, max-age=45, stale-while-revalidate=120");
        res.json({ items: batch.slice(0, limit), total: cached.total, hasMore: cached.hasMore });
        return;
      }
    }

    const scanOffset = offset > 0 ? Math.min(offset, 2400) : 0;
    const fastLimit = Math.min(Math.max(limit * 12, 120), 480);
    const fastRows = shuffleBySeed(
      await db
        .select()
        .from(videosTable)
        .where(and(eq(videosTable.active, true), embeddableVideoCondition, eq(videosTable.isStory, true)))
        .orderBy(desc(videosTable.id))
        .offset(scanOffset)
        .limit(fastLimit),
      sessionSeed + offset,
    );
    let filtered = dedupeVideosByVideoId(fastRows);
    if (excludeIds.size > 0) {
      const narrowed = filtered.filter((r) => !excludeIds.has(r.videoId));
      if (narrowed.length >= Math.min(limit, 6)) filtered = narrowed;
    }
    let items = mixShortsFeedPersonalized(filtered, limit, sessionSeed, personalization.recentSourceIds);
    if (items.length === 0 && filtered.length > 0) items = filtered.slice(0, limit);
    let serialized = await serializeVideosBatch(items);
    const payload: ShortsPayload = {
      items: serialized,
      total: filtered.length,
      hasMore: filtered.length > limit || fastRows.length === fastLimit,
    };
    if (serialized.length > 0 && cacheSuffix) {
      await writeYektubeCache(cacheSuffix, payload, 120);
    }
    if (personalization.personalized) {
      res.setHeader("x-yektube-shorts-personalized", "1");
    }
    res.setHeader("Cache-Control", "public, max-age=45, stale-while-revalidate=120");
    res.json({ items: serialized, total: payload.total, hasMore: payload.hasMore });
    return;
  }

  if (offset === 0 && !startVideoId) {
    setImmediate(() => {
      reclassifyRecentYekcekPool(2000).catch(() => undefined);
    });
  }

  const conds = [eq(videosTable.active, true), embeddableVideoCondition];
  await appendCategoryFilter(conds, categorySlug, { feedAligned: true });
  if (sourceId && !Number.isNaN(sourceId)) conds.push(eq(videosTable.sourceId, sourceId));
  /** ≤3 dk Yekçek havuzu — süresiz tüm videoları dahil etme (131k+ satırda sorgu çöküyordu) */
  const yekcekTitleHints = or(
    ilike(videosTable.title, "%short%"),
    ilike(videosTable.title, "%#short%"),
    ilike(videosTable.title, "%fragman%"),
    ilike(videosTable.title, "%kısa%"),
    ilike(videosTable.title, "%kisa%"),
    ilike(videosTable.title, "%teaser%"),
    ilike(videosTable.title, "%clip%"),
    ilike(videosTable.title, "%vertical%"),
  );
  const yekcekPoolCondition = or(
    eq(videosTable.isStory, true),
    sql`(${videosTable.duration} IS NOT NULL AND TRIM(${videosTable.duration}) != '' AND (
      ${videosTable.duration} LIKE '0:%' OR
      ${videosTable.duration} LIKE '1:%' OR
      ${videosTable.duration} LIKE '2:%' OR
      TRIM(${videosTable.duration}) = '3:00'
    ))`,
    yekcekTitleHints
      ? and(
          or(sql`${videosTable.duration} IS NULL`, sql`TRIM(${videosTable.duration}) = ''`),
          yekcekTitleHints,
        )
      : undefined,
  );
  if (yekcekPoolCondition) conds.push(yekcekPoolCondition);

  const where = and(...conds);
  const poolLimit = Math.min(Math.max(limit * 20, 400), 3200);
  const poolOrderSeed = sessionSeed + offset;

  let rows = shuffleBySeed(
    await db
      .select()
      .from(videosTable)
      .where(where)
      .orderBy(desc(videosTable.id))
      .limit(poolLimit),
    poolOrderSeed,
  );

  /** Kanal Yekçek sekmesi — SQL süzgeci kaçırırsa tüm kanal videolarından sınıflandır */
  if (rows.length === 0 && sourceId && !Number.isNaN(sourceId)) {
    rows = shuffleBySeed(
      await db
        .select()
        .from(videosTable)
        .where(and(eq(videosTable.active, true), eq(videosTable.sourceId, sourceId)))
        .orderBy(desc(videosTable.id))
        .limit(Math.min(800, poolLimit)),
      poolOrderSeed,
    );
  }

  await hydrateVideoDurationsAndClassify(
    rows.filter((r) => !r.duration?.trim()),
    Math.min(rows.length, 40),
  );

  let filtered = dedupeVideosByVideoId(
    rows.filter((r) => classifyAsYekcek({ title: r.title, duration: r.duration, isStory: r.isStory })),
  );

  /** Son eklenen uzun videolar havuzu boş bırakmasın — SQL havuzundan yedek al */
  if (filtered.length === 0 && rows.length > 0) {
    filtered = dedupeVideosByVideoId(rows);
  }
  if (filtered.length === 0 && !sourceId) {
    const scanOffset = Math.max(0, (poolOrderSeed % 12) * Math.floor(poolLimit / 2));
    const fallbackRows = shuffleBySeed(
      await db
        .select()
        .from(videosTable)
        .where(and(eq(videosTable.active, true), eq(videosTable.isStory, true)))
        .orderBy(desc(videosTable.id))
        .offset(scanOffset)
        .limit(poolLimit),
      poolOrderSeed + 1,
    );
    filtered = dedupeVideosByVideoId(fallbackRows);
    if (filtered.length === 0) {
      const broadRows = shuffleBySeed(
        await db
          .select()
          .from(videosTable)
          .where(eq(videosTable.active, true))
          .orderBy(desc(videosTable.id))
          .offset(scanOffset)
          .limit(Math.min(poolLimit, 1200)),
        poolOrderSeed + 2,
      );
      filtered = dedupeVideosByVideoId(
        broadRows.filter((r) => classifyAsYekcek({ title: r.title, duration: r.duration, isStory: r.isStory })),
      );
      if (filtered.length === 0 && broadRows.length > 0) {
        filtered = dedupeVideosByVideoId(broadRows.slice(0, limit * 8));
      }
    }
  }

  if (excludeIds.size > 0) {
    const narrowed = filtered.filter((r) => !excludeIds.has(r.videoId));
    if (narrowed.length >= Math.min(limit, 6)) filtered = narrowed;
  }

  if (startVideoId) {
    const hasStart = filtered.some((r) => r.videoId === startVideoId);
    if (!hasStart) {
      const [startRow] = await db
        .select()
        .from(videosTable)
        .where(and(eq(videosTable.active, true), eq(videosTable.videoId, startVideoId)))
        .limit(1);
      if (startRow) {
        await hydrateVideoDurationsAndClassify([startRow], 1);
        if (classifyAsYekcek({ title: startRow.title, duration: startRow.duration, isStory: startRow.isStory })) {
          filtered.unshift(startRow);
        }
      }
    } else {
      const startRow = filtered.find((r) => r.videoId === startVideoId)!;
      filtered = [startRow, ...filtered.filter((r) => r.videoId !== startVideoId)];
    }
  }

  const useShortsMix = mixChannels && !sourceId;
  const mixSeed = sessionSeed + offset;
  let items = useShortsMix
    ? mixShortsFeedPersonalized(filtered, limit, mixSeed, personalization.recentSourceIds)
    : mixShortsFeed(filtered, limit, mixSeed);
  if (items.length === 0 && filtered.length > 0) {
    items = filtered.slice(0, limit);
  }
  if (items.length === 0 && offset === 0 && !categorySlug && !sourceId && !startVideoId) {
    scheduleYektubeStartupRefresh("empty-shorts-feed");
  }

  // mixChannels karışımını bozmamak için Türkçe öncelik sıralamasını atla (spor/haber hep üstte kalıyordu)
  if (!useShortsMix) {
    items = sortByTurkishPriority(items);
  }

  let serialized = await serializeVideosBatch(items);
  if (serialized.length > 0) {
    serialized = await enrichSerializedVideoTitles(serialized);
  }

  if (personalization.personalized) {
    res.setHeader("x-yektube-shorts-personalized", "1");
  }

  res.json({
    items: serialized,
    total: filtered.length,
    hasMore: startVideoId ? false : rows.length === poolLimit || filtered.length > limit,
  });
  } catch (err) {
    logger.error({ err }, "[video] shorts failed");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/** Admin: süre backfill + Yekçek yeniden sınıflandırma (P2-D4) */
router.post("/video/reclassify-yekcek-durations", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const limit = Math.min(Math.max(Number(req.body?.limit ?? 2500) || 2500, 100), 10000);
  try {
    const updated = await reclassifyRecentYekcekPool(limit);
    res.json({
      ok: true,
      updated,
      limit,
      message: `${updated} video süre/Yekçek sınıfı güncellendi`,
    });
  } catch (err) {
    logger.error({ err }, "[video] reclassify-yekcek-durations failed");
    res.status(500).json({ error: "Yeniden sınıflandırma başarısız" });
  }
});

router.delete("/video/sources/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [current] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
    if (!current) {
      res.status(404).json({ error: "Kaynak bulunamadı" });
      return;
    }
    await deleteSourceById(id);
    res.sendStatus(204);
  } catch (err) {
    logger.warn({ err, id }, "[video] source delete failed");
    res.status(500).json({ error: "Kaynak silinemedi" });
  }
});

router.post("/video/cleanup", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const dryRun = req.body?.dryRun === true || req.query.dryRun === "1";
  try {
    const result = await runVideoTvCleanup({ dryRun });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[video] cleanup failed");
    res.status(500).json({ error: "Temizleme başarısız" });
  }
});

router.post("/video/fix-playback", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const podcastRows = await db
      .select()
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.sourceType, "podcast"));
    let reclassifiedPodcasts = 0;
    for (const row of podcastRows) {
      if (!shouldImportAsPodcast(row.name)) {
        await dualWriteYektubeUpdate(videoSourcesTable, { sourceType: "playlist" }, eq(videoSourcesTable.id, row.id));
        reclassifiedPodcasts++;
      }
    }

    const reactivated = await dualWriteYektubeUpdate(
      videosTable,
      { active: true },
      and(eq(videosTable.active, false), eq(videosTable.embedAllowed, false))!,
    );

    const embedAudited = await auditAndHideNonEmbeddableVideos(800).catch(() => 0);
    const titlesEnriched = await enrichPlaceholderTitles(300).catch(() => 0);
    const yekcekReclassified = await reclassifyRecentYekcekPool(2500).catch(() => 0);
    const categoryMerge = await mergeDuplicateCategorySlugs().catch(() => ({ sourcesUpdated: 0, videosUpdated: 0 }));
    const categoryReconciled = await reconcileVideoCategoriesFromSources().catch(() => 0);
    const categorySeed = await seedEmptyCategoryChannels(insertChannelPreset).catch(() => ({
      categoriesSeeded: 0,
      channelsAdded: 0,
    }));

    setImmediate(() => {
      backfillYoutubeCovers({
        limit: 400,
        loadSources: async () => db.select().from(videoSourcesTable).orderBy(videoSourcesTable.id),
        loadVideos: async () =>
          db.select().from(videosTable).where(eq(videosTable.active, true)).orderBy(desc(videosTable.id)).limit(6000),
        firstVideoThumbBySourceIds,
        updateDb: async (table, id, coverUrl) => {
          const url = normalizeYoutubeCoverUrl(coverUrl);
          if (!url) return;
          if (table === "sources") {
            await dualWriteYektubeUpdate(videoSourcesTable, { logoUrl: url }, eq(videoSourcesTable.id, id));
          } else {
            await dualWriteYektubeUpdate(videosTable, { thumbnail: url }, eq(videosTable.id, id));
          }
        },
      }).catch(() => undefined);
    });

    res.json({
      ok: true,
      reclassifiedPodcasts,
      videosReactivated: reactivated.length,
      embedAudited,
      titlesEnriched,
      yekcekReclassified,
      categoryMerge,
      categoryReconciled,
      categorySeed,
      coversBackfillScheduled: true,
    });
  } catch (err) {
    logger.error({ err }, "[video] fix-playback failed");
    res.status(500).json({ error: "Onarım başarısız" });
  }
});

router.post("/video/sources/:id/toggle", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [current] = await db
      .select()
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.id, id));
    if (!current) {
      res.status(404).json({ error: "Source not found" });
      return;
    }
    const nextActive = !current.active;
    const updated = await dualWriteYektubeUpdate(
      videoSourcesTable,
      { active: nextActive },
      eq(videoSourcesTable.id, id),
    );
    const row = updated[0] ?? { ...current, active: nextActive };
    res.json(serializeVideoSource(row));
  } catch (err) {
    logger.warn({ err, id }, "[video] source toggle failed");
    res.status(500).json({ error: "Kaynak durumu değiştirilemedi" });
  }
});

const PRESETS = mergeVideoTvChannelPresets(
  VIDEO_TV_PRESETS,
  VIDEO_TV_TOP_CHANNEL_SUPPLEMENT,
  VIDEO_TV_TOP_PODCAST_CHANNEL_SUPPLEMENT,
  VIDEO_TV_KIDS_CHANNEL_SUPPLEMENT,
);

async function insertChannelPreset(preset: VideoTvPreset): Promise<{ id: number; created: boolean } | null> {
  const channelId = preset.channelId.trim();
  if (!channelId) return null;
  const categorySlug = slugifyVideoCategory(preset.category) || preset.category || "eglence";
  const url = channelId.startsWith("@")
    ? `https://www.youtube.com/${channelId}`
    : channelId.startsWith("UC")
      ? `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`
      : undefined;

  const [row] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: preset.name.slice(0, 200),
    platform: "youtube",
    sourceType: "channel",
    channelId,
    url: url ?? null,
    logoUrl: preset.logoUrl ?? null,
    categorySlug,
    active: true,
    isLive: false,
    useYoutubeApi: true,
  });

  scheduleChannelFullContentSync(row.id);
  return { id: row.id, created: true };
}

async function insertLivePreset(preset: VideoTvLivePreset): Promise<{ id: number; created: boolean } | null> {
  const videoId = preset.videoId.trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  const categorySlug = slugifyVideoCategory(preset.category) || preset.category || "haberler";
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  const [row] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: preset.name.slice(0, 200),
    platform: "youtube",
    sourceType: "live",
    channelId: videoId,
    url,
    logoUrl: preset.logoUrl ?? livePresetThumbnail(videoId),
    categorySlug,
    active: true,
    isLive: true,
    useYoutubeApi: true,
  });

  return { id: row.id, created: true };
}

router.get("/video/presets", async (_req, res): Promise<void> => {
  res.json(PRESETS);
});

router.get("/video/presets/live", async (_req, res): Promise<void> => {
  res.json(VIDEO_TV_LIVE_PRESETS);
});

router.post("/video/presets/bulk-add-live", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const category =
    typeof body.category === "string" && body.category.trim() && body.category !== "all"
      ? slugifyVideoCategory(body.category.trim())
      : undefined;

  const existingRows = await db
    .select({ channelId: videoSourcesTable.channelId, name: videoSourcesTable.name })
    .from(videoSourcesTable)
    .where(eq(videoSourcesTable.platform, "youtube"));
  const existingIds = new Set(
    existingRows.map((r) => String(r.channelId ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const existingNames = new Set(existingRows.map((r) => String(r.name ?? "").trim().toLowerCase()).filter(Boolean));

  const candidates = VIDEO_TV_LIVE_PRESETS.filter((p) => !category || slugifyVideoCategory(p.category) === category);
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const preset of candidates) {
    const key = preset.videoId.trim().toLowerCase();
    const nameKey = preset.name.trim().toLowerCase();
    if (existingIds.has(key) || existingNames.has(nameKey)) {
      skipped++;
      continue;
    }
    try {
      const result = await insertLivePreset(preset);
      if (result) {
        added++;
        existingIds.add(key);
        existingNames.add(nameKey);
      }
    } catch (err) {
      errors.push(`${preset.name}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }

  res.json({
    ok: true,
    added,
    skipped,
    total: candidates.length,
    message:
      added > 0
        ? `${added} canlı TV kaynağı eklendi`
        : "Eklenecek yeni canlı kaynak bulunamadı",
    errors: errors.length > 0 ? errors.slice(0, 8) : undefined,
  });
});

router.get("/video/live/categories", async (_req, res): Promise<void> => {
  res.json(LIVE_TV_SEARCH_CATEGORIES);
});

router.get("/video/live/search", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limit = Math.min(Math.max(Number(req.query.limit ?? 15) || 15, 1), 50);
  if (!q) {
    res.json({ items: [] });
    return;
  }
  try {
    const items = await searchYoutubeLiveVideos(q, limit);
    res.json({ items });
  } catch (err) {
    logger.warn({ err, q }, "[video] live search failed");
    res.json({ items: [] });
  }
});

router.post("/video/live/import-search", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  try {
    const result = await importLiveFromYoutubeSearch({
      query: typeof body.query === "string" ? body.query : "",
      categoryKey: typeof body.categoryKey === "string" ? body.categoryKey : undefined,
      categorySlug: typeof body.categorySlug === "string" ? body.categorySlug : undefined,
      limit: typeof body.limit === "number" ? body.limit : Number(body.limit) || 12,
    });
    res.json({
      ok: true,
      ...result,
      message:
        result.added > 0
          ? `${result.added} canlı yayın eklendi (${result.found} bulundu)`
          : result.found > 0
            ? "Bulunan yayınların tamamı zaten kayıtlı"
            : "Canlı yayın bulunamadı — YouTube API anahtarını kontrol edin",
    });
  } catch (err) {
    logger.warn({ err }, "[video] live import-search failed");
    res.status(500).json({
      error: "Canlı yayın içe aktarımı başarısız",
      added: 0,
      skipped: 0,
      found: 0,
      errors: [err instanceof Error ? err.message : "hata"],
    });
  }
});

router.post("/video/live/normalize", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const result = await normalizeLiveVideoSources();
    res.json({
      ok: true,
      ...result,
      message: `${result.updated} canlı kaynak onarıldı (${result.recategorized} kategori düzeltildi)`,
    });
  } catch (err) {
    logger.warn({ err }, "[video] live normalize failed");
    res.status(500).json({ error: "Canlı kaynak onarımı başarısız", updated: 0 });
  }
});

router.post("/video/live/import-all-categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const limit = Math.min(Math.max(Number(body.limit ?? 15) || 15, 1), 50);
  try {
    const result = await importAllLiveCategories(limit);
    res.json({
      ok: true,
      ...result,
      message:
        result.added > 0
          ? `${result.added} canlı yayın eklendi (${result.categories} kategori tarandı)`
          : "Yeni kanal bulunamadı — mevcut kayıtlar veya API anahtarı kontrol edin",
    });
  } catch (err) {
    logger.warn({ err }, "[video] live import-all-categories failed");
    res.status(500).json({ error: "Kategori içe aktarımı başarısız", added: 0, skipped: 0, categories: 0, details: [] });
  }
});

router.post("/video/live/bootstrap", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  try {
    const result = await bootstrapLiveTv({
      importPresets: body.importPresets !== false,
      importCategories: body.importCategories !== false,
      normalize: body.normalize !== false,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.warn({ err }, "[video] live bootstrap failed");
    res.status(500).json({ error: "Canlı TV kurulumu başarısız", message: err instanceof Error ? err.message : "hata" });
  }
});

router.post("/video/presets/bulk-add", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const category =
    typeof body.category === "string" && body.category.trim() && body.category !== "all"
      ? slugifyVideoCategory(body.category.trim())
      : undefined;

  const existingRows = await db
    .select({ channelId: videoSourcesTable.channelId, name: videoSourcesTable.name })
    .from(videoSourcesTable)
    .where(eq(videoSourcesTable.platform, "youtube"));
  const existingIds = new Set(
    existingRows.map((r) => String(r.channelId ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const existingNames = new Set(existingRows.map((r) => String(r.name ?? "").trim().toLowerCase()).filter(Boolean));

  const candidates = PRESETS.filter((p) => !category || slugifyVideoCategory(p.category) === category);
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const preset of candidates) {
    const key = preset.channelId.trim().toLowerCase();
    const nameKey = preset.name.trim().toLowerCase();
    if (existingIds.has(key) || existingNames.has(nameKey)) {
      skipped++;
      continue;
    }
    try {
      const result = await insertChannelPreset(preset);
      if (result) {
        added++;
        existingIds.add(key);
        existingNames.add(nameKey);
      }
    } catch (err) {
      errors.push(`${preset.name}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }

  res.json({
    ok: true,
    added,
    skipped,
    total: candidates.length,
    message:
      added > 0
        ? `${added} kaynak eklendi — video, playlist, podcast ve shorts senkronu arka planda başladı`
        : "Eklenecek yeni kaynak bulunamadı",
    errors: errors.length > 0 ? errors.slice(0, 8) : undefined,
  });
});

/** Kategori başına en çok abonesi olan kanalları keşfeder, ekler; video/playlist/shorts senkronu tetikler */
router.post("/video/import-top-channels", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const perCategory = Math.min(Math.max(Number(body.perCategory ?? 10) || 10, 1), 20);
  const asyncRun = body.async !== false;
  const categoryFilter =
    typeof body.category === "string" && body.category.trim() && body.category !== "all"
      ? slugifyVideoCategory(body.category.trim())
      : undefined;
  const categories = categoryFilter ? [categoryFilter] : undefined;

  const runImport = async () => {
    const existingRows = await db
      .select({ channelId: videoSourcesTable.channelId, name: videoSourcesTable.name })
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.platform, "youtube"));
    const existingIds = new Set(
      existingRows.map((r) => String(r.channelId ?? "").trim().toLowerCase()).filter(Boolean),
    );
    const existingNames = new Set(existingRows.map((r) => String(r.name ?? "").trim().toLowerCase()).filter(Boolean));

    const byCategory = await buildTopChannelCandidatesAllCategories({ categories, perCategory });
    let added = 0;
    let skipped = 0;
    const addedByCategory: Record<string, number> = {};
    const errors: string[] = [];

    for (const [cat, candidates] of byCategory) {
      let catAdded = 0;
      for (const preset of candidates) {
        if (catAdded >= perCategory) break;
        const key = preset.channelId.trim().toLowerCase();
        const nameKey = preset.name.trim().toLowerCase();
        if (existingIds.has(key) || existingNames.has(nameKey)) {
          skipped++;
          continue;
        }
        try {
          const result = await insertChannelPreset(preset);
          if (result) {
            added++;
            catAdded++;
            addedByCategory[cat] = (addedByCategory[cat] ?? 0) + 1;
            existingIds.add(key);
            existingNames.add(nameKey);
          }
        } catch (err) {
          errors.push(`${preset.name}: ${err instanceof Error ? err.message : "hata"}`);
        }
      }
    }

    return { added, skipped, addedByCategory, errors };
  };

  const runImportWithMedia = async () => {
    const base = await runImport();
    let shortsUpserted = 0;
    let podcastListsCreated = 0;
    try {
      const shorts = await syncAllChannelShorts();
      shortsUpserted = shorts.upserted;
    } catch (err) {
      logger.warn({ err }, "[video] import-top-channels shorts sync failed");
    }
    try {
      const pods = await syncAllChannelPlaylistsAndPodcasts();
      podcastListsCreated = pods.created;
    } catch (err) {
      logger.warn({ err }, "[video] import-top-channels podcast sync failed");
    }
    return { ...base, shortsUpserted, podcastListsCreated };
  };

  if (asyncRun) {
    setImmediate(() => {
      runImportWithMedia()
        .then((r) => logger.info(r, "[video] import-top-channels tamam"))
        .catch((err) => logger.error({ err }, "[video] import-top-channels failed"));
    });
    res.json({
      ok: true,
      scheduled: true,
      message: `Kategori başına top kanallar arka planda ekleniyor — videolar, playlistler, podcastler ve Shorts senkronlanacak`,
    });
    return;
  }

  try {
    const result = await runImportWithMedia();
    res.json({
      ok: true,
      ...result,
      message:
        result.added > 0
          ? `${result.added} top kanal eklendi — ${result.shortsUpserted} shorts, ${result.podcastListsCreated} podcast/playlist kaynağı senkronlandı`
          : "Eklenecek yeni top kanal bulunamadı (mevcut kayıtlar dolu olabilir)",
      errors: result.errors.length > 0 ? result.errors.slice(0, 8) : undefined,
    });
  } catch (err) {
    logger.error({ err }, "[video] import-top-channels sync failed");
    res.status(500).json({ error: "Top kanal içe aktarma başarısız" });
  }
});

router.get("/video/videos/random", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 16) || 16, 50);
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim() : undefined;
  const excludeRaw = typeof req.query.exclude === "string" ? req.query.exclude : "";
  const excludeIds = excludeRaw
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  const conds = [eq(videosTable.active, true), embeddableVideoCondition];
  await appendCategoryFilter(conds, categorySlug, { feedAligned: true });
  if (excludeIds.length > 0) conds.push(notInArray(videosTable.id, excludeIds));

  const rows = await db
    .select()
    .from(videosTable)
    .where(and(...conds))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  res.json({ items: rows.map((row) => serializeVideo(row)), total: rows.length });
});

router.get("/video/youtube-meta/:youtubeVideoId", async (req, res): Promise<void> => {
  const youtubeVideoId = String(req.params.youtubeVideoId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(youtubeVideoId)) {
    res.status(400).json({ error: "Geçersiz video ID" });
    return;
  }
  const map = await fetchYoutubeVideoSnippetMap([youtubeVideoId]);
  const meta = map.get(youtubeVideoId);
  if (!meta) {
    if (await proxyYoutubeRequestToFallback(req, res)) return;
    res.status(404).json({ error: "Video meta bulunamadı" });
    return;
  }
  res.json(meta);
});

/** Google Translate ile SEO meta — orijinal başlık DB/UI'da kalır */
router.get("/video/seo-meta/status", async (_req, res): Promise<void> => {
  res.json({ googleTranslateConfigured: await googleTranslateConfigured() });
});

/** Admin: senkron kuyruğu — kazıma/API işlemlerinin durumu */
router.get("/video/sync-queue", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const batchId = typeof req.query.batchId === "string" ? req.query.batchId.trim() : undefined;
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 250);
  res.json(getYektubeSyncQueue({ batchId, limit }));
});

/** YouTube Data API vs kazıma — admin araçları için durum */
router.get("/video/sync-capabilities", async (_req, res): Promise<void> => {
  const apiKey = await resolveYoutubeApiKey();
  res.json({
    hasYoutubeApiKey: Boolean(apiKey),
    apiWarning: apiKey ? null : youtubeMissingApiKeyWarning(),
    modes: {
      api: "YouTube Data API v3 — tam geçmiş, embed politikası uygulanır",
      rss: "Atom RSS — son ~15 video, API anahtarı gerekmez",
      scrape: "HTML kazıma — en fazla 200 video, API anahtarı gerekmez",
    },
  });
});

router.get("/video/seo-meta/:youtubeVideoId", async (req, res): Promise<void> => {
  const youtubeVideoId = normalizeYoutubeVideoId(String(req.params.youtubeVideoId ?? "").trim()) ?? "";
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(youtubeVideoId)) {
    res.status(400).json({ error: "Geçersiz video ID" });
    return;
  }

  const dbIdRaw = typeof req.query.dbId === "string" ? parseInt(req.query.dbId, 10) : NaN;
  const dbId = Number.isFinite(dbIdRaw) && dbIdRaw > 0 ? dbIdRaw : undefined;
  const pageUrl = typeof req.query.pageUrl === "string" ? req.query.pageUrl.trim().slice(0, 2048) : undefined;

  let title = typeof req.query.title === "string" ? req.query.title.trim() : "";
  let description = typeof req.query.description === "string" ? req.query.description.trim() : "";
  let channelName = typeof req.query.channelName === "string" ? req.query.channelName.trim() : "";
  let thumbnail = typeof req.query.thumbnail === "string" ? req.query.thumbnail.trim() : "";
  let duration = typeof req.query.duration === "string" ? req.query.duration.trim() : "";
  let publishedAt = typeof req.query.publishedAt === "string" ? req.query.publishedAt.trim() : "";
  let categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim() : "";

  if (dbId) {
    const [row] = await db.select().from(videosTable).where(eq(videosTable.id, dbId)).limit(1);
    if (row && row.videoId === youtubeVideoId) {
      title = title || row.title;
      description = description || row.description || "";
      channelName = channelName || row.channelName || "";
      thumbnail = thumbnail || row.thumbnail || "";
      duration = duration || row.duration || "";
      publishedAt = publishedAt || row.publishedAt || "";
      categorySlug = categorySlug || row.categorySlug || "";
    }
  }

  if (!title) {
    const map = await fetchYoutubeVideoSnippetMap([youtubeVideoId]);
    const sn = map.get(youtubeVideoId);
    if (sn?.title) title = sn.title;
    if (sn?.description) description = description || sn.description;
    if (sn?.thumbnail) thumbnail = thumbnail || sn.thumbnail;
    if (sn?.duration) duration = duration || sn.duration || "";
  }

  if (!title) {
    res.status(404).json({ error: "Video meta bulunamadı" });
    return;
  }

  try {
    const meta = await resolveVideoSeoMeta({
      dbId,
      youtubeVideoId,
      title,
      description: description || null,
      channelName: channelName || null,
      thumbnail: thumbnail || null,
      duration: duration || null,
      publishedAt: publishedAt || null,
      categorySlug: categorySlug || undefined,
      pageUrl,
    });
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.json(meta);
  } catch (err) {
    logger.warn({ err, youtubeVideoId }, "[video] seo-meta failed");
    res.status(502).json({ error: "SEO meta üretilemedi" });
  }
});

router.get("/video/youtube-engagement/:youtubeVideoId", async (req, res): Promise<void> => {
  const youtubeVideoId = String(req.params.youtubeVideoId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(youtubeVideoId)) {
    res.status(400).json({ error: "Geçersiz video ID" });
    return;
  }
  try {
    const cached = readYoutubeVideoEngagementCache(youtubeVideoId);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("X-Engagement-Cache", cached.fresh ? "hit" : "stale");
      if (cached.stale) refreshYoutubeVideoEngagementBackground(youtubeVideoId);
      res.json(cached.data);
      return;
    }
    const data = await getYoutubeVideoEngagement(youtubeVideoId);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("X-Engagement-Cache", "miss");
    res.json(data);
  } catch (err) {
    const stale = readYoutubeVideoEngagementCache(youtubeVideoId);
    if (stale) {
      logger.warn({ err, youtubeVideoId }, "[video] youtube-engagement failed — serving stale cache");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("X-Engagement-Cache", "stale-fallback");
      res.json(stale.data);
      return;
    }
    logger.warn({ err, youtubeVideoId }, "[video] youtube-engagement failed");
    res.status(502).json({ error: "YouTube etkileşim verisi alınamadı" });
  }
});

/** Yalnızca YouTube yorumları — izleme sayfası (Invidious öncelikli, ~8s). */
router.get("/video/youtube-comments/:youtubeVideoId", async (req, res): Promise<void> => {
  const youtubeVideoId = String(req.params.youtubeVideoId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(youtubeVideoId)) {
    res.status(400).json({ error: "Geçersiz video ID" });
    return;
  }
  try {
    const data = await getYoutubeVideoCommentsOnly(youtubeVideoId);
    res.json(data);
  } catch (err) {
    logger.warn({ err, youtubeVideoId }, "[video] youtube-comments failed");
    try {
      const engagement = await getYoutubeVideoEngagement(youtubeVideoId);
      res.json({
        videoId: youtubeVideoId,
        comments: engagement.comments ?? [],
        commentCount: engagement.commentCount,
      });
    } catch {
      res.json({ videoId: youtubeVideoId, comments: [], commentCount: null });
    }
  }
});

/** Video kapak — ytimg proxy + uzun önbellek (thumbnail CDN) */
router.get("/video/thumb/:videoId.jpg", async (req, res): Promise<void> => {
  const raw = String(req.params.videoId ?? "").trim();
  const youtubeVideoId = normalizeYoutubeVideoId(raw) ?? raw;
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(youtubeVideoId)) {
    res.status(400).end();
    return;
  }
  const quality = req.query.q === "hq" ? "hqdefault" : req.query.q === "sd" ? "sddefault" : "mqdefault";
  const upstreamUrl = `https://i.ytimg.com/vi/${encodeURIComponent(youtubeVideoId)}/${quality}.jpg`;
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).end();
      return;
    }
    const ct = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    if (upstream.body) {
      const { Readable } = await import("node:stream");
      Readable.fromWeb(upstream.body as import("stream/web").ReadableStream).pipe(res);
    } else {
      res.status(502).end();
    }
  } catch (err) {
    logger.warn({ err, youtubeVideoId }, "[video] thumb proxy failed");
    res.status(502).end();
  }
});

/** Türkçe altyazı — WebVTT (native oynatıcı track) */
router.get("/video/youtube-captions/:youtubeVideoId/tr.vtt", async (req, res): Promise<void> => {
  const raw = String(req.params.youtubeVideoId ?? "").trim();
  const youtubeVideoId = normalizeYoutubeVideoId(raw) ?? raw;
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(youtubeVideoId)) {
    res.status(400).json({ error: "Geçersiz video ID" });
    return;
  }
  const cacheSuffix = `captions-vtt:${youtubeVideoId}`;
  try {
    const cached = await readYektubeCache<string>(cacheSuffix);
    if (cached) {
      res.setHeader("Content-Type", "text/vtt; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.send(cached);
      return;
    }

    const vtt = await fetchYoutubeTurkishCaptionsVtt(youtubeVideoId);
    if (!vtt) {
      res.status(404).json({ error: "Türkçe altyazı bulunamadı" });
      return;
    }
    await writeYektubeCache(cacheSuffix, vtt, 3600);
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.send(vtt);
  } catch (err) {
    logger.warn({ err, youtubeVideoId }, "[video] youtube-captions failed");
    res.status(502).json({ error: "Altyazı alınamadı" });
  }
});

router.get("/video/youtube-stream/:youtubeVideoId", async (req, res): Promise<void> => {
  const raw = String(req.params.youtubeVideoId ?? "").trim();
  const force = req.query.force === "1";
  const preferAudio = req.query.audio === "1";
  const forLive = req.query.live === "1";
  const youtubeVideoId = normalizeYoutubeVideoId(raw) ?? raw;
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeVideoId)) {
    res.status(400).json({ error: "Geçersiz video ID" });
    return;
  }
  if (force) invalidateStreamCache(youtubeVideoId);
  try {
    /* YouTube bu barındırıcıdan erişilemiyorsa (devre açık) beklemeden fallback'e vekille. */
    if (shouldSkipLocalYoutubeResolve() && (await proxyYoutubeRequestToFallback(req, res))) return;
    const stream = await withLocalResolveBudget(
      forLive
        ? resolveYoutubeLiveStreamUrl(youtubeVideoId)
        : resolveYoutubeStreamUrl(youtubeVideoId, { preferAudio }),
    );
    if (stream === "budget-exceeded") {
      /* Yerel çözümleme çok yavaş — fallback varsa oradan yanıtla (çözümleme cache için sürer). */
      noteYoutubeResolveFailure();
      logYoutubeStreamMetric("resolve_budget_exceeded", youtubeVideoId, { preferAudio, force, forLive });
      if (await proxyYoutubeRequestToFallback(req, res)) return;
      res.status(404).json({ error: "Video akışı alınamadı" });
      return;
    }
    if (stream) {
      noteYoutubeResolveSuccess();
      logYoutubeStreamMetric("resolve_ok", youtubeVideoId, { preferAudio, force, forLive, source: stream.source });
      res.json(stream);
      return;
    }
    noteYoutubeResolveFailure();
    logYoutubeStreamMetric("resolve_miss", youtubeVideoId, { preferAudio, force, forLive });
    if (await proxyYoutubeRequestToFallback(req, res)) return;
    res.status(404).json({ error: "Video akışı alınamadı" });
  } catch (err) {
    logYoutubeStreamMetric("resolve_error", youtubeVideoId, {
      preferAudio,
      force,
      err: err instanceof Error ? err.message : String(err),
    });
    logger.warn({ err, youtubeVideoId }, "[video] youtube-stream failed");
    if (await proxyYoutubeRequestToFallback(req, res)) return;
    res.status(502).json({ error: "Video akışı çözümlenemedi" });
  }
});

/** HTML5 video için proxy — embed kapalı videolar dahil (Referer + Range) */
router.get("/video/youtube-stream/:youtubeVideoId/play", async (req, res): Promise<void> => {
  const raw = String(req.params.youtubeVideoId ?? "").trim();
  const force = req.query.force === "1";
  const preferAudio = req.query.audio === "1";
  const forLive = req.query.live === "1";
  const youtubeVideoId = normalizeYoutubeVideoId(raw) ?? raw;
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeVideoId)) {
    res.status(400).json({ error: "Geçersiz video ID" });
    return;
  }
  if (force) invalidateStreamCache(youtubeVideoId);

  try {
    /* YouTube bu barındırıcıdan erişilemiyorsa (devre açık) beklemeden fallback'e vekille. */
    if (shouldSkipLocalYoutubeResolve() && (await proxyYoutubeRequestToFallback(req, res, { timeoutMs: 90_000 }))) return;
    const resolved = await withLocalResolveBudget(
      (async () => {
        const liveStream = forLive ? await resolveYoutubeLiveStreamUrl(youtubeVideoId) : null;
        return liveStream ?? (await resolveYoutubeStreamUrl(youtubeVideoId, { preferAudio }));
      })(),
    );
    if (resolved === "budget-exceeded") {
      noteYoutubeResolveFailure();
      logYoutubeStreamMetric("resolve_budget_exceeded", youtubeVideoId, { preferAudio, force, endpoint: "play", forLive });
      if (await proxyYoutubeRequestToFallback(req, res, { timeoutMs: 90_000 })) return;
      res.status(404).json({ error: "Video akışı alınamadı" });
      return;
    }
    const stream = resolved;
    if (!stream?.url) {
      noteYoutubeResolveFailure();
      logYoutubeStreamMetric("resolve_miss", youtubeVideoId, { preferAudio, force, endpoint: "play", forLive });
      if (await proxyYoutubeRequestToFallback(req, res, { timeoutMs: 90_000 })) return;
      res.status(404).json({ error: "Video akışı alınamadı" });
      return;
    }
    noteYoutubeResolveSuccess();

    const proxyUrl = preferAudio && stream.audioUrl ? stream.audioUrl : stream.url;
    const range = typeof req.headers.range === "string" ? req.headers.range : undefined;
    const upstream = await fetchYoutubeStreamUpstream(proxyUrl, range);

    if (!upstream.ok && upstream.status !== 206) {
      invalidateStreamCache(youtubeVideoId);
      logYoutubeStreamMetric("play_upstream_error", youtubeVideoId, {
        upstreamStatus: upstream.status,
        preferAudio,
        force,
      });
      res.status(upstream.status === 403 ? 502 : upstream.status).json({ error: "Akış okunamadı" });
      return;
    }

    const ct = upstream.headers.get("content-type") ?? stream.mimeType;
    if (ct) res.setHeader("Content-Type", ct);
    const cl = upstream.headers.get("content-length");
    if (cl) res.setHeader("Content-Length", cl);
    const cr = upstream.headers.get("content-range");
    if (cr) res.setHeader("Content-Range", cr);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-store");

    if (upstream.body) {
      res.status(upstream.status);
      const { Readable } = await import("node:stream");
      const readable = Readable.fromWeb(upstream.body as import("stream/web").ReadableStream);
      readable.on("error", (streamErr) => {
        logYoutubeStreamMetric("play_pipe_error", youtubeVideoId, {
          err: streamErr instanceof Error ? streamErr.message : String(streamErr),
        });
        logger.warn({ err: streamErr, youtubeVideoId }, "[video] youtube-stream play pipe error");
        if (!res.headersSent) res.status(502).json({ error: "Video oynatılamadı" });
        else res.end();
      });
      res.on("close", () => {
        if (!readable.destroyed) readable.destroy();
      });
      readable.pipe(res);
    } else {
      res.status(502).end();
    }
  } catch (err) {
    logYoutubeStreamMetric("resolve_error", youtubeVideoId, {
      endpoint: "play",
      preferAudio,
      force,
      err: err instanceof Error ? err.message : String(err),
    });
    logger.warn({ err, youtubeVideoId }, "[video] youtube-stream play failed");
    if (!res.headersSent && (await proxyYoutubeRequestToFallback(req, res, { timeoutMs: 90_000 }))) return;
    if (!res.headersSent) res.status(502).json({ error: "Video oynatılamadı" });
  }
});

router.get("/video/videos/:id/similar", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 8) || 8, 24);
  const [current] = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Video bulunamadı" });
    return;
  }

  const currentIsYekcek = classifyAsYekcek({
    isStory: current.isStory,
    title: current.title,
    duration: current.duration,
  });

  const pickSimilar = (rows: typeof current[]) =>
    rows
      .map((row) => serializeVideo(row))
      .filter((v) =>
        currentIsYekcek
          ? classifyAsYekcek({ isStory: v.isStory, title: v.title, duration: v.duration })
          : isLongFormVideo({ isStory: v.isStory, title: v.title, duration: v.duration }),
      );

  const baseConds = [eq(videosTable.active, true), embeddableVideoCondition, notInArray(videosTable.id, [id])];
  if (currentIsYekcek) {
    baseConds.push(eq(videosTable.isStory, true));
  } else {
    baseConds.push(eq(videosTable.isStory, false));
    baseConds.push(sql`${videosTable.title} NOT ILIKE 'Short %'`);
  }
  if (current.categorySlug) baseConds.push(eq(videosTable.categorySlug, current.categorySlug));

  const excludeIds = new Set<number>([id]);
  let items: ReturnType<typeof serializeVideo>[] = [];

  // 1) Aynı kategori, farklı kanallar
  if (current.sourceId) {
    const otherSourceConds = [...baseConds, notInArray(videosTable.sourceId, [current.sourceId])];
    const rows = await db
      .select()
      .from(videosTable)
      .where(and(...otherSourceConds))
      .orderBy(desc(videosTable.publishedAt), desc(videosTable.id))
      .limit(Math.min(limit * 6, 72));
    for (const v of pickSimilar(rows)) {
      if (items.length >= limit) break;
      if (excludeIds.has(v.id)) continue;
      items.push(v);
      excludeIds.add(v.id);
    }
  }

  // 2) Hâlâ azsa — aynı kategoriden uzun videolar (aynı kanal dahil, yalnızca uzun)
  if (items.length < limit && current.categorySlug) {
    const rows = await db
      .select()
      .from(videosTable)
      .where(and(...baseConds, notInArray(videosTable.id, [...excludeIds])))
      .orderBy(desc(videosTable.publishedAt), desc(videosTable.id))
      .limit(Math.min((limit - items.length) * 4, 48));
    for (const v of pickSimilar(rows)) {
      if (items.length >= limit) break;
      if (excludeIds.has(v.id)) continue;
      items.push(v);
      excludeIds.add(v.id);
    }
  }

  // 3) Kategori yoksa — kaynak içi uzun videolar (shorts hariç)
  if (items.length < limit && current.sourceId && !current.categorySlug) {
    const rows = await db
      .select()
      .from(videosTable)
      .where(
        and(
          eq(videosTable.active, true),
          embeddableVideoCondition,
          eq(videosTable.sourceId, current.sourceId),
          notInArray(videosTable.id, [...excludeIds]),
          currentIsYekcek ? eq(videosTable.isStory, true) : eq(videosTable.isStory, false),
          currentIsYekcek ? sql`true` : sql`${videosTable.title} NOT ILIKE 'Short %'`,
        ),
      )
      .orderBy(desc(videosTable.id))
      .limit(limit - items.length);
    for (const v of pickSimilar(rows)) {
      if (items.length >= limit) break;
      items.push(v);
    }
  }

  items = await enrichSerializedVideoTitles(items);
  items = items
    .filter((v) =>
      currentIsYekcek
        ? classifyAsYekcek({ isStory: v.isStory, title: v.title, duration: v.duration })
        : isLongFormVideo({ isStory: v.isStory, title: v.title, duration: v.duration }),
    );

  const scoreTr = (v: (typeof items)[number]) =>
    turkishContentScore(v.title, v.description, v.channelName ?? v.sourceName);

  // Türkçe benzer içerik önceliği — yabancı (ör. Tay/İngilizce) GMMTV vb. yerine TR videolar
  if (items.length < limit && current.categorySlug) {
    const trRows = await db
      .select()
      .from(videosTable)
      .where(and(...baseConds, notInArray(videosTable.id, [...excludeIds])))
      .orderBy(desc(videosTable.publishedAt), desc(videosTable.id))
      .limit(Math.min(limit * 12, 144));
    for (const v of sortByTurkishPriority(pickSimilar(trRows)).filter((row) => scoreTr(row) > 0)) {
      if (items.length >= limit) break;
      if (excludeIds.has(v.id)) continue;
      items.push(v);
      excludeIds.add(v.id);
    }
  }

  items = sortByTurkishPriority(items);
  const turkishOnly = items.filter((v) => scoreTr(v) > 0);
  if (turkishOnly.length >= Math.min(4, limit)) {
    items = turkishOnly;
  }
  items = items.slice(0, limit);

  res.json({ items, total: items.length });
});

/** Aynı kanaldan diğer videolar — izleme sayfası alt paneli */
router.get("/video/videos/:id/channel-more", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 12) || 12, 48);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const [current] = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (!current?.sourceId) {
    res.json({ items: [], total: 0, hasMore: false });
    return;
  }

  const conds = [
    eq(videosTable.active, true),
    embeddableVideoCondition,
    eq(videosTable.sourceId, current.sourceId),
    notInArray(videosTable.id, [id]),
    eq(videosTable.isStory, false),
    sql`${videosTable.title} NOT ILIKE 'Short %'`,
  ];

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(videosTable)
      .where(and(...conds))
      .orderBy(desc(videosTable.publishedAt), desc(videosTable.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(videosTable)
      .where(and(...conds)),
  ]);

  let items = rows
    .filter((r) => isLongFormVideo({ isStory: r.isStory, title: r.title, duration: r.duration }))
    .map((row) => serializeVideo(row));
  items = await enrichSerializedVideoTitles(items);
  const total = countRow[0]?.count ?? 0;

  res.json({
    items,
    total,
    hasMore: offset + items.length < total,
  });
});

/** Yekpare arama — önce DB, yoksa YouTube'dan çekip kaydeder */
router.get("/video/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json({ items: [], total: 0, localCount: 0, importedCount: 0 });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 24) || 24, 50);
  const excludeStories = req.query.excludeStories !== "false";
  const importFromYoutube = req.query.importFromYoutube !== "false";
  try {
    const result = await searchYektubeVideos(q, { limit, excludeStories, importFromYoutube });
    res.json(result);
  } catch (err) {
    logger.warn({ err, q }, "[video] search failed");
    res.json({ items: [], total: 0, localCount: 0, importedCount: 0 });
  }
});

/** Haber haritası — video oynatıldığında YekTube'a kaydet (haber kategorisi). */
router.post("/video/haber-haritasi/register-play", async (req, res): Promise<void> => {
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const videoId = String(body.videoId ?? "").trim();
  if (!videoId) {
    res.status(400).json({ ok: false, error: "videoId required" });
    return;
  }
  const categorySlug = typeof body.categorySlug === "string" && body.categorySlug.trim()
    ? body.categorySlug.trim()
    : "haberler";
  try {
    const item = await importYoutubeVideoById(videoId, { categorySlug });
    res.json({ ok: true, item });
  } catch (err) {
    logger.warn({ err, videoId }, "[video] haber-haritasi register-play failed");
    res.status(500).json({ ok: false, error: "register_failed" });
  }
});

/** Eksik kanal/playlist/video kapaklarını YouTube'dan alıp DB'ye yazar */
router.post("/video/backfill-covers", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const asyncRun = body.async !== false;
  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.map((x) => parseInt(String(x), 10)).filter((n) => !Number.isNaN(n))
    : undefined;

  const run = async () =>
    backfillYoutubeCovers({
      sourceIds,
      limit: typeof body.limit === "number" ? body.limit : 500,
      loadSources: async () => db.select().from(videoSourcesTable).orderBy(videoSourcesTable.id),
      loadVideos: async (ids) => {
        if (ids?.length) {
          return db
            .select()
            .from(videosTable)
            .where(and(eq(videosTable.active, true), inArray(videosTable.sourceId, ids)))
            .orderBy(desc(videosTable.id));
        }
        return db.select().from(videosTable).where(eq(videosTable.active, true)).orderBy(desc(videosTable.id));
      },
      firstVideoThumbBySourceIds,
      updateDb: async (table, id, coverUrl) => {
        const url = normalizeYoutubeCoverUrl(coverUrl);
        if (!url) return;
        if (table === "sources") {
          await dualWriteYektubeUpdate(videoSourcesTable, { logoUrl: url }, eq(videoSourcesTable.id, id));
        } else {
          await dualWriteYektubeUpdate(videosTable, { thumbnail: url }, eq(videosTable.id, id));
        }
      },
    });

  if (asyncRun) {
    setImmediate(() => {
      run().catch(() => undefined);
    });
    res.json({ ok: true, scheduled: true, message: "Kapak güncelleme arka planda başladı" });
    return;
  }

  const stats = await run();
  res.json({ ok: true, ...stats });
});

/**
 * Sıcak public video listesi yanıt önbelleği — haber haritası / vitrin havuzu
 * (limit=200&newsOnly=true...) her sayfa açılışında aynı ağır sorguyu tetikliyordu.
 * Arama içeren istekler önbelleklenmez; veri publictir, oturuma bağlı değildir.
 */
const VIDEO_LIST_RESPONSE_TTL_MS = 45_000;
const VIDEO_LIST_RESPONSE_MAX_ENTRIES = 200;
const videoListResponseCache = new Map<string, { expiresAt: number; body: unknown }>();

function serveVideoListCached(req: Request, res: Response): boolean {
  if (req.method !== "GET") return false;
  if (String(req.query.search ?? "").trim()) return false;
  const key = String(req.originalUrl ?? req.url ?? "");
  if (!key) return false;

  const hit = videoListResponseCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
    res.setHeader("X-Yekpare-Cache", "hit");
    res.json(hit.body);
    return true;
  }
  if (hit) videoListResponseCache.delete(key);

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 200) {
      if (videoListResponseCache.size >= VIDEO_LIST_RESPONSE_MAX_ENTRIES) {
        const oldestKey = videoListResponseCache.keys().next().value;
        if (oldestKey !== undefined) videoListResponseCache.delete(oldestKey);
      }
      videoListResponseCache.set(key, { expiresAt: Date.now() + VIDEO_LIST_RESPONSE_TTL_MS, body });
    }
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
    return originalJson(body);
  }) as typeof res.json;
  return false;
}

router.get("/video/videos", async (req, res): Promise<void> => {
  if (serveVideoListCached(req, res)) return;
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug : undefined;
  const sourceId = typeof req.query.sourceId === "string" ? parseInt(req.query.sourceId) : undefined;
  const featured = req.query.featured === "true";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const storiesOnly = req.query.storiesOnly === "true";
  const isChannelScoped = sourceId != null && !Number.isNaN(sourceId);
  const includeStories = req.query.includeStories === "true";
  const browseCategory = Boolean(categorySlug && categorySlug !== "all");
  const excludeStories =
    storiesOnly || includeStories
      ? false
      : req.query.excludeStories === "false"
        ? false
        : req.query.excludeStories === "true"
          ? true
          : !isChannelScoped && !search;
  const longFormOnly = req.query.longFormOnly === "true";
  const enrichTitles =
    req.query.enrichTitles === "true" || longFormOnly || isChannelScoped;
  const mixChannels = req.query.mixChannels === "true" || req.query.mix === "true";
  const strictCategory = req.query.strictCategory === "true";
  const newsOnly = req.query.newsOnly === "true";
  const newsFirst = !newsOnly && req.query.newsFirst === "true";
  const platformFilter =
    typeof req.query.platform === "string" ? req.query.platform.trim().toLowerCase() : undefined;
  const maxLimit =
    sourceId && !Number.isNaN(sourceId) ? 500 : browseCategory ? 500 : 100;
  const limit = Math.min(Number(req.query.limit ?? 24) || 24, maxLimit);
  const offset = Number(req.query.offset ?? 0) || 0;

  /**
   * İzleme sayfası `resolveVideo` tam 11 karakterlik YouTube video ID'si ile arar.
   * 4 kolonda `ilike '%id%'` + count taraması bazı ortamlarda 15-20sn sürüyordu;
   * indeksli eşitlik araması ile anında dön.
   */
  if (search && /^[A-Za-z0-9_-]{11}$/.test(search)) {
    const exactRows = await db
      .select()
      .from(videosTable)
      .where(and(eq(videosTable.active, true), embeddableVideoCondition, eq(videosTable.videoId, search)))
      .orderBy(desc(videosTable.id))
      .limit(limit);
    if (exactRows.length > 0) {
      res.json({ items: await serializeVideosBatch(exactRows), total: exactRows.length });
      return;
    }
  }

  if (browseCategory && offset === 0) {
    setImmediate(() => {
      reclassifyRecentYekcekPool(300).catch(() => undefined);
    });
  }

  if (isChannelScoped && offset === 0) {
    setImmediate(() => {
      enrichAndClassifySourceVideos(sourceId).catch(() => undefined);
      reclassifyYekcekForSource(sourceId).catch(() => undefined);
    });
  }

  const categoryFeedAligned = browseCategory && !(sourceId && !Number.isNaN(sourceId));
  const categorySourceIds = categoryFeedAligned && categorySlug
    ? new Set(await getActiveSourceIdsForCategory(categorySlug))
    : null;

  const conds = [eq(videosTable.active, true), embeddableVideoCondition];
  await appendCategoryFilter(conds, categorySlug, { feedAligned: categoryFeedAligned });
  if (platformFilter === "instagram" || platformFilter === "tiktok") {
    conds.push(eq(videosTable.platform, platformFilter));
  } else if (platformFilter === "social") {
    conds.push(or(eq(videosTable.platform, "instagram"), eq(videosTable.platform, "tiktok"))!);
  }
  const feedSeed = parseShortsSessionSeed(typeof req.query.seed === "string" ? req.query.seed : undefined);
  if (sourceId && !Number.isNaN(sourceId)) conds.push(eq(videosTable.sourceId, sourceId));
  if (featured) conds.push(eq(videosTable.isFeatured, true));
  if (storiesOnly) conds.push(eq(videosTable.isStory, true));
  if (excludeStories || longFormOnly) conds.push(eq(videosTable.isStory, false));
  if (longFormOnly) conds.push(sql`${videosTable.title} NOT ILIKE 'Short %'`);
  if (search) {
    const searchCond = or(
      ilike(videosTable.title, `%${search}%`),
      ilike(videosTable.description, `%${search}%`),
      ilike(videosTable.channelName, `%${search}%`),
      ilike(videosTable.videoId, `%${search}%`),
    );
    if (searchCond) conds.push(searchCond);
  }

  const baseWhere = and(...conds);
  const useMix =
    !strictCategory && (mixChannels || browseCategory) && !sourceId && !search && offset === 0;
  const poolLimit = useMix
    ? Math.min(Math.max(limit * (longFormOnly ? 25 : 15), longFormOnly ? 200 : 120), 800)
    : longFormOnly && !browseCategory
      ? Math.min(Math.max(limit * 4, 80), maxLimit)
      : browseCategory
        ? Math.min(Math.max(limit * 12, 200), maxLimit)
        : limit;
  const poolOffset = useMix ? 0 : offset;

  let rawRows: (typeof videosTable.$inferSelect)[] = [];
  let totalRows: { count: number }[] = [];
  if (useMix && (newsFirst || newsOnly)) {
    try {
    const newsConds: Parameters<typeof and>[0][] = [
      eq(videosTable.active, true),
      embeddableVideoCondition,
      eq(videosTable.isStory, false),
    ];
    if (excludeStories || longFormOnly) {
      /* haber kısa klipleri de dahil */
    }
    const haberSlugs = await rawSlugsForCategory("haberler");
    const newsCatCond =
      haberSlugs.length === 1
        ? eq(videosTable.categorySlug, haberSlugs[0]!)
        : haberSlugs.length > 1
          ? inArray(videosTable.categorySlug, haberSlugs)
          : eq(videosTable.categorySlug, "haberler");
    const sourceNewsCatCond =
      haberSlugs.length === 1
        ? eq(videoSourcesTable.categorySlug, haberSlugs[0]!)
        : haberSlugs.length > 1
          ? inArray(videoSourcesTable.categorySlug, haberSlugs)
          : eq(videoSourcesTable.categorySlug, "haberler");
    const newsNameCond = or(
      ilike(videosTable.channelName, "%haber%"),
      ilike(videosTable.channelName, "%gündem%"),
      ilike(videosTable.channelName, "%gundem%"),
      ilike(videosTable.channelName, "%ntv%"),
      ilike(videosTable.channelName, "%cnn%"),
      ilike(videosTable.channelName, "%trt%"),
      ilike(videosTable.channelName, "%sözcü%"),
      ilike(videosTable.channelName, "%sozcu%"),
      ilike(videosTable.channelName, "%halk%"),
      ilike(videosTable.channelName, "%tv100%"),
      ilike(videosTable.channelName, "%tele1%"),
      ilike(videosTable.channelName, "%ulusal%"),
      ilike(videosTable.channelName, "%show%"),
      ilike(videosTable.channelName, "%a haber%"),
    );
    const newsSourceRows = await db
      .select({ id: videoSourcesTable.id })
      .from(videoSourcesTable)
      .where(
        and(
          eq(videoSourcesTable.active, true),
          or(
            sourceNewsCatCond,
            ilike(videoSourcesTable.name, "%haber%"),
            ilike(videoSourcesTable.name, "%ntv%"),
            ilike(videoSourcesTable.name, "%cnn%"),
            ilike(videoSourcesTable.name, "%trt%"),
            ilike(videoSourcesTable.name, "%sözcü%"),
            ilike(videoSourcesTable.name, "%sozcu%"),
          ),
        ),
      )
      .limit(120);
    const newsSourceIds = newsSourceRows.map((r) => r.id).filter((id) => id > 0);
    const newsSourceCond =
      newsSourceIds.length > 0 ? inArray(videosTable.sourceId, newsSourceIds) : undefined;
    const newsOrParts = [newsCatCond, newsNameCond, newsSourceCond].filter(Boolean);
    newsConds.push(or(...newsOrParts)!);

    const newsLimit = Math.min(400, poolLimit);
    const [newsRows, generalRows, totalRowsResult] = await Promise.all([
      db
        .select()
        .from(videosTable)
        .where(and(...newsConds))
        .orderBy(desc(videosTable.publishedAt), desc(videosTable.id))
        .limit(newsLimit),
      newsOnly
        ? Promise.resolve([] as (typeof videosTable.$inferSelect)[])
        : db
            .select()
            .from(videosTable)
            .where(baseWhere)
            .orderBy(desc(videosTable.publishedAt), desc(videosTable.id))
            .limit(poolLimit)
            .offset(poolOffset),
      newsOnly
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(videosTable)
            .where(and(...newsConds))
        : db.select({ count: sql<number>`count(*)::int` }).from(videosTable).where(baseWhere),
    ]);
    rawRows = newsOnly ? newsRows : dedupeVideosByVideoId([...newsRows, ...generalRows]);
    totalRows = totalRowsResult;
    } catch (err) {
      logger.warn({ err }, "[video] news-first mix failed; falling back to standard pool");
      const [rows, totalRowsResult] = await Promise.all([
        db.select().from(videosTable).where(baseWhere).orderBy(desc(videosTable.publishedAt), desc(videosTable.id)).limit(poolLimit).offset(poolOffset),
        db.select({ count: sql<number>`count(*)::int` }).from(videosTable).where(baseWhere),
      ]);
      rawRows = rows;
      totalRows = totalRowsResult;
    }
  } else {
    const [rows, totalRowsResult] = await Promise.all([
      db.select().from(videosTable).where(baseWhere).orderBy(desc(videosTable.publishedAt), desc(videosTable.id)).limit(poolLimit).offset(poolOffset),
      db.select({ count: sql<number>`count(*)::int` }).from(videosTable).where(baseWhere),
    ]);
    rawRows = rows;
    totalRows = totalRowsResult;
  }

  let filteredRows = dedupeVideosByVideoId(
    longFormOnly && !browseCategory
      ? rawRows.filter(
          (r) =>
            isLongFormVideo({ isStory: r.isStory, title: r.title, duration: r.duration }) ||
            ((newsFirst || newsOnly) && isNewsLikeVideo(r)),
        )
      : rawRows,
  );

  if (browseCategory && categorySlug && categorySlug !== "all" && categorySourceIds) {
    filteredRows = filteredRows.filter((r) =>
      videoMatchesCategoryFeed(r, categorySlug, categorySourceIds),
    );
  }
  if (excludeStories && !storiesOnly) {
    filteredRows = filteredRows.filter(
      (r) => !classifyAsYekcek({ isStory: r.isStory, title: r.title, duration: r.duration }),
    );
  }
  if (browseCategory && excludeStories && !storiesOnly) {
    filteredRows = filteredRows.filter((r) =>
      isLongFormVideo({ isStory: r.isStory, title: r.title, duration: r.duration }),
    );
  }

  const rows = useMix
    ? newsOnly
      ? mixVideosNewsOnly(filteredRows, limit, feedSeed)
      : newsFirst
        ? mixVideosForNewsSiteFeed(filteredRows, limit, feedSeed)
        : mixVideosForHomeFeed(filteredRows, limit, feedSeed)
    : filteredRows.slice(0, limit);

  let items = useMix ? await serializeVideosBatch(rows) : await serializeVideosBatch(sortByTurkishPriority(rows));
  if (enrichTitles && items.length > 0) {
    try {
      items = await enrichSerializedVideoTitles(items);
    } catch (err) {
      logger.warn({ err, categorySlug }, "[video] enrich titles skipped");
    }
  }
  if (longFormOnly && !browseCategory) {
    items = items.filter(
      (i) =>
        isLongFormVideo({ isStory: i.isStory, title: i.title, duration: i.duration }) ||
        ((newsFirst || newsOnly) && isNewsLikeVideo(i)),
    );
    items = items.filter((i) => !/^Short\s+[A-Za-z0-9_-]+$/i.test(String(i.title ?? "").trim()));
  }
  if (newsOnly) {
    items = items.filter((i) => isNewsLikeVideo(i));
  }
  if (excludeStories && !storiesOnly) {
    items = items.filter(
      (i) => !classifyAsYekcek({ isStory: i.isStory, title: i.title, duration: i.duration }),
    );
  }
  if (browseCategory && excludeStories && !storiesOnly) {
    items = items.filter((i) =>
      isLongFormVideo({ isStory: i.isStory, title: i.title, duration: i.duration }),
    );
  }
  if (categorySlug && categorySlug !== "all" && categorySourceIds) {
    items = items.filter((i) => videoMatchesCategoryFeed(i, categorySlug, categorySourceIds));
    const norm = slugifyVideoCategory(categorySlug);
    if (norm === "muzik" || norm === "music") {
      const before = items.length;
      items = items.filter((i) =>
        isMusicCatalogVideo({
          title: i.title,
          description: i.description,
          duration: i.duration,
          channelName: i.channelName,
          categorySlug: i.categorySlug,
        }),
      );
      if (before > items.length) {
        logger.info(
          { before, after: items.length, dropped: before - items.length, category: norm },
          "[video] music catalog filter",
        );
      }
    }
  }
  const musicCatalogOnly = req.query.musicCatalogOnly === "true";
  if (musicCatalogOnly && (!categorySlug || categorySlug === "all")) {
    const before = items.length;
    items = items.filter((i) =>
      isMusicCatalogVideo({
        title: i.title,
        description: i.description,
        duration: i.duration,
        channelName: i.channelName,
        categorySlug: i.categorySlug,
      }),
    );
    if (before > items.length) {
      logger.info(
        { before, after: items.length, dropped: before - items.length },
        "[video] music catalog filter (musicCatalogOnly)",
      );
    }
  }
  items = dedupeVideosByVideoId(items);

  if (isChannelScoped) {
    items = items.map((i) => ({
      ...i,
      isStory: classifyAsYekcek({ isStory: i.isStory, title: i.title, duration: i.duration }),
    }));
  }

  res.json({
    items,
    total: totalRows[0]?.count ?? 0,
  });
});

router.patch("/video/videos/bulk", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const parsed = parseBulkUpdateVideosBody(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const updated = await dualWriteYektubeUpdate(
    videosTable,
    { categorySlug: parsed.categorySlug },
    inArray(videosTable.id, parsed.ids),
  );
  res.json({ updated: updated.length, categorySlug: parsed.categorySlug });
});

router.patch("/video/videos/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = parseUpdateVideoBody(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [current] = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Video bulunamadı" });
    return;
  }
  const [updated] = await dualWriteYektubeUpdate(videosTable, parsed, eq(videosTable.id, id));
  res.json(serializeVideo(updated ?? { ...current, ...parsed }));
});

router.delete("/video/videos/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await dualWriteYektubeDelete(videosTable, eq(videosTable.id, id));
  res.sendStatus(204);
});

/** Müzik yönetimi — YouTube Music tarama ve istatistik */
router.get("/video/music/stats", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    res.json(await getMusicAdminStats());
  } catch (err) {
    logger.warn({ err }, "[video] music stats failed");
    res.status(500).json({ error: "Müzik istatistikleri alınamadı" });
  }
});

router.get("/video/music/browse", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const sections = await browseYoutubeMusicHome();
    res.json({ sections });
  } catch (err) {
    logger.warn({ err }, "[video] music browse failed");
    res.status(500).json({ error: "YouTube Music ana sayfası alınamadı", sections: [] });
  }
});

router.get("/video/music/search", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const type = typeof req.query.type === "string" ? req.query.type.trim() : "song";
  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 50);
  if (!q) {
    res.json({ items: [], channels: [] });
    return;
  }
  try {
    const [items, channels] = await Promise.all([
      searchYoutubeMusic(q, type as "song" | "album" | "playlist" | "video" | "artist", limit),
      searchYoutubeMusicChannels(q, Math.min(limit, 12)),
    ]);
    res.json({ items, channels });
  } catch (err) {
    logger.warn({ err, q }, "[video] music search failed");
    res.json({ items: [], channels: [] });
  }
});

router.post("/video/music/import-youtube-search", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  try {
    const result = await importMusicFromYoutubeSearch({
      query: typeof body.query === "string" ? body.query : "müzik",
      limit: typeof body.limit === "number" ? body.limit : Number(body.limit) || 24,
      importVideos: body.importVideos !== false,
      importChannels: body.importChannels !== false,
    });
    res.json(result);
  } catch (err) {
    logger.warn({ err }, "[video] music youtube search import failed");
    res.status(500).json({ error: "YouTube arama içe aktarımı başarısız", imported: 0, skipped: 0, channels: 0, errors: [] });
  }
});

router.post("/video/music/import-ytm", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  try {
    const result = await importMusicFromYtm({
      sectionIndex: typeof body.sectionIndex === "number" ? body.sectionIndex : undefined,
      playlistId: typeof body.playlistId === "string" ? body.playlistId : undefined,
      videoIds: Array.isArray(body.videoIds) ? body.videoIds.map(String) : undefined,
      limit: typeof body.limit === "number" ? body.limit : Number(body.limit) || 24,
    });
    res.json(result);
  } catch (err) {
    logger.warn({ err }, "[video] music ytm import failed");
    res.status(500).json({ error: "YouTube Music içe aktarımı başarısız", imported: 0, skipped: 0, channels: 0, errors: [] });
  }
});

router.post("/video/music/sync-sources", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const result = await syncMusicSources();
    res.json(result);
  } catch (err) {
    logger.warn({ err }, "[video] music sync failed");
    res.status(500).json({ error: "Müzik kaynakları senkronlanamadı", synced: 0, failed: 0 });
  }
});

router.get("/video/kids/stats", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    res.json(await getKidsAdminStats());
  } catch (err) {
    logger.warn({ err }, "[video] kids stats failed");
    res.status(500).json({ error: "Çocuk istatistikleri alınamadı", sources: 0, videos: 0 });
  }
});

router.post("/video/kids/import-presets", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const asyncRun = body.async !== false;
  if (asyncRun) {
    setImmediate(() => {
      importKidsFromPresets().catch((err) => logger.warn({ err }, "[video] kids preset import async failed"));
    });
    res.json({
      ok: true,
      scheduled: true,
      message: "Hazır çocuk kanalları arka planda içe aktarılıyor",
      added: 0,
      skipped: 0,
      errors: [],
    });
    return;
  }
  try {
    const result = await importKidsFromPresets();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.warn({ err }, "[video] kids preset import failed");
    res.status(500).json({ error: "Çocuk kanalları eklenemedi", added: 0, skipped: 0, errors: [] });
  }
});

router.post("/video/kids/import-youtube-search", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const opts = {
    query: typeof body.query === "string" ? body.query : "çocuk videoları türkçe",
    limit: typeof body.limit === "number" ? body.limit : Number(body.limit) || 24,
    importVideos: body.importVideos !== false,
    importChannels: body.importChannels !== false,
    syncChannels: body.syncChannels === true,
  };
  const asyncRun = body.async !== false;
  if (asyncRun) {
    setImmediate(() => {
      importKidsFromYoutubeSearch(opts).catch((err) =>
        logger.warn({ err, query: opts.query }, "[video] kids youtube search import async failed"),
      );
    });
    res.json({
      ok: true,
      scheduled: true,
      message: "YouTube arama içe aktarımı arka planda çalışıyor",
      imported: 0,
      skipped: 0,
      channels: 0,
      errors: [],
    });
    return;
  }
  try {
    const result = await importKidsFromYoutubeSearch(opts);
    res.json(result);
  } catch (err) {
    logger.warn({ err }, "[video] kids youtube search import failed");
    res.status(500).json({ error: "YouTube arama içe aktarımı başarısız", imported: 0, skipped: 0, channels: 0, errors: [] });
  }
});

router.post("/video/kids/import-bootstrap", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const asyncRun = body.async !== false;
  const run = () =>
    importKidsBootstrap({
      videosPerQuery: typeof body.videosPerQuery === "number" ? body.videosPerQuery : Number(body.videosPerQuery) || 12,
      syncPresets: body.syncPresets !== false,
    });

  if (asyncRun) {
    setImmediate(() => {
      run().catch((err) => logger.warn({ err }, "[video] kids bootstrap async failed"));
    });
    res.json({
      ok: true,
      scheduled: true,
      message: "Çocuk kanalları ve videolar arka planda içe aktarılıyor",
    });
    return;
  }

  try {
    const result = await run();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.warn({ err }, "[video] kids bootstrap failed");
    res.status(500).json({
      error: "Çocuk içe aktarımı başarısız",
      imported: 0,
      skipped: 0,
      channels: 0,
      presetsAdded: 0,
      presetsSkipped: 0,
      synced: 0,
      errors: [],
    });
  }
});

router.post("/video/kids/sync-sources", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const result = await syncKidsSources();
    res.json(result);
  } catch (err) {
    logger.warn({ err }, "[video] kids sync failed");
    res.status(500).json({ error: "Çocuk kaynakları senkronlanamadı", synced: 0, failed: 0 });
  }
});

router.get("/video/admin/section-stats", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const sections = await getAdminSectionStats();
    res.json({ sections });
  } catch (err) {
    logger.warn({ err }, "[video] section stats failed");
    res.status(500).json({ error: "Bölüm istatistikleri alınamadı", sections: [] });
  }
});

router.get("/video/admin/section-config", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    res.json(await loadSectionConfig());
  } catch (err) {
    logger.warn({ err }, "[video] section config load failed");
    res.status(500).json({ error: "Yapılandırma yüklenemedi" });
  }
});

router.put("/video/admin/section-config", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Partial<SectionConfigStore>;
  try {
    const current = await loadSectionConfig();
    const next: SectionConfigStore = {
      yektubeCategories: Array.isArray(body.yektubeCategories) ? body.yektubeCategories : current.yektubeCategories,
      muzikCategories: Array.isArray(body.muzikCategories) ? body.muzikCategories : current.muzikCategories,
      cocukCategories: Array.isArray(body.cocukCategories) ? body.cocukCategories : current.cocukCategories,
    };
    res.json(await saveSectionConfig(next));
  } catch (err) {
    logger.warn({ err }, "[video] section config save failed");
    res.status(500).json({ error: "Yapılandırma kaydedilemedi" });
  }
});

router.get("/video/section-categories", async (req, res): Promise<void> => {
  const section = typeof req.query.section === "string" ? req.query.section.trim() : "";
  if (section !== "muzik" && section !== "cocuk") {
    res.status(400).json({ error: "section=muzik veya section=cocuk gerekli" });
    return;
  }
  try {
    const categories = await getPublicSectionCategories(section);
    res.json({ categories });
  } catch (err) {
    logger.warn({ err }, "[video] section categories failed");
    res.json({ categories: [] });
  }
});

router.get("/video/pages/sidebar", async (_req, res): Promise<void> => {
  try {
    const pages = await listSidebarStaticPages();
    res.json({ pages });
  } catch (err) {
    logger.warn({ err }, "[video] sidebar pages failed");
    res.json({ pages: [] });
  }
});

router.get("/video/pages/:slug", async (req, res): Promise<void> => {
  const slug = typeof req.params.slug === "string" ? req.params.slug.trim() : "";
  if (!slug) {
    res.status(400).json({ error: "slug gerekli" });
    return;
  }
  try {
    const page = await getStaticPageBySlug(slug);
    if (!page) {
      res.status(404).json({ error: "Sayfa bulunamadı" });
      return;
    }
    res.json({ page });
  } catch (err) {
    logger.warn({ err, slug }, "[video] static page load failed");
    res.status(500).json({ error: "Sayfa yüklenemedi" });
  }
});

router.get("/video/admin/pages", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const pages = await loadStaticPages();
    res.json({ pages });
  } catch (err) {
    logger.warn({ err }, "[video] admin pages list failed");
    res.status(500).json({ error: "Sayfalar yüklenemedi", pages: [] });
  }
});

router.post("/video/admin/pages", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  try {
    const page = await createStaticPage({
      slug: typeof body.slug === "string" ? body.slug : "",
      title: typeof body.title === "string" ? body.title : "",
      lastUpdated: typeof body.lastUpdated === "string" ? body.lastUpdated : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      sidebarLabel: typeof body.sidebarLabel === "string" ? body.sidebarLabel : null,
    });
    res.status(201).json({ page });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sayfa oluşturulamadı";
    res.status(400).json({ error: message });
  }
});

router.put("/video/admin/pages/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    res.status(400).json({ error: "id gerekli" });
    return;
  }
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  try {
    const page = await updateStaticPage(id, {
      slug: typeof body.slug === "string" ? body.slug : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      lastUpdated: typeof body.lastUpdated === "string" ? body.lastUpdated : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      sidebarLabel:
        body.sidebarLabel === null
          ? null
          : typeof body.sidebarLabel === "string"
            ? body.sidebarLabel
            : undefined,
    });
    res.json({ page });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sayfa güncellenemedi";
    const status = message.includes("bulunamadı") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

router.delete("/video/admin/pages/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    res.status(400).json({ error: "id gerekli" });
    return;
  }
  try {
    await deleteStaticPage(id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sayfa silinemedi";
    const status = message.includes("bulunamadı") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

export default router;
