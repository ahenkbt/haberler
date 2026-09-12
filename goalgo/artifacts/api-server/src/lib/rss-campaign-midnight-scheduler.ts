/**
 * RSS kampanya gece 00:00 Europe/Istanbul — SHA (ASG+AHG) + Vatanhaber Ankara.
 * Portal saatlik / 01:00 kalıcı RSS otomasyonuna dokunmaz.
 */
import type { Logger } from "pino";
import { getNewsDbForRead, rssCampaignsTable } from "@workspace/db";
import { PG_ADVISORY_LOCKS, withPgAdvisoryLock } from "./pg-advisory-lock.js";
import { envJobFlag } from "./hostingProfile.js";
import { executeRssCampaignRun } from "./rssCampaignRun.js";
import { ensureHmSharedRssCampaigns } from "./hm-rss-campaign-seed.js";
import { copyVatanhaberAnkaraNewsToHmSites } from "./hm-vatanhaber-ankara-sync.js";
import { isMidnightTrCampaign } from "./rss-campaign-dedupe.js";
import { isShaCampaign } from "./hm-sha-rss-feeds.js";
import {
  isWithinRssCampaignMidnightSlot,
  msUntilNextRssCampaignMidnightSlot,
  rssCampaignMidnightScheduleLabel,
  turkeyCalendarDayKey,
} from "./rss-campaign-midnight-slot.js";

export {
  isWithinRssCampaignMidnightSlot,
  msUntilNextRssCampaignMidnightSlot,
  RSS_CAMPAIGN_MIDNIGHT_HOUR_TR,
  rssCampaignMidnightScheduleLabel,
  turkeyCalendarDayKey,
} from "./rss-campaign-midnight-slot.js";

let lastDailyRunDayKey: string | null = null;

export async function runHmMidnightRssCampaigns(log: Logger): Promise<{
  seeded: boolean;
  campaigns: number;
  copiedAnkara: number;
}> {
  const seed = await ensureHmSharedRssCampaigns();
  const campaigns = await getNewsDbForRead().select().from(rssCampaignsTable);
  const due = campaigns.filter((c) => isMidnightTrCampaign(c) || isShaCampaign(c));
  let ran = 0;
  for (const campaign of due) {
    const result = await executeRssCampaignRun(campaign.id);
    ran += 1;
    log.info({ campaignId: campaign.id, name: campaign.name, ...result }, "[hm-rss-midnight] kampanya bitti");
  }
  const ankara = await copyVatanhaberAnkaraNewsToHmSites();
  log.info({ ...ankara, shaCampaignId: seed.shaCampaignId }, "[hm-rss-midnight] vatanhaber ankara kopya");
  return { seeded: true, campaigns: ran, copiedAnkara: ankara.copied };
}

async function tickRssCampaignMidnight(log: Logger, reason: "startup" | "slot"): Promise<void> {
  if (!envJobFlag("HM_RSS_MIDNIGHT_SYNC", true)) {
    log.debug("[hm-rss-midnight] HM_RSS_MIDNIGHT_SYNC=0 — atlandı");
    return;
  }
  if (!isWithinRssCampaignMidnightSlot()) {
    if (reason !== "startup") {
      log.debug("[hm-rss-midnight] planlı slot dışında — atlandı");
    }
    return;
  }

  const dayKey = turkeyCalendarDayKey();
  if (lastDailyRunDayKey === dayKey) {
    log.debug({ dayKey }, "[hm-rss-midnight] bugün zaten çalıştı — atlandı");
    return;
  }

  const ran = await withPgAdvisoryLock(PG_ADVISORY_LOCKS.HM_RSS_MIDNIGHT, async () => {
    if (lastDailyRunDayKey === dayKey) return false;
    await runHmMidnightRssCampaigns(log);
    lastDailyRunDayKey = dayKey;
    log.info({ reason, dayKey }, "[hm-rss-midnight] 00:00 TR SHA + Vatanhaber çalıştı");
    return true;
  });

  if (ran === undefined) {
    log.debug("[hm-rss-midnight] başka replica çalıştırıyor — atlandı");
  }
}

/** Kapatmak: HM_RSS_MIDNIGHT_SYNC=0 */
export function startRssCampaignMidnightScheduler(log: Logger): () => void {
  let stopped = false;
  let slotTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleNextSlot = () => {
    if (stopped) return;
    const delay = msUntilNextRssCampaignMidnightSlot(new Date());
    slotTimer = setTimeout(() => {
      void tickRssCampaignMidnight(log, "slot").finally(scheduleNextSlot);
    }, Math.max(5_000, delay));
    slotTimer.unref?.();
  };

  const startupDelay = setTimeout(() => {
    void tickRssCampaignMidnight(log, "startup");
  }, 25_000);
  startupDelay.unref?.();

  scheduleNextSlot();

  log.info(
    { schedule: rssCampaignMidnightScheduleLabel(), enabled: envJobFlag("HM_RSS_MIDNIGHT_SYNC", true) },
    "[hm-rss-midnight] günlük 00:00 TR zamanlayıcı aktif",
  );

  return () => {
    stopped = true;
    clearTimeout(startupDelay);
    clearTimeout(slotTimer);
  };
}
