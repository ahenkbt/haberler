import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTurkatahaberHost,
  turkataLayoutNeedsRepair,
  TURKATAHABER_DOMAIN,
} from "./hm-turkatahaber-edge.js";

describe("hm-turkatahaber-edge", () => {
  it("detects iller-only legacy nav", () => {
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify({ hmNavOnlyCategorySlugs: ["yerel"] })), true);
    assert.equal(turkataLayoutNeedsRepair(""), true);
  });

  it("accepts cumha page allowlist with bolge-*", () => {
    const layout = {
      hmNavOnlyCategorySlugs: [
        "daha",
        "siyaset",
        "kamu",
        "stk",
        "yerel-yonetimler",
        "roportajlar",
        "toplum-ve-yasam",
        "bolge-marmara",
        "ankara",
      ],
      logoUrl: "/turkata/turkata-logo.webp",
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), false);
  });

  it("flags tepe-only allowlist missing bolge-*", () => {
    const layout = {
      hmNavOnlyCategorySlugs: [
        "daha",
        "siyaset",
        "kamu",
        "stk",
        "yerel-yonetimler",
        "roportajlar",
        "toplum-ve-yasam",
      ],
      logoUrl: "/turkata/turkata-logo.webp",
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), true);
  });

  it("host match", () => {
    assert.equal(isTurkatahaberHost(TURKATAHABER_DOMAIN), true);
    assert.equal(isTurkatahaberHost("www.turkatahaber.com"), true);
    assert.equal(isTurkatahaberHost("fix.tc"), false);
  });
});
