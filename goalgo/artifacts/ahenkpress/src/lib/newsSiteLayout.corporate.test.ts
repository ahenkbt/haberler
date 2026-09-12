import { describe, expect, it } from "vitest";
import {
  defaultNewsSiteLayoutPrefs,
  hmNewsThemePresetPatch,
  isHmCorporateLayoutKind,
  isHmCorporateLikeTheme,
  parseNewsSiteLayoutFromJson,
  pickChangedVitrinLayoutKeys,
  resolveHmLayoutKind,
  resolveStoredHmVitrinTheme,
} from "./newsSiteLayout";

describe("HM corporate layout kind", () => {
  it("layout kind: tema ailesi (corporate/vatan) + bilinen kurumsal slug", () => {
    expect(resolveHmLayoutKind({ hmVitrinTheme: "corporate" })).toBe("corporate");
    expect(resolveHmLayoutKind({ hmVitrinTheme: "vatan" })).toBe("corporate");
    expect(isHmCorporateLikeTheme("vatan")).toBe(true);
    expect(isHmCorporateLikeTheme("corporate")).toBe(true);
    expect(isHmCorporateLikeTheme("esen")).toBe(false);
    expect(isHmCorporateLayoutKind({ hmVitrinTheme: "esen" }, "vkd")).toBe(true);
    expect(isHmCorporateLayoutKind({ hmVitrinTheme: "esen" }, "asg")).toBe(false);
    expect(resolveStoredHmVitrinTheme("vatan", "vkd")).toBe("vatan");
    expect(resolveStoredHmVitrinTheme("esen", "vkd")).toBe("vatan");
    expect(resolveStoredHmVitrinTheme("classic", "asg")).toBe("classic");
  });

  it("boş/bozuk layout_json vkd için vatan kalır, haber esen varsayılanına düşmez", () => {
    const empty = parseNewsSiteLayoutFromJson(null, "vkd");
    expect(empty.hmVitrinTheme).toBe("vatan");
    expect(isHmCorporateLayoutKind(empty, "vkd")).toBe(true);
    const broken = parseNewsSiteLayoutFromJson("{not-json", "vatankahramanlari");
    expect(broken.hmVitrinTheme).toBe("vatan");
    const newsEmpty = parseNewsSiteLayoutFromJson(null, "asg");
    expect(newsEmpty.hmVitrinTheme).toBe(defaultNewsSiteLayoutPrefs.hmVitrinTheme);
  });

  it("kayıtlı VKD vitrin parse sonrası haber varsayılanına dönmez", () => {
    const parsed = parseNewsSiteLayoutFromJson(
      JSON.stringify({
        hmVitrinTheme: "vatan",
        tickerFinance: false,
        corporateSliderItems: [{ title: "Dernek", href: "/", imageUrl: "/vkd/vkd-hero-vatan.png" }],
      }),
      "vkd",
    );
    expect(parsed.hmVitrinTheme).toBe("vatan");
    expect(parsed.tickerFinance).toBe(false);
    expect(parsed.corporateSliderItems?.[0]?.title).toBe("Dernek");
  });

  it("vitrin kaydı yalnızca değişen alanı gönderir; kurumsal/vatan tema haber temasına inmez", () => {
    const base = parseNewsSiteLayoutFromJson(
      JSON.stringify({ hmVitrinTheme: "vatan", tickerFinance: true }),
      "vkd",
    );
    const single = pickChangedVitrinLayoutKeys(base, { ...base, tickerFinance: false }, "vkd");
    expect(single).toEqual({ tickerFinance: false });

    const next = { ...base, ...defaultNewsSiteLayoutPrefs, tickerFinance: false, hmVitrinTheme: "esen" };
    const patch = pickChangedVitrinLayoutKeys(base, next, "vkd");
    expect(patch.tickerFinance).toBe(false);
    expect(patch.hmVitrinTheme).toBeUndefined();
  });

  it("haber sitesinde bilinçli tema değişikliği vitrin yamasında kalır", () => {
    const base = parseNewsSiteLayoutFromJson(JSON.stringify({ hmVitrinTheme: "esen" }), "asg");
    const next = { ...base, hmVitrinTheme: "classic" as const };
    const patch = pickChangedVitrinLayoutKeys(base, next, "asg");
    expect(patch.hmVitrinTheme).toBe("classic");
  });

  it("haber sitesi stok esen/news dump’ı özel vitrin düzenini ezmez", () => {
    const customOrder = ["hero", "latestGrid", "authorsStrip", "featuredCategoryStrip"];
    const base = parseNewsSiteLayoutFromJson(
      JSON.stringify({
        hmVitrinTheme: "classic",
        hmNewsHomeModuleOrder: customOrder,
        mansetVariant: "magazine-grid",
        tickerFinance: true,
        tickerWeather: true,
        logoUrl: "https://cdn.example/logo.png",
      }),
      "asg",
    );
    expect(base.hmVitrinTheme).toBe("classic");

    const staleStock = {
      ...base,
      ...defaultNewsSiteLayoutPrefs,
      tickerFinance: false,
      hmVitrinTheme: "esen" as const,
    };
    const patch = pickChangedVitrinLayoutKeys(base, staleStock, "asg");
    expect(patch.tickerFinance).toBe(false);
    expect(patch.hmVitrinTheme).toBeUndefined();
    expect(patch.hmNewsHomeModuleOrder).toBeUndefined();
    expect(patch.mansetVariant).toBeUndefined();

    const themeOnly = pickChangedVitrinLayoutKeys(
      base,
      { ...base, ...hmNewsThemePresetPatch("esen"), hmVitrinTheme: "esen" },
      "asg",
    );
    expect(themeOnly.hmVitrinTheme).toBe("esen");
    expect(themeOnly.hmNewsHomeModuleOrder).toBeDefined();

    const reset = pickChangedVitrinLayoutKeys(base, { ...base, ...defaultNewsSiteLayoutPrefs }, "asg", {
      allowStockLayoutReset: true,
    });
    expect(reset.hmVitrinTheme).toBe(defaultNewsSiteLayoutPrefs.hmVitrinTheme);
  });
});
