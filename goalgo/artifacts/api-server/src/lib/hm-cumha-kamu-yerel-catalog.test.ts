import { describe, expect, it } from "vitest";
import {
  buildKamuYerelCategories,
  buildKamuYerelDahaExtraPage,
  buildKamuYerelHmNewsSiteRssFeedRows,
  buildKamuYerelCorporateMenuItems,
  buildKamuYerelIllerExtraPage,
  categorySlugFromCumhaFeed,
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
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/category/yerel-yonetimler")).toBe(
      "yerel-yonetimler",
    );
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/category/nato")).toBe("dunya");
  });

  it("builds cumha-primary site RSS rows (19 kategori + 81 il + tamamlayıcı)", () => {
    const rows = buildKamuYerelHmNewsSiteRssFeedRows();
    // 15 kamu + 4 dünya/Cumha-intl + 81 il + 7 supplemental (NTV×6 + muhtar)
    expect(rows.length).toBe(19 + 81 + 7);
    expect(rows.some((r) => r.url.includes("kamu-kurumlari-ve-ust-kurullar"))).toBe(true);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/category/cumhurbaskanligi"))).toBe(true);
    expect(rows.some((r) => r.url.includes("cumha.com.tr/rss/category/nato"))).toBe(true);
    expect(rows.find((r) => r.url.includes("/rss/category/nato"))?.categoryKey).toBe("dunya");
    expect(rows.some((r) => r.url.includes("ntv.com.tr/gundem.rss"))).toBe(true);
    expect(rows.some((r) => r.url.includes("rss.haberler.com/rss.asp?kategori=muhtar"))).toBe(true);
    expect(rows.find((r) => r.url.includes("kategori=muhtar"))?.categoryKey).toBe("yerel-yonetimler");
    expect(rows.every((r) => !r.url.includes("birgun.net/rss/kategori/siyaset-8"))).toBe(true);
  });

  it("expands kamu-yerel parent nav slugs for category listings", () => {
    expect(expandKamuYerelListingCategorySlugs("dunya", "turkatahaber")).toEqual(
      expect.arrayContaining(["dunya", "nato", "avrupa-birligi", "birlesmis-milletler"]),
    );
    expect(expandKamuYerelListingCategorySlugs("yerel-yonetimler", "turkatahaber")).toEqual(
      expect.arrayContaining(["yerel-yonetimler", "muhtar", "belediye", "ilceler", "buyuksehir-ve-iller"]),
    );
    expect(expandKamuYerelListingCategorySlugs("siyaset", "turkatahaber")).toEqual(
      expect.arrayContaining([
        "siyaset",
        "cumhurbaskanligi",
        "bakanliklar",
        "tbmm",
        "siyasi-partiler",
        "genel-merkez",
      ]),
    );
    expect(expandKamuYerelListingCategorySlugs("kamu", "turkatahaber")).toEqual(
      expect.arrayContaining(["kamu", "mulki-idare", "kamu-kurumlari", "valilikler"]),
    );
    expect(expandKamuYerelListingCategorySlugs("kamu", "turkatahaber")).not.toEqual(
      expect.arrayContaining(["cumhurbaskanligi"]),
    );
    expect(expandKamuYerelListingCategorySlugs("stk", "turkatahaber")).toEqual(
      expect.arrayContaining(["stk", "sivil-toplum-kuruluslari", "toplum-ve-yasam"]),
    );
    expect(expandKamuYerelListingCategorySlugs("gundem", "turkatahaber")).toEqual(["gundem"]);
    expect(expandKamuYerelListingCategorySlugs("dunya", "asg")).toEqual(["dunya"]);
  });

  it("exposes merged top nav category slugs", () => {
    expect(listKamuYerelNavTopCategorySlugs()).toEqual([...KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS]);
    expect(listKamuYerelNavTopCategorySlugs()).toEqual([
      "siyaset",
      "kamu",
      "stk",
      "yerel-yonetimler",
      "yerel",
      "gundem",
      "dunya",
      "spor",
      "teknoloji",
      "saglik",
      "roportajlar",
    ]);
  });

  it("corporate menu excludes iller/bolge; Daha points to /daha hub", () => {
    const menu = buildKamuYerelCorporateMenuItems();
    expect(menu.length).toBeLessThanOrEqual(50);
    expect(menu.some((m) => m.id === "ky-menu-iller" || m.id.startsWith("ky-region-"))).toBe(false);
    expect(menu.some((m) => m.id.startsWith("ky-il-"))).toBe(false);
    const daha = menu.find((m) => m.id === "ky-cat-daha");
    expect(daha?.href).toBe(`/${KAMU_YEREL_DAHA_PAGE_SLUG}`);
    expect(menu.find((m) => m.id === "ky-cat-siyaset")?.label).toBe("Siyaset");
    expect(menu.find((m) => m.id === "ky-cat-kamu")?.label).toBe("Kamu");
    expect(menu.find((m) => m.id === "ky-cat-stk")?.label).toBe("STK");
    expect(menu.find((m) => m.id === "ky-cat-dunya")?.label).toBe("Dünya");
    expect(menu.find((m) => m.id === "ky-cat-gundem")?.label).toBe("Gündem");
    expect(menu.find((m) => m.id === "ky-cat-roportajlar")?.label).toBe("Röportajlar");
    const genelMerkez = menu.find((m) => m.id === "ky-cat-genel-merkez");
    expect(genelMerkez?.parentId).toBe("ky-cat-siyaset");
    const nato = menu.find((m) => m.id === "ky-cat-nato");
    expect(nato?.parentId).toBe("ky-cat-dunya");
    expect(menu.find((m) => m.id === "ky-cat-muhtar")?.parentId).toBe("ky-cat-yerel-yonetimler");
    expect(menu.find((m) => m.id === "ky-cat-belediye")?.parentId).toBe("ky-cat-yerel-yonetimler");
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

  it("daha hub keeps 81 provinces, logos, and points intl to Dünya", () => {
    const page = buildKamuYerelDahaExtraPage();
    expect(page.slug).toBe(KAMU_YEREL_DAHA_PAGE_SLUG);
    expect(page.bodyHtml).toContain('href="/kategori/dunya"');
    expect(page.bodyHtml).not.toContain('href="/kategori/nato"');
    expect(page.bodyHtml).toContain("hm-daha-proje");
    expect(page.bodyHtml).toContain("hm-daha-site-grid");
    expect(page.bodyHtml).toContain("gundem.fix.tc");
    expect(page.bodyHtml).toContain("ankara.fix.tc");
    expect(page.bodyHtml).not.toContain("ankarahabergundemi.com");
    expect(page.bodyHtml).not.toContain("ankarasehirgazetesi.com");
    expect(page.bodyHtml).toContain("vatanhaber.net");
    expect(page.bodyHtml).toContain("gundemi.org");
    expect(page.bodyHtml).toContain("Ankara Haber Gündemi");
    expect(page.bodyHtml).toContain("Sosyal Hizmetler Haber Sitesi");
    expect(page.bodyHtml).toContain("https://sosyalhizmetler.tr/");
    expect(page.bodyHtml).toContain("sosyalhizmetler-logo.webp");
    expect(page.bodyHtml).toContain("Ege Gündemi");
    expect(page.bodyHtml).toContain("https://ege.gundemi.org/");
    expect(page.bodyHtml).toContain("Marmara Gündemi");
    expect(page.bodyHtml).toContain("https://marmara.gundemi.org/");
    expect(page.bodyHtml).toContain("Karadeniz Gündemi");
    expect(page.bodyHtml).toContain("https://karadeniz.gundemi.org/");
    expect(page.bodyHtml).toContain("Doğu Anadolu Gündemi");
    expect(page.bodyHtml).toContain("https://doguanadolu.gundemi.org/");
    expect(page.bodyHtml).toContain("Güneydoğu Gündemi");
    expect(page.bodyHtml).toContain("https://guneydogu.gundemi.org/");
    expect(page.bodyHtml).not.toContain("tukav.org");
    expect(page.bodyHtml).not.toContain("TÜKAV");
    expect(page.bodyHtml).toContain('id="marmara"');
    expect(page.bodyHtml.match(/class="hm-daha-il-link"/g)?.length).toBe(81);
  });
});
