import { describe, expect, it } from "vitest";
import {
  buildTepeMansetPoolPreferringLocal,
  keepCategoryItemsOrFallback,
  pickEsenLeadPackColumns,
  preferLocalThenFill,
  resolveHomepageLocalPref,
} from "./hmHomepageSectionFill";

function item(id: number, title: string, categorySlug: string, extra?: Record<string, unknown>) {
  return {
    id,
    title,
    categorySlug,
    createdAt: new Date(Date.now() - id * 3600_000).toISOString(),
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    ...extra,
  };
}

describe("hmHomepageSectionFill", () => {
  it("does not apply Kırşehir pref to ASG/AHG", () => {
    expect(resolveHomepageLocalPref("asg")).toBeNull();
    expect(resolveHomepageLocalPref("ankarahabergundemi")).toBeNull();
    expect(resolveHomepageLocalPref("kirsehirhaber")?.cityKey).toBe("kirsehir");
  });

  it("fills Öne Çıkanlar left column from backfill when unused pool is empty", () => {
    const { left, right } = pickEsenLeadPackColumns({
      pool: [],
      backfillPool: [
        item(1, "AÇI Partisi", "gundem"),
        item(2, "Suna Mengüç", "gundem"),
        item(3, "Yerel haber", "yerel"),
      ],
      leftCount: 6,
      rightCount: 2,
    });
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(left.map((row) => row.id)).not.toContain(right[0]?.id);
  });

  it("fills a full 6+2 Öne Çıkanlar pack from a mixed pool", () => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8].map((id) =>
      item(id, `Haber ${id}`, ["gundem", "dunya", "spor", "ekonomi"][id % 4]!),
    );
    const { left, right } = pickEsenLeadPackColumns({
      pool,
      leftCount: 6,
      rightCount: 2,
    });
    expect(left).toHaveLength(6);
    expect(right).toHaveLength(2);
  });

  it("prefers Kırşehir headlines on tepe manşet then falls back", () => {
    const pref = resolveHomepageLocalPref("kirsehirhaber");
    const pool = buildTepeMansetPoolPreferringLocal({
      items: [
        item(1, "Trump'tan mesaj", "dunya"),
        item(2, "Kırşehir’de karla mücadele", "yerel"),
        item(3, "Mbappé gol attı", "spor"),
      ],
      localPref: pref,
      siteId: 494,
      limit: 3,
    });
    expect(pool[0]?.title).toMatch(/Kırşehir/i);
    expect(pool.length).toBe(3);
  });

  it("keeps category API items when the client filter would empty the page", () => {
    const all = [item(1, "Havuz haberi", "gundem")];
    expect(keepCategoryItemsOrFallback([], all)).toEqual(all);
    expect(keepCategoryItemsOrFallback(all, all)).toEqual(all);
  });

  it("mixes categories for Öne Çıkanlar", () => {
    const pref = null;
    const picked = preferLocalThenFill(
      [item(1, "G1", "gundem"), item(2, "G2", "gundem"), item(3, "D1", "dunya"), item(4, "S1", "spor")],
      pref,
      null,
      3,
    );
    expect(new Set(picked.map((row) => row.categorySlug)).size).toBeGreaterThanOrEqual(2);
  });
});
