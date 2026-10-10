import { describe, expect, it } from "vitest";
import { HM_RSS_SOURCE_PACKS } from "./hm-rss-source-packs.js";
import { FIXHABER_CAMPAIGN_RSS_FEEDS } from "./hm-fixhaber-rss-feeds.js";
import {
  filterItemsForSiteYonelim,
  isMuhalifRssUrl,
  isMuhalifRssUrlByPattern,
  normalizeSiteYonelim,
  parseSiteYonelim,
  rssSourceAllowedForSiteYonelim,
} from "./hm-rss-kaynak-yonelim.js";

const MUHALIF = [
  "https://www.birgun.net/rss/kategori/guncel-7",
  "https://www.evrensel.net/rss/haber",
  "https://www.diken.com.tr/feed/",
  "https://medyascope.tv/feed/",
  "https://bianet.org/rss",
  "https://www.artigercek.com/rss",
  "https://www.karar.com/rss",
  "https://haber.sol.org.tr/rss",
  "https://kronos36.news/feed/",
  "https://www.cumhuriyet.com.tr/rss/dunya",
];

describe("site yönelimi", () => {
  it("boş ve bilinmeyen değer karma olur", () => {
    expect(normalizeSiteYonelim(undefined)).toBe("karma");
    expect(normalizeSiteYonelim("")).toBe("karma");
    expect(normalizeSiteYonelim("orta")).toBe("karma");
    expect(normalizeSiteYonelim("Sağ")).toBe("sag");
    expect(normalizeSiteYonelim("sol")).toBe("sol");
    expect(parseSiteYonelim("yanlis")).toBeNull();
    expect(parseSiteYonelim(null)).toBe("karma");
  });
});

describe("muhalif RSS dağıtımı", () => {
  it("adlandırılan muhalif adresler sol işaretlidir", () => {
    for (const url of MUHALIF) {
      expect(isMuhalifRssUrl(url), url).toBe(true);
      expect(isMuhalifRssUrlByPattern(url), url).toBe(true);
    }
  });

  it("mevcut ılımlı akışlar üç yönde de açık kalır", () => {
    const urls = [
      "https://www.ntv.com.tr/turkiye.rss",
      "https://www.dirilispostasi.com/rss/gundem",
      "https://www.aa.com.tr/tr/rss/default?cat=guncel",
      "yekpare-hm-sync:3:news:12",
      "",
    ];
    for (const url of urls) {
      expect(isMuhalifRssUrl(url)).toBe(false);
      for (const yonelim of ["sag", "sol", "karma"] as const) {
        expect(rssSourceAllowedForSiteYonelim({ url }, yonelim)).toBe(true);
      }
    }
  });

  it("muhalif kaynak yalnız sol siteye gider", () => {
    const url = "https://www.birgun.net/haber/ornek";
    expect(rssSourceAllowedForSiteYonelim({ url }, "sol")).toBe(true);
    expect(rssSourceAllowedForSiteYonelim({ url }, "sag")).toBe(false);
    expect(rssSourceAllowedForSiteYonelim({ url }, "karma")).toBe(false);
    expect(rssSourceAllowedForSiteYonelim({ url, kaynakYonelim: "sol" }, "karma")).toBe(false);
    expect(rssSourceAllowedForSiteYonelim({ url: "https://www.ntv.com.tr/a", kaynakYonelim: "sol" }, "sag")).toBe(false);
    expect(rssSourceAllowedForSiteYonelim({ url: "https://www.ntv.com.tr/a", kaynakYonelim: "sol" }, "sol")).toBe(true);
  });

  it("karma ve sağ listeden muhalif haberi düşürür, sol tutar", () => {
    const items = [
      { rssSourceUrl: "https://www.ntv.com.tr/haber/1" },
      { rssSourceUrl: "https://www.cumhuriyet.com.tr/haber/2" },
      { rssSourceUrl: null },
    ];
    expect(filterItemsForSiteYonelim(items, "karma")).toEqual([items[0], items[2]]);
    expect(filterItemsForSiteYonelim(items, "sag")).toEqual([items[0], items[2]]);
    expect(filterItemsForSiteYonelim(items, "sol")).toBe(items);
  });

  it("BirGün paketi ve Fix Haber BirGün satırları sol işaretli, adresleri durur", () => {
    expect(HM_RSS_SOURCE_PACKS.birgun.feeds.length).toBeGreaterThan(0);
    expect(HM_RSS_SOURCE_PACKS.birgun.feeds.every((feed) => feed.kaynakYonelim === "sol")).toBe(true);
    expect(HM_RSS_SOURCE_PACKS.birgun.feeds.every((feed) => feed.url.includes("birgun.net"))).toBe(true);
    expect(HM_RSS_SOURCE_PACKS.ntv.feeds.every((feed) => feed.kaynakYonelim == null)).toBe(true);
    const fixBirgun = FIXHABER_CAMPAIGN_RSS_FEEDS.filter((feed) => feed.id.startsWith("birgun-"));
    expect(fixBirgun.length).toBeGreaterThan(0);
    expect(fixBirgun.every((feed) => feed.kaynakYonelim === "sol" && feed.url.includes("birgun.net"))).toBe(true);
  });
});
