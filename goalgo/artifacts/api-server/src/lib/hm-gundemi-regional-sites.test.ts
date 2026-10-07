import { describe, expect, it } from "vitest";
import {
  buildGundemiApexLayoutJson,
  buildGundemiRegionalLayoutJson,
  findGundemiCatalogSite,
  findGundemiRegionalSite,
  GUNDEMI_APEX_DOMAIN,
  GUNDEMI_APEX_HAKKIMIZDA_HTML,
  GUNDEMI_APEX_LOGO_PATH,
  GUNDEMI_APEX_SITE,
  GUNDEMI_APEX_SLOGAN,
  GUNDEMI_APEX_SLUG,
  GUNDEMI_APEX_YS_KUNYE,
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

  it("künye ve hakkımızda turkatahaber.com ile aynı (bölgeseller)", () => {
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

  it("apex is dedicated gundemi site, not turkatahaber alias", () => {
    expect(GUNDEMI_APEX_DOMAIN).toBe("gundemi.org");
    expect(GUNDEMI_APEX_SLUG).toBe("gundemi");
    expect(GUNDEMI_APEX_SLOGAN).toBe("ilkeli iffetli isabetli haber");
    expect(GUNDEMI_APEX_LOGO_PATH).toBe("/gundemi/logos/gundemi-org.png");
    expect(TURKATA_HM_SLUG).toBe("turkatahaber");
    expect(listGundemiRegionalDomains()).not.toContain("gundemi.org");
    expect(listGundemiRegionalSlugs()).not.toContain("gundemi");
    expect(listGundemiRegionalSlugs()).not.toContain("turkatahaber");
    expect(findGundemiCatalogSite("gundemi.org")?.slug).toBe("gundemi");
    expect(findGundemiCatalogSite("www.gundemi.org")?.slug).toBe("gundemi");
    expect(findGundemiCatalogSite("gundemi")?.domain).toBe("gundemi.org");
  });

  it("apex layout: phpTheme + slogan + logo + gundemi branding", () => {
    const layout = buildGundemiApexLayoutJson(GUNDEMI_APEX_SITE);
    expect(layout.phpTheme).toBe(true);
    expect(layout.frontend).toBe("php");
    expect(layout.hmVitrinTheme).toBe("yenisafak");
    expect(layout.hmYsSlogan).toBe("ilkeli iffetli isabetli haber");
    expect(layout.logoUrl).toBe("/gundemi/logos/gundemi-org.png");
    expect(layout.faviconUrl).toBe("/gundemi/logos/gundemi-org.png");
    expect(layout.hmYsKunye).toEqual({ ...GUNDEMI_APEX_YS_KUNYE });
    expect(layout.hmFooterAboutHtml).toBe(GUNDEMI_APEX_HAKKIMIZDA_HTML);
    expect(String(layout.hmFooterAboutHtml)).toContain("ilkeli iffetli isabetli haber");
    expect(String(layout.hmFooterAboutHtml)).not.toContain("TÜRKATA HABER AJANSI");
    expect(GUNDEMI_APEX_SITE.hmYsSlogan).toBe(GUNDEMI_APEX_SLOGAN);
    expect(GUNDEMI_APEX_SITE.logoPath).toBe(GUNDEMI_APEX_LOGO_PATH);
  });
});
