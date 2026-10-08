import { describe, expect, it } from "vitest";
import {
  buildKamuYerelCategories,
  buildKamuYerelDahaExtraPage,
  buildKamuYerelHmNewsSiteRssFeedRows,
  buildKamuYerelCorporateMenuItems,
  buildKamuYerelIllerExtraPage,
  categorySlugFromCumhaFeed,
  categorySlugFromCumhaItemRaw,
  cumhaLocationRssUrl,
  cumhaProvinceSlugFromName,
  expandKamuYerelListingCategorySlugs,
  kamuYerelRegionCategorySlug,
  KAMU_YEREL_DAHA_PAGE_SLUG,
  KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS,
  KAMU_YEREL_REGION_ORDER,
  listKamuYerelNavTopCategorySlugs,
  listKamuYerelProvinces,
} from "./hm-cumha-kamu-yerel-catalog.js";

describe("hm-cumha-kamu-yerel-catalog", () => {
  it("lists 81 provinces with cumha lokasyon RSS", () => {
    const provinces = listKamuYerelProvinces();
    expect(provinces).toHaveLength(81);
    expect(cumhaProvinceSlugFromName("Afyonkarahisar")).toBe("afyonkarahisar");
    expect(cumhaLocationRssUrl("ankara")).toBe("https://cumha.com.tr/rss/lokasyon/ankara");
  });

  it("maps cumha RSS URLs to site category slugs", () => {
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/lokasyon/izmir")).toBe("izmir");
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/category/yerel-yonetimler")).toBe("yerel-yonetimler");
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/latest-posts")).toBe("yerel");
  });

  it("builds cumha-primary site RSS rows including extras from rss-feeds", () => {
    const rows = buildKamuYerelHmNewsSiteRssFeedRows();
    expect(rows.length).toBe(19 + 81 + 3 + 3);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/latest-posts"))).toBe(true);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/lokasyon/turkiye"))).toBe(true);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/lokasyon/dunya"))).toBe(true);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/category/nato"))).toBe(true);
  });

  it("expands parent and thin leaf listings", () => {
    expect(expandKamuYerelListingCategorySlugs("daha", "turkatahaber")).toEqual(
      expect.arrayContaining(["daha", "nato", "dunya"]),
    );
    expect(expandKamuYerelListingCategorySlugs("nato", "turkatahaber")).toEqual(
      expect.arrayContaining(["nato", "daha", "dunya"]),
    );
    expect(expandKamuYerelListingCategorySlugs("daha", "asg")).toEqual(["daha"]);
  });

  it("maps cumha:category_slug from item XML", () => {
    expect(
      categorySlugFromCumhaItemRaw(
        "<item><cumha:category_slug>kamu-kurumlari-ve-ust-kurullar</cumha:category_slug></item>",
      ),
    ).toBe("kamu-kurumlari");
  });

  it("exposes Cumha-aligned top nav category slugs", () => {
    expect(listKamuYerelNavTopCategorySlugs()).toEqual([...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS]);
  });

  it("corporate menu Daha hub + parent links", () => {
    const menu = buildKamuYerelCorporateMenuItems();
    expect(menu.find((m) => m.id === "ky-cat-daha")?.href).toBe(`/${KAMU_YEREL_DAHA_PAGE_SLUG}`);
    expect(menu.find((m) => m.id === "ky-cat-genel-merkez")?.parentId).toBe("ky-cat-siyasi-partiler");
    expect(menu.find((m) => m.id === "ky-cat-nato")?.parentId).toBe("ky-cat-daha");
  });

  it("categories group 81 il under 7 bolge-* parent slugs", () => {
    const cats = buildKamuYerelCategories();
    expect(cats.filter((c) => c.slug.startsWith("bolge-"))).toHaveLength(7);
    expect(cats.filter((c) => listKamuYerelProvinces().some((p) => p.slug === c.slug))).toHaveLength(81);
  });

  it("iller + daha landing pages", () => {
    expect(buildKamuYerelIllerExtraPage().bodyHtml.match(/hm-iller-il-link/g)?.length).toBe(81);
    const page = buildKamuYerelDahaExtraPage();
    expect(page.slug).toBe(KAMU_YEREL_DAHA_PAGE_SLUG);
    expect(page.bodyHtml).toContain('href="/kategori/nato"');
    expect(page.bodyHtml.match(/hm-daha-il-link/g)?.length).toBe(81);
  });
});
