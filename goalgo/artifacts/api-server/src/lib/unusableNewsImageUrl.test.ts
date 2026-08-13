import { describe, expect, it } from "vitest";
import { isUnusableNewsImageUrl } from "./unusableNewsImageUrl.js";
import { resolveNewsItemImageUrl, resolveNewsItemImageFallbackUrl } from "./news-display-image.js";

describe("isUnusableNewsImageUrl", () => {
  it("treats empty and about:blank as unusable", () => {
    expect(isUnusableNewsImageUrl("")).toBe(true);
    expect(isUnusableNewsImageUrl("   ")).toBe(true);
    expect(isUnusableNewsImageUrl(null)).toBe(true);
    expect(isUnusableNewsImageUrl("about:blank")).toBe(true);
  });

  it("treats Render hosts without /api/media/ as unusable", () => {
    expect(isUnusableNewsImageUrl("https://goalgo-y7ze.onrender.com/uploads/old.jpg")).toBe(true);
    expect(isUnusableNewsImageUrl("http://goalgo-y7ze.onrender.com/static/foo.webp")).toBe(true);
    expect(isUnusableNewsImageUrl("//cdn.onrender.com/foo.jpg")).toBe(true);
  });

  it("keeps Render /api/media/ paths so they can be rewritten to R2", () => {
    expect(
      isUnusableNewsImageUrl("https://goalgo-y7ze.onrender.com/api/media/uploads/abc.webp"),
    ).toBe(false);
  });

  it("keeps local uploads and live CDN covers", () => {
    expect(isUnusableNewsImageUrl("/api/media/uploads/abc.webp")).toBe(false);
    expect(isUnusableNewsImageUrl("https://cdn.example.com/news.jpg")).toBe(false);
    expect(isUnusableNewsImageUrl("data:image/svg+xml,abc")).toBe(false);
  });
});

describe("resolveNewsItemImageUrl — Render leftovers", () => {
  it("skips a Render cover and uses the next usable field", () => {
    expect(
      resolveNewsItemImageUrl({
        imageUrl: "https://goalgo-y7ze.onrender.com/uploads/dead.jpg",
        featuredImage: "/api/media/uploads/live.webp",
      }),
    ).toBe("/api/media/uploads/live.webp");
  });

  it("returns null when every cover field is on Render", () => {
    expect(
      resolveNewsItemImageUrl({
        imageUrl: "https://goalgo-y7ze.onrender.com/old.jpg",
      }),
    ).toBeNull();
  });

  it("skips Render fallbacks", () => {
    expect(
      resolveNewsItemImageFallbackUrl({
        imageUrl: "/api/media/uploads/a.webp",
        imageFallbackUrl: "https://goalgo-y7ze.onrender.com/old.jpg",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
      }),
    ).toBe("https://cdn.example.com/thumb.jpg");
  });
});
