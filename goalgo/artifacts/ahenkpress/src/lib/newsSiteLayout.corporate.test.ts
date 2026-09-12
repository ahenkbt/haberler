import { describe, expect, it } from "vitest";
import {
  defaultNewsSiteLayoutPrefs,
  isHmCorporateLayoutKind,
  parseNewsSiteLayoutFromJson,
  pickChangedVitrinLayoutKeys,
  resolveHmLayoutKind,
  resolveStoredHmVitrinTheme,
} from "./newsSiteLayout";

describe("HM corporate layout kind", () => {
  it("layout kind: tema + bilinen kurumsal slug", () => {
    expect(resolveHmLayoutKind({ hmVitrinTheme: "corporate" })).toBe("corporate");
    expect(isHmCorporateLayoutKind({ hmVitrinTheme: "esen" }, "vkd")).toBe(true);
    expect(isHmCorporateLayoutKind({ hmVitrinTheme: "esen" }, "asg")).toBe(false);
    expect(resolveStoredHmVitrinTheme("esen", "vkd")).toBe("corporate");
    expect(resolveStoredHmVitrinTheme("classic", "asg")).toBe("classic");
  });

  it("boş/bozuk layout_json vkd için corporate kalır, haber esen varsayılanına düşmez", () => {
    const empty = parseNewsSiteLayoutFromJson(null, "vkd");
    expect(empty.hmVitrinTheme).toBe("corporate");
    const broken = parseNewsSiteLayoutFromJson("{not-json", "vatankahramanlari");
    expect(broken.hmVitrinTheme).toBe("corporate");
    const newsEmpty = parseNewsSiteLayoutFromJson(null, "asg");
    expect(newsEmpty.hmVitrinTheme).toBe(defaultNewsSiteLayoutPrefs.hmVitrinTheme);
  });

  it("kayıtlı corporate tema parse sonrası haber varsayılanına dönmez", () => {
    const parsed = parseNewsSiteLayoutFromJson(
      JSON.stringify({
        hmVitrinTheme: "corporate",
        tickerFinance: false,
        corporateSliderItems: [{ title: "Dernek", href: "/", imageUrl: "/vkd/vkd-hero-vatan.png" }],
      }),
      "vkd",
    );
    expect(parsed.hmVitrinTheme).toBe("corporate");
    expect(parsed.tickerFinance).toBe(false);
    expect(parsed.corporateSliderItems?.[0]?.title).toBe("Dernek");
  });

  it("vitrin kaydı yalnızca değişen alanı gönderir; kurumsal tema haber temasına inmez", () => {
    const base = parseNewsSiteLayoutFromJson(
      JSON.stringify({ hmVitrinTheme: "corporate", tickerFinance: true }),
      "vkd",
    );
    const single = pickChangedVitrinLayoutKeys(base, { ...base, tickerFinance: false }, "vkd");
    expect(single).toEqual({ tickerFinance: false });

    const next = { ...base, ...defaultNewsSiteLayoutPrefs, tickerFinance: false, hmVitrinTheme: "esen" };
    const patch = pickChangedVitrinLayoutKeys(base, next, "vkd");
    expect(patch.tickerFinance).toBe(false);
    expect(patch.hmVitrinTheme).toBeUndefined();
  });

  it("haber sitesinde tema değişikliği vitrin yamasında kalır", () => {
    const base = parseNewsSiteLayoutFromJson(JSON.stringify({ hmVitrinTheme: "esen" }), "asg");
    const next = { ...base, hmVitrinTheme: "classic" as const };
    const patch = pickChangedVitrinLayoutKeys(base, next, "asg");
    expect(patch.hmVitrinTheme).toBe("classic");
  });
});
