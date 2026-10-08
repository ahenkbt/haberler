import { describe, expect, it } from "vitest";
import {
  HABERLER_MUHTAR_CATEGORY_SLUG,
  HABERLER_MUHTAR_LISTING_BASE,
  HABERLER_MUHTAR_RSS_URL,
  buildKamuYerelCategories,
  buildKamuYerelCorporateMenuItems,
  buildKamuYerelHmNewsSiteRssFeedRows,
  expandKamuYerelListingCategorySlugs,
  listHaberlerMuhtarListingPages,
  listKamuYerelCategoryPageAllowSlugs,
} from "./hm-cumha-kamu-yerel-catalog.js";
import { buildKamuYerelLayoutJson, TURKATAHABER_SITE } from "./hm-kamu-yerel-sites.js";

describe("turkata muhtar catalog + import helpers", () => {
  it("seeds muhtar category into kamu-yerel taxonomy and page allowlist", () => {
    const cats = buildKamuYerelCategories();
    expect(cats.some((c) => c.slug === HABERLER_MUHTAR_CATEGORY_SLUG && c.name === "Muhtar")).toBe(
      true,
    );
    expect(listKamuYerelCategoryPageAllowSlugs()).toContain("muhtar");
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    expect(layout.hmNavOnlyCategorySlugs as string[]).toContain("muhtar");
  });

  it("nests Muhtar under yerel-yonetimler in corporate menu + listing expand", () => {
    const menu = buildKamuYerelCorporateMenuItems();
    const muhtar = menu.find((m) => m.id === "ky-cat-muhtar");
    expect(muhtar?.href).toBe("/kategori/muhtar");
    expect(muhtar?.parentId).toBe("ky-cat-yerel-yonetimler");
    expect(expandKamuYerelListingCategorySlugs("yerel-yonetimler", "turkatahaber")).toEqual(
      expect.arrayContaining(["yerel-yonetimler", "muhtar", "ilceler"]),
    );
  });

  it("lists robots-safe Haberler.com muhtar pages for ~100 ingest", () => {
    const pages = listHaberlerMuhtarListingPages(4);
    expect(pages[0]).toBe(HABERLER_MUHTAR_LISTING_BASE);
    expect(pages).toEqual([
      "https://www.haberler.com/muhtar/",
      "https://www.haberler.com/muhtar/s2/",
      "https://www.haberler.com/muhtar/s3/",
      "https://www.haberler.com/muhtar/s4/",
    ]);
  });

  it("includes Haberler muhtar RSS in supplemental feed rows", () => {
    const rows = buildKamuYerelHmNewsSiteRssFeedRows();
    expect(rows.some((r) => r.url === HABERLER_MUHTAR_RSS_URL && r.categoryKey === "muhtar")).toBe(
      true,
    );
    // 19 cumha + 81 il + 4 tamamlayıcı (NTV×3 + Haberler Muhtar)
    expect(rows.length).toBe(19 + 81 + 4);
  });
});
