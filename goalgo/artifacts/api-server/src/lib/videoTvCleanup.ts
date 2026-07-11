import { and, desc, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import type { VideoSourceRow } from "@workspace/db";
import {
  dualWriteYektubeDelete,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
} from "@workspace/db";
import { VIDEO_TV_PRESETS } from "../data/videoTvPresets.js";
import { looksLikeVideoPlaylistNotPodcast, shouldImportAsPodcast } from "./youtubePodcastFilter.js";
import { logger } from "./logger.js";

const db = getYektubeDbForRead();

/** Eski hazır kaynak preset'lerindeki hatalı YouTube kanal ID'leri. */
export const OBSOLETE_YOUTUBE_CHANNEL_IDS = new Set([
  "UCqgnDFnbn-W19w63ezxxNGQ",
  "UCRR_RaDM7tHDtsJa48tt-vw",
  "UCQ65pl4SZWyMc05f6_pVP_g",
  "UCWXXnGN1NxiJ45LxhDTZ-Lg",
  "UCY8WZ1HOYPgZyqK5GhFHEdQ",
  "UCwjtX9Wo8tLnIVfuLb6vTOA",
  "UCEWaapCEoWiJ0BJWERoXyhA",
  "UC1eVDIuENWTFiV-YqpEAd1g",
  "UCFHX1cNnzNHFTNo4lnKx_Eg",
  "UCQyBZbAOdR8HlXJpGsFeT-A",
  "UCmctTUZ5KS-zCD8HK1qXhCQ",
  "UCRm5IokC7lBbMGoCikZNs7w",
  "UCM_DhzL5J7PFKZkKLnj1IhA",
  "UCKnEOEIp2GKnCVJsuO-RBjA",
  "UCFWrjSuNzPCfn7v_7P5Y_aQ",
  "UC0MEUGS-i25NjIYHR9wO9aw",
  "UCL66jX7tN18Yvjsm5Eo-Q1w",
  "UCe2GqaIBFfXa_GpZw4tMpJw",
  "UCNuMHmjy0EhRfQ3YL0Lz9Vw",
  "UClOk4jrgVVPDGQCemoJEIXQ",
  "UCAMQ_c_4q6IDgZH0F8Rl8GA",
]);

export type SourceRemovalReason =
  | "inactive_source"
  | "duplicate_channel"
  | "obsolete_channel_id"
  | "preset_mismatch";

export type RemovedSourceDetail = {
  id: number;
  name: string;
  channelId: string;
  sourceType: string;
  videoCount: number;
  reason: SourceRemovalReason;
};

export type VideoTvCleanupResult = {
  ok: true;
  dryRun: boolean;
  deletedVideos: number;
  deletedSources: number;
  details: {
    inactiveVideos: number;
    inactiveSources: number;
    orphanVideos: number;
    duplicateVideos: number;
    duplicateChannels: number;
    obsoleteChannelIds: number;
    presetMismatch: number;
    reclassifiedPodcasts: number;
    embedBlockedHidden: number;
  };
  removedSources: RemovedSourceDetail[];
};

function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s*(tv|haber|resmi|official)\b/gi, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeChannelId(id: string): string {
  return id.trim().toLowerCase();
}

function presetIdsByNormalizedName(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const preset of VIDEO_TV_PRESETS) {
    const key = normalizeChannelName(preset.name);
    if (!key) continue;
    const ids = map.get(key) ?? new Set<string>();
    ids.add(normalizeChannelId(preset.channelId));
    map.set(key, ids);
  }
  return map;
}

function channelKeepScore(row: VideoSourceRow, presetIds: Set<string> | undefined): number {
  const cid = normalizeChannelId(row.channelId);
  let score = (row.videoCount ?? 0) * 10_000;
  if (row.active) score += 5_000;
  if (presetIds?.has(cid)) score += 20_000;
  score += row.id;
  return score;
}

async function countVideos(where?: SQL): Promise<number> {
  const q = db.select({ count: sql<number>`count(*)::int` }).from(videosTable);
  const [row] = where ? await q.where(where) : await q;
  return row?.count ?? 0;
}

