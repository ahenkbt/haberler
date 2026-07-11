import { describe, expect, it } from "vitest";
import { shouldApplyActivatedPoolCategoryFilter } from "./hybrid-news-merge.js";

describe("shouldApplyActivatedPoolCategoryFilter", () => {
  it("genel akışta aktivasyon filtresi uygulanır", () => {
    expect(shouldApplyActivatedPoolCategoryFilter()).toBe(true);
    expect(shouldApplyActivatedPoolCategoryFilter("")).toBe(true);
    expect(shouldApplyActivatedPoolCategoryFilter("   ")).toBe(true);
  });

  it("açık kategori sayfasında aktivasyon filtresi atlanır", () => {
    expect(shouldApplyActivatedPoolCategoryFilter("asayis")).toBe(false);
    expect(shouldApplyActivatedPoolCategoryFilter("asayiş")).toBe(false);
    expect(shouldApplyActivatedPoolCategoryFilter(" gundem ")).toBe(false);
  });
});
