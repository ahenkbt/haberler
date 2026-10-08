import { describe, expect, it } from "vitest";
import {
  applySehitGaziLogoToLayout,
  SEHITGAZI_DOMAIN,
  SEHITGAZI_FAVICON_PATH,
  SEHITGAZI_LOGO_PATH,
  SEHITGAZI_SLUG,
  sehitGaziLayoutNeedsLogoRepair,
} from "./hm-sehitgazi-site.js";
import { isSehitGaziSiteRef } from "./hm-sehitgazi-logo-repair.js";

describe("hm-sehitgazi-site", () => {
  it("applies logo paths when missing", () => {
    const { layout, changed } = applySehitGaziLogoToLayout({ hmPrimaryColor: "#a50e1e" });
    expect(changed).toBe(true);
    expect(layout.logoUrl).toBe(SEHITGAZI_LOGO_PATH);
    expect(layout.faviconUrl).toBe(SEHITGAZI_FAVICON_PATH);
    expect(layout.hmPrimaryColor).toBe("#a50e1e");
  });

  it("is idempotent when logo already correct", () => {
    const { layout, changed } = applySehitGaziLogoToLayout({
      logoUrl: SEHITGAZI_LOGO_PATH,
      faviconUrl: SEHITGAZI_FAVICON_PATH,
    });
    expect(changed).toBe(false);
    expect(layout.logoUrl).toBe(SEHITGAZI_LOGO_PATH);
  });

  it("replaces inline data-url logos", () => {
    expect(sehitGaziLayoutNeedsLogoRepair(JSON.stringify({ logoUrl: "data:image/png;base64,AAAA" }))).toBe(
      true,
    );
  });

  it("preserves user https logos (does not force brand path)", () => {
    const { layout, changed } = applySehitGaziLogoToLayout({
      logoUrl: "https://cdn.example/custom-logo.png",
      faviconUrl: "https://cdn.example/custom-logo.png",
    });
    expect(changed).toBe(false);
    expect(layout.logoUrl).toBe("https://cdn.example/custom-logo.png");
  });

  it("repairs /api/media and turkata mark paths", () => {
    expect(
      applySehitGaziLogoToLayout({ logoUrl: "/api/media/uploads/x.png" }).layout.logoUrl,
    ).toBe(SEHITGAZI_LOGO_PATH);
    expect(
      applySehitGaziLogoToLayout({ logoUrl: "/turkata/turkata-mark.png" }).layout.logoUrl,
    ).toBe(SEHITGAZI_LOGO_PATH);
  });

  it("recognizes site refs without touching turksav/yerel/yesilvatan", () => {
    expect(isSehitGaziSiteRef(SEHITGAZI_SLUG)).toBe(true);
    expect(isSehitGaziSiteRef(SEHITGAZI_DOMAIN)).toBe(true);
    expect(isSehitGaziSiteRef("www.sehitgazi.org.tr")).toBe(true);
    expect(isSehitGaziSiteRef("turksav")).toBe(false);
    expect(isSehitGaziSiteRef("turksav.org")).toBe(false);
    expect(isSehitGaziSiteRef("yerelnet")).toBe(false);
    expect(isSehitGaziSiteRef("yerel.net.tr")).toBe(false);
    expect(isSehitGaziSiteRef("yesilvatan")).toBe(false);
    expect(isSehitGaziSiteRef("yesilvatan.gen.tr")).toBe(false);
  });
});
