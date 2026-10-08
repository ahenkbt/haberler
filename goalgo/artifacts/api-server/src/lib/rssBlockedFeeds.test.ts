import { describe, expect, it } from "vitest";
import { filterBlockedHmRssFeedUrls, isBlockedHmRssFeedUrl } from "./rssBlockedFeeds.js";

describe("rssBlockedFeeds", () => {
  it("blocks BirGün siyaset-8 politika RSS", () => {
    expect(isBlockedHmRssFeedUrl("https://www.birgun.net/rss/kategori/siyaset-8")).toBe(true);
    expect(isBlockedHmRssFeedUrl("https://www.birgun.net/rss/kategori/teknoloji-28")).toBe(false);
  });

  it("filterBlockedHmRssFeedUrls drops blocked URLs", () => {
    expect(
      filterBlockedHmRssFeedUrls([
        "https://www.birgun.net/rss/kategori/siyaset-8",
        "https://cumha.com.tr/rss/lokasyon/ankara",
      ]),
    ).toEqual(["https://cumha.com.tr/rss/lokasyon/ankara"]);
  });
});
