import { describe, expect, it } from "vitest";
import { wrapArticleAsNewsPageBundle, NEWS_PAGE_BUNDLE_BUDGET_MS, resolveLocalSiteNewsBySlug } from "./news-page-bundle.js";

describe("wrapArticleAsNewsPageBundle", () => {
  it("returns a HaberDetay-compatible shell when extras fail", () => {
    const article = { id: 1, slug: "ankabir", title: "Ankabir" } as never;
    const bundle = wrapArticleAsNewsPageBundle(article);
    expect(bundle.article).toBe(article);
    expect(bundle.related).toEqual([]);
    expect(bundle.kose).toBeNull();
    expect(bundle.sidebar).toEqual({ authors: [], popular: [] });
  });

  it("caps page-bundle extras so a hung related query cannot block the article", () => {
    expect(NEWS_PAGE_BUNDLE_BUDGET_MS).toBe(5_000);
  });
});

describe("resolveLocalSiteNewsBySlug", () => {
  it("skips numeric ids so 15-temmuz parseInt regressi olmasın", async () => {
    expect(await resolveLocalSiteNewsBySlug("166538", 3)).toBeNull();
    expect(await resolveLocalSiteNewsBySlug("", 3)).toBeNull();
  });
});
