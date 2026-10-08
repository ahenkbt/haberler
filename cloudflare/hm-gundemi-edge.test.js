import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyGundemiLogoToLayout,
  gundemiLayoutNeedsLogoRepair,
  gundemiLogoPathForHost,
  isGundemiBrandHost,
  GUNDEMI_APEX_LOGO_PATH,
} from "./hm-gundemi-edge.js";

describe("hm-gundemi-edge", () => {
  it("maps hosts to logo paths", () => {
    assert.equal(gundemiLogoPathForHost("gundemi.org"), GUNDEMI_APEX_LOGO_PATH);
    assert.equal(gundemiLogoPathForHost("ege.gundemi.org"), "/gundemi/logos/ege-gundemi.png");
    assert.equal(
      gundemiLogoPathForHost("marmara.gundemi.org"),
      "/gundemi/logos/marmara-gundemi.png",
    );
    assert.equal(
      gundemiLogoPathForHost("doguanadolu.gundemi.org"),
      "/gundemi/logos/doguanadolu-gundemi.png",
    );
  });

  it("detects gundemi brand hosts", () => {
    assert.equal(isGundemiBrandHost("ege.gundemi.org"), true);
    assert.equal(isGundemiBrandHost("www.marmara.gundemi.org"), true);
    assert.equal(isGundemiBrandHost("gundemi.org"), true);
    assert.equal(isGundemiBrandHost("turkatahaber.com"), false);
  });

  it("repairs wrong brand logo (sosyal hizmetler leak)", () => {
    const { layout, changed } = applyGundemiLogoToLayout(
      { logoUrl: "/sh/sosyal-hizmetler-logo.png", faviconUrl: "/sh/sosyal-hizmetler-logo.png" },
      "marmara.gundemi.org",
    );
    assert.equal(changed, true);
    assert.equal(layout.logoUrl, "/gundemi/logos/marmara-gundemi.png");
    assert.equal(layout.faviconUrl, "/gundemi/logos/marmara-gundemi.png");
  });

  it("leaves correct logo alone", () => {
    const path = "/gundemi/logos/ege-gundemi.png";
    const { changed } = applyGundemiLogoToLayout(
      { logoUrl: path, faviconUrl: path },
      "ege.gundemi.org",
    );
    assert.equal(changed, false);
    assert.equal(gundemiLayoutNeedsLogoRepair(JSON.stringify({ logoUrl: path, faviconUrl: path }), "ege.gundemi.org"), false);
  });
});
