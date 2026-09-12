import type { Logger } from "pino";
import { getTurkeyHourMinute } from "./rss-automation-control.js";
import { PG_ADVISORY_LOCKS, withPgAdvisoryLock } from "./pg-advisory-lock.js";
import { envJobFlag } from "./hostingProfile.js";
import { repairHmTepeMansetLayoutForAllSites } from "./hm-tepe-manset-repair.js";
import { backfillHmRssMissingImages } from "./hm-rss-missing-image.js";

/** Günde bir kez — 04:00 Europe/Istanbul. */
export const HM_TEPE_MANSET_DAILY_HOUR_TR = 4;
export const HM_TEPE_MANSET_DAILY_SLOT_WINDOW_MIN = 45;

const TR_OFFSET_MS = 3 * 60 * 60_000;

function turkeyCalendarDayKey(now = new Date()): string {
  return new Date(now.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

export function isWithinHmTepeMansetDailySlot(now = new Date()): boolean {
  if (process.env.HM_TEPE_MANSET_SCHEDULE_ALL_DAY === "1") return true;
  const { hour, minute } = getTurkeyHourMinute(now);
  if (hour !== HM_TEPE_MANSET_DAILY_HOUR_TR) return false;
  const windowMin = Math.min(
    59,
    Math.max(1, Number(process.env.HM_TEPE_MANSET_SCHEDULE_SLOT_WINDOW_MIN) || HM_TEPE_MANSET_DAILY_SLOT_WINDOW_MIN),
  );
  return minute < windowMin;
}

export function msUntilNextHmTepeMansetDailySlot(now = new Date()): number {
  if (process.env.HM_TEPE_MANSET_SCHEDULE_ALL_DAY === "1") {
    return Math.max(60_000, Number(process.env.HM_TEPE_MANSET_SCHEDULE_ALL_DAY_MS) || 5 * 60_000);
  }
  const { hour, minute } = getTurkeyHourMinute(now);
  const minuteOfDay = hour * 60 + minute;
  const slotStart = HM_TEPE_MANSET_DAILY_HOUR_TR * 60;
  if (minuteOfDay < slotStart) return (slotStart - minuteOfDay) * 60_000;
  const windowMin = Math.min(
    59,
    Math.max(1, Number(process.env.HM_TEPE_MANSET_SCHEDULE_SLOT_WINDOW_MIN) || HM_TEPE_MANSET_DAILY_SLOT_WINDOW_MIN),
  );
  if (hour === HM_TEPE_MANSET_DAILY_HOUR_TR && minute < windowMin) return 60_000;
  const untilMidnight = (24 * 60 - minuteOfDay) * 60_000;
  return untilMidnight + slotStart * 60_000;
}

let lastDailyRunDayKey: string | null = null;

export async function runHmTepeMansetDailyJobs(log: Logger, reason: "startup" | "slot"): Promise<void> {
  if (!envJobFlag("HM_TEPE_MANSET_DAILY", true)) {
    log.debug("[hm-tepe-manset-daily] HM_TEPE_MANSET_DAILY=0 — atlandı");
    return;
  }
  if (!isWithinHmTepeMansetDailySlot() && reason !== "startup") {
    log.debug("[hm-tepe-manset-daily] planlı slot dışında — atlandı");
    return;
  }

  const dayKey = turkeyCalendarDayKey();
  if (reason === "slot" && lastDailyRunDayKey === dayKey) {
    log.debug({ dayKey }, "[hm-tepe-manset-daily] bugün zaten çalıştı — atlandı");
    return;
  }

  const ran = await withPgAdvisoryLock(PG_ADVISORY_LOCKS.HM_TEPE_MANSET_DAILY, async () => {
    if (reason === "slot" && lastDailyRunDayKey === dayKey) return false;
    const layout = await repairHmTepeMansetLayoutForAllSites();
    const images = await backfillHmRssMissingImages({ limit: 120, scrape: true });
    lastDailyRunDayKey = dayKey;
    log.info(
      { reason, dayKey, layout, images },
      "[hm-tepe-manset-daily] layout + RSS görsel backfill",
    );
    return true;
  });

  if (ran === undefined) {
    log.debug("[hm-tepe-manset-daily] başka replica çalıştırıyor — atlandı");
  }
}

export function startHmTepeMansetDailyScheduler(log: Logger): () => void {
  let stopped = false;
  let slotTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleNextSlot = () => {
    if (stopped) return;
    const delay = msUntilNextHmTepeMansetDailySlot(new Date());
    slotTimer = setTimeout(() => {
      void runHmTepeMansetDailyJobs(log, "slot").finally(scheduleNextSlot);
    }, Math.max(5_000, delay));
    slotTimer.unref?.();
  };

  const startupDelay = setTimeout(() => {
    void repairHmTepeMansetLayoutForAllSites()
      .then((r) => log.info({ ...r }, "[hm-tepe-manset-daily] startup layout"))
      .catch((err) => log.error({ err }, "[hm-tepe-manset-daily] startup layout başarısız"));
  }, 22_000);
  startupDelay.unref?.();

  scheduleNextSlot();
  log.info(
    { hourTr: HM_TEPE_MANSET_DAILY_HOUR_TR, enabled: envJobFlag("HM_TEPE_MANSET_DAILY", true) },
    "[hm-tepe-manset-daily] günlük manşet + görsel zamanlayıcısı aktif",
  );

  return () => {
    stopped = true;
    clearTimeout(startupDelay);
    clearTimeout(slotTimer);
  };
}
