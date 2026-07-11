import { describe, expect, it } from "vitest";
import {
  createCategoryBoxModuleDedupeTracker,
  ensureNewsBoxSections,
  pickModuleSectionCategoryItems,
} from "./hmCategoryBoxItems";

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
