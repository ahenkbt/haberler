import { describe, expect, it } from "vitest";
import { mergeHmLayoutPatch, stripCorporateRssLayoutFlags } from "./hm-layout-json.js";

describe("stripCorporateRssLayoutFlags", () => {
  it("clears RSS flags and modules on corporate layouts", () => {
    const out = stripCorporateRssLayoutFlags({
      hmVitrinTheme: "corporate",
      hybridRssEnabled: true,
      hmNewsRssLinksEnabled: true,
      hmCorporateGoogleNewsBandEnabled: true,
      hmCorporateRssBandEnabled: true,
      hmCorporateHomeModuleOrder: ["hero", "googleNewsBand", "rssBand", "mainNews"],
    });
    expect(out.hybridRssEnabled).toBe(false);
    expect(out.hmNewsRssLinksEnabled).toBe(false);
    expect(out.hmCorporateGoogleNewsBandEnabled).toBe(false);
    expect(out.hmCorporateRssBandEnabled).toBe(false);
    expect(out.hmCorporateHomeModuleOrder).toEqual(["hero", "mainNews"]);
  });

  it("leaves news-site RSS flags unchanged", () => {
    const out = stripCorporateRssLayoutFlags({
      hmVitrinTheme: "esen",
      hybridRssEnabled: true,
      hmNewsRssLinksEnabled: true,
    });
    expect(out.hybridRssEnabled).toBe(true);
    expect(out.hmNewsRssLinksEnabled).toBe(true);
  });
});

describe("mergeHmLayoutPatch", () => {
  it("forces RSS off when saving a corporate vitrin patch", () => {
    const merged = mergeHmLayoutPatch(
      { hmVitrinTheme: "corporate", hybridRssEnabled: true },
      { hybridRssEnabled: true, hmCorporateGoogleNewsBandEnabled: true },
      { vitrinOnly: true },
    );
    expect(merged.hybridRssEnabled).toBe(false);
    expect(merged.hmCorporateGoogleNewsBandEnabled).toBe(false);
  });
});
