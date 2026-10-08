import { describe, expect, it } from "vitest";
import { defaultNewsSiteLayoutPrefs, parseNewsSiteLayoutFromJson } from "./newsSiteLayout";
import {
  buildYenisafakLayoutPatch,
  buildYsAboutPagePatch,
  buildYsCorporatePageHtmlPatch,
  buildYsKunyePagePatch,
  nextYsCategoryVisibilityPatch,
  PHP_THEME_LAYOUT_KEYS,
  PHP_THEME_LEGACY_ONLY_LAYOUT_KEYS,
  phpEnabledModules,
  phpModuleIsOn,
  readYsEditorSnapshot,
  readYsMansetPreset,
  ysEditorSnapshotsEqual,
  YS_AD_SLOTS,
  YS_MANSET_PRESETS,
  YS_MODULES,
  YS_SITE_PAGES,
  YS_SPA_MARKER_LAYOUT_KEYS,
  ysCategoryNavVisible,
} from "./yenisafakEditorLayout";

describe("Yenişafak layout contract", () => {
  it("PHP isOn: ys anahtarı eski anahtardan önce kazanır, eksikse açık kalır", () => {
    expect(phpModuleIsOn({}, ["hmNewsYsTickerEnabled", "hmNewsBreakingBandEnabled"])).toBe(true);
    expect(
      phpModuleIsOn(
        { hmNewsBreakingBandEnabled: false },
        ["hmNewsYsTickerEnabled", "hmNewsBreakingBandEnabled"],
      ),
    ).toBe(false);
    expect(
      phpModuleIsOn(
        { hmNewsYsTickerEnabled: false, hmNewsBreakingBandEnabled: true },
        ["hmNewsYsTickerEnabled", "hmNewsBreakingBandEnabled"],
      ),
    ).toBe(false);
  });

  it("kayıt yaması modül sırası, kategori, adet ve her iki anahtarı yazar", () => {
    const snapshot = readYsEditorSnapshot({
      ...defaultNewsSiteLayoutPrefs,
      hmNewsBreakingBandEnabled: false,
      hmNewsHomeModuleOrder: ["mediaDarkBlock", "breakingBand", "hero"],
      hmNewsHomeModuleCategorySlugs: { breakingBand: "spor" },
      hmNewsHomeModuleItemCounts: { breakingBand: 3 },
    });
    const ticker = snapshot.modules.find((row) => row.id === "ysTicker");
    expect(ticker?.enabled).toBe(false);
    expect(ticker?.category).toBe("spor");
    expect(ticker?.count).toBe(3);

    const patch = buildYenisafakLayoutPatch(defaultNewsSiteLayoutPrefs, {
      ...snapshot,
      preset: "nefes",
      primaryColor: "#0A7CB5",
      secondaryColor: "#112233",
      slogan: "Yerelin sesi",
      logoUrl: "https://cdn.example/logo.png",
      kunye: { genelMudur: "Ada Yılmaz", email: "ada@example.com" },
      modules: snapshot.modules.map((row) =>
        row.id === "ysGallery" ? { ...row, enabled: false, category: "kultur-sanat", count: 6 } : row,
      ),
    });

    expect(patch.hmVitrinTheme).toBe("yenisafak");
    expect(patch.hmYsMansetPreset).toBe("nefes");
    expect(patch.hmNewsYsMansetLayout).toBe("nefes");
    expect(patch.hmPrimaryColor).toBe("#0a7cb5");
    expect(patch.hmYsSlogan).toBe("Yerelin sesi");
    expect(patch.hmNewsYsGalleryEnabled).toBe(false);
    expect(patch.hmNewsMediaDarkBlockEnabled).toBe(false);
    expect(patch.hmNewsYsTickerEnabled).toBe(false);
    expect(patch.logoUrl).toBe("https://cdn.example/logo.png");

    const enabled = phpEnabledModules(patch);
    expect(enabled.map((row) => row.id)).not.toContain("ysGallery");
    expect(enabled.map((row) => row.id)).not.toContain("ysTicker");
    expect(enabled[0]?.id).toBe("ysManset");
    const slugs = patch.hmNewsHomeModuleCategorySlugs as Record<string, string>;
    const counts = patch.hmNewsHomeModuleItemCounts as Record<string, number>;
    expect(slugs.ysTicker).toBe("spor");
    expect(counts.breakingBand).toBe(3);
  });

  it("parse ys sıra ve manşet önayarını silmez", () => {
    const parsed = parseNewsSiteLayoutFromJson(
      JSON.stringify({
        hmVitrinTheme: "yenisafak",
        hmYsMansetPreset: "odatv",
        hmYsSlogan: "Kısa slogan",
        hmNewsHomeModuleOrder: ["ysGallery", "ysManset", "ysTicker"],
        hmNewsHomeModuleItemCounts: { ysManset: 5 },
        hmNewsYsMansetEnabled: true,
      }),
      "turkatahaber",
    );
    expect(parsed.hmVitrinTheme).toBe("yenisafak");
    expect(parsed.hmYsMansetPreset).toBe("odatv");
    expect(parsed.hmYsSlogan).toBe("Kısa slogan");
    expect(parsed.hmNewsHomeModuleOrder?.slice(0, 3)).toEqual(["ysGallery", "ysManset", "ysTicker"]);
    expect(parsed.hmNewsHomeModuleItemCounts?.ysManset).toBe(5);
    const rows = readYsEditorSnapshot(parsed).modules;
    expect(rows[0]?.id).toBe("ysGallery");
    expect(rows.find((row) => row.id === "ysManset")?.count).toBe(5);
  });

  it("ysEditorSnapshotsEqual manşet preset değişimini algılar", () => {
    const base = readYsEditorSnapshot(defaultNewsSiteLayoutPrefs);
    const changed = { ...base, preset: "sabah" as const };
    expect(ysEditorSnapshotsEqual(base, base)).toBe(true);
    expect(ysEditorSnapshotsEqual(base, changed)).toBe(false);
  });

  it("eski hmNewsYsMansetLayout manşet önayarını açar ve kayıt iki anahtarı da yazar", () => {
    expect(readYsMansetPreset({ ...defaultNewsSiteLayoutPrefs, hmNewsYsMansetLayout: "sabah" })).toBe("sabah");
    expect(
      readYsMansetPreset({
        ...defaultNewsSiteLayoutPrefs,
        hmYsMansetPreset: "mynet",
        hmNewsYsMansetLayout: "sabah",
      }),
    ).toBe("mynet");
    const snapshot = readYsEditorSnapshot({ ...defaultNewsSiteLayoutPrefs, hmNewsYsMansetLayout: "takvim" });
    expect(snapshot.preset).toBe("takvim");
    const patch = buildYenisafakLayoutPatch(defaultNewsSiteLayoutPrefs, snapshot);
    expect(patch.hmYsMansetPreset).toBe("takvim");
    expect(patch.hmNewsYsMansetLayout).toBe("takvim");
  });

  it("kategori beyaz listesi vitrin anahtarını ve gizlenenleri birlikte günceller", () => {
    const only = ["gundem", "spor"];
    expect(ysCategoryNavVisible("gundem", new Set(), only)).toBe(true);
    expect(ysCategoryNavVisible("ekonomi", new Set(), only)).toBe(false);
    expect(ysCategoryNavVisible("gundem", new Set(["gundem"]), only)).toBe(false);
    expect(ysCategoryNavVisible("ekonomi", new Set(), null)).toBe(true);
    expect(nextYsCategoryVisibilityPatch([], only, "ekonomi", true)).toEqual({
      hmNavHiddenCategorySlugs: null,
      hmNavOnlyCategorySlugs: ["gundem", "spor", "ekonomi"],
    });
    expect(nextYsCategoryVisibilityPatch([], only, "spor", false)).toEqual({
      hmNavHiddenCategorySlugs: ["spor"],
      hmNavOnlyCategorySlugs: ["gundem"],
    });
    expect(nextYsCategoryVisibilityPatch(["spor"], null, "spor", true)).toEqual({
      hmNavHiddenCategorySlugs: null,
    });
  });

  it("sayfa kayıt yaması telif şablonu yazmaz; künye ve iletişim HTML’i birbirini silmez", () => {
    expect(YS_SITE_PAGES.map((page) => page.slug)).toEqual(["hakkimizda", "kunye", "iletisim"]);
    expect(buildYsAboutPagePatch("  <p>Biz</p>  ")).toEqual({ hmFooterAboutHtml: "<p>Biz</p>" });
    expect(buildYsAboutPagePatch("   ")).toEqual({ hmFooterAboutHtml: null });
    expect(buildYsKunyePagePatch({ genelMudur: " Ada ", email: "" })).toEqual({
      hmYsKunye: { genelMudur: "Ada" },
    });
    expect(
      buildYsCorporatePageHtmlPatch({ iletisim: "<p>Ara</p>", reklam: "<p>Reklam</p>" }, "kunye", "<p>Künye</p>"),
    ).toEqual({
      hmCorporatePageHtml: { iletisim: "<p>Ara</p>", reklam: "<p>Reklam</p>", kunye: "<p>Künye</p>" },
    });
    expect(buildYsCorporatePageHtmlPatch({ kunye: "<p>Künye</p>" }, "kunye", "  ")).toEqual({
      hmCorporatePageHtml: null,
    });
  });
});

