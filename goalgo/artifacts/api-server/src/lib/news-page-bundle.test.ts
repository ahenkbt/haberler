import { describe, expect, it } from "vitest";
import {
  wrapArticleAsNewsPageBundle,
  NEWS_PAGE_BUNDLE_BUDGET_MS,
  resolveLocalSiteNewsBySlug,
  isVisibleCentralPoolNewsForHmSite,
} from "./news-page-bundle.js";

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

describe("isVisibleCentralPoolNewsForHmSite", () => {
  it("accepts published central RSS pool news on editor sites", () => {
    expect(
      isVisibleCentralPoolNewsForHmSite(
        {
          siteId: null,
          rssSourceUrl: "https://www.birgun.net/haber/yedekte-parti",
          isEditorManual: false,
          tags: ["rss-auto"],
        },
        3,
      ),
    ).toBe(true);
  });

  it("rejects another site's local row and foreign sync copies", () => {
    expect(
      isVisibleCentralPoolNewsForHmSite(
        { siteId: 7, rssSourceUrl: "https://example.com/a", isEditorManual: true },
        3,
      ),
    ).toBe(false);
    expect(
      isVisibleCentralPoolNewsForHmSite(
        { siteId: null, rssSourceUrl: "yekpare-hm-sync:7:news:12", isEditorManual: false },
        3,
      ),
    ).toBe(false);
  });

  it("honors rss-hm-target tags", () => {
    expect(
      isVisibleCentralPoolNewsForHmSite(
        {
          siteId: null,
          rssSourceUrl: "https://example.com/a",
          tags: ["rss-hm-target:3,8"],
        },
        3,
      ),
    ).toBe(true);
    expect(
      isVisibleCentralPoolNewsForHmSite(
        {
          siteId: null,
          rssSourceUrl: "https://example.com/a",
          tags: ["rss-hm-target:8"],
        },
        3,
      ),
    ).toBe(false);
  });
});
