import type { Request } from "express";
import { desc, eq } from "drizzle-orm";
import {
  getYektubeDbForRead,
  yektubeMemberPrefsTable,
  yektubeWatchHistoryTable,
} from "@workspace/db";
import { normalizeYoutubeVideoId, parseExcludeYoutubeVideoIds } from "./videoMix.js";

const db = getYektubeDbForRead();
const MAX_MEMBER_EXCLUDE = 80;
const MAX_RECENT_SOURCES = 24;

async function memberSaveHistoryEnabled(memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ saveHistory: yektubeMemberPrefsTable.saveHistory })
    .from(yektubeMemberPrefsTable)
    .where(eq(yektubeMemberPrefsTable.memberId, memberId))
    .limit(1);
  return row?.saveHistory !== false;
}

export type ShortsPersonalization = {
  excludeIds: Set<string>;
  recentSourceIds: Set<number>;
  personalized: boolean;
};

/** Üye oturumu + izleme geçmişi ile Yekçek hariç tutma / kanal çeşitliliği */
export async function resolveShortsPersonalization(
  req: Request,
  clientExcludeRaw: string | undefined,
): Promise<ShortsPersonalization> {
  const excludeIds = parseExcludeYoutubeVideoIds(clientExcludeRaw);
  const recentSourceIds = new Set<number>();
  const memberId = req.session?.memberId?.trim();
  if (!memberId) {
    return { excludeIds, recentSourceIds, personalized: false };
  }
  if (!(await memberSaveHistoryEnabled(memberId))) {
    return { excludeIds, recentSourceIds, personalized: false };
  }

  const rows = await db
    .select({
      youtubeVideoId: yektubeWatchHistoryTable.youtubeVideoId,
      sourceId: yektubeWatchHistoryTable.sourceId,
    })
    .from(yektubeWatchHistoryTable)
    .where(eq(yektubeWatchHistoryTable.memberId, memberId))
    .orderBy(desc(yektubeWatchHistoryTable.watchedAt))
    .limit(MAX_MEMBER_EXCLUDE);

  for (const r of rows) {
    const id = normalizeYoutubeVideoId(r.youtubeVideoId);
    if (id) excludeIds.add(id);
    if (r.sourceId && r.sourceId > 0 && recentSourceIds.size < MAX_RECENT_SOURCES) {
      recentSourceIds.add(r.sourceId);
    }
  }

  return { excludeIds, recentSourceIds, personalized: rows.length > 0 };
}
