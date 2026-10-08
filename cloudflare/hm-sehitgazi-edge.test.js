import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySehitGaziLogoToLayout,
  isSehitGaziHost,
  SEHITGAZI_FAVICON_PATH,
  SEHITGAZI_LOGO_PATH,
  sehitGaziLayoutNeedsLogoRepair,
} from "./hm-sehitgazi-edge.js";

describe("hm-sehitgazi-edge", () => {
  it("applies logo paths", () => {
    const { layout, changed } = applySehitGaziLogoToLayout({});
    assert.equal(changed, true);
    assert.equal(layout.logoUrl, SEHITGAZI_LOGO_PATH);
    assert.equal(layout.faviconUrl, SEHITGAZI_FAVICON_PATH);
  });

  it("does not rewrite turksav, yerel, or yesilvatan hosts", () => {
    assert.equal(isSehitGaziHost("sehitgazi.org.tr"), true);
    assert.equal(isSehitGaziHost("www.sehitgazi.org.tr"), true);
    assert.equal(isSehitGaziHost("turksav.org"), false);
    assert.equal(isSehitGaziHost("yerel.net.tr"), false);
    assert.equal(isSehitGaziHost("yesilvatan.gen.tr"), false);
  });

  it("flags missing logo", () => {
    assert.equal(sehitGaziLayoutNeedsLogoRepair("{}"), true);
    assert.equal(
      sehitGaziLayoutNeedsLogoRepair(
        JSON.stringify({ logoUrl: SEHITGAZI_LOGO_PATH, faviconUrl: SEHITGAZI_FAVICON_PATH }),
      ),
      false,
    );
  });

  it("preserves user https logos", () => {
    const { changed, layout } = applySehitGaziLogoToLayout({
      logoUrl: "https://cdn.example/custom.png",
      faviconUrl: "https://cdn.example/custom.png",
    });
    assert.equal(changed, false);
    assert.equal(layout.logoUrl, "https://cdn.example/custom.png");
  });
});
