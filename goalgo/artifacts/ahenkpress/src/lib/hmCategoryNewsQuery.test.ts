import { describe, expect, it } from "vitest";
import { keepScopedCategoryPageItems } from "./hmHomeCategorySectionPool";
import {
  buildHmCategoryHybridPath,
  buildHmCategoryNewsFallbackPath,
  isShaTargetSiteSlug,
  shaCityNewsSlugsMatch,
  shouldUseCategoryNewsFallback,
} from "./hmCategoryNewsQuery";

describe("hmCategoryNewsQuery", () => {
  it("kategori sayfası hibrit isteğine dbFirst ekler", () => {
    expect(
      buildHmCategoryHybridPath({ slug: "yerel", siteId: 3, limit: 60, offset: 0 }),
    ).toBe(
      "/api/news/hybrid?limit=60&offset=0&includeTotal=1&categorySlug=yerel&rssScope=all&dbFirst=1&siteId=3",
    );
  });

  it("hibrit düşerse /api/news yedek yolunu kurar", () => {
    expect(
      buildHmCategoryNewsFallbackPath({ slug: "gundem", siteId: 8, limit: 60, offset: 60 }),
    ).toBe("/api/news/?limit=60&offset=60&includeTotal=1&categorySlug=gundem&siteId=8");
  });

  it("ASG/AHG yerel↔ankara eşleşmesini açar; diğer sitelerde kapatır", () => {
    expect(isShaTargetSiteSlug("asg")).toBe(true);
    expect(shaCityNewsSlugsMatch("ankara", "yerel", ["asg"])).toBe(true);
    expect(shaCityNewsSlugsMatch("yerel", "ankara", ["ankarahabergundemi"])).toBe(true);
    expect(shaCityNewsSlugsMatch("ankara", "yerel", ["vkd"])).toBe(false);
    expect(shaCityNewsSlugsMatch("gundem", "yerel", ["asg"])).toBe(false);
  });

  it("hibrit boş/timeout yanıtında /api/news yedeğine geçer", () => {
    expect(shouldUseCategoryNewsFallback({ items: [], total: 0 })).toBe(true);
    expect(shouldUseCategoryNewsFallback({ items: [{ id: 1 }], total: 1 })).toBe(false);
    expect(shouldUseCategoryNewsFallback([])).toBe(true);
    expect(shouldUseCategoryNewsFallback(null)).toBe(true);
  });

  it("ASG ankara listesi imageUrl boş olsa da boşalmaz", () => {
    const items = [
      { title: "Ankara haber 1", categorySlug: "ankara", imageUrl: "" },
      { title: "Ankara haber 2", categorySlug: "ankara", imageUrl: null },
    ];
    const ctx = {
      knownCanonicalSlugs: new Set(["ankara", "yerel", "gundem"]),
      siteSlugPrefixes: ["asg"],
    };
    const kept = keepScopedCategoryPageItems(items, "ankara", ctx);
    expect(kept.map((item) => item.title)).toEqual(["Ankara haber 1", "Ankara haber 2"]);
  });

  it("eşleşme filtresi tüm satırları düşürürse API kapsamını korur", () => {
    const items = [{ title: "Havuz haberi", categorySlug: "xyz-unknown", imageUrl: "" }];
    const ctx = { knownCanonicalSlugs: new Set(["gundem"]), siteSlugPrefixes: [] };
    const kept = keepScopedCategoryPageItems(items, "ankara", ctx);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.title).toBe("Havuz haberi");
  });
});
