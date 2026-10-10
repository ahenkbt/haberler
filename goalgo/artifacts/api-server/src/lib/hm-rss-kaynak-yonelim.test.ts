import { describe, expect, it } from "vitest";
import { HM_RSS_SOURCE_PACKS } from "./hm-rss-source-packs.js";
import { FIXHABER_CAMPAIGN_RSS_FEEDS } from "./hm-fixhaber-rss-feeds.js";
import {
  filterItemsForSiteYonelim,
  isMuhalifRssUrl,
  isMuhalifRssUrlByPattern,
  isOppositionRssSource,
  effectiveSiteYonelim,
  normalizeSiteYonelim,
  parseSiteYonelim,
  prioritizeOppositionForManset,
  rssSourceAllowedForSiteYonelim,
} from "./hm-rss-kaynak-yonelim.js";

const MUHALIF = [
  "https://www.birgun.net/rss/kategori/guncel-7",
  "https://www.evrensel.net/rss/haber",
  "https://www.diken.com.tr/feed/",
  "https://medyascope.tv/feed/",
  "https://bianet.org/rss",
  "https://www.artigercek.com/rss",
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

  it("muhalif kaynak sağ, sol ve karma sitelerde görünür", () => {
    const url = "https://www.birgun.net/haber/ornek";
    for (const yonelim of ["sag", "sol", "karma"] as const) {
      expect(rssSourceAllowedForSiteYonelim({ url }, yonelim)).toBe(true);
      expect(rssSourceAllowedForSiteYonelim({ url, kaynakYonelim: "sol" }, yonelim)).toBe(true);
      expect(rssSourceAllowedForSiteYonelim({ url: "https://www.ntv.com.tr/a", kaynakYonelim: "sol" }, yonelim)).toBe(true);
    }
    expect(isOppositionRssSource({ url })).toBe(true);
    expect(isOppositionRssSource({ url: "https://www.ntv.com.tr/a", kaynakYonelim: "sol" })).toBe(true);
    expect(isOppositionRssSource({ url: "https://www.ntv.com.tr/a" })).toBe(false);
  });

  it("liste süzgeci muhalif haberi düşürmez", () => {
    const items = [
      { rssSourceUrl: "https://www.ntv.com.tr/haber/1" },
      { rssSourceUrl: "https://www.cumhuriyet.com.tr/haber/2" },
      { rssSourceUrl: null },
    ];
    expect(filterItemsForSiteYonelim(items, "karma")).toBe(items);
    expect(filterItemsForSiteYonelim(items, "sag")).toBe(items);
    expect(filterItemsForSiteYonelim(items, "sol")).toBe(items);
  });

  it("muhalif öncelik yalnız sol manşet seçimindedir", () => {
    const items = [
      { rssSourceUrl: "https://www.ntv.com.tr/haber/1", title: "ntv" },
      { rssSourceUrl: "https://www.cumhuriyet.com.tr/haber/2", title: "cumhuriyet" },
      { link: "https://www.birgun.net/haber/3", title: "birgun" },
      { rssSourceUrl: null, title: "yerel" },
    ];
    expect(prioritizeOppositionForManset(items, "sag")).toBe(items);
    expect(prioritizeOppositionForManset(items, "karma")).toBe(items);
    expect(prioritizeOppositionForManset(items, "sol").map((item) => item.title)).toEqual([
      "cumhuriyet",
      "birgun",
      "ntv",
      "yerel",
    ]);
    expect(prioritizeOppositionForManset([{ title: "tek" }], "sol")).toEqual([{ title: "tek" }]);
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

describe("yönelim yalnız atanmış sitelerde", () => {
  it("Karar muhalif listesinde değil", () => {
    expect(isMuhalifRssUrl("https://www.karar.com/rss")).toBe(false);
    expect(isMuhalifRssUrl("https://www.karar.com.tr/rss")).toBe(false);
    expect(isMuhalifRssUrlByPattern("https://www.karar.com/haber/1")).toBe(false);
    expect(isOppositionRssSource({ url: "https://www.karar.com/haber/1" })).toBe(false);
  });

  it("yonelim_aktif=false site süzgeçsiz (mevcut davranış)", () => {
    expect(effectiveSiteYonelim({ yonelim: "karma", yonelimAktif: false })).toBeNull();
    expect(effectiveSiteYonelim({ yonelim: "sag" })).toBeNull();
    expect(effectiveSiteYonelim(null)).toBeNull();
    const items = [
      { rssSourceUrl: "https://www.birgun.net/haber/1" },
      { rssSourceUrl: "https://www.cumhuriyet.com.tr/haber/2" },
    ];
    expect(filterItemsForSiteYonelim(items, null)).toBe(items);
    expect(rssSourceAllowedForSiteYonelim({ url: items[0].rssSourceUrl }, null)).toBe(true);
  });

  it("yonelim_aktif=true süzmez; ton ve manşet için yönelim döner", () => {
    expect(effectiveSiteYonelim({ yonelim: "karma", yonelimAktif: true })).toBe("karma");
    expect(effectiveSiteYonelim({ yonelim: "sol", yonelimAktif: true })).toBe("sol");
    const items = [
      { rssSourceUrl: "https://www.ntv.com.tr/haber/1", title: "ntv" },
      { rssSourceUrl: "https://www.birgun.net/haber/1", title: "birgun" },
    ];
    const karma = effectiveSiteYonelim({ yonelim: "karma", yonelimAktif: true });
    expect(filterItemsForSiteYonelim(items, karma)).toBe(items);
    expect(prioritizeOppositionForManset(items, karma)).toBe(items);
    const sol = effectiveSiteYonelim({ yonelim: "sol", yonelimAktif: true });
    expect(filterItemsForSiteYonelim(items, sol)).toBe(items);
    expect(prioritizeOppositionForManset(items, sol).map((item) => item.title)).toEqual(["birgun", "ntv"]);
    expect(prioritizeOppositionForManset(items, effectiveSiteYonelim({ yonelim: "sol", yonelimAktif: false }))).toBe(items);
  });
});
