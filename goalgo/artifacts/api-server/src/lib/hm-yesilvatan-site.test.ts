import { describe, expect, it } from "vitest";
import {
  applyYesilVatanLogoToLayout,
  YESILVATAN_DOMAIN,
  YESILVATAN_FAVICON_PATH,
  YESILVATAN_LOGO_PATH,
  YESILVATAN_SLUG,
  yesilVatanLayoutNeedsLogoRepair,
} from "./hm-yesilvatan-site.js";
import { isYesilVatanSiteRef } from "./hm-yesilvatan-logo-repair.js";

describe("hm-yesilvatan-site", () => {
  it("applies logo paths when missing", () => {
    const { layout, changed } = applyYesilVatanLogoToLayout({ hmPrimaryColor: "#2e7d32" });
    expect(changed).toBe(true);
    expect(layout.logoUrl).toBe(YESILVATAN_LOGO_PATH);
    expect(layout.faviconUrl).toBe(YESILVATAN_FAVICON_PATH);
    expect(layout.hmPrimaryColor).toBe("#2e7d32");
  });

  it("is idempotent when logo already correct", () => {
    const { layout, changed } = applyYesilVatanLogoToLayout({
      logoUrl: YESILVATAN_LOGO_PATH,
      faviconUrl: YESILVATAN_FAVICON_PATH,
    });
    expect(changed).toBe(false);
    expect(layout.logoUrl).toBe(YESILVATAN_LOGO_PATH);
  });

  it("replaces inline data-url logos", () => {
    expect(yesilVatanLayoutNeedsLogoRepair(JSON.stringify({ logoUrl: "data:image/png;base64,AAAA" }))).toBe(
      true,
    );
  });

  it("recognizes site refs without touching yerel", () => {
    expect(isYesilVatanSiteRef(YESILVATAN_SLUG)).toBe(true);
    expect(isYesilVatanSiteRef(YESILVATAN_DOMAIN)).toBe(true);
    expect(isYesilVatanSiteRef("www.yesilvatan.gen.tr")).toBe(true);
    expect(isYesilVatanSiteRef("yerelnet")).toBe(false);
    expect(isYesilVatanSiteRef("yerel.net.tr")).toBe(false);
  });
});
