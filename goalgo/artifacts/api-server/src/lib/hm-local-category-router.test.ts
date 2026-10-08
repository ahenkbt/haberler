import { describe, expect, it } from "vitest";
import {
  isHmPlaceCategorySlug,
  pickHmLocalCategorySlug,
  resolveHmImportCategorySlug,
  type HmSiteCategoryCatalogRow,
} from "./hm-local-category-router.js";

const ASG_CATALOG: HmSiteCategoryCatalogRow[] = [
  { slug: "ankara", name: "Ankara" },
  { slug: "bolge", name: "Bölge" },
  { slug: "yerel", name: "Yerel" },
  { slug: "gundem", name: "Gündem" },
  { slug: "ekonomi", name: "Ekonomi" },
];

const VATAN_CATALOG: HmSiteCategoryCatalogRow[] = [
  { slug: "ankara", name: "Ankara Haberleri" },
  { slug: "yerel", name: "Yerel" },
  { slug: "gundem", name: "Gündem" },
];

const ISTANBUL_ONLY_YEREL: HmSiteCategoryCatalogRow[] = [
  { slug: "yerel", name: "Yerel" },
  { slug: "gundem", name: "Gündem" },
];

const BOLGE_FALLBACK: HmSiteCategoryCatalogRow[] = [
  { slug: "bolge-haber", name: "Bölge Haberleri" },
  { slug: "yerel", name: "Yerel" },
];

describe("hm-local-category-router", () => {
  it("isHmPlaceCategorySlug: il/yerel slug'ları karışık doldurma dışı", () => {
    expect(isHmPlaceCategorySlug("ankara", "asg")).toBe(true);
    expect(isHmPlaceCategorySlug("yerel")).toBe(true);
    expect(isHmPlaceCategorySlug("gundem")).toBe(false);
  });

  it("pickHmLocalCategorySlug: şehir → bölge → yerel önceliği", () => {
    expect(pickHmLocalCategorySlug(ASG_CATALOG, "ankara", "asg")).toBe("ankara");
    expect(pickHmLocalCategorySlug(BOLGE_FALLBACK, "izmir")).toBe("bolge-haber");
    expect(pickHmLocalCategorySlug(ISTANBUL_ONLY_YEREL, "istanbul")).toBe("yerel");
  });

  it("ASG: yerel Ankara haberi ankara kategorisine", () => {
    expect(
      resolveHmImportCategorySlug("yerel", "Mamak'ta trafik düzenlemesi", null, null, {
        siteCategories: ASG_CATALOG,
        siteSlug: "asg",
      }),
    ).toBe("ankara");
  });

  it("ASG: ulusal spor ankara/yerel hedefinden spor'a", () => {
    expect(
      resolveHmImportCategorySlug("ankara", "Galatasaray şampiyonluk yolunda", null, null, {
        siteCategories: ASG_CATALOG,
        siteSlug: "asg",
      }),
    ).toBe("spor");
  });

  it("ASG: borsa ekonomi kategorisine, ankara değil", () => {
    expect(
      resolveHmImportCategorySlug("ankara", "Borsa İstanbul rekor kırdı", null, null, {
        siteCategories: ASG_CATALOG,
        siteSlug: "asg",
      }),
    ).toBe("ekonomi");
  });

  it("vatanhaber: Ankara yerel → ankara slug", () => {
    expect(
      resolveHmImportCategorySlug("yerel", "Çankaya'da yol çalışması", null, null, {
        siteCategories: VATAN_CATALOG,
        siteSlug: "vatanhaber",
      }),
    ).toBe("ankara");
  });

  it("İstanbul yerel, sitede istanbul yok → bölge veya yerel", () => {
    expect(
      resolveHmImportCategorySlug("yerel", "Kadıköy'de metro arızası", null, null, {
        siteCategories: BOLGE_FALLBACK,
      }),
    ).toBe("bolge-haber");
    expect(
      resolveHmImportCategorySlug("yerel", "Kadıköy'de metro arızası", null, null, {
        siteCategories: ISTANBUL_ONLY_YEREL,
      }),
    ).toBe("yerel");
  });

  it("katalog yokken ASG ankara guard uyumluluğu", () => {
    expect(resolveHmImportCategorySlug("ankara", "Sincan'da yangın söndürüldü", null, null, { siteSlug: "asg" })).toBe(
      "ankara",
    );
    expect(
      resolveHmImportCategorySlug("ankara", "Ukrayna'da savaş devam ediyor", null, null, { siteSlug: "asg" }),
    ).toBe("dunya");
  });
});
