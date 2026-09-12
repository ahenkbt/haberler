import { describe, expect, it } from "vitest";
import {
  getTurkeyDayStartUtc,
  isWithinRssPersistSlot,
  isWithinRssScheduledSlot,
  RSS_PERSIST_HOURS_TR,
} from "./rss-automation-control.js";

function trDate(hour: number, minute: number): Date {
  // TR = UTC+3
  return new Date(Date.UTC(2026, 7, 14, hour - 3, minute, 0));
}

describe("rss automation slots", () => {
  it("saatlik canlı pencere ilk 20 dakikadır", () => {
    expect(isWithinRssScheduledSlot(trDate(10, 0))).toBe(true);
    expect(isWithinRssScheduledSlot(trDate(10, 19))).toBe(true);
    expect(isWithinRssScheduledSlot(trDate(10, 21))).toBe(false);
  });

  it("kalıcı kayıt 02:00 ve 09:00 TR pencereleridir", () => {
    expect([...RSS_PERSIST_HOURS_TR]).toEqual([2, 9]);
    expect(isWithinRssPersistSlot(trDate(2, 0))).toBe(true);
    expect(isWithinRssPersistSlot(trDate(2, 19))).toBe(true);
    expect(isWithinRssPersistSlot(trDate(2, 21))).toBe(false);
    expect(isWithinRssPersistSlot(trDate(9, 5))).toBe(true);
    expect(isWithinRssPersistSlot(trDate(9, 19))).toBe(true);
    expect(isWithinRssPersistSlot(trDate(1, 5))).toBe(false);
    expect(isWithinRssPersistSlot(trDate(15, 0))).toBe(false);
  });

  it("Türkiye gün başlangıcı 00:00 TR’dir", () => {
    const noon = trDate(12, 30);
    const start = getTurkeyDayStartUtc(noon);
    expect(start.toISOString()).toBe(trDate(0, 0).toISOString());
  });
});
