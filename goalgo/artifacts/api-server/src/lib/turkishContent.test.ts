import { describe, expect, it } from "vitest";
import {
  isKnownForeignWorldBriefSource,
  isLikelyForeignHeadline,
  isLikelyTurkishHeadline,
  isTurkishWorldBriefContent,
  shouldMoveNewsToGlobalCategory,
} from "./turkishContent.js";

describe("turkishContent global reclassify", () => {
  it("Türkçe başlıkları global yapmaz", () => {
    expect(isLikelyTurkishHeadline("İstanbul'da trafik kazası")).toBe(true);
    expect(shouldMoveNewsToGlobalCategory("İstanbul'da trafik kazası")).toBe(false);
    expect(shouldMoveNewsToGlobalCategory("Son dakika: Meclis gündeminde")).toBe(false);
    expect(shouldMoveNewsToGlobalCategory("DEVA Partisi Ankara Milletvekili açıklama yaptı")).toBe(false);
    expect(shouldMoveNewsToGlobalCategory("CHP Denizli Milletvekili Şeref Arpacı")).toBe(false);
  });

  it("İngilizce başlıkları global yapar", () => {
    expect(shouldMoveNewsToGlobalCategory("Breaking news: World leaders meet today")).toBe(true);
    expect(shouldMoveNewsToGlobalCategory("The latest update from global markets")).toBe(true);
  });

  it("Fransızca başlıkları global yapar", () => {
    expect(shouldMoveNewsToGlobalCategory("La France annonce une nouvelle mesure")).toBe(true);
  });

  it("lang alanı tr dışındaysa global yapar", () => {
    expect(shouldMoveNewsToGlobalCategory("Some headline", null, "en")).toBe(true);
    expect(shouldMoveNewsToGlobalCategory("Some headline", null, "tr")).toBe(true);
    expect(shouldMoveNewsToGlobalCategory("Son dakika haber", null, "tr")).toBe(false);
  });

  it("boş başlığı atlar", () => {
    expect(shouldMoveNewsToGlobalCategory("")).toBe(false);
    expect(shouldMoveNewsToGlobalCategory(null)).toBe(false);
  });
});

describe("turkishContent world briefs (/kisa-kisa)", () => {
  it("bilinen yabancı kaynakları reddeder", () => {
    expect(isKnownForeignWorldBriefSource("NOS")).toBe(true);
    expect(isKnownForeignWorldBriefSource("DW")).toBe(true);
    expect(isKnownForeignWorldBriefSource("Deutsche Welle")).toBe(true);
    expect(isKnownForeignWorldBriefSource("Le Monde")).toBe(true);
    expect(isKnownForeignWorldBriefSource("O Globo")).toBe(true);
    expect(isKnownForeignWorldBriefSource("NTV Dünya")).toBe(false);
    expect(isTurkishWorldBriefContent("Rusya'da seçim sonuçları", null, null, "BBC")).toBe(false);
  });

  it("Hollandaca, Almanca, Portekizce ve Fransızca başlıkları reddeder", () => {
    expect(isLikelyForeignHeadline("Het kabinet heeft vandaag nieuws bekendgemaakt")).toBe(true);
    expect(isLikelyForeignHeadline("De politie heeft nieuws naar buiten gebracht")).toBe(true);
    expect(isLikelyForeignHeadline("Die Bundesregierung kündigt neue Maßnahmen an")).toBe(true);
    expect(isLikelyForeignHeadline("Bundesregierung beschließt neue Maßnahmen")).toBe(true);
    expect(isLikelyForeignHeadline("La France annonce une nouvelle mesure")).toBe(true);
    expect(isLikelyForeignHeadline("O presidente do Brasil disse hoje")).toBe(true);
    expect(isLikelyForeignHeadline("Governo anuncia medidas no Brasil")).toBe(true);

    expect(isTurkishWorldBriefContent("Het kabinet heeft vandaag nieuws bekendgemaakt")).toBe(false);
    expect(isTurkishWorldBriefContent("De politie heeft nieuws", null, "tr", "NOS")).toBe(false);
    expect(isTurkishWorldBriefContent("Bundesregierung beschließt neue Maßnahmen", null, "de", "DW")).toBe(false);
    expect(isTurkishWorldBriefContent("La France annonce une nouvelle mesure", null, "fr", "Le Monde")).toBe(false);
    expect(isTurkishWorldBriefContent("Governo anuncia medidas", null, "pt", "O Globo")).toBe(false);
  });

  it("Türkçe dünya haberlerini kabul eder", () => {
    expect(isTurkishWorldBriefContent("ABD'de yeni yaptırım kararı")).toBe(true);
    expect(isTurkishWorldBriefContent("Rusya Ukrayna savaşında son gelişmeler")).toBe(true);
    expect(isTurkishWorldBriefContent("İsrail-Filistin çatışmasında ateşkes görüşmeleri")).toBe(true);
    expect(isTurkishWorldBriefContent("Almanya'da hükümet yeni önlemler açıkladı")).toBe(true);
    expect(isTurkishWorldBriefContent("Son dakika: Meclis gündeminde kritik oturum")).toBe(true);
    expect(isTurkishWorldBriefContent("Fransa Cumhurbaşkanı açıklama yaptı", null, "tr", "NTV")).toBe(true);
  });

  it("lang alanı tr dışındaysa reddeder", () => {
    expect(isTurkishWorldBriefContent("Son dakika haber", null, "tr")).toBe(true);
    expect(isTurkishWorldBriefContent("Son dakika haber", null, "en")).toBe(false);
  });

  it("yalnızca spot Türkçe olsa bile yabancı başlığı reddeder", () => {
    expect(isTurkishWorldBriefContent("Breaking news from Europe", "Son dakika haber")).toBe(false);
  });
});
