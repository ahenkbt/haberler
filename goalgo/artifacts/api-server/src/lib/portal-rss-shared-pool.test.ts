import { describe, expect, it } from "vitest";
import {
  canonicalSharedPoolFeedId,
  expandFeedIdsForSharedPoolQuery,
  resolveRssCampaignSharedPublishTargets,
  rssCampaignSharedFeedConfig,
} from "./portal-rss-shared-pool.js";

describe("portal rss shared pool", () => {
  it("maps site-specific feed ids to one canonical portal-rss id", () => {
    const feed = {
      id: "hm-8-site-pack-ntv-gundem",
      categorySlug: "gundem",
      url: "https://www.ntv.com.tr/son-dakika.rss",
    };
    const canonical = canonicalSharedPoolFeedId(feed);
    expect(canonical.startsWith("portal-rss-gundem-")).toBe(true);
    expect(canonicalSharedPoolFeedId({ ...feed, id: "hm-3-site-pack-ntv-gundem" })).toBe(canonical);
    expect(expandFeedIdsForSharedPoolQuery([feed])).toEqual(
      expect.arrayContaining([feed.id, canonical]),
    );
  });

  it("keeps portal-rss / gmn ids unchanged", () => {
    expect(
      canonicalSharedPoolFeedId({
        id: "portal-rss-gundem-abc",
        categorySlug: "gundem",
        url: "https://example.com/rss",
      }),
    ).toBe("portal-rss-gundem-abc");
  });

  it("publishes campaign items once to the central pool", () => {
    expect(resolveRssCampaignSharedPublishTargets([3, 8, 12])).toEqual([null]);
    expect(resolveRssCampaignSharedPublishTargets([null, 3])).toEqual([null]);
    expect(resolveRssCampaignSharedPublishTargets([])).toEqual([]);
    const cfg = rssCampaignSharedFeedConfig({
      campaignId: 9,
      categorySlug: "ankara",
      feedUrl: "https://www.bizimankara.com.tr/rss/ankara",
    });
    expect(cfg.maxItems).toBe(20);
    expect(cfg.categorySlug).toBe("ankara");
    expect(cfg.id.startsWith("portal-rss-campaign-9-")).toBe(true);
  });
});
