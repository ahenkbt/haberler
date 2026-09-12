import { describe, expect, it } from "vitest";
import {
  articleUrlForRssImageBackfill,
  pickRssBackfillImageUrl,
  shouldBackfillMissingRssNewsImage,
} from "./hm-rss-missing-image.js";

describe("shouldBackfillMissingRssNewsImage", () => {
  it("backfills site-local RSS imports that lack a real cover", () => {
    expect(
      shouldBackfillMissingRssNewsImage({
        imageUrl: null,
        rssSourceUrl: "https://www.example.com/gundem/haber-1",
        isEditorManual: false,
        tags: ["rss-auto"],
      }),
    ).toBe(true);
    expect(
      shouldBackfillMissingRssNewsImage({
        imageUrl: "data:image/svg+xml,%3Csvg%3EGorsel",
        rssSourceUrl: "https://www.example.com/gundem/haber-1",
        isEditorManual: false,
      }),
    ).toBe(true);
  });

  it("never overwrites editor manuals or rows that already have a cover", () => {
    expect(
      shouldBackfillMissingRssNewsImage({
        imageUrl: "",
        rssSourceUrl: "https://www.example.com/gundem/haber-1",
        isEditorManual: true,
      }),
    ).toBe(false);
    expect(
      shouldBackfillMissingRssNewsImage({
        imageUrl: "https://cdn.example.com/cover.jpg",
        rssSourceUrl: "https://www.example.com/gundem/haber-1",
        isEditorManual: false,
      }),
    ).toBe(false);
    expect(
      shouldBackfillMissingRssNewsImage({
        imageUrl: "",
        rssSourceUrl: "yekpare-hm-sync:3:news:12",
        isEditorManual: false,
      }),
    ).toBe(false);
  });
});

describe("pickRssBackfillImageUrl", () => {
  it("prefers cached enclosure, then og:image scrape, then feed media:content", () => {
    expect(
      pickRssBackfillImageUrl({
        pageUrl: "https://www.example.com/haber/1",
        cachedImageUrl: "https://cdn.example.com/cached.jpg",
        scrapedImageUrl: "https://cdn.example.com/og.jpg",
      }),
    ).toBe("https://cdn.example.com/cached.jpg");

    expect(
      pickRssBackfillImageUrl({
        pageUrl: "https://www.example.com/haber/1",
        scrapedImageUrl: "https://cdn.example.com/og.jpg",
      }),
    ).toBe("https://cdn.example.com/og.jpg");

    expect(
      pickRssBackfillImageUrl({
        pageUrl: "https://www.example.com/haber/1",
        rawFeedItem: `<item><media:content url="https://cdn.example.com/media.jpg" medium="image"/></item>`,
      }),
    ).toBe("https://cdn.example.com/media.jpg");
  });

  it("parses article URL from rssSourceUrl", () => {
    expect(articleUrlForRssImageBackfill("https://vatanhaber.net/haber/1")).toContain("vatanhaber.net");
    expect(articleUrlForRssImageBackfill("yekpare-hm-pool:3:9")).toBeNull();
  });
});
