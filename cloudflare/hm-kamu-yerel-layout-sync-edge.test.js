import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isKamuYerelHost,
  kamuYerelLayoutNeedsRepair,
} from "./hm-kamu-yerel-layout-sync-edge.js";

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

describe("hm-kamu-yerel-layout-sync-edge", () => {
  it("matches kamu-yerel hosts", () => {
    assert.equal(isKamuYerelHost("turkatahaber.com"), true);
    assert.equal(isKamuYerelHost("www.yerel.net.tr"), true);
    assert.equal(isKamuYerelHost("fix.tc"), false);
  });

  it("flags nav missing merged tepe slugs", () => {
    assert.equal(
      kamuYerelLayoutNeedsRepair(
        JSON.stringify({
          hmNavOnlyCategorySlugs: ["yerel", "bolge-marmara"],
          logoUrl: "/turkata/turkata-logo.webp",
        }),
        "/turkata/turkata-logo.webp",
      ),
      true,
    );
  });

  it("accepts merged allowlist with bolge-*", () => {
    assert.equal(
      kamuYerelLayoutNeedsRepair(
        JSON.stringify({
          hmNavOnlyCategorySlugs: [...NAV_TOP, "bolge-marmara", "ankara"],
          logoUrl: "/turkata/turkata-logo.webp",
        }),
        "/turkata/turkata-logo.webp",
      ),
      false,
    );
  });
});
