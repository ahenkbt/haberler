import { describe, expect, it } from "vitest";
import { buildKamuYerelLayoutJson, TURKATAHABER_SITE, YERELNET_SITE } from "./hm-kamu-yerel-sites.js";
import { HM_RSS_SOURCE_PACKS_ALL_OFF } from "./hm-rss-source-packs.js";

describe("hm-kamu-yerel-sites", () => {
  it("layout uses cumha RSS only — karma paketleri kapalı", () => {
    const layout = buildKamuYerelLayoutJson(TURKATAHABER_SITE);
    expect(layout.mansetCategorySlug).toBe("yerel");
    expect(layout.hmRssSourcePacks).toEqual(HM_RSS_SOURCE_PACKS_ALL_OFF);
    const rows = layout.hmNewsSiteRssFeedRows as Array<{ url: string }>;
    expect(rows.length).toBeGreaterThan(90);
    expect(rows.every((r) => !String(r.url).includes("ntv.com.tr/gundem"))).toBe(true);
  });

  it("yerel.net.tr shares kamu-yerel taxonomy", () => {
    const layout = buildKamuYerelLayoutJson(YERELNET_SITE);
    expect(layout.hmVitrinTheme).toBe("esen");
    expect(Array.isArray(layout.hmCorporateMenuItems)).toBe(true);
  });
});
