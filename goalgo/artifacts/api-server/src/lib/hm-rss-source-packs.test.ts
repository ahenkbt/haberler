import { describe, expect, it } from "vitest";
import {
  HM_RSS_KARMA_MAX_ITEMS,
  HM_RSS_SOURCE_PACKS,
  listEnabledHmRssSourcePackFeeds,
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

  it("karma çek 5 öğe; yalnızca açık paketler listelenir", () => {
    expect(HM_RSS_KARMA_MAX_ITEMS).toBe(5);
    const none = listEnabledHmRssSourcePackFeeds({});
    expect(none).toHaveLength(0);
    const ntv = listEnabledHmRssSourcePackFeeds({ ntv: true });
    expect(ntv.length).toBe(HM_RSS_SOURCE_PACKS.ntv.feeds.length);
    expect(parseHmRssSourcePackFlags({ ntv: true, karmaCek: true })).toEqual({
      ntv: true,
      dirilis: false,
      birgun: false,
      yerel: false,
      karmaCek: true,
    });
  });
});
