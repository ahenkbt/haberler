import { describe, expect, it } from "vitest";
import { buildHmSitePublicCacheUrls } from "./hm-public-cache-purge.js";

describe("buildHmSitePublicCacheUrls", () => {
  it("includes portal meta + custom domain variants", () => {
    const urls = buildHmSitePublicCacheUrls({
      siteId: 2,
      slug: "su",
      domain: "suhaber.net",
      domain2: "www.suhaber.net",
      domain3: null,
    });
    expect(urls).toContain("https://ahenk.net.tr/api/hm/meta/by-slug/su");
    expect(urls).toContain(
      "https://ahenk.net.tr/api/hm/meta/by-domain?domain=suhaber.net",
    );
    expect(urls).toContain(
      "https://suhaber.net/api/hm/meta/by-domain?domain=suhaber.net",
    );
    expect(urls).toContain(
      "https://www.suhaber.net/api/hm/meta/by-domain?domain=www.suhaber.net",
    );
    expect(urls).toContain("https://ahenk.net.tr/api/hm/home-bundle?siteId=2");
    expect(urls).toContain("https://ahenk.net.tr/api/hm/home-bundle?slug=su&sliderLimit=15");
    expect(urls.some((u) => u.includes("suhaber.net"))).toBe(true);
  });
});
