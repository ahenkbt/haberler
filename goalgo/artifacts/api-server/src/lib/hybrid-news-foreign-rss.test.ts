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

  it("keeps HM site-configured feeds even when slug looks domestic", () => {
    const feeds = filterForeignOnlyPortalHybridRssFeeds([
      {
        id: "hm-1-site-turkiye",
        categorySlug: "turkiye",
        label: "Türkiye",
        url: "https://www.ntv.com.tr/turkiye.rss",
        enabled: true,
        maxItems: 10,
      },
      {
        id: "turkiye",
        categorySlug: "turkiye",
        label: "Merkez TR",
        url: "https://www.ntv.com.tr/turkiye.rss",
        enabled: true,
        maxItems: 10,
        countryCode: "TR",
      },
    ]);
    expect(feeds.map((feed) => feed.id)).toEqual(["hm-1-site-turkiye"]);
  });

  it("keeps cached items from HM site feed ids", () => {
    const items = filterForeignOnlyPortalRssItems(
      [
        {
          id: "rss:site",
          title: "Site haber",
          link: "https://example.com/a",
          spot: "",
          imageUrl: null,
          publishedAt: "2026-07-15T10:00:00.000Z",
          titleKey: "site",
          feedId: "hm-1-site-turkiye",
          categorySlug: "turkiye",
        },
      ],
      { "hm-1-site-turkiye": { countryCode: "TR", regionKey: null } },
    );
    expect(items.map((item) => item.id)).toEqual(["rss:site"]);
  });
});
