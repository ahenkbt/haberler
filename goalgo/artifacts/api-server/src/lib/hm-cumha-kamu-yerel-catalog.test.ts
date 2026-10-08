import { describe, expect, it } from "vitest";
import {
  buildKamuYerelCategories,
  buildKamuYerelHmNewsSiteRssFeedRows,
  buildKamuYerelCorporateMenuItems,
  buildKamuYerelIllerExtraPage,
  cumhaLocationRssUrl,
  cumhaProvinceSlugFromName,
  kamuYerelRegionCategorySlug,
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

  it("builds cumha-primary site RSS rows (19 kategori + 81 il + tamamlayıcı)", () => {
    const rows = buildKamuYerelHmNewsSiteRssFeedRows();
    expect(rows.length).toBe(19 + 81 + 3);
    expect(rows.some((r) => r.url.includes("kamu-kurumlari-ve-ust-kurullar"))).toBe(true);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/category/cumhurbaskanligi"))).toBe(true);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/category/nato"))).toBe(true);
    expect(rows.every((r) => !r.url.includes("birgun.net/rss/kategori/siyaset-8"))).toBe(true);
  });

  it("exposes Cumha-aligned top nav category slugs", () => {
    expect(listKamuYerelNavTopCategorySlugs()).toEqual([...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS]);
    expect(listKamuYerelNavTopCategorySlugs()).toContain("tbmm");
    expect(listKamuYerelNavTopCategorySlugs()).toContain("daha");
  });

  it("regional il menu has 7 regions under İller (81 il menüde değil — 40 kayıt sınırı)", () => {
    const menu = buildKamuYerelCorporateMenuItems();
    expect(menu.length).toBeLessThanOrEqual(40);
    const iller = menu.find((m) => m.id === "ky-menu-iller");
    expect(iller?.href).toBe("/iller");
    const regions = menu.filter((m) => m.parentId === "ky-menu-iller");
    expect(regions).toHaveLength(7);
    expect(regions[0]?.href).toMatch(/^\/iller#/);
    expect(menu.some((m) => m.id.startsWith("ky-il-"))).toBe(false);
    const genelMerkez = menu.find((m) => m.id === "ky-cat-genel-merkez");
    expect(genelMerkez?.parentId).toBe("ky-cat-siyasi-partiler");
    const nato = menu.find((m) => m.id === "ky-cat-nato");
    expect(nato?.parentId).toBe("ky-cat-daha");
  });

  it("categories group 81 il under 7 bolge-* parent slugs in sort order", () => {
    const cats = buildKamuYerelCategories();
    for (const regionId of KAMU_YEREL_REGION_ORDER) {
      expect(cats.some((c) => c.slug === kamuYerelRegionCategorySlug(regionId))).toBe(true);
    }
    expect(cats.filter((c) => c.slug.startsWith("bolge-"))).toHaveLength(7);
    expect(cats.filter((c) => listKamuYerelProvinces().some((p) => p.slug === c.slug))).toHaveLength(81);
  });

  it("iller landing lists all provinces under regions", () => {
    const page = buildKamuYerelIllerExtraPage();
    expect(page.slug).toBe("iller");
    expect(page.bodyHtml).toContain('id="marmara"');
    expect(page.bodyHtml).toContain('href="/kategori/ankara"');
    expect(page.bodyHtml.match(/hm-iller-il-link/g)?.length).toBe(81);
  });
});
