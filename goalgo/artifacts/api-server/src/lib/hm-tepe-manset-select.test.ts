import { describe, expect, it } from "vitest";
import {
  hasTepeMansetCover,
  isMissingNewsCoverImage,
  isTepeMansetManualEligible,
  rotateTepeMansetByDay,
  selectTepeMansetItems,
  tepeMansetImportanceScore,
} from "./hm-tepe-manset-select.js";

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

describe("tepe manset cover + manual eligibility", () => {
  it("treats empty, data URI and placeholder paths as missing", () => {
    expect(isMissingNewsCoverImage("")).toBe(true);
    expect(isMissingNewsCoverImage(null)).toBe(true);
    expect(isMissingNewsCoverImage("data:image/svg+xml,foo")).toBe(true);
    expect(isMissingNewsCoverImage("/hm/haber-gorsel-hazirlaniyor.svg")).toBe(true);
    expect(isMissingNewsCoverImage("https://cdn.example.com/a.jpg")).toBe(false);
  });

  it("excludes resimsiz manuel from tepe manşet", () => {
    expect(
      isTepeMansetManualEligible({
        id: 1,
        isEditorManual: true,
        isFeatured: true,
        imageUrl: "",
      }),
    ).toBe(false);
    expect(
      isTepeMansetManualEligible({
        id: 2,
        isEditorManual: true,
        isFeatured: true,
        imageUrl: "/api/media/uploads/a.webp",
      }),
    ).toBe(true);
    expect(hasTepeMansetCover({ imageUrl: "data:image/svg+xml,x" })).toBe(false);
  });
});

describe("selectTepeMansetItems", () => {
  const featuredManual = {
    id: 1,
    title: "Editör manşet",
    isEditorManual: true,
    isFeatured: true,
    createdAt: hoursAgoIso(20),
    imageUrl: "/api/media/uploads/a.webp",
    views: 10,
  };
  const latestAuto = {
    id: 2,
    title: "Otomatik taze",
    isEditorManual: false,
    isFeatured: false,
    isBreaking: true,
    createdAt: hoursAgoIso(1),
    imageUrl: "https://cdn.example.com/b.jpg",
    views: 80,
    rssSourceUrl: "https://example.com/haber/2",
  };
  const popularAuto = {
    id: 3,
    title: "Popüler",
    isEditorManual: false,
    isBreaking: false,
    createdAt: hoursAgoIso(5),
    imageUrl: "https://cdn.example.com/c.jpg",
    views: 400,
    rssSourceUrl: "https://example.com/haber/3",
  };
  const manualNoImage = {
    id: 4,
    title: "Resimsiz manuel",
    isEditorManual: true,
    isFeatured: true,
    createdAt: hoursAgoIso(2),
    imageUrl: "",
  };
  const rssFeaturedLeak = {
    id: 9,
    title: "RSS featured kaçak",
    isFeatured: true,
    rssSourceUrl: "https://example.com/feed.rss",
    createdAt: hoursAgoIso(1),
    imageUrl: "https://example.com/r2.jpg",
  };

  it("uses only featured manuals when they have covers (manual-first)", () => {
    const pool = selectTepeMansetItems([featuredManual, latestAuto, popularAuto], 5);
    expect(pool[0]?.id).toBe(1);
    expect(pool.some((x) => x.id === 4)).toBe(false);
  });

  it("never includes resimsiz manuel; fills remaining slots by importance", () => {
    const pool = selectTepeMansetItems([manualNoImage, latestAuto, popularAuto], 5);
    expect(pool.map((x) => x.id)).not.toContain(4);
    expect(pool.map((x) => x.id)).toEqual(expect.arrayContaining([2, 3]));
  });

  it("falls back to importance when no eligible manuals exist", () => {
    const pool = selectTepeMansetItems([latestAuto, popularAuto, rssFeaturedLeak], 2);
    expect(pool.length).toBe(2);
    expect(tepeMansetImportanceScore(popularAuto)).toBeGreaterThan(0);
    expect(pool.every((x) => hasTepeMansetCover(x))).toBe(true);
  });

  it("keeps manuals and mixes auto slots", () => {
    const pool = selectTepeMansetItems([featuredManual, latestAuto, popularAuto], 3);
    expect(pool[0]?.id).toBe(1);
    expect(pool.length).toBe(3);
    expect(pool.slice(1).every((x) => x.id !== 1)).toBe(true);
  });

  it("daily rotation is deterministic for the same day key", () => {
    const items = [latestAuto, popularAuto, { ...popularAuto, id: 8, title: "Üçüncü", views: 120 }];
    const a = rotateTepeMansetByDay(items, "2026-09-12:auto", 2);
    const b = rotateTepeMansetByDay(items, "2026-09-12:auto", 2);
    expect(a).toEqual(b);
    expect(a.length).toBe(2);
  });
});
