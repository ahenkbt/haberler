import { describe, expect, it } from "vitest";
import {
  applyTurksavLogoToLayout,
  TURKSAV_DOMAIN,
  TURKSAV_FAVICON_PATH,
  TURKSAV_LOGO_PATH,
  TURKSAV_SLUG,
  turksavLayoutNeedsLogoRepair,
} from "./hm-turksav-site.js";
import { isTurksavSiteRef } from "./hm-turksav-logo-repair.js";

describe("hm-turksav-site", () => {
  it("applies logo paths when missing", () => {
    const { layout, changed } = applyTurksavLogoToLayout({ hmPrimaryColor: "#1f3b63" });
    expect(changed).toBe(true);
    expect(layout.logoUrl).toBe(TURKSAV_LOGO_PATH);
    expect(layout.faviconUrl).toBe(TURKSAV_FAVICON_PATH);
    expect(layout.hmPrimaryColor).toBe("#1f3b63");
  });

  it("is idempotent when logo already correct", () => {
    const { layout, changed } = applyTurksavLogoToLayout({
      logoUrl: TURKSAV_LOGO_PATH,
      faviconUrl: TURKSAV_FAVICON_PATH,
    });
    expect(changed).toBe(false);
    expect(layout.logoUrl).toBe(TURKSAV_LOGO_PATH);
  });

  it("replaces inline data-url logos", () => {
    expect(turksavLayoutNeedsLogoRepair(JSON.stringify({ logoUrl: "data:image/png;base64,AAAA" }))).toBe(
      true,
    );
  });

  it("recognizes site refs without touching yerel or yesilvatan", () => {
    expect(isTurksavSiteRef(TURKSAV_SLUG)).toBe(true);
    expect(isTurksavSiteRef(TURKSAV_DOMAIN)).toBe(true);
    expect(isTurksavSiteRef("www.turksav.org")).toBe(true);
    expect(isTurksavSiteRef("yerelnet")).toBe(false);
    expect(isTurksavSiteRef("yerel.net.tr")).toBe(false);
    expect(isTurksavSiteRef("yesilvatan")).toBe(false);
    expect(isTurksavSiteRef("yesilvatan.gen.tr")).toBe(false);
  });
});
