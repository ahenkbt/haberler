import { describe, expect, it } from "vitest";
import {
  buildCenterMansetSliderPool,
  buildTepeMansetPool,
} from "./hmHeadlinePool";

describe("manset pools", () => {
  const featuredOld = {
    id: 1,
    title: "Eski manşet",
    isFeatured: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    imageUrl: "/api/media/uploads/a.webp",
  };
  const latestA = {
    id: 2,
    title: "Yeni haber A",
    isFeatured: false,
    createdAt: "2026-07-15T12:00:00.000Z",
    imageUrl: "/api/media/uploads/b.webp",
  };
  const latestB = {
    id: 3,
    title: "Yeni haber B",
    isFeatured: false,
    createdAt: "2026-07-15T11:00:00.000Z",
    imageUrl: "/api/media/uploads/c.webp",
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

  it("normal manşet en son eklenenleri seçer (featured / RSS hariç)", () => {
    const pool = buildCenterMansetSliderPool({
      manualItems: [featuredOld],
      latestItems: [latestA, latestB, featuredOld, rss],
      limit: 5,
    });
    expect(pool.map((x) => x.id)).toEqual([2, 3]);
    expect(pool.every((x) => x.isFeatured !== true)).toBe(true);
    expect(pool.every((x) => x.source !== "rss")).toBe(true);
  });
});