/**
 * `php-theme/src/Modules.php` → `Modules::DEFS` birebir kopyası.
 * PHP değişirse bu tablo ve `YS_MODULES` birlikte güncellenir.
 */
const PHP_MODULE_DEFS: Record<
  string,
  { category: string; count: number; toggles: string[]; aliases: string[] }
> = {
  ysTicker: {
    category: "gundem",
    count: 12,
    toggles: ["hmNewsYsTickerEnabled", "hmNewsBreakingBandEnabled"],
    aliases: ["ysTicker", "breakingBand"],
  },
  ysManset: {
    category: "gundem",
    count: 8,
    toggles: ["hmNewsYsMansetEnabled", "hmNewsSliderEnabled", "hmNewsTepeMansetEnabled"],
    aliases: ["ysManset", "hero", "tepeManset"],
  },
  ysSide: {
    category: "gundem",
    count: 4,
    toggles: ["hmNewsYsSideHeadlinesEnabled", "hmNewsLeadListSidebarEnabled"],
    aliases: ["ysSide", "ysSideHeadlines", "leadListSidebar"],
  },
  ysCategories: {
    category: "",
    count: 4,
    toggles: ["hmNewsYsCategoryBlocksEnabled", "hmNewsCategorySectionsEnabled", "hmNewsYekpareKategorilerKutusuEnabled"],
    aliases: ["ysCategories", "ysCategoryBlocks", "yekpareKategorilerKutusu", "featuredCategoryStrip"],
  },
  ysVideo: {
    category: "",
    count: 8,
    toggles: ["hmNewsYsVideoBandEnabled", "hmNewsRecentVideosSidebarEnabled"],
    aliases: ["ysVideo", "ysVideoBand", "recentVideosSidebar"],
  },
  ysAuthors: {
    category: "",
    count: 8,
    toggles: ["hmNewsYsAuthorsEnabled", "hmNewsAuthorsEnabled"],
    aliases: ["ysAuthors", "authorsStrip", "ahenkGununSesiAuthors"],
  },
  ysMostRead: {
    category: "gundem",
    count: 8,
    toggles: ["hmNewsYsMostReadEnabled", "hmNewsAhenkPopulerHaberlerEnabled"],
    aliases: ["ysMostRead", "ahenkPopulerHaberler"],
  },
  ysGallery: {
    category: "kultur-sanat",
    count: 6,
    toggles: ["hmNewsYsGalleryEnabled", "hmNewsMediaDarkBlockEnabled"],
    aliases: ["ysGallery", "mediaDarkBlock", "culturePortal"],
  },
};

