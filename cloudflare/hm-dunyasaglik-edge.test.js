import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDunyaSaglikLogoToLayout,
  isDunyaSaglikHost,
  DUNYASAGLIK_FAVICON_PATH,
  DUNYASAGLIK_LOGO_PATH,
  dunyaSaglikLayoutNeedsLogoRepair,
} from "./hm-dunyasaglik-edge.js";

describe("hm-dunyasaglik-edge", () => {
  it("applies logo paths", () => {
    const { layout, changed } = applyDunyaSaglikLogoToLayout({});
    assert.equal(changed, true);
    assert.equal(layout.logoUrl, DUNYASAGLIK_LOGO_PATH);
    assert.equal(layout.faviconUrl, DUNYASAGLIK_FAVICON_PATH);
  });

  it("does not rewrite yerel / yesilvatan / turksav / sehitgazi hosts", () => {
    assert.equal(isDunyaSaglikHost("dunyasaglik.org"), true);
    assert.equal(isDunyaSaglikHost("www.dunyasaglik.org"), true);
    assert.equal(isDunyaSaglikHost("yerel.net.tr"), false);
    assert.equal(isDunyaSaglikHost("yesilvatan.gen.tr"), false);
    assert.equal(isDunyaSaglikHost("turksav.org"), false);
    assert.equal(isDunyaSaglikHost("sehitgazi.org.tr"), false);
  });

  it("flags missing logo", () => {
    assert.equal(dunyaSaglikLayoutNeedsLogoRepair("{}"), true);
    assert.equal(
      dunyaSaglikLayoutNeedsLogoRepair(
        JSON.stringify({ logoUrl: DUNYASAGLIK_LOGO_PATH, faviconUrl: DUNYASAGLIK_FAVICON_PATH }),
      ),
      false,
    );
  });
});
