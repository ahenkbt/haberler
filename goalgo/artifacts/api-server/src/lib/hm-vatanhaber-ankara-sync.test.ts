import { describe, expect, it } from "vitest";
import {
  categorySlugIsAnkara,
  isVatanhaberSiteRow,
  siteLooksLikeAnkaraDestination,
} from "./hm-vatanhaber-ankara-sync.js";

describe("Vatanhaber Ankara hedef seçimi", () => {
  it("vatanhaber slug/domain kaynağı tanır, hedefe koymaz", () => {
    expect(isVatanhaberSiteRow({ slug: "vatanhaber" })).toBe(true);
    expect(isVatanhaberSiteRow({ slug: "asg", domain: "vatanhaber.net" })).toBe(true);
    expect(isVatanhaberSiteRow({ slug: "asg", domain: "ankarasehirgazetesi.com" })).toBe(false);
  });

  it("ankara kategorisi veya kutu RSS’i olan haber sitelerini alır", () => {
    expect(
      siteLooksLikeAnkaraDestination({
        slug: "asg",
        layout: { hmNewsSiteRssFeedRows: [{ id: "ankara", categoryKey: "ankara" }] },
        categorySlugs: ["gundem"],
      }),
    ).toBe(true);
    expect(
      siteLooksLikeAnkaraDestination({
        slug: "su",
        layout: {},
        categorySlugs: ["su-ankara", "gundem"],
      }),
    ).toBe(true);
    expect(
      siteLooksLikeAnkaraDestination({
        slug: "kirsehirhaber",
        layout: {},
        categorySlugs: ["gundem", "spor"],
      }),
    ).toBe(false);
  });

  it("kurumsal vitrini hedeflemez", () => {
    expect(
      siteLooksLikeAnkaraDestination({
        slug: "vkd",
        layout: { hmVitrinTheme: "corporate", hmActivatedCategorySlugs: ["ankara"] },
        categorySlugs: ["ankara"],
      }),
    ).toBe(false);
  });

  it("site önekli ankara slug’ını tanır", () => {
    expect(categorySlugIsAnkara("asg-ankara", "asg")).toBe(true);
    expect(categorySlugIsAnkara("gundem", "asg")).toBe(false);
  });
});
