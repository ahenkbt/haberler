import { describe, expect, it } from "vitest";
import {
  campaignIdFromRequestPath,
  collectFeedHosts,
  hostFromMaybeUrl,
  normalizeHmSiteIds,
  parsePositiveInt,
  rssCampaignOwnedByHmSite,
  rssSourceMatchesHosts,
} from "./hm-rss-campaigns.js";

describe("normalizeHmSiteIds", () => {
  it("pg array, JSON ve tek değeri sayı dizisine çevirir", () => {
    expect(normalizeHmSiteIds([3])).toEqual([3]);
    expect(normalizeHmSiteIds(["3"])).toEqual([3]);
    expect(normalizeHmSiteIds("{3}")).toEqual([3]);
    expect(normalizeHmSiteIds("{2,3}")).toEqual([2, 3]);
    expect(normalizeHmSiteIds("[2, 3]")).toEqual([2, 3]);
    expect(normalizeHmSiteIds("3")).toEqual([3]);
    expect(normalizeHmSiteIds(3)).toEqual([3]);
    expect(normalizeHmSiteIds([])).toEqual([]);
    expect(normalizeHmSiteIds(null)).toEqual([]);
  });
});

describe("rssCampaignOwnedByHmSite", () => {
  it("hedef sitede varsa true (çoklu hedef dahil)", () => {
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3], includeYekpareHaber: false }, 3)).toBe(true);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3] }, 3)).toBe(true);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [2, 3] }, 3)).toBe(true);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: "{3}" }, 3)).toBe(true);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3], includeYekpareHaber: true }, 3)).toBe(true);
  });

  it("başka site veya boş hedef false", () => {
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3] }, 2)).toBe(false);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [] }, 3)).toBe(false);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: null }, 3)).toBe(false);
  });
});

describe("parsePositiveInt", () => {
  it("geçerli id ayıklar", () => {
    expect(parsePositiveInt("12")).toBe(12);
    expect(parsePositiveInt(["7"])).toBe(7);
    expect(parsePositiveInt("0")).toBe(null);
    expect(parsePositiveInt("x")).toBe(null);
  });
});

describe("campaignIdFromRequestPath", () => {
  it("params veya path'ten id okur", () => {
    expect(campaignIdFromRequestPath("32", "")).toBe(32);
    expect(campaignIdFromRequestPath(undefined, "/api/hm/editor/rss/campaigns/8")).toBe(8);
    expect(campaignIdFromRequestPath(undefined, "/api/hm/editor/rss/campaigns/8/run")).toBe(8);
    expect(campaignIdFromRequestPath(undefined, "/api/hm/editor/rss/campaigns")).toBe(null);
  });
});

describe("feed host eşleme", () => {
  it("sehirhaberajansi hostunu tanır", () => {
    expect(hostFromMaybeUrl("https://sehirhaberajansi.com.tr/rss.php?kategori=gundem")).toBe(
      "sehirhaberajansi.com.tr",
    );
    expect(collectFeedHosts(["https://sehirhaberajansi.com.tr/rss.php?kategori=gundem"])).toEqual([
      "sehirhaberajansi.com.tr",
    ]);
    expect(
      rssSourceMatchesHosts(
        "https://sehirhaberajansi.com.tr/haber/reha-muhtar",
        ["sehirhaberajansi.com.tr"],
      ),
    ).toBe(true);
  });
});
