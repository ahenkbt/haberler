import { describe, expect, it } from "vitest";
import type { WorldBriefItem } from "@/hooks/useWorldBriefs";
import { isWorldBriefInternalRssPreviewPath, resolveWorldBriefHref } from "@/lib/worldBriefsDisplay";

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

  it("prefers external RSS source URLs", () => {
    expect(
      resolveWorldBriefHref(h, brief({ id: "x", href: "https://www.bbc.com/news/world-123" })),
    ).toBe("https://www.bbc.com/news/world-123");
  });

  it("never routes world brief cards to internal rss preview pages", () => {
    expect(resolveWorldBriefHref(h, brief({ id: "x", href: "/haberler/rss/9e079fb7173949ca" }))).toBe(
      "/asg/kisa-kisa?siteId=3",
    );
  });

  it("falls back to kisa-kisa when href is empty", () => {
    expect(resolveWorldBriefHref(h, brief({ id: "x", href: "" }))).toBe("/asg/kisa-kisa?siteId=3");
  });

  it("preserves safe internal paths", () => {
    expect(resolveWorldBriefHref(h, brief({ id: "x", href: "/kisa-kisa" }))).toBe("/asg/kisa-kisa?siteId=3");
  });
});
