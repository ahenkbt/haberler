import { and, eq, isNotNull } from "drizzle-orm";
import {
  getYektubeDbForRead,
  yektubeMemberPrefsTable,
  yektubeMemberSubscriptionsTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { isWebPushConfigured, sendWebPushSafe } from "./webPushService.js";

const db = getYektubeDbForRead();

export type NewVideoPushInput = {
  sourceId: number;
  channelName: string;
  videoTitle: string;
  youtubeVideoId: string;
  isStory: boolean;
};

function watchPath(input: NewVideoPushInput): string {
  if (input.isStory) return `/yp/yekcek?v=${encodeURIComponent(input.youtubeVideoId)}`;
  return `/yp/ara?q=${encodeURIComponent(input.youtubeVideoId)}`;
}

/** Yeni video eklendiğinde abonelere push (arka plan, hata yutulur) */
export function scheduleNotifySubscribersNewVideo(input: NewVideoPushInput): void {
  if (!isWebPushConfigured()) return;
  setImmediate(() => {
    void notifySubscribersNewVideo(input).catch((err) =>
      logger.warn({ err, sourceId: input.sourceId }, "[yektube-push] notify failed"),
    );
  });
}

export async function notifySubscribersNewVideo(input: NewVideoPushInput): Promise<number> {
  if (!isWebPushConfigured()) return 0;

  const subs = await db
    .select({ memberId: yektubeMemberSubscriptionsTable.memberId })
    .from(yektubeMemberSubscriptionsTable)
    .where(eq(yektubeMemberSubscriptionsTable.sourceId, input.sourceId));

  if (subs.length === 0) return 0;

  const memberIds = [...new Set(subs.map((s) => s.memberId))];
  let sent = 0;

  for (const memberId of memberIds) {
    const [prefs] = await db
      .select()
      .from(yektubeMemberPrefsTable)
      .where(
        and(
          eq(yektubeMemberPrefsTable.memberId, memberId),
          isNotNull(yektubeMemberPrefsTable.pushSubscriptionJson),
        ),
      )
      .limit(1);

    if (!prefs?.pushSubscriptionJson?.trim()) continue;

    const wantsShort = input.isStory && prefs.notifyShorts;
    const wantsVideo = !input.isStory && prefs.notifyNewVideos;
    if (!wantsShort && !wantsVideo) continue;

    const result = await sendWebPushSafe(prefs.pushSubscriptionJson, {
      title: input.channelName.slice(0, 80) || "Yektube",
      body: input.videoTitle.slice(0, 180) || "Yeni içerik",
      url: watchPath(input),
    });

    if (result.ok) {
      sent++;
      continue;
    }

    if (result.expired) {
      await db
        .update(yektubeMemberPrefsTable)
        .set({ pushSubscriptionJson: null, updatedAt: new Date() })
        .where(eq(yektubeMemberPrefsTable.memberId, memberId));
    }
  }

  if (sent > 0) {
    logger.info({ sourceId: input.sourceId, sent, videoId: input.youtubeVideoId }, "[yektube-push] sent");
  }

  return sent;
}
