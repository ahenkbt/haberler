import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTurkatahaberHost,
  turkataLayoutNeedsRepair,
  TURKATAHABER_DOMAIN,
} from "./hm-turkatahaber-edge.js";

const NAV_TOP = [
  "siyaset",
  "kamu",
  "stk",
  "yerel-yonetimler",
  "yerel",
  "gundem",
  "dunya",
  "spor",
  "teknoloji",
  "saglik",
  "roportajlar",
];

describe("hm-turkatahaber-edge", () => {
  it("detects iller-only legacy nav", () => {
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify({ hmNavOnlyCategorySlugs: ["yerel"] })), true);
    assert.equal(turkataLayoutNeedsRepair(""), true);
  });

  const dahaOk = {
    slug: "daha",
    bodyHtml:
      '<div class="hm-daha-proje"></div><ul class="hm-daha-site-grid"></ul><a href="https://gundem.fix.tc/">AHG</a><a href="https://ankara.fix.tc/">ASG</a><a href="https://vatanhaber.net/">Vatan</a>',
  };

  it("accepts cumha page allowlist with bolge-* and Dünya", () => {
    const layout = {
      hmNavOnlyCategorySlugs: [...NAV_TOP, "bolge-marmara", "ankara", "nato"],
      logoUrl: "/turkata/turkata-logo.webp",
      hmExtraPages: [dahaOk],
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), false);
  });

  it("flags tepe-only allowlist missing bolge-*", () => {
    const layout = {
      hmNavOnlyCategorySlugs: [...NAV_TOP],
      logoUrl: "/turkata/turkata-logo.webp",
      hmExtraPages: [dahaOk],
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), true);
  });

  it("flags missing Dünya tepe slug", () => {
    const layout = {
      hmNavOnlyCategorySlugs: NAV_TOP.filter((s) => s !== "dunya").concat(["bolge-marmara"]),
      logoUrl: "/turkata/turkata-logo.webp",
      hmExtraPages: [dahaOk],
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), true);
  });

  it("flags /daha layout missing AHG and Vatan Haber logos", () => {
    const layout = {
      hmNavOnlyCategorySlugs: [...NAV_TOP, "bolge-marmara"],
      logoUrl: "/turkata/turkata-logo.webp",
      hmExtraPages: [{ slug: "daha", bodyHtml: "<p>empty</p>" }],
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), true);
  });

  it("host match", () => {
    assert.equal(isTurkatahaberHost(TURKATAHABER_DOMAIN), true);
    assert.equal(isTurkatahaberHost("www.turkatahaber.com"), true);
    assert.equal(isTurkatahaberHost("fix.tc"), false);
  });
});
