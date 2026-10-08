import { describe, expect, it } from "vitest";
import { buildKamuYerelLayoutJson, TURKATAHABER_SITE, YERELNET_SITE } from "./hm-kamu-yerel-sites.js";
import { HM_RSS_SOURCE_PACKS_ALL_OFF } from "./hm-rss-source-packs.js";

describe("hm-kamu-yerel-sites", () => {
  it("layout uses cumha + NTV tamamlayıcı — karma paketleri kapalı", () => {
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    expect(layout.logoUrl).toBe("/turkata/turkata-logo.webp");
    expect(layout.mansetCategorySlug).toBe("yerel");
    expect(layout.hmRssSourcePacks).toEqual(HM_RSS_SOURCE_PACKS_ALL_OFF);
    const rows = layout.hmNewsSiteRssFeedRows as Array<{ url: string }>;
    expect(rows.length).toBeGreaterThan(90);
    expect(rows.some((r) => String(r.url).includes("ntv.com.tr/gundem"))).toBe(true);
    expect(rows.some((r) => String(r.url).includes("cumha.com.tr/rss/category/"))).toBe(true);
  });

  it("yerel.net.tr shares kamu-yerel taxonomy", () => {
    const layout = buildKamuYerelLayoutJson(YERELNET_SITE);
    expect(layout.hmVitrinTheme).toBe("esen");
    expect(layout.logoUrl).toBe("/yerel/yerel-logo.png");
    expect(layout.faviconUrl).toBe("/yerel/yerel-logo.png");
    expect(Array.isArray(layout.hmCorporateMenuItems)).toBe(true);
  });

  it("layout includes /daha + /iller extra pages and compact nav menu", () => {
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    const menu = layout.hmCorporateMenuItems as Array<{ id: string; href: string }>;
    expect(menu.length).toBeLessThanOrEqual(50);
    expect(menu.find((m) => m.id === "ky-cat-daha")?.href).toBe("/daha");
    const pages = layout.hmExtraPages as Array<{ slug: string }>;
    expect(pages.map((p) => p.slug)).toEqual(expect.arrayContaining(["daha", "iller"]));
  });

  it("hmNavOnly allowlists bolge-* + il pages while hmNavHidden keeps tepe menü compact", () => {
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    const allow = layout.hmNavOnlyCategorySlugs as string[];
    const hidden = layout.hmNavHiddenCategorySlugs as string[];
    expect(allow).toEqual(
      expect.arrayContaining([
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
        "muhtar",
        "bolge-marmara",
        "ankara",
        "izmir",
      ]),
    );
    expect(allow.filter((s) => s.startsWith("bolge-"))).toHaveLength(7);
    expect(hidden).toEqual(expect.arrayContaining(["bolge-marmara", "ankara", "muhtar", "belediye"]));
    expect(hidden).not.toContain("roportajlar");
    expect(hidden).not.toContain("yerel-yonetimler");
    expect(hidden).not.toContain("gundem");
    expect(hidden).not.toContain("dunya");
  });
});
