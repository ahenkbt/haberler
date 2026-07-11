import { describe, expect, it } from "vitest";
import { parseHmPoolRef, isInternalHybridRssRef } from "./hm-sync-source.js";
import { buildYekparePortalArticleUrl } from "./site-public-origin.js";

describe("hm-sync-source pool refs", () => {
  it("parses yekpare-hm-pool refs", () => {
    expect(parseHmPoolRef("yekpare-hm-pool:42:9001")).toEqual({ siteId: 42, id: 9001 });
    expect(parseHmPoolRef("https://example.com")).toBeNull();
  });

  it("detects internal hybrid rss refs", () => {
    expect(isInternalHybridRssRef("yekpare-hm-pool:1:2")).toBe(true);
    expect(isInternalHybridRssRef("yekpare-hm-sync:1:news:2")).toBe(true);
    expect(isInternalHybridRssRef("https://sozcu.com.tr/x")).toBe(false);
  });
});

describe("buildYekparePortalArticleUrl", () => {
  it("builds yekpare portal article URLs", () => {
    const url = buildYekparePortalArticleUrl("ornek-haber");
    expect(url).toMatch(/\/haber\/ornek-haber$/);
    expect(url.startsWith("http")).toBe(true);
  });
});
