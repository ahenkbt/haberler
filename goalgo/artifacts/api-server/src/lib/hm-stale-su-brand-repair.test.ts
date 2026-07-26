import { describe, expect, it } from "vitest";
import { repairStaleSuBrandLayoutJson } from "./hm-stale-su-brand-repair.js";

describe("repairStaleSuBrandLayoutJson", () => {
  it("rewrites /tr/su paths and Su Haber titles for non-su slugs", () => {
    const layout = {
      hmFooterAboutHtml: "Suhaberajansi.com, güncel haber akışını...",
      hmAllowCrossSiteManualNews: true,
      hmCorporateMenuItems: [
        { href: "/tr/su", label: "Anasayfa" },
        { href: "/tr/su/tum-haberler", label: "Tüm Haberler" },
      ],
      corporateSliderItems: [{ title: "Su Haber Ajansı", subtitle: "7/24" }],
      corporateBandItems: [{ title: "Su haber" }],
    };
    const { next, changed } = repairStaleSuBrandLayoutJson(
      JSON.stringify(layout),
      "kirsehir",
      "Kırşehir Haber",
    );
    expect(changed).toBe(true);
    const parsed = JSON.parse(next!);
    expect(parsed.hmCorporateMenuItems[0].href).toBe("/tr/kirsehir");
    expect(parsed.hmCorporateMenuItems[1].href).toBe("/tr/kirsehir/tum-haberler");
    expect(parsed.corporateSliderItems[0].title).toBe("Kırşehir Haber");
    expect(parsed.corporateBandItems[0].title).toBe("Kırşehir Haber");
    expect(parsed.hmAllowCrossSiteManualNews).toBe(false);
    expect(String(parsed.hmFooterAboutHtml)).toContain("Kırşehir Haber");
    expect(String(parsed.hmFooterAboutHtml)).not.toMatch(/Suhaberajansi/i);
  });

  it("does not touch slug=su sites", () => {
    const layout = { hmCorporateMenuItems: [{ href: "/tr/su" }] };
    const { changed } = repairStaleSuBrandLayoutJson(JSON.stringify(layout), "su", "Su Haber");
    expect(changed).toBe(false);
  });
});