export async function deleteVideosForSourceIds(sourceIds: number[]): Promise<number> {
  if (sourceIds.length === 0) return 0;
  const n = await countVideos(inArray(videosTable.sourceId, sourceIds));
  if (n > 0) {
    await dualWriteYektubeDelete(videosTable, inArray(videosTable.sourceId, sourceIds));
  }
  return n;
}

export async function deleteSourceById(sourceId: number): Promise<void> {
  await deleteVideosForSourceIds([sourceId]);
  await dualWriteYektubeDelete(videoSourcesTable, eq(videoSourcesTable.id, sourceId));
}

/** Aynı kaynak + videoId için birden fazla satır varsa en yeni kaydı tutar. */
export async function dedupeDuplicateVideoRows(dryRun = false): Promise<number> {
  const rows = await db
    .select({
      id: videosTable.id,
      sourceId: videosTable.sourceId,
      videoId: videosTable.videoId,
    })
    .from(videosTable)
    .where(and(sql`${videosTable.sourceId} IS NOT NULL`, sql`trim(${videosTable.videoId}) != ''`))
    .orderBy(desc(videosTable.id));

  const seen = new Set<string>();
  const deleteIds: number[] = [];

  for (const row of rows) {
    if (row.sourceId == null || !row.videoId?.trim()) continue;
    const key = `${row.sourceId}:${row.videoId.trim()}`;
    if (seen.has(key)) {
      deleteIds.push(row.id);
    } else {
      seen.add(key);
    }
  }

  if (!dryRun && deleteIds.length > 0) {
    for (let i = 0; i < deleteIds.length; i += 100) {
      const chunk = deleteIds.slice(i, i + 100);
      await dualWriteYektubeDelete(videosTable, inArray(videosTable.id, chunk));
    }
  }

  return deleteIds.length;
}

