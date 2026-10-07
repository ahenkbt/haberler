import { describe, expect, it } from "vitest";
import {
  buildFixHaberLayoutJson,
  findFixHaberSite,
  FIXHABER_DOMAIN,
  FIXHABER_PHP_ORIGIN_IP,
  FIXHABER_SITE,
  FIXHABER_SLUG,
  FIXHABER_ZONE,
  isFixHaberHost,
  listFixHaberDomains,
} from "./hm-fixhaber-site.js";

describe("fixhaber catalog", () => {
  it("slug + domain + zone conventions", () => {
    expect(FIXHABER_SLUG).toBe("fixhaber");
    expect(FIXHABER_DOMAIN).toBe("fix.tc");
    expect(FIXHABER_ZONE).toBe("fix.tc");
    expect(FIXHABER_PHP_ORIGIN_IP).toBe("187.77.84.201");
    expect(FIXHABER_SITE.displayName).toBe("Fix Haber");
    expect(listFixHaberDomains()).toEqual(["fix.tc", "www.fix.tc"]);
  });

  it("layout phpTheme + yenisafak + logo/favicon + brand colors", () => {
    const layout = buildFixHaberLayoutJson();
    expect(layout.phpTheme).toBe(true);
    expect(layout.frontend).toBe("php");
    expect(layout.hmVitrinTheme).toBe("yenisafak");
    expect(layout.hmYsSlogan).toBe("Fix Haber");
    expect(layout.logoUrl).toBe("/fix/fix-haber-logo.png");
    expect(layout.faviconUrl).toBe("/fix/fix-haber-favicon.png");
    expect(layout.logoUrl).toBe(FIXHABER_SITE.logoPath);
    expect(layout.faviconUrl).toBe(FIXHABER_SITE.faviconPath);
    expect(layout.hmPrimaryColor).toBe("#002B5C");
    expect(layout.hmSecondaryColor).toBe("#D20000");
    expect(layout.showPlatformNav).toBe(false);
    expect(Array.isArray(layout.hmNavOnlyCategorySlugs)).toBe(true);
    expect((layout.hmNavOnlyCategorySlugs as string[]).every((s) => s.startsWith("fixhaber-"))).toBe(
      true,
    );
  });

  it("find by slug or domain; host helper", () => {
    expect(findFixHaberSite("fixhaber")?.domain).toBe("fix.tc");
    expect(findFixHaberSite("fix.tc")?.slug).toBe("fixhaber");
    expect(findFixHaberSite("www.fix.tc")?.slug).toBe("fixhaber");
    expect(findFixHaberSite("other.tc")).toBeUndefined();
    expect(isFixHaberHost("fix.tc")).toBe(true);
    expect(isFixHaberHost("www.fix.tc")).toBe(true);
    expect(isFixHaberHost("gundemi.org")).toBe(false);
  });

  it("has categories, samples and RSS feeds for seed", () => {
    expect(FIXHABER_SITE.categories.length).toBeGreaterThanOrEqual(4);
    expect(FIXHABER_SITE.sampleHeadlines.length).toBeGreaterThanOrEqual(2);
    expect(FIXHABER_SITE.rssFeeds.length).toBeGreaterThanOrEqual(1);
    expect(FIXHABER_SITE.sampleHeadlines.some((h) => h.featured)).toBe(true);
  });
});
