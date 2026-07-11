import { and, eq, inArray } from "drizzle-orm";
import { dualWriteYektubeUpdate, getYektubeDbForRead, videosTable } from "@workspace/db";
import { fetchYoutubeEmbedAllowedMap } from "./youtubeEmbedCheck.js";

const db = getYektubeDbForRead();

/** Herkese açık listeler — aktif videolar (embed denemesi oynatıcıda yapılır). */
export const embeddableVideoCondition = eq(videosTable.active, true);

export async function hideEmbedBlockedVideosByIds(videoIds: string[]): Promise<number> {
  const ids = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return 0;

  const result = await dualWriteYektubeUpdate(
    videosTable,
    { embedAllowed: false },
    inArray(videosTable.videoId, ids),
  );
  return result.length;
}

/** Aktif videoları API ile tarayıp embed kapalı olanları işaretle (listeden kaldırma). */
export async function auditAndHideNonEmbeddableVideos(limit = 800): Promise<number> {
  const rows = await db
    .select({ id: videosTable.id, videoId: videosTable.videoId })
    .from(videosTable)
    .where(eq(videosTable.active, true))
    .limit(limit);

  if (rows.length === 0) return 0;

  const embedMap = await fetchYoutubeEmbedAllowedMap(rows.map((r) => r.videoId));
  let marked = 0;

  for (const row of rows) {
    if (embedMap.get(row.videoId) !== false) continue;
    await dualWriteYektubeUpdate(videosTable, { embedAllowed: false }, eq(videosTable.id, row.id));
    marked++;
  }

  return marked;
}
