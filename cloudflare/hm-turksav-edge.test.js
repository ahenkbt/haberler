import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTurksavLogoToLayout,
  isTurksavHost,
  TURKSAV_FAVICON_PATH,
  TURKSAV_LOGO_PATH,
  turksavLayoutNeedsLogoRepair,
} from "./hm-turksav-edge.js";

describe("hm-turksav-edge", () => {
  it("applies logo paths", () => {
    const { layout, changed } = applyTurksavLogoToLayout({});
    assert.equal(changed, true);
    assert.equal(layout.logoUrl, TURKSAV_LOGO_PATH);
    assert.equal(layout.faviconUrl, TURKSAV_FAVICON_PATH);
  });

  it("does not rewrite yerel or yesilvatan hosts", () => {
    assert.equal(isTurksavHost("turksav.org"), true);
    assert.equal(isTurksavHost("www.turksav.org"), true);
    assert.equal(isTurksavHost("yerel.net.tr"), false);
    assert.equal(isTurksavHost("yesilvatan.gen.tr"), false);
  });

  it("flags missing logo", () => {
    assert.equal(turksavLayoutNeedsLogoRepair("{}"), true);
    assert.equal(
      turksavLayoutNeedsLogoRepair(
        JSON.stringify({ logoUrl: TURKSAV_LOGO_PATH, faviconUrl: TURKSAV_FAVICON_PATH }),
      ),
      false,
    );
  });
});
