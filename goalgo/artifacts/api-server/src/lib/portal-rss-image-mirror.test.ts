import { describe, expect, it } from "vitest";
import {
  isExternalRssImageUrl,
  isLocalMediaUploadUrl,
  shouldMirrorRssImportImages,
} from "./portal-rss-image-mirror.js";

describe("portal-rss-image-mirror", () => {
  it("detects external and local media URLs", () => {
    expect(isExternalRssImageUrl("https://ticarihayatcom.teimg.com/crop/1280x720/foo.jpg")).toBe(true);
    expect(isLocalMediaUploadUrl("/api/media/uploads/rss-abc.webp")).toBe(true);
  });

  it("mirrors when the campaign toggle is on even if the env flag is off", () => {
    const prev = process.env.PORTAL_RSS_MIRROR_IMAGES;
    delete process.env.PORTAL_RSS_MIRROR_IMAGES;
    expect(shouldMirrorRssImportImages()).toBe(false);
    expect(shouldMirrorRssImportImages(false)).toBe(false);
    expect(shouldMirrorRssImportImages(true)).toBe(true);
    process.env.PORTAL_RSS_MIRROR_IMAGES = "1";
    expect(shouldMirrorRssImportImages()).toBe(true);
    if (prev == null) delete process.env.PORTAL_RSS_MIRROR_IMAGES;
    else process.env.PORTAL_RSS_MIRROR_IMAGES = prev;
  });
});
