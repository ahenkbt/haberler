import { describe, expect, it } from "vitest";
import { buildKamuYerelLayoutJson, TURKATAHABER_SITE } from "./hm-kamu-yerel-sites.js";
import { listKamuYerelCategoryPageAllowSlugs } from "./hm-cumha-kamu-yerel-catalog.js";
import { turkataLayoutNeedsCatalogRepair } from "./hm-turkatahaber-repair.js";

describe("hm-turkatahaber-repair", () => {
  it("flags iller-only legacy layout (empty hmNavOnly)", () => {
    expect(turkataLayoutNeedsCatalogRepair(JSON.stringify({ hmNavOnlyCategorySlugs: [] }))).toBe(true);
    expect(turkataLayoutNeedsCatalogRepair(JSON.stringify({ hmNavOnlyCategorySlugs: ["yerel"] }))).toBe(true);
  });

  it("accepts Cumha page allowlist + brand logo path", () => {
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    expect(layout.hmNavOnlyCategorySlugs).toEqual(listKamuYerelCategoryPageAllowSlugs());
    expect(turkataLayoutNeedsCatalogRepair(JSON.stringify(layout))).toBe(false);
  });

  it("flags SPA /turkata logo paths on PHP host", () => {
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    layout.logoUrl = "/turkata/turkata-logo.png";
    expect(turkataLayoutNeedsCatalogRepair(JSON.stringify(layout))).toBe(true);
  });
});
