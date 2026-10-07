import { describe, expect, it } from "vitest";
import {
  buildFixHaberLayoutJson,
  findFixHaberSite,
  FIXHABER_CATEGORIES,
  FIXHABER_DOMAIN,
  FIXHABER_NAV_HIDDEN_CATEGORY_SLUGS,
  FIXHABER_NAV_ONLY_CATEGORY_SLUGS,
  FIXHABER_PHP_ORIGIN_IP,
  FIXHABER_RSS_FEEDS,
  FIXHABER_SITE,
  FIXHABER_SLUG,
  FIXHABER_ZONE,
  isFixHaberHost,
  listFixHaberCategorySlugs,
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

  it("tech/science branding", () => {
    expect(FIXHABER_SITE.description).toMatch(/teknoloji/i);
    expect(FIXHABER_SITE.hmYsSlogan).toMatch(/teknoloji/i);
    expect(FIXHABER_SITE.hmPrimaryColor).toBe("#002B5C");
    expect(FIXHABER_SITE.hmSecondaryColor).toBe("#D20000");
  });

  it("layout phpTheme + yenisafak + logo/favicon + nav hierarchy", () => {
    const layout = buildFixHaberLayoutJson();
    expect(layout.phpTheme).toBe(true);
    expect(layout.frontend).toBe("php");
    expect(layout.hmVitrinTheme).toBe("yenisafak");
    expect(layout.hmYsSlogan).toBe("Teknoloji ve bilim haberleri");
    expect(layout.logoUrl).toBe("/fix/fix-haber-logo.png");
    expect(layout.faviconUrl).toBe("/fix/fix-haber-favicon.png");
    expect(layout.showPlatformNav).toBe(false);
    expect(layout.hmNavOnlyCategorySlugs).toEqual([...FIXHABER_NAV_ONLY_CATEGORY_SLUGS]);
    expect(layout.hmNavHiddenCategorySlugs).toEqual([...FIXHABER_NAV_HIDDEN_CATEGORY_SLUGS]);
    expect((layout.hmCategorySortSlugs as string[]).length).toBe(FIXHABER_CATEGORIES.length);
    expect((layout.hmNavOnlyCategorySlugs as string[]).every((s) => s.startsWith("fixhaber-"))).toBe(
      true,
    );
  });

  it("category tree covers main, niche and content types", () => {
    const slugs = new Set(listFixHaberCategorySlugs());
    for (const required of [
      "fixhaber-haberler",
      "fixhaber-mobil",
      "fixhaber-mobil-telefonlar",
      "fixhaber-mobil-akilli-saatler",
      "fixhaber-donanim",
      "fixhaber-donanim-pc-laptop",
      "fixhaber-donanim-bilesenler",
      "fixhaber-yazilim",
      "fixhaber-oyun",
      "fixhaber-incelemeler",
      "fixhaber-yapay-zeka",
      "fixhaber-otomobil-mobilite",
      "fixhaber-akilli-ev-iot",
      "fixhaber-siber-guvenlik",
      "fixhaber-uzay-bilim",
      "fixhaber-kripto-blockchain",
      "fixhaber-rehberler",
      "fixhaber-listeler",
      "fixhaber-videolar",
      "fixhaber-teknoloji",
    ]) {
      expect(slugs.has(required), `missing ${required}`).toBe(true);
    }
    expect(FIXHABER_NAV_ONLY_CATEGORY_SLUGS).toEqual([
      "fixhaber-haberler",
      "fixhaber-mobil",
      "fixhaber-donanim",
      "fixhaber-incelemeler",
      "fixhaber-yazilim",
      "fixhaber-oyun",
    ]);
  });

  it("RSS feeds are tech-focused TR + global", () => {
    expect(FIXHABER_RSS_FEEDS.length).toBeGreaterThanOrEqual(8);
    expect(FIXHABER_SITE.rssFeeds).toEqual([...FIXHABER_RSS_FEEDS]);
    expect(FIXHABER_RSS_FEEDS.some((u) => u.includes("ntv.com.tr/teknoloji"))).toBe(true);
    expect(FIXHABER_RSS_FEEDS.some((u) => u.includes("trthaber.com"))).toBe(true);
    expect(FIXHABER_RSS_FEEDS.some((u) => u.includes("theverge.com"))).toBe(true);
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

  it("has sample headlines for seed", () => {
    expect(FIXHABER_SITE.sampleHeadlines.length).toBeGreaterThanOrEqual(2);
    expect(FIXHABER_SITE.sampleHeadlines.some((h) => h.featured)).toBe(true);
  });
});
