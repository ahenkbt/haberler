import { describe, expect, it } from "vitest";
import {
  expectedFixHaberCategoryCount,
  fixHaberLayoutNeedsCatalogRepair,
  isFixHaberSiteRow,
} from "./hm-fixhaber-repair.js";
import { buildFixHaberLayoutJson, FIXHABER_NAV_ONLY_CATEGORY_SLUGS } from "./hm-fixhaber-site.js";

describe("fixHaberLayoutNeedsCatalogRepair", () => {
  it("flags missing or stale nav whitelist in layout_json", () => {
    expect(fixHaberLayoutNeedsCatalogRepair(null)).toBe(true);
    expect(fixHaberLayoutNeedsCatalogRepair("{}")).toBe(true);
    expect(
      fixHaberLayoutNeedsCatalogRepair(JSON.stringify({ hmNavOnlyCategorySlugs: ["gundem"] })),
    ).toBe(true);
    const ok = JSON.stringify(buildFixHaberLayoutJson());
    expect(fixHaberLayoutNeedsCatalogRepair(ok)).toBe(false);
  });

  it("site row helper + expected catalog size", () => {
    expect(isFixHaberSiteRow({ id: 1, slug: "fixhaber", active: true })).toBe(true);
    expect(isFixHaberSiteRow({ id: 1, slug: "gundemi", active: true })).toBe(false);
    expect(expectedFixHaberCategoryCount()).toBeGreaterThan(FIXHABER_NAV_ONLY_CATEGORY_SLUGS.length);
  });
});
