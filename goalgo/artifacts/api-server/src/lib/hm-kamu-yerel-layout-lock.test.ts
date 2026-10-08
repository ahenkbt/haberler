import { describe, expect, it } from "vitest";
import { listKamuYerelNavTopCategorySlugs } from "./hm-cumha-kamu-yerel-catalog.js";
import {
  applyKamuYerelLayoutLock,
  isLegacyGenericHmNav,
  kamuYerelLayoutNeedsCatalogRepair,
  kamuYerelLogoExpectation,
  stripKamuYerelLockedLayoutIncoming,
} from "./hm-kamu-yerel-layout-lock.js";
import { buildKamuYerelLayoutJson, TURKATAHABER_SITE, YERELNET_SITE } from "./hm-kamu-yerel-sites.js";

describe("hm-kamu-yerel-layout-lock", () => {
  it("detects legacy generic RSS nav", () => {
    expect(isLegacyGenericHmNav(["gundem", "ekonomi", "dunya", "politika", "spor", "teknoloji"])).toBe(true);
    expect(isLegacyGenericHmNav(listKamuYerelNavTopCategorySlugs())).toBe(false);
  });

  it("detects yerel.net.tr migration nav drift", () => {
    const legacy = ["yerel", "yerel-yonetimler", "ankara", "gundem", "ekonomi", "egitim", "saglik", "yasam"];
    expect(
      kamuYerelLayoutNeedsCatalogRepair(
        JSON.stringify({ hmNavOnlyCategorySlugs: legacy }),
        kamuYerelLogoExpectation(YERELNET_SITE),
      ),
    ).toBe(true);
  });

  it("applyKamuYerelLayoutLock restores catalog fields over editor patch", () => {
    const canonical = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    const patched = applyKamuYerelLayoutLock(
      { hmNavOnlyCategorySlugs: ["gundem", "spor"], logoUrl: "data:image/png;base64,abc" },
      canonical,
    );
    expect(patched.hmNavOnlyCategorySlugs).toEqual(listKamuYerelNavTopCategorySlugs());
    expect(patched.logoUrl).toBe("/brand/turkata/turkata-logo-light.png");
  });

  it("stripKamuYerelLockedLayoutIncoming blocks nav overwrite on save", () => {
    const inc = stripKamuYerelLockedLayoutIncoming("yerelnet", {
      hmPrimaryColor: "#111",
      hmNavOnlyCategorySlugs: ["gundem"],
    });
    expect(inc.hmPrimaryColor).toBe("#111");
    expect(inc.hmNavOnlyCategorySlugs).toBeUndefined();
  });

  it("accepts canonical yerel logo path", () => {
    const layout = buildKamuYerelLayoutJson(YERELNET_SITE);
    expect(layout.logoUrl).toBe("/brand/turkata/turkata-mark.png");
    expect(
      kamuYerelLayoutNeedsCatalogRepair(JSON.stringify(layout), kamuYerelLogoExpectation(YERELNET_SITE)),
    ).toBe(false);
  });
});
