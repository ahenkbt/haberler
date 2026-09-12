import { describe, expect, it } from "vitest";
import {
  categorySlugFromShaFeed,
  isShaCampaign,
  isShaHost,
  SHA_RSS_FEEDS,
  SHA_TARGET_SITE_SLUGS,
  shaFeedUrls,
  shaKategoriFromFeedUrl,
} from "./hm-sha-rss-feeds.js";

describe("SHA RSS feed eşlemesi", () => {
  it("10 SHA feed’ini ve ASG+AHG hedeflerini tanımlar", () => {
    expect(SHA_RSS_FEEDS).toHaveLength(10);
    expect(shaFeedUrls().every((u) => u.includes("sehirhaberajansi.com.tr"))).toBe(true);
    expect(SHA_TARGET_SITE_SLUGS).toEqual(["asg", "ankarahabergundemi"]);
  });

  it("kategori query → site slug (yerel=ankara, siyaset=politika)", () => {
    expect(categorySlugFromShaFeed("https://sehirhaberajansi.com.tr/rss.php")).toBe("gundem");
    expect(categorySlugFromShaFeed("https://sehirhaberajansi.com.tr/rss.php?kategori=gundem")).toBe("gundem");
    expect(categorySlugFromShaFeed("https://sehirhaberajansi.com.tr/rss.php?kategori=yerel")).toBe("ankara");
    expect(categorySlugFromShaFeed("https://sehirhaberajansi.com.tr/rss.php?kategori=siyaset")).toBe("politika");
    expect(categorySlugFromShaFeed("https://sehirhaberajansi.com.tr/rss.php?kategori=kultur-sanat")).toBe(
      "kultur-sanat",
    );
    expect(categorySlugFromShaFeed("https://www.ntv.com.tr/gundem.rss")).toBeNull();
  });

  it("SHA host ve kampanya tanıma", () => {
    expect(isShaHost("https://sehirhaberajansi.com.tr/rss.php?kategori=gundem")).toBe(true);
    expect(shaKategoriFromFeedUrl("https://sehirhaberajansi.com.tr/rss.php?kategori=spor")).toBe("spor");
    expect(isShaCampaign({ tags: ["sehirhaberajansi"], feeds: [] })).toBe(true);
    expect(
      isShaCampaign({
        tags: [],
        feeds: ["https://sehirhaberajansi.com.tr/rss.php?kategori=ekonomi"],
      }),
    ).toBe(true);
    expect(isShaCampaign({ tags: ["ntv"], feeds: ["https://www.ntv.com.tr/gundem.rss"] })).toBe(false);
  });
});
