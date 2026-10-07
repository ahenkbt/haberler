import { describe, expect, it } from "vitest";
import {
  buildGundemiRegionalLayoutJson,
  findGundemiRegionalSite,
  GUNDEMI_APEX_TURKATA_ALIAS,
  GUNDEMI_REGIONAL_SITES,
  GUNDEMI_ZONE,
  listGundemiRegionalDomains,
  listGundemiRegionalSlugs,
  TURKATA_HAKKIMIZDA_HTML,
  TURKATA_HM_SLUG,
  TURKATA_YS_KUNYE,
} from "./hm-gundemi-regional-sites.js";

describe("gundemi regional catalog", () => {
  it("8 alt alan, tek nokta, gundemi.org zone", () => {
    expect(GUNDEMI_REGIONAL_SITES).toHaveLength(8);
    expect(GUNDEMI_ZONE).toBe("gundemi.org");
    const domains = listGundemiRegionalDomains();
    expect(domains).toEqual([
      "ege.gundemi.org",
      "marmara.gundemi.org",
      "karadeniz.gundemi.org",
      "icanadolu.gundemi.org",
      "doguanadolu.gundemi.org",
      "guneydogu.gundemi.org",
      "akdeniz.gundemi.org",
      "kibris.gundemi.org",
    ]);
    for (const d of domains) {
      expect(d.includes("..")).toBe(false);
      expect(d.endsWith(".gundemi.org")).toBe(true);
    }
    expect(new Set(listGundemiRegionalSlugs()).size).toBe(8);
  });

  it("layout phpTheme + yenisafak + logo + distinct colors/presets", () => {
    const presets = new Set<string>();
    const colors = new Set<string>();
    for (const site of GUNDEMI_REGIONAL_SITES) {
      const layout = buildGundemiRegionalLayoutJson(site);
      expect(layout.phpTheme).toBe(true);
      expect(layout.frontend).toBe("php");
      expect(layout.hmVitrinTheme).toBe("yenisafak");
      expect(layout.logoUrl).toBe(site.logoPath);
      expect(String(layout.logoUrl)).toMatch(/^\/gundemi\/logos\/[a-z]+-gundemi\.png$/);
      presets.add(String(site.hmYsMansetPreset));
      colors.add(site.hmPrimaryColor);
      expect(site.regionalCategories.length).toBeGreaterThanOrEqual(3);
      expect(site.sampleHeadlines.length).toBeGreaterThanOrEqual(2);
    }
    expect(presets.size).toBeGreaterThanOrEqual(4);
    expect(colors.size).toBe(8);
  });

  it("künye ve hakkımızda turkatahaber.com ile aynı", () => {
    expect(TURKATA_YS_KUNYE.genelMudur).toBe("Nail Türkoğlu");
    expect(TURKATA_YS_KUNYE.yayinYonetmeni).toBe("Mustafa ÖZDEMİR");
    expect(TURKATA_YS_KUNYE.yaziIsleri).toBe("Melek Acar");
    expect(TURKATA_YS_KUNYE.email).toBe("bilgi@turkatahaber.com");
    expect(TURKATA_YS_KUNYE.address).toContain("Çankaya");
    expect(TURKATA_HAKKIMIZDA_HTML).toContain("TÜRKATA HABER AJANSI");
    expect(TURKATA_HAKKIMIZDA_HTML).toContain("yayin-ilkeleri");
    for (const site of GUNDEMI_REGIONAL_SITES) {
      const layout = buildGundemiRegionalLayoutJson(site);
      expect(layout.hmYsKunye).toEqual({ ...TURKATA_YS_KUNYE });
      expect(layout.hmFooterAboutHtml).toBe(TURKATA_HAKKIMIZDA_HTML);
    }
  });

  it("find by slug or domain", () => {
    expect(findGundemiRegionalSite("ege-gundemi")?.domain).toBe("ege.gundemi.org");
    expect(findGundemiRegionalSite("akdeniz.gundemi.org")?.slug).toBe("akdeniz-gundemi");
    expect(findGundemiRegionalSite("www.kibris.gundemi.org")?.slug).toBe("kibris-gundemi");
  });

  it("apex is turkatahaber alias, not a 9th regional site", () => {
    expect(GUNDEMI_APEX_TURKATA_ALIAS).toBe("gundemi.org");
    expect(TURKATA_HM_SLUG).toBe("turkatahaber");
    expect(listGundemiRegionalDomains()).not.toContain("gundemi.org");
    expect(listGundemiRegionalSlugs()).not.toContain("turkatahaber");
  });
});
