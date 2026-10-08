import { describe, expect, it, vi } from "vitest";
import { ensureHmCategoryListingNotEmpty } from "./hm-category-listing-fallback.js";

vi.mock("./hybrid-news-merge.js", () => ({
  loadPortalDbNews: vi.fn(async () => ({
    items: [{ id: "rss:1", title: "Ulusal haber", categorySlug: "gundem" }],
  })),
}));

describe("ensureHmCategoryListingNotEmpty", () => {
  it("Ankara gibi il kategorisinde karışık portal haber doldurmaz", async () => {
    const { loadPortalDbNews } = await import("./hybrid-news-merge.js");
    const out = await ensureHmCategoryListingNotEmpty({
      items: [],
      siteId: 3,
      siteSlug: "asg",
      categorySlug: "ankara",
      limit: 20,
      corporate: false,
    });
    expect(out).toEqual([]);
    expect(loadPortalDbNews).not.toHaveBeenCalled();
  });
});
