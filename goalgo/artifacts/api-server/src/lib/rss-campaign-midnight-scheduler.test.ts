import { describe, expect, it } from "vitest";
import {
  isWithinRssCampaignMidnightSlot,
  msUntilNextRssCampaignMidnightSlot,
  RSS_CAMPAIGN_MIDNIGHT_HOUR_TR,
  turkeyCalendarDayKey,
} from "./rss-campaign-midnight-slot.js";
import { isWithinRssPersistSlot } from "./rss-automation-control.js";

function trDate(hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, 8, 12, hour - 3, minute, 0));
}

describe("RSS kampanya 00:00 TR slot", () => {
  it("gece 00:00 TR penceresinde çalışır, 01:00 portal persist ile çakışmaz", () => {
    expect(RSS_CAMPAIGN_MIDNIGHT_HOUR_TR).toBe(0);
    expect(isWithinRssCampaignMidnightSlot(trDate(0, 0))).toBe(true);
    expect(isWithinRssCampaignMidnightSlot(trDate(0, 19))).toBe(true);
    expect(isWithinRssCampaignMidnightSlot(trDate(0, 21))).toBe(false);
    expect(isWithinRssCampaignMidnightSlot(trDate(1, 5))).toBe(false);
    expect(isWithinRssPersistSlot(trDate(1, 5))).toBe(true);
    expect(isWithinRssPersistSlot(trDate(0, 5))).toBe(false);
  });

  it("sonraki slota kalan süre gece yarısından sonraya işaret eder", () => {
    const fromNoon = msUntilNextRssCampaignMidnightSlot(trDate(12, 0));
    expect(fromNoon).toBeGreaterThan(11 * 60 * 60_000);
    expect(fromNoon).toBeLessThanOrEqual(12 * 60 * 60_000);
    expect(turkeyCalendarDayKey(trDate(0, 30)).length).toBe(10);
  });
});
