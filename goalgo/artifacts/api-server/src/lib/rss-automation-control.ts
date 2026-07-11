import { sql } from "drizzle-orm";
import type { Logger } from "pino";
import { db } from "@workspace/db";
import { envJobFlag } from "./hostingProfile.js";
import { logger as defaultLogger } from "./logger.js";
import { startAiRssScheduler } from "./aiRssScheduler.js";
import { startPortalRssScheduler } from "./portal-rss-scheduler.js";

/**
 * RSS arka plan otomasyonu — varsayılan KAPALI (sunucu açılışında çalışmaz).
 * Admin düğmesiyle açıldığında günde 3 kez otomatik RSS çekimi çalışır (AI kuyruğu ayrıdır).
 *
 * Zamanlama: 01:00, 09:00, 18:00 Europe/Istanbul (UTC+3 sabit; Türkiye yaz saati yok).
 * Gündüz test için: RSS_AUTOMATION_ALL_DAY=1
 * Manuel «Önbelleği yenile» / «Çalıştır» uçları slot dışında da anında çalışır.
 *
 * Ayar: site_settings.background_jobs_json → { rssAutomationEnabled: boolean }
 */
export const RSS_SCHEDULED_HOURS_TR = [1, 9, 18] as const;
/** Planlı slotta tick penceresi (dakika) — tüm saat boyunca değil, yalnızca slot başı. */
export const RSS_SCHEDULED_SLOT_WINDOW_MIN = 20;
const RSS_TZ_OFFSET_MIN = 3 * 60;

export type RssAutomationSettings = {
  rssAutomationEnabled: boolean;
};

export type RssAutomationStatus = RssAutomationSettings & {
  schedulersRunning: boolean;
  withinScheduledSlot: boolean;
  envForced: boolean | null;
  schedule: {
    slots: string[];
    label: string;
    timezone: string;
  };
  turkeyTime: string;
  nextScheduledRun: string;
  lastSkipReason: string | null;
};

let schemaReady: Promise<void> | null = null;
const schedulerStops: Array<() => void> = [];
let schedulersRunning = false;
let controlLog: Logger | null = null;
let lastSkipReason: string | null = null;

function ensureBackgroundJobsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = db
      .execute(
        sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS background_jobs_json TEXT`,
      )
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

function parseBackgroundJobsJson(raw: unknown): RssAutomationSettings {
  if (typeof raw !== "string" || !raw.trim()) {
    return { rssAutomationEnabled: false };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      rssAutomationEnabled:
        typeof parsed.rssAutomationEnabled === "boolean"
          ? parsed.rssAutomationEnabled
          : false,
    };
  } catch {
    return { rssAutomationEnabled: false };
  }
}

export function getTurkeyHourMinute(now = new Date()): { hour: number; minute: number } {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const trMinutes = (utcMinutes + RSS_TZ_OFFSET_MIN + 1440) % 1440;
  return { hour: Math.floor(trMinutes / 60), minute: trMinutes % 60 };
}

export function isWithinRssScheduledSlot(now = new Date()): boolean {
  if (process.env.RSS_AUTOMATION_ALL_DAY === "1") return true;
  const { hour, minute } = getTurkeyHourMinute(now);
  if (!(RSS_SCHEDULED_HOURS_TR as readonly number[]).includes(hour)) return false;
  const windowMin = Math.min(
    59,
    Math.max(1, Number(process.env.RSS_SCHEDULE_SLOT_WINDOW_MIN) || RSS_SCHEDULED_SLOT_WINDOW_MIN),
  );
  return minute < windowMin;
}

/** @deprecated Gece penceresi kaldırıldı — isWithinRssScheduledSlot kullanın. */
export function isWithinRssNightWindow(now = new Date()): boolean {
  return isWithinRssScheduledSlot(now);
}

function rssScheduleSlots(): string[] {
  return RSS_SCHEDULED_HOURS_TR.map((h) => `${String(h).padStart(2, "0")}:00`);
}

function rssScheduleLabel(): string {
  if (process.env.RSS_AUTOMATION_ALL_DAY === "1") return "7/24 (RSS_AUTOMATION_ALL_DAY=1)";
  return rssScheduleSlots().join(", ");
}

/** Bir sonraki planlı slota kalan süre (ms). ALL_DAY modunda intervalMs döner. */
export function msUntilNextRssScheduledSlot(
  now = new Date(),
  fallbackIntervalMs = Number(process.env.PORTAL_RSS_REFRESH_MS) || 60 * 60_000,
): number {
  if (process.env.RSS_AUTOMATION_ALL_DAY === "1") {
    return Math.max(60_000, fallbackIntervalMs);
  }
  const { hour, minute } = getTurkeyHourMinute(now);
  const minuteOfDay = hour * 60 + minute;
  const slotMinutes = RSS_SCHEDULED_HOURS_TR.map((h) => h * 60);
  for (const sm of slotMinutes) {
    if (sm > minuteOfDay) {
      return (sm - minuteOfDay) * 60_000;
    }
  }
  const untilMidnight = (24 * 60 - minuteOfDay) * 60_000;
  return untilMidnight + slotMinutes[0]! * 60_000;
}

export function formatNextRssScheduledRun(now = new Date()): string {
  const ms = msUntilNextRssScheduledSlot(now);
  const next = new Date(now.getTime() + ms);
  const { hour, minute } = getTurkeyHourMinute(next);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function envRssAutomationOverride(): boolean | null {
  const v = process.env.RSS_AUTOMATION?.trim();
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

export async function getRssAutomationSettings(): Promise<RssAutomationSettings> {
  await ensureBackgroundJobsSchema();
  const result = await db.execute(sql`SELECT background_jobs_json FROM site_settings LIMIT 1`);
  const rows = (result as { rows?: Array<{ background_jobs_json?: unknown }> }).rows ?? result;
  const row = Array.isArray(rows) ? rows[0] : null;
  return parseBackgroundJobsJson(row?.background_jobs_json);
}

async function isRssAutomationEnabledInDbOrEnv(): Promise<boolean> {
  const envOverride = envRssAutomationOverride();
  if (envOverride !== null) return envOverride;
  const settings = await getRssAutomationSettings();
  return settings.rssAutomationEnabled;
}

/** Zamanlayıcı tick'leri ve sayfa tetiklemeli arka plan RSS çekimi için. */
export async function shouldRunRssAutomationTick(): Promise<boolean> {
  const enabled = await isRssAutomationEnabledInDbOrEnv();
  if (!enabled) {
    lastSkipReason = "disabled";
    return false;
  }
  if (!isWithinRssScheduledSlot()) {
    lastSkipReason = "outside_slot";
    return false;
  }
  lastSkipReason = null;
  return true;
}

export async function getRssAutomationStatus(): Promise<RssAutomationStatus> {
  const settings = await getRssAutomationSettings();
  const envOverride = envRssAutomationOverride();
  const enabled = envOverride ?? settings.rssAutomationEnabled;
  const { hour, minute } = getTurkeyHourMinute();
  return {
    rssAutomationEnabled: enabled,
    schedulersRunning,
    withinScheduledSlot: isWithinRssScheduledSlot(),
    envForced: envOverride,
    schedule: {
      slots: rssScheduleSlots(),
      label: rssScheduleLabel(),
      timezone: "Europe/Istanbul (UTC+3)",
    },
    turkeyTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    nextScheduledRun: formatNextRssScheduledRun(),
    lastSkipReason,
  };
}

async function persistRssAutomationEnabled(enabled: boolean): Promise<void> {
  await ensureBackgroundJobsSchema();
  const result = await db.execute(sql`SELECT id, background_jobs_json FROM site_settings LIMIT 1`);
  const rows = (result as { rows?: Array<{ id?: number; background_jobs_json?: unknown }> }).rows ?? result;
  const row = Array.isArray(rows) ? rows[0] : null;
  const next = JSON.stringify({ ...parseBackgroundJobsJson(row?.background_jobs_json), rssAutomationEnabled: enabled });
  if (row?.id != null) {
    await db.execute(sql`UPDATE site_settings SET background_jobs_json = ${next} WHERE id = ${row.id}`);
    return;
  }
  await db.execute(sql`INSERT INTO site_settings (background_jobs_json) VALUES (${next})`);
}

function stopRssAutomationSchedulers(): void {
  while (schedulerStops.length > 0) {
    const stop = schedulerStops.pop();
    try {
      stop?.();
    } catch {
      /* ignore */
    }
  }
  schedulersRunning = false;
}

function startRssAutomationSchedulers(log: Logger): () => void {
  stopRssAutomationSchedulers();
  controlLog = log;

  schedulerStops.push(
    startPortalRssScheduler(log, Number(process.env.PORTAL_RSS_REFRESH_MS) || 60 * 60_000),
  );

  if (envJobFlag("AI_RSS_SCHEDULER", false)) {
    schedulerStops.push(startAiRssScheduler(log, 60_000));
  }

  schedulersRunning = true;
  log.info(
    {
      schedule: rssScheduleLabel(),
      portalRssMs: Number(process.env.PORTAL_RSS_REFRESH_MS) || 60 * 60_000,
    },
    "[rss-automation] zamanlayıcılar başlatıldı (planlı slotlarda tick çalışır)",
  );

  return () => {
    stopRssAutomationSchedulers();
    controlLog = null;
  };
}

/** index.ts: DB'de rssAutomationEnabled=true ise zamanlayıcıları başlatır. */
export async function bootstrapRssAutomationFromSettings(log: Logger): Promise<(() => void) | null> {
  const shouldRun = await isRssAutomationEnabledInDbOrEnv();
  if (!shouldRun) {
    log.info(
      "[rss-automation] kapalı — Haber vitrin ayarları → «RSS otomasyonu» veya RSS_AUTOMATION=1",
    );
    return null;
  }
  return startRssAutomationSchedulers(log);
}

/** Admin toggle sonrası zamanlayıcıları senkronize et. */
export async function syncRssAutomationSchedulers(log: Logger): Promise<(() => void) | null> {
  const shouldRun = await isRssAutomationEnabledInDbOrEnv();
  if (shouldRun) {
    if (!schedulersRunning) {
      return startRssAutomationSchedulers(log);
    }
    return () => stopRssAutomationSchedulers();
  }
  stopRssAutomationSchedulers();
  log.info("[rss-automation] zamanlayıcılar durduruldu");
  return null;
}

export async function setRssAutomationEnabled(enabled: boolean, log?: Logger): Promise<RssAutomationStatus> {
  await persistRssAutomationEnabled(enabled);
  const loggerRef = log ?? controlLog ?? defaultLogger;
  await syncRssAutomationSchedulers(loggerRef);
  return getRssAutomationStatus();
}
