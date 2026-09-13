import { describe, expect, it } from "vitest";
import {
  buildHmCategoryHybridPath,
  buildHmCategoryNewsFallbackPath,
  isKhTargetSiteSlug,
  isShaTargetSiteSlug,
  khCityNewsSlugsMatch,
  shaCityNewsSlugsMatch,
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

  it("KH yerel↔kırşehir eşleşmesini açar; diğer sitelerde kapatır", () => {
    expect(isKhTargetSiteSlug("kirsehirhaber")).toBe(true);
    expect(khCityNewsSlugsMatch("kirsehir", "yerel", ["kirsehirhaber"])).toBe(true);
    expect(khCityNewsSlugsMatch("yerel", "kirsehir", ["kh"])).toBe(true);
    expect(khCityNewsSlugsMatch("kirsehir", "yerel", ["asg"])).toBe(false);
    expect(khCityNewsSlugsMatch("gundem", "yerel", ["kirsehirhaber"])).toBe(false);
  });
});
