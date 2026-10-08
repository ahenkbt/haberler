import { describe, expect, it } from "vitest";
import { categorySlugFromCumhaFeed } from "./hm-cumha-kamu-yerel-catalog.js";
import { KAMU_YEREL_SYNDICATE_LOOKBACK_HOURS } from "./hm-kamu-yerel-syndicate.js";

describe("hm-kamu-yerel-syndicate helpers", () => {
  it("maps cumha feed URLs to kamu-yerel category slugs", () => {
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/lokasyon/ankara")).toBe("ankara");
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/category/valilikler")).toBe("valilikler");
    expect(categorySlugFromCumhaFeed("https://cumha.com.tr/rss/category/kamu-kurumlari-ve-ust-kurullar")).toBe(
      "kamu-kurumlari",
    );
  });

  it("uses a bounded lookback window for daily syndication", () => {
    expect(KAMU_YEREL_SYNDICATE_LOOKBACK_HOURS).toBeGreaterThan(12);
    expect(KAMU_YEREL_SYNDICATE_LOOKBACK_HOURS).toBeLessThanOrEqual(72);
  });
});
