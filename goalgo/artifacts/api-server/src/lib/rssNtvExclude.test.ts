import { describe, expect, it } from "vitest";
import { isExcludedNtvEvergreenDepremRssItem } from "./rssNtvExclude.js";

describe("rssNtvExclude", () => {
  it("excludes NTV daily AFAD listicle templates", () => {
    expect(
      isExcludedNtvEvergreenDepremRssItem({
        title:
          "Son dakika deprem mi oldu? Az önce deprem nerede oldu? İstanbul, Ankara, İzmir ve il il AFAD son depremler 03 Temmuz 2026",
        link: "https://www.ntv.com.tr/turkiye/son-dakika-deprem-mi-oldu-az-once-deprem-nerede-oldu-istanbul-ankara-izmir-ve-il-il-afad-son-depremler-03-temmuz-2026-1731166",
      }),
    ).toBe(true);
    expect(
      isExcludedNtvEvergreenDepremRssItem({
        title:
          "Son dakika İzmir'de deprem mi oldu? Az önce deprem İzmir'de nerede oldu? İzmir deprem Kandilli ve AFAD son depremler listesi 01 Temmuz 2026",
        link: "https://www.ntv.com.tr/turkiye/son-dakika-izmirde-deprem-mi-oldu-1730000",
      }),
    ).toBe(true);
  });

  it("keeps real earthquake breaking news titles", () => {
    expect(
      isExcludedNtvEvergreenDepremRssItem({
        title: "Muğla'da 4.2 büyüklüğünde deprem",
        link: "https://www.ntv.com.tr/turkiye/muglada-42-buyuklugunde-deprem-123456",
      }),
    ).toBe(false);
    expect(
      isExcludedNtvEvergreenDepremRssItem({
        title: "Depremde hasar tespit çalışmaları sürüyor",
        link: "https://www.ntv.com.tr/turkiye/depremde-hasar-tespit-calismalari-123456",
      }),
    ).toBe(false);
  });
});
