import { describe, expect, it } from "vitest";
import {
  centralNewsRowBelongsToCorporateSite,
  centralNewsRowVisibleOnHmEditorSite,
  centralNewsRefOriginSiteId,
  filterCorporatePublicCategoryRows,
  filterCorporatePublicNewsItems,
  filterNonCorporateOriginCentralNewsItems,
  filterVkdPublicCategoryRows,
  isCorporateOriginCentralNewsRef,
  isCorporateSiteLocalNewsRow,
  isExternalManualEditorNewsForSite,
  isVkdHmSiteSlug,
  isVkdOnlyGlobalCategorySlug,
  isYekparePoolOrSyncRef,
  resolveCorporateRepairCategorySlug,
  VKD_DEFAULT_SITE_CATEGORIES,
  VKD_PUBLIC_NEWS_CATEGORY_SLUGS,
} from "./hm-corporate-news-policy.js";

describe("hm-corporate-news-policy", () => {
  it("detects VKD site slugs", () => {
    expect(isVkdHmSiteSlug("vkd")).toBe(true);
    expect(isVkdHmSiteSlug("vatankahramanlari")).toBe(true);
    expect(isVkdHmSiteSlug("ankarasehirgazetesi")).toBe(false);
  });

  it("flags yekpare pool/sync refs", () => {
    expect(isYekparePoolOrSyncRef("yekpare-hm-pool:3:9001")).toBe(true);
    expect(isYekparePoolOrSyncRef("yekpare-hm-sync:7:news:12")).toBe(true);
    expect(isYekparePoolOrSyncRef("wp-wxr:vatankahramanlari.org:1")).toBe(false);
  });

  it("keeps only site-local rows for corporate", () => {
    expect(isCorporateSiteLocalNewsRow({ siteId: 5, rssSourceUrl: null })).toBe(true);
    expect(isCorporateSiteLocalNewsRow({ siteId: null, rssSourceUrl: null })).toBe(false);
    expect(isCorporateSiteLocalNewsRow({ siteId: 5, rssSourceUrl: "yekpare-hm-pool:1:2" })).toBe(false);
    expect(isCorporateSiteLocalNewsRow({ source: "rss", rssSourceUrl: "https://example.com/feed" })).toBe(true);
  });

  it("filters VKD public news to allowed categories", () => {
    const items = [
      { id: 1, siteId: 5, categorySlug: "dernegimiz", rssSourceUrl: null },
      { id: 2, siteId: 5, categorySlug: "gundem", rssSourceUrl: null },
      { id: 3, siteId: null, categorySlug: "dernegimiz", rssSourceUrl: null },
      { id: 4, siteId: 5, categorySlug: "faaliyetlerimiz", rssSourceUrl: "yekpare-hm-pool:1:9" },
    ];
    const out = filterCorporatePublicNewsItems(items, { siteSlug: "vkd" });
    expect(out.map((x) => x.id)).toEqual([1]);
  });

  it("filters VKD category rows", () => {
    const rows = [
      { slug: "dernegimiz" },
      { slug: "gundem" },
      { slug: "sehit-gazi" },
      { slug: "hava" },
    ];
    expect(filterVkdPublicCategoryRows(rows, "vkd").map((r) => r.slug)).toEqual([
      "dernegimiz",
      "sehit-gazi",
    ]);
    expect(VKD_PUBLIC_NEWS_CATEGORY_SLUGS).toContain("faaliyetlerimiz");
  });

  it("maps belgeler repair hint to dernegimiz on VKD", () => {
    expect(
      resolveCorporateRepairCategorySlug({
        siteSlug: "vatankahramanlari",
        articleSlug: "belgeler",
        portalCategorySlug: "global",
      }),
    ).toBe("dernegimiz");
  });

  it("marks sehit-gazi as VKD-only global slug", () => {
    expect(isVkdOnlyGlobalCategorySlug("sehit-gazi")).toBe(true);
    expect(isVkdOnlyGlobalCategorySlug("dernegimiz")).toBe(false);
  });

  it("defines VKD default editor categories including sehit-gazi", () => {
    const slugs = VKD_DEFAULT_SITE_CATEGORIES.map((c) => c.slug);
    expect(slugs).toEqual(["dernegimiz", "faaliyetlerimiz", "sehit-gazi"]);
    expect(VKD_PUBLIC_NEWS_CATEGORY_SLUGS).toContain("sehit-gazi");
  });

  it("corporate categories are site-exclusive only", () => {
    const rows = [
      { slug: "dernegimiz", exclusiveSiteId: 5 },
      { slug: "gundem", exclusiveSiteId: null },
      { slug: "sehit-gazi", exclusiveSiteId: null },
      { slug: "sehit-gazi", exclusiveSiteId: 5 },
      { slug: "faaliyetlerimiz", exclusiveSiteId: 5 },
    ];
    expect(filterCorporatePublicCategoryRows(rows, 5, "vkd").map((r) => r.slug)).toEqual([
      "dernegimiz",
      "sehit-gazi",
      "faaliyetlerimiz",
    ]);
  });

  it("rejects foreign makale sync on other HM editor sites", () => {
    expect(
      centralNewsRowVisibleOnHmEditorSite(
        {
          siteId: null,
          rssSourceUrl: "yekpare-hm-sync:3:makale:9",
          authorId: 42,
          categorySlug: "blog",
        },
        7,
      ),
    ).toBe(false);
    expect(
      centralNewsRowVisibleOnHmEditorSite(
        {
          siteId: null,
          rssSourceUrl: "yekpare-hm-sync:3:makale:9",
          authorId: 42,
          categorySlug: "blog",
        },
        3,
      ),
    ).toBe(true);
    expect(
      centralNewsRowVisibleOnHmEditorSite(
        {
          siteId: null,
          rssSourceUrl: "yekpare-hm-sync:3:news:12",
          authorId: 42,
          categorySlug: "blog",
        },
        7,
      ),
    ).toBe(false);
    expect(
      centralNewsRowVisibleOnHmEditorSite(
        {
          siteId: null,
          rssSourceUrl: "yekpare-hm-sync:3:news:12",
          categorySlug: "gundem",
        },
        7,
      ),
    ).toBe(true);
  });

  it("rejects global central rows on corporate sites", () => {
    expect(
      centralNewsRowBelongsToCorporateSite(
        { siteId: null, categorySlug: "global", rssSourceUrl: null },
        7,
      ),
    ).toBe(false);
    expect(
      centralNewsRowBelongsToCorporateSite(
        {
          siteId: null,
          categorySlug: "dernegimiz",
          rssSourceUrl: "yekpare-hm-sync:7:news:42",
        },
        7,
      ),
    ).toBe(true);
  });

  it("detects corporate origin from sync/pool refs", () => {
    expect(centralNewsRefOriginSiteId("yekpare-hm-sync:5:news:10")).toBe(5);
    expect(centralNewsRefOriginSiteId("yekpare-hm-pool:5:99")).toBe(5);
    expect(centralNewsRefOriginSiteId("https://example.com/haber")).toBeNull();

    const corporateIds = new Set([5, 9]);
    expect(isCorporateOriginCentralNewsRef("yekpare-hm-sync:5:news:10", corporateIds)).toBe(true);
    expect(isCorporateOriginCentralNewsRef("yekpare-hm-sync:3:news:10", corporateIds)).toBe(false);

    const items = [
      { id: 1, rssSourceUrl: "yekpare-hm-sync:5:news:1" },
      { id: 2, rssSourceUrl: "yekpare-hm-sync:3:news:2" },
      { id: 3, rssSourceUrl: "https://rss.example/item" },
    ];
    expect(filterNonCorporateOriginCentralNewsItems(items, corporateIds).map((x) => x.id)).toEqual([2, 3]);
  });

  it("flags external manual editor news by sync/pool origin site", () => {
    expect(
      isExternalManualEditorNewsForSite(
        { siteId: null, rssSourceUrl: "yekpare-hm-sync:3:news:12", isEditorManual: true },
        7,
      ),
    ).toBe(true);
    expect(
      isExternalManualEditorNewsForSite(
        { siteId: null, rssSourceUrl: "yekpare-hm-sync:7:news:12", isEditorManual: true },
        7,
      ),
    ).toBe(false);
    expect(
      isExternalManualEditorNewsForSite(
        { siteId: 7, rssSourceUrl: null, isEditorManual: true },
        7,
      ),
    ).toBe(false);
    expect(
      isExternalManualEditorNewsForSite(
        { siteId: null, rssSourceUrl: "yekpare-hm-pool:3:9001", isEditorManual: true },
        7,
      ),
    ).toBe(true);
    expect(
      isExternalManualEditorNewsForSite(
        { siteId: null, rssSourceUrl: "yekpare-hm-sync:3:makale:9", isEditorManual: true },
        7,
      ),
    ).toBe(false);
  });
});
