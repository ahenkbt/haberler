import { describe, expect, it } from "vitest";
import {
  listKamuYerelCategoryPageAllowSlugs,
  listKamuYerelNavTopCategorySlugs,
} from "./hm-cumha-kamu-yerel-catalog.js";
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
    expect(patched.hmNavOnlyCategorySlugs).toEqual(listKamuYerelCategoryPageAllowSlugs());
    expect(patched.logoUrl).toBe("/turkata/turkata-logo.webp");
  });

  it("stripKamuYerelLockedLayoutIncoming blocks nav but keeps editor colors", () => {
    const inc = stripKamuYerelLockedLayoutIncoming("yerelnet", {
      hmPrimaryColor: "#111",
      hmSecondaryColor: "#222",
      hmNavOnlyCategorySlugs: ["gundem"],
    });
    expect(inc.hmPrimaryColor).toBe("#111");
    expect(inc.hmSecondaryColor).toBe("#222");
    expect(inc.hmNavOnlyCategorySlugs).toBeUndefined();
  });

  it("applyKamuYerelLayoutLock keeps a valid editor color", () => {
    const canonical = buildKamuYerelLayoutJson(YERELNET_SITE);
    const patched = applyKamuYerelLayoutLock(
      { hmPrimaryColor: "#0b2a5b", hmSecondaryColor: "#c8102e" },
      canonical,
    );
    expect(patched.hmPrimaryColor).toBe("#0b2a5b");
    expect(patched.hmSecondaryColor).toBe("#c8102e");
  });

  it("applyKamuYerelLayoutLock fills missing/invalid concept colors", () => {
    const canonical = buildKamuYerelLayoutJson(YERELNET_SITE);
    const patched = applyKamuYerelLayoutLock({ hmPrimaryColor: "", hmSecondaryColor: "red" }, canonical);
    expect(patched.hmPrimaryColor).toBe("#0b6e4f");
    expect(patched.hmSecondaryColor).toBe("#c45c00");
  });

  it("accepts canonical yerel logo path", () => {
    const layout = buildKamuYerelLayoutJson(YERELNET_SITE);
    expect(layout.logoUrl).toBe("/yerel/yerel-logo.png");
    expect(
      kamuYerelLayoutNeedsCatalogRepair(JSON.stringify(layout), kamuYerelLogoExpectation(YERELNET_SITE)),
    ).toBe(false);
  });

  it("flags yerel when still pointing at Turkata mark", () => {
    expect(
      kamuYerelLayoutNeedsCatalogRepair(
        JSON.stringify({
          hmNavOnlyCategorySlugs: listKamuYerelCategoryPageAllowSlugs(),
          logoUrl: "/turkata/turkata-mark.png",
          faviconUrl: "/turkata/turkata-mark.png",
          hmExtraPages: [
            { slug: "daha", title: "Daha", bodyHtml: "", enabled: true },
            { slug: "iller", title: "İller", bodyHtml: "", enabled: true },
          ],
          hmCorporateMenuItems: [{ id: "ky-cat-daha", href: "/daha" }],
        }),
        kamuYerelLogoExpectation(YERELNET_SITE),
      ),
    ).toBe(true);
  });

  it("flags layouts missing /daha or /iller extra pages", () => {
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    const withoutDaha = {
      ...layout,
      hmExtraPages: [{ slug: "iller", title: "İller", bodyHtml: "", enabled: true, fullWidth: true }],
    };
    expect(
      kamuYerelLayoutNeedsCatalogRepair(JSON.stringify(withoutDaha), kamuYerelLogoExpectation(TURKATAHABER_SITE)),
    ).toBe(true);
  });
});
