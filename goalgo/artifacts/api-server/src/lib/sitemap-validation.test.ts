import { describe, expect, it } from "vitest";
import { emptyGoogleNewsUrlsetXml } from "./news-sitemap-xml.js";
import { GOOGLE_NEWS_SITEMAP_MAX_AGE_MS, isRecentGoogleNewsArticle } from "./sitemap-validation.js";

describe("isRecentGoogleNewsArticle", () => {
  it("accepts articles published within 48 hours", () => {
    expect(isRecentGoogleNewsArticle(new Date())).toBe(true);
    expect(isRecentGoogleNewsArticle(new Date(Date.now() - GOOGLE_NEWS_SITEMAP_MAX_AGE_MS + 60_000))).toBe(
      true,
    );
  });

  it("rejects stale createdAt unless updatedAt is recent", () => {
    const old = new Date(Date.now() - GOOGLE_NEWS_SITEMAP_MAX_AGE_MS - 60_000);
    expect(isRecentGoogleNewsArticle(old)).toBe(false);
    expect(isRecentGoogleNewsArticle(old, new Date())).toBe(true);
  });
});

describe("emptyGoogleNewsUrlsetXml", () => {
  it("keeps news namespace so GSC does not treat an empty file as unknown", () => {
    const xml = emptyGoogleNewsUrlsetXml();
    expect(xml).toContain("xmlns:news=");
    expect(xml).toContain("<urlset");
    expect(xml).not.toMatch(/<url>/);
  });
});
