import { describe, expect, it } from "vitest";
import { firstUsableNewsImageUrl, isUnusableNewsImageUrl } from "./unusableNewsImageUrl";

describe("isUnusableNewsImageUrl", () => {
  it("treats empty and about:blank as unusable", () => {
    expect(isUnusableNewsImageUrl("")).toBe(true);
    expect(isUnusableNewsImageUrl("   ")).toBe(true);
    expect(isUnusableNewsImageUrl(null)).toBe(true);
    expect(isUnusableNewsImageUrl("about:blank")).toBe(true);
  });

  it("treats Render hosts without /api/media/ as unusable", () => {
    expect(isUnusableNewsImageUrl("https://goalgo-y7ze.onrender.com/uploads/old.jpg")).toBe(true);
    expect(isUnusableNewsImageUrl("//assets.onrender.com/foo.jpg")).toBe(true);
  });

  it("keeps Render /api/media/ paths so they can be rewritten to the current origin", () => {
    expect(
      isUnusableNewsImageUrl("https://goalgo-y7ze.onrender.com/api/media/uploads/abc.webp"),
    ).toBe(false);
  });

  it("keeps local uploads and live CDN covers", () => {
    expect(isUnusableNewsImageUrl("/api/media/uploads/abc.webp")).toBe(false);
    expect(isUnusableNewsImageUrl("https://cdn.example.com/news.jpg")).toBe(false);
  });

  it("picks the first usable cover field", () => {
    expect(
      firstUsableNewsImageUrl([
        "https://goalgo-y7ze.onrender.com/dead.jpg",
        "",
        "/api/media/uploads/live.webp",
      ]),
    ).toBe("/api/media/uploads/live.webp");
  });
});
