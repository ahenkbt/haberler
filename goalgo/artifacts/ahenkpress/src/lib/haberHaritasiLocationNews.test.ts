import { describe, expect, it } from "vitest";
import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import {
  buildNewsmapLocationNewsHeadlines,
  isRssItemTaggedForNewsmapLocation,
  resolveNewsmapLocationHeadlinesFallback,
  resolveNewsmapLocationNewsItems,
  resolveTargetNewsmapLocation,
} from "@/lib/haberHaritasiLocationNews";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { NEWSMAP_MAX_AGE_MS } from "@/lib/haberHaritasiVideos";

function hybridItem(partial: Partial<HomeHybridNewsItem> & Pick<HomeHybridNewsItem, "title">): HomeHybridNewsItem {
  return {
    id: partial.id ?? partial.title,
    href: partial.href ?? `/news/${partial.title}`,
    source: partial.source ?? "rss",
    ...partial,
  };
}

function headline(partial: Partial<HmMapCityHeadline> & Pick<HmMapCityHeadline, "title">): HmMapCityHeadline {
  return {
    city: "Kayseri",
    href: "/test",
    kind: "news",
    ...partial,
  };
}

describe("haberHaritasiLocationNews", () => {
  const ilCenters = [{ adi: "Kayseri", lat: 38.7, lng: 35.5, zoom: 10 }];
  const now = Date.now();
  const freshAt = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const staleAt = new Date(now - NEWSMAP_MAX_AGE_MS - 6 * 60 * 60 * 1000).toISOString();

  it("prefers fresh location matches within 24 hours", () => {
    const items = [
      hybridItem({
        title: "Kayseri trafik",
        publishedAt: freshAt,
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
        feedLabel: "Cumha Kayseri",
      }),
      hybridItem({
        title: "Kayseri eski haber",
        publishedAt: staleAt,
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
        feedLabel: "Cumha Kayseri",
      }),
    ];
    const resolved = resolveNewsmapLocationNewsItems(items, "Kayseri", ilCenters);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.title).toBe("Kayseri trafik");
    expect(resolved[1]?.title).toBe("Kayseri eski haber");
  });

  it("falls back to RSS-tagged provincial feeds when nothing fresh", () => {
    const items = [
      hybridItem({
        title: "Belediye açıklaması",
        publishedAt: staleAt,
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
        feedLabel: "Cumha Kayseri",
      }),
      hybridItem({
        title: "Ankara merkez",
        publishedAt: freshAt,
        regionLabel: "Ankara",
        regionKey: "tr-ankara",
        feedLabel: "Cumha Ankara",
      }),
    ];
    const resolved = resolveNewsmapLocationNewsItems(items, "Kayseri", ilCenters);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.title).toBe("Belediye açıklaması");
  });

  it("detects Cumha provincial RSS tags without city name in title", () => {
    const { targetLoc, locations } = resolveTargetNewsmapLocation("Kayseri", ilCenters);
    expect(
      isRssItemTaggedForNewsmapLocation(
        hybridItem({
          title: "Son gelişme",
          regionLabel: "Kayseri",
          regionKey: "tr-kayseri",
          feedLabel: "Cumha Kayseri",
        }),
        "Kayseri",
        targetLoc,
        locations,
      ),
    ).toBe(true);
  });

  it("sorts older location matches by recency descending", () => {
    const items = [
      hybridItem({
        title: "Eski",
        publishedAt: staleAt,
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
      }),
      hybridItem({
        title: "Daha yeni eski",
        publishedAt: new Date(now - NEWSMAP_MAX_AGE_MS - 60 * 60 * 1000).toISOString(),
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
      }),
    ];
    const resolved = resolveNewsmapLocationNewsItems(items, "Kayseri", ilCenters);
    expect(resolved[0]?.title).toBe("Daha yeni eski");
  });

  it("lists ALL matched location news headlines (not collapsed to one per city)", () => {
    const items = [
      hybridItem({
        id: "kayseri-1",
        title: "Kayseri belediye meclis toplantısı yapıldı",
        href: "/news/kayseri-1",
        publishedAt: freshAt,
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
        feedLabel: "Cumha Kayseri",
      }),
      hybridItem({
        id: "kayseri-2",
        title: "Kayseri spor kulübü yeni sezona hazırlanıyor",
        href: "/news/kayseri-2",
        publishedAt: staleAt,
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
        feedLabel: "Cumha Kayseri",
      }),
      hybridItem({
        id: "kayseri-3",
        title: "Kayseri hava durumu ve yol koşulları raporu",
        href: "/news/kayseri-3",
        publishedAt: staleAt,
        regionLabel: "Kayseri",
        regionKey: "tr-kayseri",
        feedLabel: "Cumha Kayseri",
      }),
    ];
    const headlines = buildNewsmapLocationNewsHeadlines("Kayseri", items, ilCenters);
    expect(headlines).toHaveLength(3);
    expect(headlines[0]?.title).toBe("Kayseri belediye meclis toplantısı yapıldı");
    expect(headlines.every((row) => row.kind === "news")).toBe(true);
  });

  it("applies headline pool fallback with RSS when fresh pool is empty", () => {
    const rows = [
      headline({
        title: "Kayseri belediye",
        publishedAt: staleAt,
        source: "rss",
        regionKey: "tr-kayseri",
        feedLabel: "Cumha Kayseri",
      }),
    ];
    const resolved = resolveNewsmapLocationHeadlinesFallback(rows, "Kayseri");
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.title).toMatch(/belediye/);
  });

  it("does not return unrelated pool items for foreign locations", () => {
    const items = [
      hybridItem({ title: "Menemen belediye başkanı açıklama yaptı", publishedAt: freshAt }),
      hybridItem({ title: "PlayStation 5 fiyatları düştü", publishedAt: freshAt }),
      hybridItem({ title: "Bali'de deprem uyarısı", publishedAt: freshAt, spot: "Endonezya yetkilileri" }),
    ];
    const resolved = resolveNewsmapLocationNewsItems(items, "Bali, Endonezya", []);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.title).toMatch(/Bali/);
  });
});
