import { describe, expect, it } from "vitest";
import {
  buildCenterMansetSliderPool,
  buildRssAwareHeadlinePool,
  buildTepeMansetPool,
} from "./hmHeadlinePool";
import { mergeHybridBootstrapPreserveRss } from "@/hooks/useHmHomeHybridBootstrap";
import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";

describe("manset pools", () => {
  const featuredOld = {
    id: 1,
    title: "Eski manşet",
    isFeatured: true,
    isSiteManset: false,
    createdAt: "2026-06-01T10:00:00.000Z",
    imageUrl: "/api/media/uploads/a.webp",
  };
  const latestA = {
    id: 2,
    title: "Yeni haber A",
    isFeatured: false,
    isSiteManset: false,
    createdAt: "2026-07-15T12:00:00.000Z",
    imageUrl: "/api/media/uploads/b.webp",
  };
  const latestB = {
    id: 3,
    title: "Yeni haber B",
    isFeatured: false,
    isSiteManset: false,
    createdAt: "2026-07-15T11:00:00.000Z",
    imageUrl: "/api/media/uploads/c.webp",
  };
  const siteMansetPinned = {
    id: 4,
    title: "Site manşet sabit",
    isFeatured: false,
    isSiteManset: true,
    createdAt: "2026-07-10T09:00:00.000Z",
    imageUrl: "/api/media/uploads/d.webp",
  };
  const rss = {
    id: "rss:1",
    title: "RSS eski",
    source: "rss",
    createdAt: "2026-07-15T13:00:00.000Z",
    imageUrl: "https://example.com/r.jpg",
  };

  it("tepe manşet yalnızca isFeatured", () => {
    const pool = buildTepeMansetPool({
      items: [featuredOld, latestA, latestB, rss],
      limit: 5,
    });
    expect(pool.map((x) => x.id)).toEqual([1]);
  });

  it("tepe manşet harici RSS kaynaklı isFeatured haberleri eler", () => {
    const featuredRss = {
      id: 9,
      title: "RSS manşet kaçak",
      isFeatured: true,
      rssSourceUrl: "https://example.com/feed.rss",
      createdAt: "2026-07-15T14:00:00.000Z",
      imageUrl: "https://example.com/r2.jpg",
    };
    const pool = buildTepeMansetPool({
      items: [featuredOld, featuredRss, rss],
      limit: 5,
    });
    expect(pool.map((x) => x.id)).toEqual([1]);
  });

  it("site manşet seçilmemişse son haberleri seçer (RSS hariç; isFeatured aday kalır)", () => {
    const pool = buildCenterMansetSliderPool({
      manualItems: [featuredOld],
      latestItems: [latestA, latestB, featuredOld, rss],
      limit: 5,
    });
    expect(pool.map((x) => x.id)).toEqual([2, 3, 1]);
    expect(pool.every((x) => x.source !== "rss")).toBe(true);
    expect(pool.some((x) => x.isFeatured === true)).toBe(true);
  });

  it("site manşet işaretliyse yalnızca onları gösterir", () => {
    const pool = buildCenterMansetSliderPool({
      manualItems: [siteMansetPinned],
      latestItems: [latestA, latestB, featuredOld, siteMansetPinned, rss],
      limit: 5,
    });
    expect(pool.map((x) => x.id)).toEqual([4]);
    expect(pool.every((x) => x.isSiteManset === true)).toBe(true);
  });

  it("hibrit manşet bootstrap hazırken tarihsiz RSS havuzda kalır", () => {
    const manual = {
      id: 10,
      title: "Editör haber",
      createdAt: "2026-07-28T08:00:00.000Z",
      imageUrl: "/a.webp",
    };
    const rssNoDate = {
      id: "rss:99",
      title: "RSS tarihsiz",
      source: "rss",
      imageUrl: "https://example.com/r.jpg",
    };
    const pool = buildRssAwareHeadlinePool({
      manualItems: [manual],
      latestItems: [manual, rssNoDate],
      rssEnabled: true,
      rssBootstrapReady: true,
      limit: 5,
      minManual: 1,
    });
    expect(pool.some((x) => x.id === "rss:99")).toBe(true);
  });
});

describe("mergeHybridBootstrapPreserveRss", () => {
  const rssA: HomeHybridNewsItem = {
    id: "rss:1",
    title: "RSS A",
    source: "rss",
    publishedAt: "2026-07-28T08:00:00.000Z",
    href: "/haberler/rss/rss-a",
  };
  const rssB: HomeHybridNewsItem = {
    id: "rss:2",
    title: "RSS B",
    source: "rss",
    publishedAt: "2026-07-28T07:00:00.000Z",
    href: "/haberler/rss/rss-b",
  };
  const dbItem: HomeHybridNewsItem = {
    id: "db:1",
    title: "DB haber",
    source: "db",
    publishedAt: "2026-07-28T09:00:00.000Z",
    href: "/haber/db-1",
  };

  it("dbFirst yenilemesi RSS düşürürse önceki RSS korunur", () => {
    const merged = mergeHybridBootstrapPreserveRss([dbItem], [rssA, rssB]);
    expect(merged.some((x) => x.id === "rss:1")).toBe(true);
    expect(merged.some((x) => x.id === "rss:2")).toBe(true);
    expect(merged.some((x) => x.id === "db:1")).toBe(true);
  });
});
