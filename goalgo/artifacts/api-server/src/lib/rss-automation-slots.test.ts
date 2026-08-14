import { describe, expect, it } from "vitest";
import {
  isWithinRssPersistSlot,
  isWithinRssScheduledSlot,
  RSS_PERSIST_HOUR_TR,
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

  it("kalıcı kayıt yalnızca gece 01:00 TR", () => {
    expect(RSS_PERSIST_HOUR_TR).toBe(1);
    expect(isWithinRssPersistSlot(trDate(1, 5))).toBe(true);
    expect(isWithinRssPersistSlot(trDate(9, 5))).toBe(false);
    expect(isWithinRssPersistSlot(trDate(15, 0))).toBe(false);
  });
});