export async function runVideoTvCleanup(options?: { dryRun?: boolean }): Promise<VideoTvCleanupResult> {
  const dryRun = options?.dryRun ?? false;
  const presetByName = presetIdsByNormalizedName();

  const allSources = await db.select().from(videoSourcesTable).orderBy(videoSourcesTable.id);
  const sourceIds = new Set(allSources.map((s) => s.id));
  const toRemove = new Map<number, RemovedSourceDetail>();

  const mark = (row: VideoSourceRow, reason: SourceRemovalReason) => {
    if (toRemove.has(row.id)) return;
    toRemove.set(row.id, {
      id: row.id,
      name: row.name,
      channelId: row.channelId,
      sourceType: row.sourceType,
      videoCount: row.videoCount ?? 0,
      reason,
    });
  };

  for (const row of allSources) {
    if (!row.active) {
      mark(row, "inactive_source");
    }
  }

  const channels = allSources.filter(
    (s) => s.sourceType === "channel" || s.sourceType === "live" || s.sourceType === "video",
  );
  const byName = new Map<string, VideoSourceRow[]>();
  for (const row of channels) {
    const key = normalizeChannelName(row.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(row);
    byName.set(key, list);
  }

  for (const [, group] of byName) {
    if (group.length < 2) continue;
    const presetIds = presetByName.get(normalizeChannelName(group[0]!.name));
    const ranked = [...group].sort(
      (a, b) => channelKeepScore(b, presetIds) - channelKeepScore(a, presetIds),
    );
    for (const loser of ranked.slice(1)) {
      mark(loser, "duplicate_channel");
    }
  }

  for (const row of channels) {
    const cid = row.channelId.trim();
    if (!OBSOLETE_YOUTUBE_CHANNEL_IDS.has(cid)) continue;
    const key = normalizeChannelName(row.name);
    const hasReplacement = channels.some(
      (other) =>
        other.id !== row.id &&
        normalizeChannelName(other.name) === key &&
        !OBSOLETE_YOUTUBE_CHANNEL_IDS.has(other.channelId.trim()),
    );
    if (hasReplacement || (row.videoCount ?? 0) === 0) {
      mark(row, "obsolete_channel_id");
    }
  }

  for (const row of channels) {
    const key = normalizeChannelName(row.name);
    const presetIds = presetByName.get(key);
    if (!presetIds || presetIds.size === 0) continue;
    const cid = normalizeChannelId(row.channelId);
    if (presetIds.has(cid)) continue;
    const hasCorrect = channels.some(
      (other) =>
        other.id !== row.id &&
        normalizeChannelName(other.name) === key &&
        presetIds.has(normalizeChannelId(other.channelId)),
    );
    if (hasCorrect) {
      mark(row, "preset_mismatch");
    }
  }

  const inactiveVideoCount = await countVideos(eq(videosTable.active, false));

  const validSourceIds = [...sourceIds].filter((id) => !toRemove.has(id));
  const orphanVideoCount =
    validSourceIds.length === 0
      ? await countVideos(sql`${videosTable.sourceId} IS NOT NULL`)
      : await countVideos(
          and(
            sql`${videosTable.sourceId} IS NOT NULL`,
            notInArray(videosTable.sourceId, validSourceIds),
          )!,
        );

  const removedSources = [...toRemove.values()].sort((a, b) => a.id - b.id);
  const removeIds = removedSources.map((s) => s.id);

  const mislabeledPodcasts = allSources.filter(
    (s) => s.sourceType === "podcast" && !shouldImportAsPodcast(s.name),
  );

  const [embedBlockedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videosTable)
    .where(and(eq(videosTable.active, true), eq(videosTable.embedAllowed, false)));

  const embedBlockedHidden = embedBlockedRow?.count ?? 0;
  const reclassifiedPodcasts = mislabeledPodcasts.length;
  const duplicateVideos = await dedupeDuplicateVideoRows(true);

  let deletedVideos = inactiveVideoCount + orphanVideoCount + duplicateVideos;
  if (removeIds.length > 0) {
    deletedVideos += await countVideos(inArray(videosTable.sourceId, removeIds));
  }

  const details = {
    inactiveVideos: inactiveVideoCount,
    inactiveSources: removedSources.filter((s) => s.reason === "inactive_source").length,
    orphanVideos: orphanVideoCount,
    duplicateVideos,
    duplicateChannels: removedSources.filter((s) => s.reason === "duplicate_channel").length,
    obsoleteChannelIds: removedSources.filter((s) => s.reason === "obsolete_channel_id").length,
    presetMismatch: removedSources.filter((s) => s.reason === "preset_mismatch").length,
    reclassifiedPodcasts,
    embedBlockedHidden,
  };

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      deletedVideos,
      deletedSources: removeIds.length,
      details,
      removedSources,
    };
  }

  if (inactiveVideoCount > 0) {
    await dualWriteYektubeDelete(videosTable, eq(videosTable.active, false));
  }

  if (embedBlockedHidden > 0) {
    await dualWriteYektubeUpdate(
      videosTable,
      { active: false },
      and(eq(videosTable.active, true), eq(videosTable.embedAllowed, false))!,
    );
  }

  for (const row of mislabeledPodcasts) {
    if (!removeIds.includes(row.id)) {
      await dualWriteYektubeUpdate(videoSourcesTable, { sourceType: "playlist" }, eq(videoSourcesTable.id, row.id));
    }
  }

  if (orphanVideoCount > 0) {
    const validIds = [...sourceIds].filter((id) => !toRemove.has(id));
    if (validIds.length === 0) {
      await dualWriteYektubeDelete(videosTable, sql`${videosTable.sourceId} IS NOT NULL`);
    } else {
      await dualWriteYektubeDelete(
        videosTable,
        and(
          sql`${videosTable.sourceId} IS NOT NULL`,
          notInArray(videosTable.sourceId, validIds),
        )!,
      );
    }
  }

  for (const sourceId of removeIds) {
    await deleteSourceById(sourceId);
  }

  await dedupeDuplicateVideoRows(false);

  logger.info({ deletedVideos, deletedSources: removeIds.length, details }, "[videoTvCleanup] tamamlandı");

  return {
    ok: true,
    dryRun: false,
    deletedVideos,
    deletedSources: removeIds.length,
    details,
    removedSources,
  };
}
