import { describe, expect, it } from "vitest";
import { resolveHomepageLocalPref } from "./hm-homepage-local-pref.js";
import { keepCategoryItemsOrFallback } from "./hm-category-listing-fallback.js";
import {
  fillCoveredPreferringLocal,
  pickDiversifiedByCategory,
  pickLeadPackColumns,
  preferLocalThenFill,
} from "./hm-homepage-section-fill.js";

function item(
  id: number,
  title: string,
  categorySlug: string,
  hoursAgo = 1,
): {
  id: number;
  title: string;
  categorySlug: string;
  createdAt: string;
  imageUrl: string;
} {
  return {
    id,
    title,
    categorySlug,
    createdAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    imageUrl: `/img/${id}.jpg`,
  };
}

describe("homepage section fill", () => {
  it("round-robins categories instead of filling from one slug", () => {
    const pool = [
      item(1, "Gündem 1", "gundem", 1),
      item(2, "Gündem 2", "gundem", 2),
      item(3, "Dünya 1", "dunya", 3),
      item(4, "Spor 1", "spor", 4),
      item(5, "Ekonomi 1", "ekonomi", 5),
    ];
    const picked = pickDiversifiedByCategory(pool, 4);
    const cats = picked.map((row) => row.categorySlug);
    expect(new Set(cats).size).toBeGreaterThanOrEqual(3);
    expect(cats).toContain("gundem");
    expect(cats).toContain("dunya");
  });

  it("puts Kırşehir items first then fills remaining slots", () => {
    const pref = resolveHomepageLocalPref("kirsehirhaber");
    const pool = [
      item(1, "Trump'tan mesaj", "dunya", 1),
      item(2, "Mbappé gol attı", "spor", 2),
      item(3, "Kırşehir’de karla mücadele", "yerel", 8),
      item(4, "Ekonomi paketi", "ekonomi", 3),
    ];
    const picked = preferLocalThenFill(pool, pref, 494, 3);
    expect(picked[0]?.id).toBe(3);
    expect(picked.length).toBe(3);
  });

  it("never leaves the left Öne Çıkanlar column empty when any news exists", () => {
    const { left, right } = pickLeadPackColumns({
      pool: [],
      backfillPool: [item(10, "Dünya haberi", "dunya"), item(11, "Spor haberi", "spor")],
      leftCount: 6,
      rightCount: 2,
      hasCover: (row) => Boolean(row.imageUrl),
    });
    expect(left.length).toBeGreaterThan(0);
    expect(left.length + right.length).toBe(2);
    expect(left.some((row) => row.id === right[0]?.id)).toBe(false);
  });

  it("fills a full 6+2 Öne Çıkanlar pack from a mixed pool", () => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8].map((id) =>
      item(id, `Haber ${id}`, ["gundem", "dunya", "spor", "ekonomi"][id % 4]!),
    );
    const { left, right } = pickLeadPackColumns({
      pool,
      leftCount: 6,
      rightCount: 2,
      hasCover: (row) => Boolean(row.imageUrl),
    });
    expect(left).toHaveLength(6);
    expect(right).toHaveLength(2);
  });

  it("photo slots keep covered local first and never dump coverless rows", () => {
    const pref = resolveHomepageLocalPref("kirsehirhaber");
    const pool = [
      { ...item(1, "Kapaksız Kırşehir", "yerel"), imageUrl: "" },
      item(2, "Kapaklı ulusal", "dunya"),
      { ...item(3, "Kapaklı Kırşehir", "yerel"), imageUrl: "/img/3.jpg" },
    ];
    const picked = fillCoveredPreferringLocal(pool, pref, 494, 3, (row) => Boolean(row.imageUrl));
    expect(picked.map((row) => row.id)).toEqual([3, 2]);
  });

  it("keeps API category rows when a client-side slug filter would empty the page", () => {
    const all = [item(1, "Havuz haberi", "gundem")];
    expect(keepCategoryItemsOrFallback([], all)).toEqual(all);
    expect(keepCategoryItemsOrFallback(all, all)).toEqual(all);
  });
});
