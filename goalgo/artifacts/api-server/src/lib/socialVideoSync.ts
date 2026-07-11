import { eq, inArray } from "drizzle-orm";
import { getYektubeDbForRead, videoSourcesTable, type VideoSourceRow } from "@workspace/db";
import { logger } from "./logger.js";
import { syncInstagramSourceToDb } from "./instagramReelsSync.js";
import { syncTiktokSourceToDb } from "./tiktokVideoSync.js";

const db = getYektubeDbForRead();

export function isSocialPlatform(platform: string): platform is "instagram" | "tiktok" {
  return platform === "instagram" || platform === "tiktok";
}

export async function syncSocialSourceToDb(
  source: VideoSourceRow,
): Promise<{ upserted: number; warning?: string }> {
  if (source.platform === "instagram") return syncInstagramSourceToDb(source);
  if (source.platform === "tiktok") return syncTiktokSourceToDb(source);
  return { upserted: 0, warning: "Desteklenmeyen sosyal platform" };
}

export type SocialSyncResult = {
  sources: number;
  upserted: number;
  warnings: string[];
};

export async function syncAllSocialSources(): Promise<SocialSyncResult> {
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(inArray(videoSourcesTable.platform, ["instagram", "tiktok"]));

  const active = rows.filter((s) => s.active && !s.isLive && s.sourceType !== "live");
  let upserted = 0;
  const warnings: string[] = [];

  for (const source of active) {
    const result = await syncSocialSourceToDb(source);
    upserted += result.upserted;
    if (result.warning) warnings.push(`${source.name}: ${result.warning}`);
  }

  logger.info({ sources: active.length, upserted }, "[socialVideoSync] toplu senkron tamam");
  return { sources: active.length, upserted, warnings };
}

let socialSyncRunning = false;

export function isSocialSyncRunning(): boolean {
  return socialSyncRunning;
}

export function scheduleSyncAllSocial(): boolean {
  if (socialSyncRunning) return false;
  socialSyncRunning = true;
  setImmediate(async () => {
    try {
      await syncAllSocialSources();
    } catch (err) {
      logger.error({ err }, "[socialVideoSync] toplu senkron hatası");
    } finally {
      socialSyncRunning = false;
    }
  });
  return true;
}
