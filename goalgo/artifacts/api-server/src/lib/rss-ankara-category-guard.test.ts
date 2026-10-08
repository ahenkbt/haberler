import { describe, expect, it } from "vitest";
import {
  isMisclassifiedAnkaraItem,
  looksLikeAnkaraLocalContent,
  looksLikeNationalOrInternationalContent,
  resolveAnkaraImportCategorySlug,
} from "./rss-ankara-category-guard.js";

describe("rss-ankara-category-guard", () => {
  it("detects Ankara local headlines", () => {
    expect(looksLikeAnkaraLocalContent("Çankaya'da yol çalışması başladı")).toBe(true);
    expect(looksLikeAnkaraLocalContent("Keçiören Belediyesi yeni projeyi açıkladı")).toBe(true);
  });

  it("flags national news as non-Ankara", () => {
    expect(looksLikeNationalOrInternationalContent("İstanbul'da metro hattı açıldı")).toBe(true);
    expect(looksLikeNationalOrInternationalContent("Ukrayna'da savaş devam ediyor")).toBe(true);
  });

  it("misclassified ankara → gundem/dunya on import", () => {
    expect(
      resolveAnkaraImportCategorySlug("ankara", "Galatasaray şampiyonluk yolunda", null, null),
    ).toBe("gundem");
    expect(
      resolveAnkaraImportCategorySlug("ankara", "Dünya Bankası faiz kararını açıkladı", null, null),
    ).toBe("dunya");
    expect(
      resolveAnkaraImportCategorySlug("ankara", "Mamak'ta trafik düzenlemesi", null, null),
    ).toBe("ankara");
  });

  it("isMisclassifiedAnkaraItem for spor-like national in ankara slug", () => {
    expect(isMisclassifiedAnkaraItem("ankara", "Fenerbahçe transfer bombasını patlattı")).toBe(true);
    expect(isMisclassifiedAnkaraItem("ankara", "Sincan'da yangın söndürüldü")).toBe(false);
    expect(isMisclassifiedAnkaraItem("gundem", "Fenerbahçe")).toBe(false);
  });
});
