import { describe, expect, it } from "vitest";
import { normalizePublicMediaUrl, normalizeHmLayoutMediaUrls } from "./normalizePublicMediaUrl.js";

describe("normalizePublicMediaUrl", () => {
  it("preserves full .webp extension on relative upload paths", () => {
    const url = "/api/media/uploads/1791446269709-d6398771bfe90d0f.webp";
    expect(normalizePublicMediaUrl(url)).toBe(url);
  });

  it("maps r2.dev public URLs to site-relative upload paths with extension intact", () => {
    expect(
      normalizePublicMediaUrl(
        "https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev/1791446269709-d6398771bfe90d0f.webp",
      ),
    ).toBe("/api/media/uploads/1791446269709-d6398771bfe90d0f.webp");
  });

  it("leaves external CDN URLs unchanged", () => {
    const ext = "https://example.com/photo.webp";
    expect(normalizePublicMediaUrl(ext)).toBe(ext);
  });

  it("normalizes layout logo fields without truncating extensions", () => {
    const out = normalizeHmLayoutMediaUrls({
      logoUrl: "https://goalgo.example/api/media/uploads/site-logo.webp?v=1",
    }) as { logoUrl?: string };
    expect(out.logoUrl).toBe("/api/media/uploads/site-logo.webp?v=1");
  });
});
