import { describe, expect, it } from "vitest";
import {
  effectiveNewsCategorySlugForSiteGlobalPolicy,
  filterNewsItemsForSiteGlobalPolicy,
  HM_GLOBAL_NEWS_CATEGORY_SLUG,
  isForeignDunyaRssTreatedAsGlobal,
  isGlobalNewsCategoryEnabledOnSite,
  isHmGlobalNewsCategorySlug,
  isTurkishDunyaRssFeedGeo,
  resolveGlobalMapFeedCategorySlug,
} from "./hm-global-news-category.js";

describe("hm-global-news-category", () => {
  it("global slug tanır", () => {
    expect(isHmGlobalNewsCategorySlug("global")).toBe(true);
    expect(isHmGlobalNewsCategorySlug("dunya")).toBe(false);
  });

  it("haber sitesinde yalnızca açık etkinleştirmede görünür", () => {
    expect(isGlobalNewsCategoryEnabledOnSite({ activatedSlugs: null })).toBe(false);
    expect(isGlobalNewsCategoryEnabledOnSite({ activatedSlugs: [] })).toBe(false);
    expect(isGlobalNewsCategoryEnabledOnSite({ activatedSlugs: ["gundem"] })).toBe(false);
    expect(isGlobalNewsCategoryEnabledOnSite({ activatedSlugs: ["global"] })).toBe(true);
    expect(isGlobalNewsCategoryEnabledOnSite({ newsmapMode: true, activatedSlugs: [] })).toBe(true);
  });

  it("liste süzgeci global öğeleri eler", () => {
    const items = [
      { id: "1", categorySlug: "gundem", title: "TR" },
      { id: "2", categorySlug: HM_GLOBAL_NEWS_CATEGORY_SLUG, title: "EN" },
    ];
    const filtered = filterNewsItemsForSiteGlobalPolicy(items, { activatedSlugs: null });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });

  it("global kategori isteği kapalıyken boş döner", () => {
    const items = [{ id: "2", categorySlug: "global", title: "EN breaking news today" }];
    expect(
      filterNewsItemsForSiteGlobalPolicy(items, {
        activatedSlugs: ["global"],
        requestedCategorySlug: "global",
      }),
    ).toEqual([]);
  });

  it("global kategori isteği yalnızca newsmap modunda dolu döner", () => {
    const items = [{ id: "2", categorySlug: "global", title: "EN breaking news today" }];
    expect(
      filterNewsItemsForSiteGlobalPolicy(items, {
        newsmapMode: true,
        requestedCategorySlug: "global",
      }),
    ).toHaveLength(1);
  });

  it("TR/KKTC dünya pinleri dünya kalır", () => {
    expect(isTurkishDunyaRssFeedGeo({ countryCode: "TR", regionKey: "tr-ankara" })).toBe(true);
    expect(isTurkishDunyaRssFeedGeo({ countryCode: "CY", regionKey: "cy-lefkosa" })).toBe(true);
    expect(isTurkishDunyaRssFeedGeo({ countryCode: null, regionKey: "global-dunya" })).toBe(true);
  });

  it("yabancı dünya RSS site için global sayılır", () => {
    const feedGeoById = {
      "gmn-99": { countryCode: "IN", regionKey: "in-karnataka" },
    };
    const item = { categorySlug: "dunya", source: "rss", feedId: "gmn-99" };
    expect(isForeignDunyaRssTreatedAsGlobal(item, feedGeoById)).toBe(true);
    expect(effectiveNewsCategorySlugForSiteGlobalPolicy(item, feedGeoById)).toBe("global");
    expect(filterNewsItemsForSiteGlobalPolicy([item], { activatedSlugs: null, feedGeoById })).toEqual([]);
  });

  it("harita feed slug: yabancı bölge → global", () => {
    expect(
      resolveGlobalMapFeedCategorySlug({
        category: "news",
        countryCode: "IN",
        regionKey: "in-karnataka",
      }),
    ).toBe("global");
    expect(
      resolveGlobalMapFeedCategorySlug({
        category: "news",
        countryCode: "TR",
        regionKey: "tr-ankara",
      }),
    ).toBe("dunya");
  });
});
