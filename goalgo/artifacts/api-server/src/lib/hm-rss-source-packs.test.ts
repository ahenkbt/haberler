import { describe, expect, it } from "vitest";
import {
  DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS,
  HM_RSS_KARMA_DEFAULTS_REV,
  HM_RSS_KARMA_MAX_ITEMS,
  HM_RSS_SOURCE_PACKS,
  HM_RSS_SOURCE_PACKS_ALL_OFF,
  listEnabledHmRssSourcePackFeeds,
  nextRssKarmaDefaultLayoutPatch,
  parseHmRssSourcePackFlags,
} from "./hm-rss-source-packs.js";

describe("hm rss source packs", () => {
  it("Diriliş / Birgün / yerel URL’leri paketlerde durur", () => {
    expect(HM_RSS_SOURCE_PACKS.dirilis.feeds.some((f) => f.url.includes("/rss/gundem"))).toBe(true);
    expect(HM_RSS_SOURCE_PACKS.birgun.feeds.some((f) => f.url.includes("siyaset-8"))).toBe(true);
    expect(HM_RSS_SOURCE_PACKS.yerel.feeds.filter((f) => f.categoryKey === "ankara").length).toBeGreaterThan(3);
    expect(HM_RSS_SOURCE_PACKS.yerel.feeds.filter((f) => f.categoryKey === "yerel").length).toBeGreaterThan(3);
  });

  it("siyaset ve politika aynı kategoriye düşer", () => {
    const siyaset = HM_RSS_SOURCE_PACKS.dirilis.feeds.find((f) => f.url.endsWith("/siyaset"));
    const politika = HM_RSS_SOURCE_PACKS.dirilis.feeds.find((f) => f.url.endsWith("/politika"));
    expect(siyaset?.categoryKey).toBe("politika");
    expect(politika?.categoryKey).toBe("politika");
  });

  it("karma çek 5 öğe; tanımsız layout’ta tüm paketler + karma açık", () => {
    expect(HM_RSS_KARMA_MAX_ITEMS).toBe(5);
    const unset = parseHmRssSourcePackFlags(undefined);
    expect(unset).toEqual(DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS);
    expect(parseHmRssSourcePackFlags({})).toEqual(DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS);
    expect(parseHmRssSourcePackFlags({ ntv: false, karmaCek: false })).toEqual(DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS);
    expect(parseHmRssSourcePackFlags({}, { corporate: true })).toEqual(HM_RSS_SOURCE_PACKS_ALL_OFF);
    expect(listEnabledHmRssSourcePackFeeds(parseHmRssSourcePackFlags({}, { corporate: true }))).toHaveLength(0);
    const ntv = listEnabledHmRssSourcePackFeeds(
      parseHmRssSourcePackFlags({ ntv: true }, { karmaDefaultsRev: HM_RSS_KARMA_DEFAULTS_REV }),
    );
    expect(ntv.length).toBe(HM_RSS_SOURCE_PACKS.ntv.feeds.length);
    expect(
      parseHmRssSourcePackFlags({ ntv: true, karmaCek: true }, { karmaDefaultsRev: HM_RSS_KARMA_DEFAULTS_REV }),
    ).toEqual({
      ntv: true,
      dirilis: false,
      birgun: false,
      yerel: false,
      karmaCek: true,
    });
  });

  it("rev yazıldıktan sonra editörün kapattığı paketler korunur", () => {
    expect(
      parseHmRssSourcePackFlags(
        { ntv: false, dirilis: false, birgun: false, yerel: false, karmaCek: false },
        { karmaDefaultsRev: HM_RSS_KARMA_DEFAULTS_REV },
      ),
    ).toEqual(HM_RSS_SOURCE_PACKS_ALL_OFF);
  });

  it("haber sitesi rev yoksa karma varsayılanını yazar; kurumsal RSS haberi silinir", () => {
    const news = nextRssKarmaDefaultLayoutPatch({
      hmVitrinTheme: "esen",
      hybridRssEnabled: false,
      hmRssSourcePacks: { ntv: false, karmaCek: false },
    });
    expect(news?.hybridRssEnabled).toBe(true);
    expect(news?.hmRssSourcePacks).toEqual(DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS);
    expect(news?.hmRssKarmaDefaultsRev).toBe(HM_RSS_KARMA_DEFAULTS_REV);
    expect(
      nextRssKarmaDefaultLayoutPatch({
        hmVitrinTheme: "esen",
        hmRssKarmaDefaultsRev: HM_RSS_KARMA_DEFAULTS_REV,
        hybridRssEnabled: false,
      }),
    ).toBeNull();

    const corporate = nextRssKarmaDefaultLayoutPatch({
      hmVitrinTheme: "corporate",
      hybridRssEnabled: true,
      hmRssSourcePacks: { ...DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS },
      hmNewsSiteRssFeedRows: [{ id: "x" }],
      hmCorporateGoogleNewsBandEnabled: true,
    });
    expect(corporate?.hybridRssEnabled).toBe(false);
    expect(corporate?.hmRssSourcePacks).toEqual(HM_RSS_SOURCE_PACKS_ALL_OFF);
    expect(corporate?.hmNewsSiteRssFeedRows).toEqual([]);
    expect(corporate?.hmCorporateGoogleNewsBandEnabled).toBe(false);
  });
});
