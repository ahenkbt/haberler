import { describe, expect, it } from "vitest";
import {
  VATAN_ASSETS,
  VATAN_LONGFORM_PAGES,
  VATAN_MEMORIAL_CARDS,
  VATAN_MENU_ITEMS,
  VATAN_THEME_ID,
  getVatanLongformPage,
  isHmVatanThemeId,
  isVatanLongformSlug,
} from "./hmVatanTheme";
import {
  applyVkdVatanThemeToLayoutPrefs,
  defaultNewsSiteLayoutPrefs,
  isHmCorporateLikeTheme,
  normalizeHmVitrinTheme,
} from "./newsSiteLayout";

describe("Vatan theme", () => {
  it("registers theme id vatan", () => {
    expect(VATAN_THEME_ID).toBe("vatan");
    expect(isHmVatanThemeId("vatan")).toBe(true);
    expect(isHmVatanThemeId("corporate")).toBe(false);
    expect(normalizeHmVitrinTheme("vatan")).toBe("vatan");
    expect(isHmCorporateLikeTheme("vatan")).toBe(true);
    expect(isHmCorporateLikeTheme("corporate")).toBe(true);
    expect(isHmCorporateLikeTheme("news")).toBe(false);
  });

  it("keeps memorial module hrefs on existing public paths", () => {
    const hrefs = VATAN_MEMORIAL_CARDS.map((card) => card.href);
    expect(hrefs).toContain("/sehitlerimiz");
    expect(hrefs).toContain("/canakkale-sehitleri");
    expect(hrefs).toContain("/sehitliklerimiz");
    expect(hrefs).toContain("/terorle-mucadele");
    expect(hrefs).toContain("/guvenlik-gucleri");
    expect(hrefs).toContain("/sehit-gazi-haklari");
    expect(hrefs).toContain("/milli-gunler");
    expect(VATAN_MEMORIAL_CARDS.every((card) => card.image.startsWith("/vkd/vatan/"))).toBe(true);
  });

  it("exposes longform pages without inventing routes for existing CMS slugs", () => {
    expect(isVatanLongformSlug("sehitliklerimiz")).toBe(true);
    expect(isVatanLongformSlug("terorle-mucadele")).toBe(true);
    expect(isVatanLongformSlug("guvenlik-gucleri")).toBe(true);
    expect(isVatanLongformSlug("sehit-gazi-haklari")).toBe(true);
    expect(getVatanLongformPage("sehitlerimiz")).toBeNull();
    expect(Object.keys(VATAN_LONGFORM_PAGES)).toHaveLength(4);
    expect(VATAN_ASSETS.canakkaleHero).toBe("/vkd/vatan/canakkale-hero.jpg");
  });

  it("adds only missing memorial menu items", () => {
    expect(VATAN_MENU_ITEMS.map((item) => item.href)).toEqual(["/terorle-mucadele", "/guvenlik-gucleri"]);
  });

  it("forces Vatan theme and default slider on VKD layout prefs", () => {
    const next = applyVkdVatanThemeToLayoutPrefs({
      ...defaultNewsSiteLayoutPrefs,
      hmVitrinTheme: "corporate",
      hmCorporateMenuItems: [{ id: "vkd-menu-kurumsal", label: "KURUMSAL", href: "#", enabled: true }],
    });
    expect(next.hmVitrinTheme).toBe("vatan");
    expect(next.corporateSliderItems?.some((item) => item.imageUrl === VATAN_ASSETS.canakkaleHero)).toBe(true);
    expect(next.hmCorporateMenuItems?.some((item) => item.id === "vkd-menu-kah-teror")).toBe(true);
    expect(next.hmCorporateMenuItems?.some((item) => item.id === "vkd-menu-kah-guvenlik")).toBe(true);
  });
});
