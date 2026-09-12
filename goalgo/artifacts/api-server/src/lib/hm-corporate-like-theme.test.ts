import { describe, expect, it } from "vitest";
import {
  isHmCorporateLikeTheme,
  isHmNewsFallbackVitrinTheme,
  resolveDefaultHmNewsSiteLayoutTheme,
} from "./hm-corporate-like-theme.js";
import { isHmCorporateLayout } from "./hm-editor-categories.js";
import { mergeHmLayoutPatch } from "./hm-layout-json.js";
import { sanitizeHmPublicLayoutRecord } from "./hm-layout-sanitize.js";
import { applyHmRssNewsPolicyToLayout, nextRssKarmaDefaultLayoutPatch } from "./hm-rss-source-packs.js";

describe("corporate-like vitrin theme (Vatan / kurumsal)", () => {
  it("treats vatan as corporate-like, not news/esen", () => {
    expect(isHmCorporateLikeTheme("vatan")).toBe(true);
    expect(isHmCorporateLikeTheme("corporate")).toBe(true);
    expect(isHmCorporateLikeTheme("kurumsal")).toBe(true);
    expect(isHmCorporateLikeTheme("news")).toBe(false);
    expect(isHmCorporateLikeTheme("esen")).toBe(false);
    expect(isHmNewsFallbackVitrinTheme("esen")).toBe(true);
    expect(isHmNewsFallbackVitrinTheme("vatan")).toBe(false);
    expect(isHmCorporateLayout({ hmVitrinTheme: "vatan" })).toBe(true);
    expect(isHmCorporateLayout({ hmVitrinTheme: "esen" })).toBe(false);
  });

  it("does not default a Vatan or corporate incoming theme to esen", () => {
    expect(resolveDefaultHmNewsSiteLayoutTheme("vatan")).toBe("vatan");
    expect(resolveDefaultHmNewsSiteLayoutTheme("corporate")).toBe("corporate");
    expect(resolveDefaultHmNewsSiteLayoutTheme("kurumsal")).toBe("corporate");
    expect(resolveDefaultHmNewsSiteLayoutTheme("")).toBe("esen");
    expect(resolveDefaultHmNewsSiteLayoutTheme("news")).toBe("esen");
  });

  it("keeps VKD Vatan flags when sanitizing public layout", () => {
    const layout = {
      hmVitrinTheme: "vatan",
      hmCorporateAtaturkCornerEnabled: true,
      hmCorporateCulturePortalBandEnabled: false,
      hmCorporateWarsSectionEnabled: false,
      hmCorporateNationalDaysSectionEnabled: false,
      hmSehitSearchEnabled: true,
    };
    const vkd = sanitizeHmPublicLayoutRecord(layout, "vkd");
    expect(vkd.hmVitrinTheme).toBe("vatan");
    expect(vkd.hmCorporateAtaturkCornerEnabled).toBe(true);
    expect(vkd.hmSehitSearchEnabled).toBe(true);

    const other = sanitizeHmPublicLayoutRecord({ ...layout }, "ahenkhaber");
    expect(other.hmVitrinTheme).toBe("vatan");
    expect(other.hmCorporateAtaturkCornerEnabled).toBe(true);
  });

  it("does not rewrite corporate sanitize theme to news", () => {
    const next = sanitizeHmPublicLayoutRecord(
      { hmVitrinTheme: "corporate", hmCorporateAtaturkCornerEnabled: true },
      "ornek-belediye",
    );
    expect(next.hmVitrinTheme).toBe("corporate");
    expect(next.hmCorporateAtaturkCornerEnabled).toBe(true);
  });

  it("vitrin-only merge keeps corporate and vatan themes off news/esen", () => {
    for (const theme of ["corporate", "vatan"] as const) {
      const sliderOnly = mergeHmLayoutPatch(
        { hmVitrinTheme: theme, hmCorporateAtaturkCornerEnabled: true },
        { corporateSliderItems: [{ title: "Hatıra" }] },
        { vitrinOnly: true },
      );
      expect(sliderOnly.hmVitrinTheme).toBe(theme);
      expect(sliderOnly.hmVitrinTheme).not.toBe("esen");
      expect(sliderOnly.hmVitrinTheme).not.toBe("news");

      const newsDefaultLeak = mergeHmLayoutPatch(
        { hmVitrinTheme: theme, hmCorporateLayoutWidth: "full" },
        { hmVitrinTheme: "esen", mansetVariant: "center-trio", hmNewsGoogleNewsBandEnabled: true },
        { vitrinOnly: true },
      );
      expect(newsDefaultLeak.hmVitrinTheme).toBe(theme);
    }

    const explicitGenelAyarlar = mergeHmLayoutPatch(
      { hmVitrinTheme: "corporate" },
      { hmVitrinTheme: "news" },
    );
    expect(explicitGenelAyarlar.hmVitrinTheme).toBe("corporate");
  });

  it("RSS policy does not write news karma defaults onto Vatan", () => {
    const vatan = nextRssKarmaDefaultLayoutPatch({
      hmVitrinTheme: "vatan",
      hybridRssEnabled: true,
      hmRssSourcePacks: { ntv: true, karmaCek: true },
      hmNewsSiteRssFeedRows: [{ id: "x" }],
    });
    expect(vatan?.hybridRssEnabled).toBe(false);
    expect(vatan?.hmNewsSiteRssFeedRows).toEqual([]);

    const applied = applyHmRssNewsPolicyToLayout({ hmVitrinTheme: "vatan" });
    expect(applied.hmVitrinTheme).toBe("vatan");
    expect(applied.hybridRssEnabled).not.toBe(true);
  });
});
