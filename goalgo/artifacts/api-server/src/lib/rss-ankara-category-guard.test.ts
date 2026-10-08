import { describe, expect, it } from "vitest";
import {
  isMisclassifiedAnkaraItem,
  looksLikeAnkaraLocalContent,
  looksLikeNationalOrInternationalContent,
  resolveAnkaraImportCategorySlug,
  resolveAnkaraReplacementCategorySlug,
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

  it("maps topics away from ankara on import", () => {
    expect(
      resolveAnkaraImportCategorySlug("ankara", "Galatasaray şampiyonluk yolunda", null, null),
    ).toBe("spor");
    expect(
      resolveAnkaraImportCategorySlug("ankara", "Dünya Bankası faiz kararını açıkladı", null, null),
    ).toBe("dunya");
    expect(
      resolveAnkaraImportCategorySlug("ankara", "Borsa İstanbul rekor kırdı", null, null),
    ).toBe("ekonomi");
    expect(
      resolveAnkaraImportCategorySlug("ankara", "Mamak'ta trafik düzenlemesi", null, null),
    ).toBe("ankara");
  });

  it("requires Ankara local signal to stay in ankara category", () => {
    expect(isMisclassifiedAnkaraItem("ankara", "Fenerbahçe transfer bombasını patlattı")).toBe(true);
    expect(isMisclassifiedAnkaraItem("ankara", "Sincan'da yangın söndürüldü")).toBe(false);
    expect(isMisclassifiedAnkaraItem("ankara", "Genel gündem haberi başlığı", null, null)).toBe(true);
    expect(isMisclassifiedAnkaraItem("gundem", "Fenerbahçe")).toBe(false);
  });

  it("flags rss-342598-style international football as Ankara misfit", () => {
    const title =
      "Cristiano Ronaldo'dan Arjantin Formasıyla Son Tangosunu Yapan Messi'ye Duygusal Mesaj";
    const spot =
      "Futbol tarihinin iki büyük yıldızı Cristiano Ronaldo ve Lionel Messi bir kez daha aynı hikâyenin içinde buluştu.";
    expect(looksLikeAnkaraLocalContent(title, spot)).toBe(false);
    expect(isMisclassifiedAnkaraItem("ankara", title, spot)).toBe(true);
    expect(resolveAnkaraImportCategorySlug("ankara", title, spot)).toBe("spor");
  });

  it("does not treat kazandı as Kahramankazan local signal", () => {
    expect(looksLikeAnkaraLocalContent("Galatasaray deplasmanda farklı kazandı", null, null)).toBe(
      false,
    );
  });

  it("Spider-Man / gişe sinema haberi Ankara'dan gündeme", () => {
    const title = "Gişe Rekortmeni Spider-Man: Brand New Day Beyaz Perde Yolculuğunu Noktaladı";
    const spot =
      "Rekor gişe geliriyle dikkat çeken Spider-Man: Brand New Day, sinema macerasını tamamlayarak dijital platformlara geçiş yaptı.";
    expect(isMisclassifiedAnkaraItem("ankara", title, spot)).toBe(true);
    expect(resolveAnkaraImportCategorySlug("ankara", title, spot)).toBe("gundem");
  });

  it("resolveAnkaraReplacementCategorySlug picks canonical slugs", () => {
    expect(resolveAnkaraReplacementCategorySlug("Yapay zeka düzenlemesi Meclis'te", null, null)).toBe(
      "teknoloji",
    );
    expect(resolveAnkaraReplacementCategorySlug("Sağlık Bakanlığı açıklama yaptı", null, null)).toBe(
      "saglik",
    );
  });
});
