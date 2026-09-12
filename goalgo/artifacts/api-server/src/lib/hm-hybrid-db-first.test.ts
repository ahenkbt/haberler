import { describe, expect, it } from "vitest";
import { resolveHybridDbFirstFlag, shouldDefaultHybridCategoryDbFirst } from "./hm-hybrid-db-first.js";

describe("shouldDefaultHybridCategoryDbFirst", () => {
  it("HM kategori vitrininde DB-first varsayılanı açar", () => {
    expect(
      shouldDefaultHybridCategoryDbFirst({
        siteId: 3,
        categorySlug: "yerel",
        rssScope: "all",
      }),
    ).toBe(true);
  });

  it("newsmap / kutu RSS / rssOnly için açmaz", () => {
    expect(
      shouldDefaultHybridCategoryDbFirst({
        siteId: 3,
        categorySlug: "gundem",
        newsmapMode: true,
      }),
    ).toBe(false);
    expect(
      shouldDefaultHybridCategoryDbFirst({
        siteId: 3,
        categorySlug: "gundem",
        rssScope: "box",
      }),
    ).toBe(false);
    expect(
      shouldDefaultHybridCategoryDbFirst({
        siteId: 3,
        categorySlug: "gundem",
        rssOnly: true,
      }),
    ).toBe(false);
  });
});

describe("resolveHybridDbFirstFlag", () => {
  it("kategori isteğinde varsayılan dbFirst; 0 ile kapatılır", () => {
    expect(
      resolveHybridDbFirstFlag({
        siteId: 8,
        categorySlug: "dunya",
        rssScope: "all",
      }),
    ).toBe(true);
    expect(
      resolveHybridDbFirstFlag({
        dbFirstQuery: "0",
        siteId: 8,
        categorySlug: "dunya",
        rssScope: "all",
      }),
    ).toBe(false);
    expect(
      resolveHybridDbFirstFlag({
        dbFirstQuery: "1",
        siteId: 3,
        rssScope: "all",
      }),
    ).toBe(true);
  });
});
