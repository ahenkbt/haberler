import { describe, expect, it } from "vitest";
import type { PortalRssItem } from "./portal-rss-fetch.js";
import {
  allocateRssImportDailyBudget,
  capRssItemsPerFeed,
  dedupeCategoryRssBatchItems,
  groupPortalRssItemsByCategory,
  PORTAL_RSS_NEWS_IMPORT_DAILY_BUDGET,
  PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY,
  PORTAL_RSS_NEWS_IMPORT_PER_FEED,
} from "./portal-rss-import-select.js";
import { rssTitlesAreNearDuplicate, normalizeRssSourceUrl } from "./rssImportDedupeCore.js";

function item(partial: Partial<PortalRssItem> & Pick<PortalRssItem, "id" | "title" | "link">): PortalRssItem {
  return {
    spot: "",
    imageUrl: null,
    publishedAt: "2026-09-12T08:00:00.000Z",
    titleKey: partial.title.toLocaleLowerCase("tr-TR"),
    feedId: "feed-a",
    categorySlug: "gundem",
    ...partial,
  };
}

describe("portal RSS import select", () => {
  it("besleme ve kategori tavanları günlük ~100 hedefine uyar", () => {
    expect(PORTAL_RSS_NEWS_IMPORT_PER_FEED).toBe(10);
    expect(PORTAL_RSS_NEWS_IMPORT_PER_CATEGORY).toBe(10);
    expect(PORTAL_RSS_NEWS_IMPORT_DAILY_BUDGET).toBe(100);
  });

  it("besleme başına en fazla 10 öğe alır", () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      item({
        id: `a-${i}`,
        title: `Haber ${i}`,
        link: `https://kaynak.example/haber-${i}`,
        feedId: "ntv-gundem",
        publishedAt: new Date(Date.UTC(2026, 8, 12, 10, i)).toISOString(),
      }),
    );
    const capped = capRssItemsPerFeed(items, 10);
    expect(capped).toHaveLength(10);
    expect(capped[0]?.title).toBe("Haber 14");
  });

  it("farklı kaynakta aynı URL veya yakın başlığı tekilleştirir", () => {
    const items = [
      item({
        id: "1",
        title: "Bakanlık yeni vergi düzenlemesi açıkladı",
        link: "https://www.ntv.com.tr/ekonomi/vergi?utm_source=rss",
        feedId: "ntv",
        categorySlug: "ekonomi",
        publishedAt: "2026-09-12T09:00:00.000Z",
      }),
      item({
        id: "2",
        title: "Bakanlık yeni vergi düzenlemesi açıkladı",
        link: "https://ntv.com.tr/ekonomi/vergi",
        feedId: "dirilis",
        categorySlug: "gundem",
        publishedAt: "2026-09-12T08:00:00.000Z",
      }),
      item({
        id: "3",
        title: "Bakanlık yeni vergi düzenlemesi açıkladı resmen",
        link: "https://www.birgun.net/haber/vergi-2",
        feedId: "birgun",
        categorySlug: "ekonomi",
        publishedAt: "2026-09-12T07:00:00.000Z",
      }),
      item({
        id: "4",
        title: "TFF derbi hakemini açıkladı",
        link: "https://www.ntv.com.tr/spor/derbi",
        feedId: "ntv-spor",
        categorySlug: "spor",
        publishedAt: "2026-09-12T06:00:00.000Z",
      }),
    ];
    const deduped = dedupeCategoryRssBatchItems(items);
    expect(deduped).toHaveLength(2);
    expect(deduped.map((row) => row.id).sort()).toEqual(["1", "4"]);
  });

  it("günlük kotayı kategoriler arasında round-robin böler", () => {
    const byCategory = groupPortalRssItemsByCategory([
      item({ id: "g1", title: "Gündem 1", link: "https://a.example/g1", categorySlug: "gundem" }),
      item({ id: "g2", title: "Gündem 2", link: "https://a.example/g2", categorySlug: "gundem" }),
      item({ id: "s1", title: "Spor 1", link: "https://a.example/s1", categorySlug: "spor" }),
      item({ id: "s2", title: "Spor 2", link: "https://a.example/s2", categorySlug: "spor" }),
      item({ id: "e1", title: "Ekonomi 1", link: "https://a.example/e1", categorySlug: "ekonomi" }),
    ]);
    const allocated = allocateRssImportDailyBudget(byCategory, 3, 10);
    expect([...allocated.keys()].sort()).toEqual(["ekonomi", "gundem", "spor"]);
    expect([...allocated.values()].reduce((n, rows) => n + rows.length, 0)).toBe(3);
    expect(allocated.get("gundem")).toHaveLength(1);
    expect(allocated.get("spor")).toHaveLength(1);
    expect(allocated.get("ekonomi")).toHaveLength(1);
  });

  it("URL iz parametrelerini düşürür ve yakın başlığı tanır", () => {
    expect(normalizeRssSourceUrl("https://WWW.Example.com/haber/?utm_source=rss&fbclid=1")).toBe(
      "https://example.com/haber",
    );
    expect(
      rssTitlesAreNearDuplicate(
        "Merkez Bankası faiz kararını açıkladı",
        "Merkez Bankasi faiz kararini acikladi",
      ),
    ).toBe(true);
    expect(
      rssTitlesAreNearDuplicate(
        "Merkez Bankası faiz kararını açıkladı",
        "Merkez Bankası faiz kararını açıkladı bugün",
      ),
    ).toBe(true);
    expect(rssTitlesAreNearDuplicate("Borsa güne yükselişle başladı", "Derbi hakemi açıklandı")).toBe(
      false,
    );
  });
});
