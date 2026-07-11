import { describe, expect, it } from "vitest";
import {
  isSiteLocalNewsRow,
  shouldRefreshNewsListImageFromSource,
} from "./news-list-image-enrich-logic.js";
import { parseHmPoolRef, parseHmSyncDedupeKey } from "./hm-sync-source.js";

describe("isSiteLocalNewsRow", () => {
  it("treats any positive siteId as site-local", () => {
    expect(isSiteLocalNewsRow({ siteId: 7, isEditorManual: true })).toBe(true);
    expect(
      isSiteLocalNewsRow({
        siteId: 7,
        rssSourceUrl: "wp-wxr:vatankahramanlari.org.tr:32379",
      }),
    ).toBe(true);
    expect(
      isSiteLocalNewsRow({
        siteId: 7,
        rssSourceUrl: "yekpare-hm-pool:3:5408",
        isEditorManual: false,
      }),
    ).toBe(true);
  });

  it("treats null/zero as central", () => {
    expect(isSiteLocalNewsRow({ siteId: null })).toBe(false);
    expect(isSiteLocalNewsRow({ siteId: 0 })).toBe(false);
    expect(isSiteLocalNewsRow({})).toBe(false);
  });
});

describe("shouldRefreshNewsListImageFromSource", () => {
  it("refreshes central yekpare pool copies", () => {
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 1,
        siteId: null,
        imageUrl: "/old.jpg",
        rssSourceUrl: "yekpare-hm-pool:3:9001",
        isEditorManual: false,
      }),
    ).toBe(true);
  });

  it("never refreshes site-local rows including pool copies", () => {
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 9,
        siteId: 7,
        imageUrl: "/old.jpg",
        rssSourceUrl: "yekpare-hm-pool:3:5408",
        isEditorManual: false,
      }),
    ).toBe(false);
  });

  it("refreshes central RSS-auto tagged rows", () => {
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 2,
        siteId: null,
        imageUrl: "/stale.jpg",
        rssSourceUrl: "https://example.com/haber/1",
        isEditorManual: false,
        tags: ["rss-auto"],
      }),
    ).toBe(true);
  });

  it("keeps editor manual uploads", () => {
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 3,
        imageUrl: "/editor.jpg",
        rssSourceUrl: "https://example.com/haber/2",
        isEditorManual: true,
        tags: ["rss-auto"],
      }),
    ).toBe(false);
  });

  it("keeps all site-local rows regardless of rss ref", () => {
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 7,
        siteId: 7,
        imageUrl: "/api/media/uploads/rss-1783399628135.webp",
        rssSourceUrl: "wp-wxr:vatankahramanlari.org.tr:32379",
        isEditorManual: false,
      }),
    ).toBe(false);
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 8,
        siteId: 7,
        imageUrl: "/api/media/uploads/1782744417359-806f2f0f3ec51c69.png",
        rssSourceUrl: null,
        isEditorManual: false,
      }),
    ).toBe(false);
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 10,
        siteId: 7,
        imageUrl: "/stale.jpg",
        rssSourceUrl: "https://example.com/haber/1",
        isEditorManual: false,
        tags: ["rss-auto"],
      }),
    ).toBe(false);
  });

  it("skips yekpare sync refs even on central rows", () => {
    expect(
      shouldRefreshNewsListImageFromSource({
        id: 6,
        siteId: null,
        imageUrl: "/editor-upload.jpg",
        rssSourceUrl: "yekpare-hm-sync:7:news:42",
        isEditorManual: false,
      }),
    ).toBe(false);
  });
});

describe("pool/sync image source refs", () => {
  it("parses pool ref with site scope", () => {
    expect(parseHmPoolRef("yekpare-hm-pool:7:501")).toEqual({ siteId: 7, id: 501 });
  });

  it("parses sync ref with site scope", () => {
    expect(parseHmSyncDedupeKey("yekpare-hm-sync:7:news:501")).toEqual({
      siteId: 7,
      kind: "news",
      sourceId: 501,
    });
  });
});
