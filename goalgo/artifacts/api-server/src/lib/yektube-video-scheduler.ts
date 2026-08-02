import type { Logger } from "pino";
import { getTurkeyHourMinute } from "./rss-automation-control.js";
import { PG_ADVISORY_LOCKS, withPgAdvisoryLock } from "./pg-advisory-lock.js";
import { scheduleYektubeContentRefresh } from "../routes/video.js";
import { envJobFlag } from "./hostingProfile.js";

/** Günde bir kez — 01:00 Europe/Istanbul (UTC+3 sabit). */
export const YEKTUBE_SCHEDULED_HOUR_TR = 1;
export const YEKTUBE_SCHEDULED_SLOT_WINDOW_MIN = 45;

const TR_OFFSET_MS = 3 * 60 * 60_000;

function turkeyCalendarDayKey(now = new Date()): string {
  return new Date(now.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

export function isWithinYektubeVideoScheduledSlot(now = new Date()): boolean {
  if (process.env.YEKTUBE_SCHEDULE_ALL_DAY === "1") return true;
  const { hour, minute } = getTurkeyHourMinute(now);
  if (hour !== YEKTUBE_SCHEDULED_HOUR_TR) return false;
  const windowMin = Math.min(
    59,
    Math.max(1, Number(process.env.YEKTUBE_SCHEDULE_SLOT_WINDOW_MIN) || YEKTUBE_SCHEDULED_SLOT_WINDOW_MIN),
  );
  return minute < windowMin;
}

/** Bir sonraki 01:00 TR slotuna kalan süre (ms). */
export function msUntilNextYektubeVideoScheduledSlot(now = new Date()): number {
  if (process.env.YEKTUBE_SCHEDULE_ALL_DAY === "1") {
    return Math.max(60_000, Number(process.env.YEKTUBE_SCHEDULE_ALL_DAY_MS) || 5 * 60_000);
  }
  const { hour, minute } = getTurkeyHourMinute(now);
  const minuteOfDay = hour * 60 + minute;
  const slotStart = YEKTUBE_SCHEDULED_HOUR_TR * 60;
  if (minuteOfDay < slotStart) {
    return (slotStart - minuteOfDay) * 60_000;
  }
  const windowMin = Math.min(
    59,
    Math.max(1, Number(process.env.YEKTUBE_SCHEDULE_SLOT_WINDOW_MIN) || YEKTUBE_SCHEDULED_SLOT_WINDOW_MIN),
  );
  if (hour === YEKTUBE_SCHEDULED_HOUR_TR && minute < windowMin) {
    return 60_000;
  }
  const untilMidnight = (24 * 60 - minuteOfDay) * 60_000;
  return untilMidnight + slotStart * 60_000;
}

export function yektubeVideoScheduleLabel(): string {
  if (process.env.YEKTUBE_SCHEDULE_ALL_DAY === "1") return "7/24 test (YEKTUBE_SCHEDULE_ALL_DAY=1)";
  return `01:00 TR (günde 1)`;
}

let lastDailyRunDayKey: string | null = null;

async function tickYektubeVideoDaily(log: Logger, reason: "startup" | "slot"): Promise<void> {
  if (!envJobFlag("YEKTUBE_NIGHT_SYNC", true)) {
    log.debug("[yektube-scheduler] YEKTUBE_NIGHT_SYNC=0 — atlandı");
    return;
  }
  if (!isWithinYektubeVideoScheduledSlot()) {
    if (reason !== "startup") {
      log.debug("[yektube-scheduler] planlı slot dışında — atlandı");
    }
    return;
  }

  const dayKey = turkeyCalendarDayKey();
  if (lastDailyRunDayKey === dayKey) {
    log.debug({ dayKey }, "[yektube-scheduler] bugün zaten çalıştı — atlandı");
    return;
  }

  const geminiClassify = process.env.YEKTUBE_NIGHT_GEMINI !== "0";
  const ran = await withPgAdvisoryLock(PG_ADVISORY_LOCKS.YEKTUBE_VIDEO_DAILY, async () => {
    if (lastDailyRunDayKey === dayKey) return false;
    const result = scheduleYektubeContentRefresh({ geminiClassify });
    lastDailyRunDayKey = dayKey;
    log.info(
      {
        reason,
        dayKey,
        geminiClassify,
        videosStarted: result.videosStarted,
        shortsStarted: result.shortsStarted,
      },
      "[yektube-scheduler] gece 01:00 video botları başlatıldı",
    );
    return true;
  });

  if (ran === undefined) {
    log.debug("[yektube-scheduler] başka replica çalıştırıyor — atlandı");
  }
}

/**
 * /yp video kaynak botları — günde 1 kez 01:00 TR.
 * Kapatmak: YEKTUBE_NIGHT_SYNC=0
 */
export function startYektubeVideoDailyScheduler(log: Logger): () => void {
  let stopped = false;
  let slotTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleNextSlot = () => {
    if (stopped) return;
    const delay = msUntilNextYektubeVideoScheduledSlot(new Date());
    slotTimer = setTimeout(() => {
      void tickYektubeVideoDaily(log, "slot").finally(scheduleNextSlot);
    }, Math.max(5_000, delay));
    slotTimer.unref?.();
  };

  const startupDelay = setTimeout(() => {
    void tickYektubeVideoDaily(log, "startup");
  }, 20_000);
  startupDelay.unref?.();

  scheduleNextSlot();

  log.info(
    { schedule: yektubeVideoScheduleLabel(), enabled: envJobFlag("YEKTUBE_NIGHT_SYNC", true) },
    "[yektube-scheduler] günlük video senkron zamanlayıcısı aktif",
  );

  return () => {
    stopped = true;
    clearTimeout(startupDelay);
    clearTimeout(slotTimer);
  };
}
