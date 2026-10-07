import { describe, expect, it } from "vitest";
import { rssTitlesAreNearDuplicate } from "./rssImportDedupeCore.js";
import {
  pickRotatedFreeSiteIndex,
  rssStoryTitleMatchesAny,
  rssStoryTitlesMatchAny,
  uniqueNonEmptyTitles,
} from "./rssStorySiteAssign.js";

/** sehitgazi.org.tr örnekleri: farklı ajans başlıkları, aynı cenaze töreni olayı */
const SEHIT_POLIS_TITLES = [
  "Şehit polis Türkoğlu için tören düzenlendi",
  "Uygulama noktasında şehit edilen polis memuru için tören düzenlendi",
  "Şehit polis Türkoğlu için Ankara Emniyet Müdürlüğünde tören düzenlendi",
  "Silahlı saldırıda şehit olan polis için Ankara Emniyet Müdürlüğünde resmi cenaze töreni düzenlendi",
];

describe("rssStorySiteAssign", () => {
  it("eski Jaccard eşiği şehit polis başlıklarını kaçırır; token benzerliği yakalar", () => {
    for (let i = 0; i < SEHIT_POLIS_TITLES.length; i += 1) {
      for (let j = i + 1; j < SEHIT_POLIS_TITLES.length; j += 1) {
        expect(rssTitlesAreNearDuplicate(SEHIT_POLIS_TITLES[i]!, SEHIT_POLIS_TITLES[j]!)).toBe(false);
        expect(rssStoryTitleMatchesAny(SEHIT_POLIS_TITLES[i]!, [SEHIT_POLIS_TITLES[j]!])).toBe(true);
      }
    }
  });

  it("AI + kaynak başlık varyantlarından herhangi biri mevcut başlıkla eşleşirse aynı olay sayılır", () => {
    const existing = [SEHIT_POLIS_TITLES[0]!];
    expect(
      rssStoryTitlesMatchAny(
        ["Tamamen farklı bir spor skoru açıklandı", SEHIT_POLIS_TITLES[3]!],
        existing,
      ),
    ).toBe(true);
    expect(rssStoryTitlesMatchAny(["Tamamen farklı bir spor skoru açıklandı"], existing)).toBe(false);
  });

  it("round-robin dolu siteleri atlayıp boş siteye dağıtır", () => {
    // Siteler: 0 dolu, 1 boş, 2 dolu — start=0 → index 1
    const first = pickRotatedFreeSiteIndex(3, 0, (i) => i === 0 || i === 2);
    expect(first).toEqual({ index: 1, nextStart: 2 });

    // Hepsi dolu
    expect(pickRotatedFreeSiteIndex(3, 1, () => true)).toBeNull();

    // start=2, 2 dolu → 0 boş
    const wrap = pickRotatedFreeSiteIndex(3, 2, (i) => i === 1 || i === 2);
    expect(wrap).toEqual({ index: 0, nextStart: 1 });
  });

  it("aynı olayı bir sitede tutup sıradaki kopyayı diğer siteye kaydırır (senaryo)", () => {
    const sites = [10, 20, 30]; // örn. sehitgazi + diğerleri
    const titlesOnSite = new Map<number, string[]>([
      [10, [SEHIT_POLIS_TITLES[0]!]],
      [20, []],
      [30, []],
    ]);
    let cursor = 0;

    const assign = (incoming: string) => {
      const picked = pickRotatedFreeSiteIndex(sites.length, cursor, (index) => {
        const siteId = sites[index]!;
        return rssStoryTitleMatchesAny(incoming, titlesOnSite.get(siteId) ?? []);
      });
      if (!picked) return null;
      cursor = picked.nextStart;
      const siteId = sites[picked.index]!;
      const bag = titlesOnSite.get(siteId) ?? [];
      bag.push(incoming);
      titlesOnSite.set(siteId, bag);
      return siteId;
    };

    // İlk kopya sehitgazi'de (10) var → 20'ye
    expect(assign(SEHIT_POLIS_TITLES[1]!)).toBe(20);
    // İkinci yakın başlık 10+20 dolu → 30
    expect(assign(SEHIT_POLIS_TITLES[2]!)).toBe(30);
    // Dördüncü varyant tüm sitelerde var → atla
    expect(assign(SEHIT_POLIS_TITLES[3]!)).toBeNull();
    // Farklı haber 30'den sonraki cursor ile devam
    expect(assign("TFF derbi hakemini açıkladı")).toBe(10);
  });

  it("uniqueNonEmptyTitles tekrarları ve boşları temizler", () => {
    expect(uniqueNonEmptyTitles("A", "a", "", "B", null, "A")).toEqual(["A", "B"]);
  });
});
