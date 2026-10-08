import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyYesilVatanLogoToLayout,
  isYesilVatanHost,
  YESILVATAN_FAVICON_PATH,
  YESILVATAN_LOGO_PATH,
  yesilVatanLayoutNeedsLogoRepair,
} from "./hm-yesilvatan-edge.js";

describe("hm-yesilvatan-edge", () => {
  it("applies logo paths", () => {
    const { layout, changed } = applyYesilVatanLogoToLayout({});
    assert.equal(changed, true);
    assert.equal(layout.logoUrl, YESILVATAN_LOGO_PATH);
    assert.equal(layout.faviconUrl, YESILVATAN_FAVICON_PATH);
  });

  it("does not rewrite yerel or unrelated hosts", () => {
    assert.equal(isYesilVatanHost("yesilvatan.gen.tr"), true);
    assert.equal(isYesilVatanHost("www.yesilvatan.gen.tr"), true);
    assert.equal(isYesilVatanHost("yerel.net.tr"), false);
  });

  it("flags missing logo", () => {
    assert.equal(yesilVatanLayoutNeedsLogoRepair("{}"), true);
    assert.equal(
      yesilVatanLayoutNeedsLogoRepair(
        JSON.stringify({ logoUrl: YESILVATAN_LOGO_PATH, faviconUrl: YESILVATAN_FAVICON_PATH }),
      ),
      false,
    );
  });
});
