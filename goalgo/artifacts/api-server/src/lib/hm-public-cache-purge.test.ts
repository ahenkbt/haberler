import { describe, expect, it } from "vitest";
import { buildHmSitePublicCacheUrls } from "./hm-public-cache-purge.js";

describe("buildHmSitePublicCacheUrls", () => {
  it("includes portal meta + custom domain variants", () => {
    const urls = buildHmSitePublicCacheUrls({
      siteId: 2,
      slug: "kirsehir",
      domain: "belediyehizmet.com",
      domain2: "kirsehri.com",
      domain3: null,
    });
    expect(urls).toContain("https://yekpare.net/api/hm/meta/by-slug/kirsehir");
    expect(urls).toContain(
      "https://yekpare.net/api/hm/meta/by-domain?domain=belediyehizmet.com",
    );
    expect(urls).toContain(
      "https://belediyehizmet.com/api/hm/meta/by-domain?domain=belediyehizmet.com",
    );
    expect(urls).toContain(
      "https://www.belediyehizmet.com/api/hm/meta/by-domain?domain=www.belediyehizmet.com",
    );
    expect(urls).toContain("https://yekpare.net/api/hm/home-bundle?siteId=2");
    expect(urls.some((u) => u.includes("kirsehri.com"))).toBe(true);
  });
});
