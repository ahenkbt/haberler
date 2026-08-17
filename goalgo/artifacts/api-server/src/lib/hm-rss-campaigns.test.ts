import { describe, expect, it } from "vitest";
import { parsePositiveInt, rssCampaignOwnedByHmSite } from "./hm-rss-campaigns.js";

describe("rssCampaignOwnedByHmSite", () => {
  it("yalnızca tek hedef site eşleşince true", () => {
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3], includeYekpareHaber: false }, 3)).toBe(true);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3] }, 3)).toBe(true);
  });

  it("başka site, çoklu hedef veya Yekpare işaretliyse false", () => {
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3] }, 2)).toBe(false);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [2, 3] }, 3)).toBe(false);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [3], includeYekpareHaber: true }, 3)).toBe(false);
    expect(rssCampaignOwnedByHmSite({ hmSiteIds: [] }, 3)).toBe(false);
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
