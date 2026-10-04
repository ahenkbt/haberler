import { describe, expect, it } from "vitest";
import type { WorldBriefItem } from "@/hooks/useWorldBriefs";
import {
  isWorldBriefInternalRssPreviewPath,
  repairDunyaLabel,
  repairWorldBriefsPayload,
  resolveWorldBriefHref,
} from "@/lib/worldBriefsDisplay";

function brief(partial: Partial<WorldBriefItem> & Pick<WorldBriefItem, "id">): WorldBriefItem {
  return {
    title: "Test headline",
    spot: null,
    href: "",
    publishedAt: "2026-01-01T12:00:00.000Z",
    sourceName: "BBC",
    feedLabel: "BBC",
    countryCode: "GB",
    countryName: "United Kingdom",
    continent: "europe",
    ...partial,
  };
}

describe("worldBriefsDisplay", () => {
  const h = (path: string) => `/asg${path}?siteId=3`;

  it("detects internal RSS preview paths", () => {
    expect(isWorldBriefInternalRssPreviewPath("/haberler/rss/abc")).toBe(true);
    expect(isWorldBriefInternalRssPreviewPath("/asg/haberler/rss/abc")).toBe(true);
    expect(isWorldBriefInternalRssPreviewPath("/kisa-kisa")).toBe(false);
  });

  it("routes edge RSS cards to in-site preview", () => {
    expect(
      resolveWorldBriefHref(
        h,
        brief({ id: "edge-abc123", href: "/haberler/rss/edge-abc123" }),
      ),
    ).toBe("/asg/haberler/rss/edge-abc123?siteId=3");
  });

  it("does not open external publisher URLs from world briefs", () => {
    expect(
      resolveWorldBriefHref(h, brief({ id: "x", href: "https://www.ntv.com.tr/dunya/foo-123" })),
    ).toBe("/asg/kisa-kisa?siteId=3");
  });

  it("falls back to kisa-kisa when href is empty", () => {
    expect(resolveWorldBriefHref(h, brief({ id: "x", href: "" }))).toBe("/asg/kisa-kisa?siteId=3");
  });

  it("repairs the edge Dünya mojibake on world-brief labels", () => {
    const broken = `D${String.fromCharCode(0x251c, 0x255d)}nya`;
    expect(repairDunyaLabel(broken)).toBe("Dünya");
    expect(repairDunyaLabel("Dünya")).toBe("Dünya");
    const repaired = repairWorldBriefsPayload({
      continents: [
        {
          id: "global",
          label: broken,
          items: [brief({ id: "edge-1", sourceName: broken, feedLabel: broken })],
          countries: [],
        },
      ],
      totalItems: 1,
      feedCount: 1,
      checkedAt: "2026-10-04T00:00:00.000Z",
    });
    expect(repaired.continents[0]?.label).toBe("Dünya");
    expect(repaired.continents[0]?.items[0]?.sourceName).toBe("Dünya");
    expect(repaired.continents[0]?.items[0]?.feedLabel).toBe("Dünya");
  });

  it("preserves safe internal article paths", () => {
    expect(resolveWorldBriefHref(h, brief({ id: "db:1", href: "/haber/foo" }))).toBe(
      "/asg/haber/foo?siteId=3",
    );
  });
});
