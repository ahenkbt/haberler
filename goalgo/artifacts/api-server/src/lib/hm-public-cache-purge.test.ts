import { describe, expect, it } from "vitest";
import { buildHmSitePublicCacheUrls } from "./hm-public-cache-purge.js";

describe("buildHmSitePublicCacheUrls", () => {
  it("includes portal meta + custom domain variants", () => {
    const urls = buildHmSitePublicCacheUrls({
      siteId: 2,
      slug: "su",
      domain: "suhaberajansi.com",
      domain2: "www.suhaberajansi.com",
      domain3: null,
    });
    expect(urls).toContain("https://turk.eco/api/hm/meta/by-slug/su");
    expect(urls).toContain(
      "https://turk.eco/api/hm/meta/by-domain?domain=suhaberajansi.com",
    );
    expect(urls).toContain(
      "https://suhaberajansi.com/api/hm/meta/by-domain?domain=suhaberajansi.com",
    );
    expect(urls).toContain(
      "https://www.suhaberajansi.com/api/hm/meta/by-domain?domain=www.suhaberajansi.com",
    );
    expect(urls).toContain("https://turk.eco/api/hm/home-bundle?siteId=2");
    expect(urls.some((u) => u.includes("suhaberajansi.com"))).toBe(true);
  });
});
