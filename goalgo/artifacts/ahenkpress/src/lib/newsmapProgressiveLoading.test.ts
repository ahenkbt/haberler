import { describe, expect, it } from "vitest";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import {
  isNewsmapLocationEnhancing,
  mergeNewsmapHeadlinesDedupe,
  resolveNewsmapPhase1LocationHeadlines,
  shouldBlockNewsmapLocationLoading,
} from "@/lib/newsmapProgressiveLoading";

function headline(partial: Partial<HmMapCityHeadline> & Pick<HmMapCityHeadline, "title" | "city">): HmMapCityHeadline {
  return {
    href: `/t/${partial.title}`,
    kind: "news",
    ...partial,
  };
}

describe("newsmapProgressiveLoading", () => {
  it("merges phase1 and phase2 without duplicate hrefs", () => {
    const phase1 = [headline({ city: "Konya", title: "DB haber", href: "/a" })];
    const phase2 = [
      headline({ city: "Konya", title: "DB haber", href: "/a" }),
      headline({ city: "Konya", title: "RSS haber", href: "/b", source: "rss" }),
    ];
    const merged = mergeNewsmapHeadlinesDedupe(phase1, phase2);
    expect(merged).toHaveLength(2);
    expect(merged.map((row) => row.title)).toEqual(["DB haber", "RSS haber"]);
  });

  it("resolves phase1 from headlines and region pool", () => {
    const rows = resolveNewsmapPhase1LocationHeadlines(
      "Konya",
      [headline({ city: "Ankara", title: "Baskent" })],
      [headline({ city: "Konya", title: "Konya trafik" })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Konya trafik");
  });

  it("does not block UI when phase1 is ready", () => {
    expect(shouldBlockNewsmapLocationLoading(2, 0, true)).toBe(false);
    expect(isNewsmapLocationEnhancing(2, true)).toBe(true);
  });

  it("blocks UI only when both phases empty and fetch pending", () => {
    expect(shouldBlockNewsmapLocationLoading(0, 0, true)).toBe(true);
    expect(shouldBlockNewsmapLocationLoading(0, 0, false)).toBe(false);
  });
});
