import { describe, expect, it } from "vitest";
import { defaultNewsSiteLayoutPrefs, parseNewsSiteLayoutFromJson } from "./newsSiteLayout";
import {
  buildYenisafakLayoutPatch,
  phpEnabledModules,
  phpModuleIsOn,
  readYsEditorSnapshot,
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
});
