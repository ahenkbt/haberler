import { describe, expect, it } from "vitest";
import {
  VATAN_ASSETS,
  VATAN_HERITAGE_CARDS,
  VATAN_LONGFORM_PAGES,
  VATAN_MEMORIAL_CARDS,
  VATAN_MENU_ITEMS,
  VATAN_THEME_ID,
  getVatanLongformPage,
  isHmVatanThemeId,
  isVatanLongformSlug,
  mergeVkdVatanMenuItems,
} from "./hmVatanTheme";
import {
  applyVkdVatanThemeToLayoutPrefs,
  defaultNewsSiteLayoutPrefs,
  isHmCorporateLikeTheme,
  mergeNewsSiteLayoutForSave,
  normalizeHmVitrinTheme,
  pickVitrinLayoutPatchForSave,
  sanitizeHmPublicLayoutPrefs,
} from "./newsSiteLayout";
import { isHmHeaderChromeContained, isHmSiteLayoutContained } from "./hmChromeLayout";

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

  it("surfaces Atatürk and existing heritage pages on homepage cards", () => {
    const hrefs = VATAN_HERITAGE_CARDS.map((card) => card.href);
    expect(hrefs).toContain("/ataturk");
    expect(hrefs).toContain("/kultur-portali");
    expect(hrefs).toContain("/savaslar");
    expect(hrefs).toContain("/hakkimizda");
    expect(VATAN_ASSETS.ataturk).toBe("/vkd/vatan/ataturk.jpg");
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

  it("includes Atatürk dropdown seeds without replacing existing items", () => {
    expect(VATAN_MENU_ITEMS.some((item) => item.id === "vkd-menu-ataturk")).toBe(true);
    expect(VATAN_MENU_ITEMS.some((item) => item.href === "/ataturk")).toBe(true);
    expect(VATAN_MENU_ITEMS.some((item) => item.href === "/ataturk/hayati")).toBe(true);
    expect(VATAN_MENU_ITEMS.some((item) => item.href === "/kultur-portali")).toBe(true);
    const existing = [{ id: "vkd-menu-kurumsal", label: "KURUMSAL", href: "#", parentId: null }];
    const merged = mergeVkdVatanMenuItems(existing);
    expect(merged.filter((item) => item.id === "vkd-menu-kurumsal")).toHaveLength(1);
    expect(merged.some((item) => item.id === "vkd-menu-ataturk-kose")).toBe(true);
  });

  it("forces Vatan theme and heritage modules without leaving corporate-like layout", () => {
    const next = applyVkdVatanThemeToLayoutPrefs({
      ...defaultNewsSiteLayoutPrefs,
      hmVitrinTheme: "corporate",
      hmCorporateMenuItems: [
        { id: "vkd-menu-kurumsal", label: "KURUMSAL", href: "#", enabled: true },
        { id: "vkd-menu-kunye", label: "KÜNYE", href: "/kunye", enabled: true },
      ],
    });
    expect(next.hmVitrinTheme).toBe("vatan");
    expect(isHmCorporateLikeTheme(next.hmVitrinTheme)).toBe(true);
    expect(next.hmCorporateLayoutWidth).toBe("full");
    expect(next.hmChromeColorMode).toBe("dark");
    expect(isHmSiteLayoutContained(next)).toBe(false);
    expect(isHmHeaderChromeContained(next)).toBe(false);
    expect(next.hmCorporateMenuPrimaryOnly).toBe(false);
    expect(next.hmCorporateAtaturkCornerEnabled).toBe(true);
    expect(next.corporateSliderItems?.some((item) => item.imageUrl === VATAN_ASSETS.canakkaleHero)).toBe(true);
    expect(next.hmCorporateMenuItems?.some((item) => item.id === "vkd-menu-kah-teror")).toBe(true);
    expect(next.hmCorporateMenuItems?.some((item) => item.id === "vkd-menu-ataturk")).toBe(true);
    const ataturkIdx = next.hmCorporateMenuItems?.findIndex((item) => item.id === "vkd-menu-ataturk") ?? -1;
    const kunyeIdx = next.hmCorporateMenuItems?.findIndex((item) => item.id === "vkd-menu-kunye") ?? -1;
    expect(ataturkIdx).toBeGreaterThanOrEqual(0);
    expect(kunyeIdx).toBeGreaterThan(ataturkIdx);
    expect(next.hmVitrinTheme).not.toBe("esen");
    expect(next.hmVitrinTheme).not.toBe("news");
  });

  it("does not let vitrin-only saves flip Vatan or corporate onto news defaults", () => {
    const vatan = applyVkdVatanThemeToLayoutPrefs({
      ...defaultNewsSiteLayoutPrefs,
      hmVitrinTheme: "corporate",
    });
    const vitrinPatch = pickVitrinLayoutPatchForSave(
      { ...vatan, ...defaultNewsSiteLayoutPrefs, hmVitrinTheme: "esen" },
      vatan.hmVitrinTheme,
    );
    expect(vitrinPatch.hmVitrinTheme).toBeUndefined();

    const merged = mergeNewsSiteLayoutForSave(vatan, { ...defaultNewsSiteLayoutPrefs }, { vitrinOnly: true });
    expect(merged.hmVitrinTheme).toBe("vatan");
    expect(isHmCorporateLikeTheme(merged.hmVitrinTheme)).toBe(true);

    const sanitized = sanitizeHmPublicLayoutPrefs(vatan, "vkd");
    expect(sanitized.hmVitrinTheme).toBe("vatan");
    expect(sanitized.hmCorporateAtaturkCornerEnabled).toBe(true);
  });
});
