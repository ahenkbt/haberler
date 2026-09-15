import { describe, expect, it } from "vitest";
import {
  resolveVatanHero,
  resolveVatanMosaicTiles,
  resolveVatanVisibleHomeModules,
  VATAN_HOME_MODULE_ORDER,
} from "./hmVatanEditorHome";
import { VATAN_ASSETS, VATAN_DEFAULT_SLIDER_ITEMS } from "./hmVatanTheme";
import { VATAN_HOME_HERO_V2, VATAN_MOSAIC_TILES } from "./hmVatanHomeContent";
import { defaultNewsSiteLayoutPrefs, parseNewsSiteLayoutFromJson, type NewsSiteLayoutPrefs } from "./newsSiteLayout";
import { buildVatanFooterGroups } from "./hmVatanNav";

function prefs(patch: Partial<NewsSiteLayoutPrefs>): NewsSiteLayoutPrefs {
  return { ...defaultNewsSiteLayoutPrefs, ...patch };
}

describe("Vatan editor home bindings", () => {
  it("keeps branded hero copy and default slides when the editor slider is empty", () => {
    const hero = resolveVatanHero(prefs({ corporateSliderItems: [] }));
    expect(hero.title).toBe(VATAN_HOME_HERO_V2.title);
    expect(hero.slides.map((s) => s.image)).toEqual(VATAN_HOME_HERO_V2.slides.map((s) => s.image));
  });

  it("ignores VKD stock Tepe Manşet seed so branded hero stays until the editor customizes it", () => {
    const hero = resolveVatanHero(
      prefs({
        corporateSliderItems: VATAN_DEFAULT_SLIDER_ITEMS.map((item) => ({ ...item })),
      }),
    );
    expect(hero.slides.map((s) => s.image)).toEqual(VATAN_HOME_HERO_V2.slides.map((s) => s.image));
    expect(hero.primaryLabel).toBe(VATAN_HOME_HERO_V2.primaryLabel);
    expect(hero.primaryHref).toBe(VATAN_HOME_HERO_V2.primaryHref);
  });

  it("uses Tepe Manşet images and the first two slide links for CTAs", () => {
    const hero = resolveVatanHero(
      prefs({
        corporateSliderItems: [
          {
            id: "a",
            title: "Burs",
            href: "/burs",
            imageUrl: "/vkd/vatan/custom-1.jpg",
            order: 1,
            active: true,
          },
          {
            id: "b",
            title: "Vakıf",
            href: "/vakif",
            imageUrl: "/vkd/vatan/custom-2.jpg",
            order: 2,
            active: true,
          },
        ],
      }),
    );
    expect(hero.slides.map((s) => s.image)).toEqual(["/vkd/vatan/custom-1.jpg", "/vkd/vatan/custom-2.jpg"]);
    expect(hero.primaryHref).toBe("/burs");
    expect(hero.primaryLabel).toBe("Burs");
    expect(hero.secondaryHref).toBe("/vakif");
    expect(hero.secondaryLabel).toBe("Vakıf");
    expect(hero.title).toBe(VATAN_HOME_HERO_V2.title);
  });

  it("replaces mosaic tiles when at least two band items have images", () => {
    const tiles = resolveVatanMosaicTiles(
      prefs({
        corporateBandItems: [
          { id: "b1", title: "Kart 1", href: "/a", imageUrl: "/img-a.jpg", order: 1, active: true },
          { id: "b2", title: "Kart 2", href: "/b", imageUrl: "/img-b.jpg", order: 2, active: true },
        ],
      }),
    );
    expect(tiles).toHaveLength(2);
    expect(tiles[0]?.title).toBe("Kart 1");
    expect(tiles[0]?.image).toBe("/img-a.jpg");
    expect(tiles[0]?.size).toBe("xl");
  });

  it("overrides mosaic titles from extra pages when bands are empty", () => {
    const tiles = resolveVatanMosaicTiles(
      prefs({
        hmExtraPages: [
          {
            id: "p1",
            slug: "sehitliklerimiz",
            title: "Editör Şehitlik Başlığı",
            enabled: true,
            bodyHtml: "<p>x</p>",
          },
        ],
      }),
    );
    expect(tiles[0]?.slug).toBe(VATAN_MOSAIC_TILES[0]?.slug);
    expect(tiles[0]?.title).toBe("Editör Şehitlik Başlığı");
    expect(tiles[0]?.image).toBe(VATAN_ASSETS.sehitlik);
  });

  it("hides Vatan home modules listed in hmVatanHomeHiddenModules", () => {
    const visible = resolveVatanVisibleHomeModules(
      prefs({ hmVatanHomeHiddenModules: ["wars", "nationalDays"] }),
    );
    expect(visible).toEqual(VATAN_HOME_MODULE_ORDER.filter((id) => id !== "wars" && id !== "nationalDays"));
  });

  it("falls back to legacy corporate toggles when Vatan hidden list is not customized", () => {
    const visible = resolveVatanVisibleHomeModules(
      prefs({
        hmSehitSearchEnabled: false,
        hmCorporateAtaturkCornerEnabled: false,
        hmCorporateWarsSectionEnabled: false,
        hmCorporateNationalDaysSectionEnabled: false,
        hmCorporateDonation: {
          ...defaultNewsSiteLayoutPrefs.hmCorporateDonation!,
          enabled: false,
        },
      }),
    );
    expect(visible).toEqual(
      VATAN_HOME_MODULE_ORDER.filter(
        (id) =>
          id !== "sehitSearch" &&
          id !== "ataturk" &&
          id !== "wars" &&
          id !== "nationalDays" &&
          id !== "donation",
      ),
    );
  });

  it("treats explicit empty Vatan hidden list as an override", () => {
    const visible = resolveVatanVisibleHomeModules(
      prefs({
        hmVatanHomeHiddenModules: [],
        hmSehitSearchEnabled: false,
        hmCorporateAtaturkCornerEnabled: false,
      }),
    );
    expect(visible).toEqual(VATAN_HOME_MODULE_ORDER);
  });

  it("keeps an explicit empty Vatan hidden list after parsing", () => {
    const parsed = parseNewsSiteLayoutFromJson(
      JSON.stringify({
        hmVitrinTheme: "vatan",
        hmVatanHomeHiddenModules: [],
        hmSehitSearchEnabled: false,
        hmCorporateAtaturkCornerEnabled: false,
        hmCorporateWarsSectionEnabled: false,
        hmCorporateNationalDaysSectionEnabled: false,
        hmCorporateDonation: { enabled: false },
      }),
      "vkd",
    );
    expect(resolveVatanVisibleHomeModules(parsed)).toEqual(VATAN_HOME_MODULE_ORDER);
  });

  it("seeds missing VKD Vatan module defaults as visible", () => {
    const parsed = parseNewsSiteLayoutFromJson(JSON.stringify({ hmVitrinTheme: "vatan" }), "vkd");
    expect(parsed.hmVatanHomeHiddenModules).toEqual([]);
    expect(parsed.hmCorporateDonation?.enabled).toBe(true);
    expect(resolveVatanVisibleHomeModules(parsed)).toEqual(VATAN_HOME_MODULE_ORDER);
  });

  it("preserves an explicit null donation payload while still seeding Vatan visibility", () => {
    const parsed = parseNewsSiteLayoutFromJson(JSON.stringify({ hmVitrinTheme: "vatan", hmCorporateDonation: null }), "vkd");
    expect(parsed.hmCorporateDonation?.enabled).toBe(false);
    expect(parsed.hmVatanHomeHiddenModules).toEqual([]);
    expect(resolveVatanVisibleHomeModules(parsed)).toEqual(VATAN_HOME_MODULE_ORDER);
  });

  it("builds footer columns from Üst menü groups", () => {
    const groups = buildVatanFooterGroups(
      prefs({
        hmCorporateMenuItems: [
          { id: "root-a", label: "Kurumsal", href: "#", enabled: true },
          { id: "child-a", label: "Hakkımızda", href: "/hakkimizda", parentId: "root-a", enabled: true },
          { id: "root-b", label: "Hatıra", href: "#", enabled: true },
          { id: "child-b", label: "Şehitlerimiz", href: "/sehitlerimiz", parentId: "root-b", enabled: true },
        ],
      }),
      (path) => path,
    );
    expect(groups.map((g) => g.heading)).toEqual(["Kurumsal", "Hatıra"]);
    expect(groups[0]?.links[0]?.href).toBe("/hakkimizda");
  });

  it("lets a dedicated footer menu replace header groups", () => {
    const groups = buildVatanFooterGroups(
      prefs({
        hmCorporateMenuItems: [
          { id: "root-a", label: "Kurumsal", href: "#", enabled: true },
          { id: "child-a", label: "Hakkımızda", href: "/hakkimizda", parentId: "root-a", enabled: true },
        ],
        hmNewsFooterMenuItems: [{ id: "f1", label: "Bağış", href: "/bagis", enabled: true }],
      }),
      (path) => path,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.heading).toBe("Menü");
    expect(groups[0]?.links[0]?.href).toBe("/bagis");
  });
});
