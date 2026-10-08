import { describe, expect, it } from "vitest";
import { applyGundemiSiteLogoToLayout } from "./hm-gundemi-logo-repair.js";
import { GUNDEMI_REGIONAL_SITES } from "./hm-gundemi-regional-sites.js";

describe("hm-gundemi-logo-repair", () => {
  const marmara = GUNDEMI_REGIONAL_SITES.find((s) => s.slug === "marmara-gundemi")!;

  it("repairs sosyal hizmetler logo leak on marmara", () => {
    const { layout, changed } = applyGundemiSiteLogoToLayout(
      {
        logoUrl: "/sh/sosyal-hizmetler-logo.png",
        faviconUrl: "/sh/sosyal-hizmetler-logo.png",
      },
      marmara,
    );
    expect(changed).toBe(true);
    expect(layout.logoUrl).toBe("/gundemi/logos/marmara-gundemi.png");
    expect(layout.faviconUrl).toBe("/gundemi/logos/marmara-gundemi.png");
  });

  it("keeps correct logo", () => {
    const path = "/gundemi/logos/ege-gundemi.png";
    const ege = GUNDEMI_REGIONAL_SITES.find((s) => s.slug === "ege-gundemi")!;
    const { changed } = applyGundemiSiteLogoToLayout(
      { logoUrl: path, faviconUrl: path },
      ege,
    );
    expect(changed).toBe(false);
  });
});
