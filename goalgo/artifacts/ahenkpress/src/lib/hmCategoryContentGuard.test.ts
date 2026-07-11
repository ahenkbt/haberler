import { describe, expect, it } from "vitest";
import {
  isLikelyPoliticsNotSports,
  passesCategoryContentGuard,
} from "./hmCategoryContentGuard";

describe("hmCategoryContentGuard — SPOR siyaset sızıntısı", () => {
  it("açık siyaset başlığını (spor sinyali yok) siyaset sayar", () => {
    expect(isLikelyPoliticsNotSports({ title: "Cumhurbaşkanı kabineyi topladı" })).toBe(true);
    expect(isLikelyPoliticsNotSports({ title: "Mecliste bütçe görüşmeleri sürüyor" })).toBe(true);
    expect(isLikelyPoliticsNotSports({ title: "CHP kongre tarihini açıkladı" })).toBe(true);
  });

  it("spor sinyali taşıyan başlığı siyaset saymaz (override)", () => {
    expect(isLikelyPoliticsNotSports({ title: "Bakan, Galatasaray maçını tribünden izledi" })).toBe(false);
    expect(isLikelyPoliticsNotSports({ title: "Süper Lig'de şampiyonluk yarışı kızıştı" })).toBe(false);
  });

  it("saf spor başlığını siyaset saymaz", () => {
    expect(isLikelyPoliticsNotSports({ title: "Fenerbahçe transferi bitirdi" })).toBe(false);
  });

  it("SPOR kategorisinde siyaset öğesini eler, diğer kategorilerde elemez", () => {
    const politicsItem = { title: "Mecliste yeni yasa teklifi" };
    expect(passesCategoryContentGuard(politicsItem, "spor")).toBe(false);
    expect(passesCategoryContentGuard(politicsItem, "siyaset")).toBe(true);
    expect(passesCategoryContentGuard(politicsItem, "gundem")).toBe(true);
  });

  it("SPOR kategorisinde gerçek spor öğesini geçirir", () => {
    expect(passesCategoryContentGuard({ title: "Derbi öncesi son gelişmeler" }, "spor")).toBe(true);
    expect(passesCategoryContentGuard({ title: "Galatasaray transfer bombasını patlattı" }, "spor")).toBe(true);
  });

  it("SPOR kategorisinde spor sinyali olmayan öğeyi eler", () => {
    expect(
      passesCategoryContentGuard(
        { title: "Yenimahalle'de İnşaat İskelesinden Düşen İşçi Hayatını Kaybetti" },
        "spor",
      ),
    ).toBe(false);
  });

  it("spot metnindeki siyaset sinyalini SPOR'dan eler", () => {
    expect(
      passesCategoryContentGuard(
        { title: "Operasyon mu yapacaksınız?", spot: "İmamoğlu mahkeme savunmasında konuştu" },
        "spor",
      ),
    ).toBe(false);
  });

  it("feedLabel siyaset sinyali taşıyorsa SPOR'dan eler", () => {
    expect(
      passesCategoryContentGuard(
        { title: "Yoksulluğa değil, görünmesine karşılar", feedLabel: "Politika" },
        "spor",
      ),
    ).toBe(false);
  });
});
