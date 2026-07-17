import { describe, expect, it } from "vitest";
import {
  createCategoryBoxModuleDedupeTracker,
  ensureNewsBoxItems,
  ensureNewsBoxSections,
  pickModuleSectionCategoryItems,
} from "./hmCategoryBoxItems";
import { createHomeNewsDedupeTracker, pickHomeModuleNewsItems } from "./hmHeadlinePool";

describe("ensureNewsBoxSections — SPOR guard boş havuz", () => {
  it("resolveSectionPool boş döndüğünde global havuzdan doldurmaz", () => {
    const globalPool = [{ id: 1, title: "Oğuz Murat Aci davası", categorySlug: "gundem" }];
    const sections = ensureNewsBoxSections(
      [{ slug: "spor", title: "Spor", items: [] }],
      globalPool,
      4,
      (_section, pool) => pickModuleSectionCategoryItems(createCategoryBoxModuleDedupeTracker(), pool, 4),
      () => [],
    );
    expect(sections[0]?.items).toEqual([]);
  });
});

describe("vitrin/dosya — hero seed tüm havuzu claim etse bile boş kalmaz", () => {
  const pool = [
    { id: 1, title: "Haber bir", createdAt: "2026-07-16T10:00:00.000Z" },
    { id: 2, title: "Haber iki", createdAt: "2026-07-16T09:00:00.000Z" },
    { id: 3, title: "Haber üç", createdAt: "2026-07-16T08:00:00.000Z" },
    { id: 4, title: "Haber dört", createdAt: "2026-07-16T07:00:00.000Z" },
  ];

  it("ensureNewsBoxItems kullanılmış havuzdan yeniden doldurur", () => {
    const dedupe = createHomeNewsDedupeTracker(pool);
    const items = ensureNewsBoxItems([], pool, 4, dedupe);
    expect(items.length).toBe(4);
    expect(items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it("pickModuleSectionCategoryItems global claim sonrası en az bir haber döner", () => {
    const global = createHomeNewsDedupeTracker(pool);
    const moduleDedupe = createCategoryBoxModuleDedupeTracker();
    const picked = pickModuleSectionCategoryItems(moduleDedupe, pool, 4, global);
    expect(picked.length).toBe(4);
  });

  it("pickHomeModuleNewsItems unused yoksa reuse backfill yapar", () => {
    const tracker = createHomeNewsDedupeTracker(pool);
    const picked = pickHomeModuleNewsItems(tracker, pool, { limit: 3 });
    expect(picked.length).toBe(3);
  });
});
