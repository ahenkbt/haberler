import { describe, expect, it } from "vitest";
import {
  expandFixHaberListingCategorySlugs,
  fixHaberRssCategorySlugsMatch,
  mapCanonicalSlugToFixHaber,
  resolveFixHaberImportCategorySlug,
} from "./hm-fixhaber-category-router.js";

describe("fixhaber category router", () => {
  it("maps canonical RSS keys to fixhaber slugs", () => {
    expect(mapCanonicalSlugToFixHaber("teknoloji")).toBe("fixhaber-teknoloji");
    expect(mapCanonicalSlugToFixHaber("gundem")).toBe("fixhaber-gundem");
    expect(mapCanonicalSlugToFixHaber("fixhaber-donanim")).toBe("fixhaber-donanim");
  });

  it("refines generic imports using title signals", () => {
    expect(
      resolveFixHaberImportCategorySlug("teknoloji", "OpenAI yeni model duyurdu", null, null),
    ).toBe("fixhaber-yapay-zeka");
    expect(
      resolveFixHaberImportCategorySlug("gundem", "PlayStation 5 fiyat güncellemesi", null, null),
    ).toBe("fixhaber-oyun");
  });

  it("expands donanım listing slugs", () => {
    expect(expandFixHaberListingCategorySlugs("fixhaber-donanim", "fixhaber")).toContain(
      "fixhaber-donanim-pc-laptop",
    );
  });

  it("matches fixhaber category families for vitrin filters", () => {
    expect(fixHaberRssCategorySlugsMatch("fixhaber-teknoloji", "fixhaber-donanim")).toBe(true);
    expect(fixHaberRssCategorySlugsMatch("fixhaber-gundem", "fixhaber-donanim")).toBe(false);
  });
});
