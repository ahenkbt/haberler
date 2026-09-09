import { describe, expect, it } from "vitest";
import {
  isLegacyPortalLogoPair,
  isLegacyPortalSiteName,
  normalizePortalDisplayName,
  PORTAL_BRAND_SHORT,
  PORTAL_HOST,
  PORTAL_SITE_NAME,
} from "./portalBrand.js";

describe("portalBrand (API)", () => {
  it("canonical host and site name are Ahenk", () => {
    expect(PORTAL_HOST).toBe("ahenk.net.tr");
    expect(PORTAL_SITE_NAME).toBe("Ahenk Bilgi Teknolojileri");
  });

  it("rewrites Türk Ekosistemi / turk.eco / yekpare display names", () => {
    expect(normalizePortalDisplayName("Türk Ekosistemi")).toBe(PORTAL_BRAND_SHORT);
    expect(isLegacyPortalSiteName("turk.eco")).toBe(true);
    expect(isLegacyPortalSiteName("turknet.app")).toBe(true);
    expect(isLegacyPortalLogoPair("Yek", "pare")).toBe(true);
    expect(isLegacyPortalLogoPair("Ahenk", "BT")).toBe(false);
  });
});
