import { getTurkeyHourMinute } from "./rss-automation-control.js";

export const RSS_CAMPAIGN_MIDNIGHT_HOUR_TR = 0;
export const RSS_CAMPAIGN_MIDNIGHT_SLOT_WINDOW_MIN = 20;

const TR_OFFSET_MS = 3 * 60 * 60_000;

export function turkeyCalendarDayKey(now = new Date()): string {
  return new Date(now.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

export function isWithinRssCampaignMidnightSlot(now = new Date()): boolean {
  if (process.env.HM_RSS_MIDNIGHT_ALL_DAY === "1") return true;
  const { hour, minute } = getTurkeyHourMinute(now);
  if (hour !== RSS_CAMPAIGN_MIDNIGHT_HOUR_TR) return false;
  const windowMin = Math.min(
    59,
    Math.max(1, Number(process.env.HM_RSS_MIDNIGHT_SLOT_WINDOW_MIN) || RSS_CAMPAIGN_MIDNIGHT_SLOT_WINDOW_MIN),
  );
  return minute < windowMin;
}

export function msUntilNextRssCampaignMidnightSlot(now = new Date()): number {
  if (process.env.HM_RSS_MIDNIGHT_ALL_DAY === "1") {
    return Math.max(60_000, Number(process.env.HM_RSS_MIDNIGHT_ALL_DAY_MS) || 5 * 60_000);
  }
  const { hour, minute } = getTurkeyHourMinute(now);
  const minuteOfDay = hour * 60 + minute;
  const slotStart = RSS_CAMPAIGN_MIDNIGHT_HOUR_TR * 60;
  if (minuteOfDay < slotStart) {
    return (slotStart - minuteOfDay) * 60_000;
  }
  const windowMin = Math.min(
    59,
    Math.max(1, Number(process.env.HM_RSS_MIDNIGHT_SLOT_WINDOW_MIN) || RSS_CAMPAIGN_MIDNIGHT_SLOT_WINDOW_MIN),
  );
  if (hour === RSS_CAMPAIGN_MIDNIGHT_HOUR_TR && minute < windowMin) {
    return 60_000;
  }
  return (24 * 60 - minuteOfDay + slotStart) * 60_000;
}

export function rssCampaignMidnightScheduleLabel(): string {
  if (process.env.HM_RSS_MIDNIGHT_ALL_DAY === "1") return "7/24 test (HM_RSS_MIDNIGHT_ALL_DAY=1)";
  return "00:00 TR (günde 1) — SHA + Vatanhaber Ankara";
}
