import { describe, expect, it } from "vitest";
import {
  filterForeignOnlyPortalHybridRssFeeds,
  filterForeignOnlyPortalRssItems,
} from "./hybrid-news-foreign-rss.js";

describe("hybrid-news foreign RSS filters", () => {
  it("drops Turkish domestic feeds but keeps global / foreign country feeds", () => {
    const feeds = filterForeignOnlyPortalHybridRssFeeds([
      {
        id: "turkiye",
        categorySlug: "turkiye",
        label: "Türkiye",
        url: "https://www.ntv.com.tr/turkiye.rss",
        enabled: true,
        maxItems: 10,
        countryCode: "TR",
      },
      {
        id: "dunya",
        categorySlug: "dunya",
        label: "Dünya",
        url: "https://www.ntv.com.tr/dunya.rss",
        enabled: true,
        maxItems: 10,
      },
      {
        id: "gmn-1",
        categorySlug: "dunya",
        label: "Atina",
        url: "https://news.google.com/rss/search?q=Athens",
        enabled: true,
        maxItems: 10,
        countryCode: "GR",
        regionKey: "gr-atina",
      },
    ]);

    expect(feeds.map((feed) => feed.id)).toEqual(["gmn-1"]);
  });

  it("filters cached RSS items using feed geo metadata", () => {
    const items = filterForeignOnlyPortalRssItems(
      [
        {
          id: "rss:1",
          title: "Ankara",
          link: "https://example.com/tr",
          spot: "",
          imageUrl: null,
          publishedAt: "2026-07-04T10:00:00.000Z",
          titleKey: "ankara",
          feedId: "tr-feed",
          categorySlug: "turkiye",
        },
        {
          id: "rss:2",
          title: "Athens update",
          link: "https://example.com/gr",
          spot: "",
          imageUrl: null,
          publishedAt: "2026-07-04T10:00:00.000Z",
          titleKey: "athens",
          feedId: "gr-feed",
          categorySlug: "global",
        },
      ],
      {
        "tr-feed": { countryCode: "TR", regionKey: "tr-turkiye" },
        "gr-feed": { countryCode: "GR", regionKey: "gr-atina" },
      },
    );

    expect(items.map((item) => item.id)).toEqual(["rss:2"]);
  });
});
