import { describe, expect, it } from "vitest";
import {
  isGenuineRssNewsRow,
  isManualOrWxrNewsRow,
  isSuspectWrongRssCover,
} from "./hm-corporate-manual-image-repair.js";

describe("isManualOrWxrNewsRow", () => {
  it("detects editor manual and WXR imports", () => {
    expect(isManualOrWxrNewsRow({ isEditorManual: true })).toBe(true);
    expect(isManualOrWxrNewsRow({ rssSourceUrl: "wp-wxr:vatankahramanlari.org:42" })).toBe(true);
    expect(isManualOrWxrNewsRow({ tags: ["wp-import", "faaliyetlerimiz"] })).toBe(true);
  });

  it("rejects plain pool copies without manual markers", () => {
    expect(
      isManualOrWxrNewsRow({
        rssSourceUrl: "yekpare-hm-pool:3:5408",
        isEditorManual: false,
        tags: [],
      }),
    ).toBe(false);
  });
});

describe("isGenuineRssNewsRow", () => {
  it("detects RSS-auto and http source", () => {
    expect(isGenuineRssNewsRow({ tags: ["rss-auto"], rssSourceUrl: "https://x.com/a" })).toBe(true);
    expect(isGenuineRssNewsRow({ rssSourceUrl: "https://example.com/haber/1" })).toBe(true);
  });

  it("does not flag WXR refs", () => {
    expect(isGenuineRssNewsRow({ rssSourceUrl: "wp-wxr:site:1", tags: ["wp-import"] })).toBe(false);
  });
});

describe("isSuspectWrongRssCover", () => {
  it("flags WXR manual with rss cover not in content", () => {
    expect(
      isSuspectWrongRssCover({
        imageUrl: "/api/media/uploads/rss-1783399628135.webp",
        content: '<p><img src="/api/media/uploads/hm-abc123.webp"/></p>',
        rssSourceUrl: "wp-wxr:vatankahramanlari.org.tr:32379",
        isEditorManual: true,
        tags: ["wp-import"],
      }),
    ).toBe(true);
  });

  it("skips genuine RSS items", () => {
    expect(
      isSuspectWrongRssCover({
        imageUrl: "/api/media/uploads/rss-1783399628135.webp",
        rssSourceUrl: "https://example.com/haber/1",
        tags: ["rss-auto"],
        isEditorManual: false,
      }),
    ).toBe(false);
  });

  it("skips non-rss cover filenames", () => {
    expect(
      isSuspectWrongRssCover({
        imageUrl: "/api/media/uploads/hm-1783399628135.webp",
        isEditorManual: true,
        content: "<p>text</p>",
      }),
    ).toBe(false);
  });

  it("flags rss cover when content has external images", () => {
    expect(
      isSuspectWrongRssCover({
        imageUrl: "/api/media/uploads/rss-wrong.webp",
        content: '<img src="https://vatankahramanlari.org/wp-content/uploads/photo.jpg"/>',
        isEditorManual: true,
        rssSourceUrl: "wp-wxr:site:9",
      }),
    ).toBe(true);
  });
});