describe("PHP tema anahtar sözleşmesi", () => {
  it("YS_MODULES PHP Modules::DEFS ile aynı modül, alias, kategori ve adet listesini taşır", () => {
    expect(YS_MODULES.map((def) => def.id)).toEqual(Object.keys(PHP_MODULE_DEFS));
    for (const def of YS_MODULES) {
      const php = PHP_MODULE_DEFS[def.id]!;
      expect([...def.aliases]).toEqual(php.aliases);
      expect(def.defaultCategory).toBe(php.category);
      expect(def.defaultCount).toBe(php.count);
      expect(php.toggles[0]).toBe(def.toggleKey);
      expect(php.toggles[1]).toBe(def.legacyToggleKey);
      for (const toggle of php.toggles) {
        expect(PHP_THEME_LAYOUT_KEYS).toContain(toggle);
      }
    }
  });

  it("manşet presetleri ve reklam slotları PHP Site::presetId / templates ile aynıdır", () => {
    expect(YS_MANSET_PRESETS.map((item) => item.id)).toEqual(["odatv", "sabah", "takvim", "mynet", "nefes"]);
    expect(YS_AD_SLOTS.map((slot) => slot.slotKey)).toEqual(["header", "block_strip", "home_block_fill"]);
  });

  it("vitrin kayıt yaması yalnızca PHP'nin okuduğu anahtarları ve SPA tema işaretini yazar", () => {
    const snapshot = readYsEditorSnapshot(defaultNewsSiteLayoutPrefs);
    const patch = buildYenisafakLayoutPatch(defaultNewsSiteLayoutPrefs, snapshot);
    const allowed = new Set<string>([...PHP_THEME_LAYOUT_KEYS, ...YS_SPA_MARKER_LAYOUT_KEYS]);
    const unexpected = Object.keys(patch).filter((key) => !allowed.has(key));
    expect(unexpected).toEqual([]);
    expect(patch.hmVitrinTheme).toBe("yenisafak");
    for (const key of [
      "hmYsMansetPreset",
      "hmNewsYsMansetLayout",
      "hmPrimaryColor",
      "hmSecondaryColor",
      "hmYsSlogan",
      "hmYsKunye",
      "logoUrl",
      "hmNewsHomeModuleOrder",
      "hmNewsHomeModuleCategorySlugs",
      "hmNewsHomeModuleItemCounts",
      "hmAdSlots",
    ]) {
      expect(Object.prototype.hasOwnProperty.call(patch, key)).toBe(true);
    }
    // Eski TSX tema anahtarları yazılmaz.
    for (const key of ["mansetVariant", "hmChromeColorMode", "hmNewsEsenThemeBlockEnabled", "hmNewsPortal3ThemeBlockEnabled"]) {
      expect(Object.prototype.hasOwnProperty.call(patch, key)).toBe(false);
    }
  });

  it("PHP anahtar listesi tekrarsızdır ve eski-yalnız anahtarla kesişmez", () => {
    expect(new Set(PHP_THEME_LAYOUT_KEYS).size).toBe(PHP_THEME_LAYOUT_KEYS.length);
    for (const key of PHP_THEME_LEGACY_ONLY_LAYOUT_KEYS) {
      expect(PHP_THEME_LAYOUT_KEYS as readonly string[]).not.toContain(key);
    }
  });
});
