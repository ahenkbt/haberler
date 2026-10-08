import { describe, expect, it } from "vitest";
import {
  applyDunyaSaglikLogoToLayout,
  DUNYASAGLIK_DOMAIN,
  DUNYASAGLIK_FAVICON_PATH,
  DUNYASAGLIK_LOGO_PATH,
  DUNYASAGLIK_SLUG,
  dunyaSaglikLayoutNeedsLogoRepair,
} from "./hm-dunyasaglik-site.js";
import { isDunyaSaglikSiteRef } from "./hm-dunyasaglik-logo-repair.js";

describe("hm-dunyasaglik-site", () => {
  it("applies logo paths when missing", () => {
    const { layout, changed } = applyDunyaSaglikLogoToLayout({ hmPrimaryColor: "#0a7ea4" });
    expect(changed).toBe(true);
    expect(layout.logoUrl).toBe(DUNYASAGLIK_LOGO_PATH);
    expect(layout.faviconUrl).toBe(DUNYASAGLIK_FAVICON_PATH);
    expect(layout.hmPrimaryColor).toBe("#0a7ea4");
  });

  it("is idempotent when logo and colors already correct", () => {
    const { layout, changed } = applyDunyaSaglikLogoToLayout({
      logoUrl: DUNYASAGLIK_LOGO_PATH,
      faviconUrl: DUNYASAGLIK_FAVICON_PATH,
      hmPrimaryColor: "#0a7ea4",
      hmSecondaryColor: "#0d6b5c",
    });
    expect(changed).toBe(false);
    expect(layout.logoUrl).toBe(DUNYASAGLIK_LOGO_PATH);
  });

  it("replaces inline data-url logos", () => {
    expect(dunyaSaglikLayoutNeedsLogoRepair(JSON.stringify({ logoUrl: "data:image/png;base64,AAAA" }))).toBe(
      true,
    );
  });

  it("recognizes site refs without touching yerel / yesilvatan / turksav", () => {
    expect(isDunyaSaglikSiteRef(DUNYASAGLIK_SLUG)).toBe(true);
    expect(isDunyaSaglikSiteRef(DUNYASAGLIK_DOMAIN)).toBe(true);
    expect(isDunyaSaglikSiteRef("www.dunyasaglik.org")).toBe(true);
    expect(isDunyaSaglikSiteRef("yerelnet")).toBe(false);
    expect(isDunyaSaglikSiteRef("yesilvatan")).toBe(false);
    expect(isDunyaSaglikSiteRef("turksav")).toBe(false);
    expect(isDunyaSaglikSiteRef("sehitgazi")).toBe(false);
  });
});
