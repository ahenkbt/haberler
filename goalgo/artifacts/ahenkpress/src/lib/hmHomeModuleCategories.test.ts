import { describe, expect, it } from "vitest";
import {
  HM_NEWS_HOME_MODULE_CATEGORY_ASSIGNABLE,
  resolveLatestGridOpeningCategorySlug,
} from "./hmHomeModuleCategories";

describe("Son Haberler latestGrid", () => {
  it("açılış sekmesi her zaman Tümü (boş slug)", () => {
    expect(
      resolveLatestGridOpeningCategorySlug({
        manualSlug: "gundem",
        tabStripSlugs: ["gundem", "spor"],
        sectionSlugs: ["ekonomi"],
      }),
    ).toBe("");
    expect(resolveLatestGridOpeningCategorySlug({ manualSlug: "" })).toBe("");
  });

  it("kutu kategori atamasında latestGrid yoktur", () => {
    expect(HM_NEWS_HOME_MODULE_CATEGORY_ASSIGNABLE).not.toContain("latestGrid");
  });
});
