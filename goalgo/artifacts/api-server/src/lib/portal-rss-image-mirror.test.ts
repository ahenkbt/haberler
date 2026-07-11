import { describe, expect, it } from "vitest";
import { isExternalRssImageUrl, isLocalMediaUploadUrl } from "./portal-rss-image-mirror.js";
describe("portal-rss-image-mirror", () => {
  it("detects external and local media URLs", () => {
    expect(isExternalRssImageUrl("https://ticarihayatcom.teimg.com/crop/1280x720/foo.jpg")).toBe(true);
    expect(isLocalMediaUploadUrl("/api/media/uploads/rss-abc.webp")).toBe(true);
  });
});
