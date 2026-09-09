import { describe, expect, it } from "vitest";
import {
  isLegacyPortalSiteName,
  normalizePortalDisplayName,
  normalizePortalLogoParts,
  PORTAL_BRAND_SHORT,
  PORTAL_HOST,
} from "./portalBrand";
import {
  applySiteSettingsToAhenkAgency,
  defaultAhenkAgencySite,
  defaultAhenkNavItems,
} from "./ahenkAgencySite";
import { isAhenkAgencyPublicPath } from "./ahenkAgencyHost";

describe("Ahenk portal brand", () => {
  it("maps legacy site names to Ahenk Bilgi Teknolojileri", () => {
    expect(PORTAL_HOST).toBe("ahenk.net.tr");
    expect(normalizePortalDisplayName("Türk Ekosistemi")).toBe(PORTAL_BRAND_SHORT);
    expect(normalizePortalDisplayName("Yekpare")).toBe(PORTAL_BRAND_SHORT);
    expect(normalizePortalDisplayName("turk.eco")).toBe(PORTAL_BRAND_SHORT);
    expect(isLegacyPortalSiteName("turknet.app")).toBe(true);
    expect(normalizePortalLogoParts("Yek", "pare")).toEqual({ logoText1: "Ahenk", logoText2: "BT" });
  });

  it("puts Kariyer in the main nav and keeps urun-satisi off the menu", () => {
    const hrefs = defaultAhenkNavItems().map((n) => n.href);
    expect(hrefs).toContain("/kariyer");
    expect(hrefs).not.toContain("/urun-satisi");
    expect(hrefs).not.toContain("/newsmap");
  });

  it("treats destek, künye and haberler as Ahenk public paths", () => {
    expect(isAhenkAgencyPublicPath("/destek")).toBe(true);
    expect(isAhenkAgencyPublicPath("/iletisim-kunye")).toBe(true);
    expect(isAhenkAgencyPublicPath("/haberler")).toBe(true);
    expect(isAhenkAgencyPublicPath("/newsmap")).toBe(false);
  });

  it("binds Tema Ayarları identity onto the public Ahenk chrome", () => {
    const merged = applySiteSettingsToAhenkAgency(defaultAhenkAgencySite(), {
      siteName: "Türk Ekosistemi",
      tagline: "Keşfet, Sipariş Et, Yerini Ayırt; Şehri Yekpare Yaşa.",
      phone: "0541 313 62 45",
      email: "bilgi@ahenk.net.tr",
    });
    expect(merged.brandName).toBe(PORTAL_BRAND_SHORT);
    expect(merged.tagline).toBe("Web yazılımı, haber sitesi ve ajans — Ahenk Bilgi Teknolojileri.");
    expect(merged.email).toBe("bilgi@ahenk.net.tr");
    expect(merged.phoneTel).toBe("+905413136245");

    const custom = applySiteSettingsToAhenkAgency(defaultAhenkAgencySite(), {
      siteName: "Ahenk Bilgi Teknolojileri",
      tagline: "Web yazılımı, haber sitesi ve ajans — Ahenk Bilgi Teknolojileri.",
      phone: "0555 111 22 33",
      email: "destek@ahenk.net.tr",
    });
    expect(custom.brandName).toBe("Ahenk Bilgi Teknolojileri");
    expect(custom.tagline).toContain("Ahenk Bilgi Teknolojileri");
    expect(custom.email).toBe("destek@ahenk.net.tr");
    expect(custom.phoneTel).toBe("+905551112233");
  });
});
