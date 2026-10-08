import { describe, expect, it } from "vitest";
import {
  categorySlugFromFixHaberFeed,
  FIXHABER_CAMPAIGN_RSS_FEEDS,
  fixHaberFeedUrls,
} from "./hm-fixhaber-rss-feeds.js";

describe("fixhaber rss feeds", () => {
  it("maps known feed URLs to fixhaber-prefixed categories", () => {
    expect(categorySlugFromFixHaberFeed("https://www.ntv.com.tr/teknoloji.rss")).toBe("fixhaber-teknoloji");
    expect(categorySlugFromFixHaberFeed("https://www.ntv.com.tr/gundem.rss")).toBe("fixhaber-gundem");
    expect(categorySlugFromFixHaberFeed("https://www.birgun.net/rss/kategori/bilim-40")).toBe("fixhaber-bilim");
    expect(categorySlugFromFixHaberFeed("https://feeds.arstechnica.com/arstechnica/index")).toBe(
      "fixhaber-donanim",
    );
  });

  it("campaign feed list stays in sync with defs", () => {
    expect(fixHaberFeedUrls().length).toBe(FIXHABER_CAMPAIGN_RSS_FEEDS.length);
    expect(fixHaberFeedUrls().every((u) => u.startsWith("https://"))).toBe(true);
  });
});
