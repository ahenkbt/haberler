import { describe, expect, it } from "vitest";
import { hasKoseAuthorId, isKoseArticle, parseHmSyncSourceKind, buildKoseArticlePublicPath, resolveArticlePublicPath } from "./kose-article.js";

describe("kose-article", () => {
  it("parses hm sync source kind", () => {
    expect(parseHmSyncSourceKind("yekpare-hm-sync:1:makale:42")).toBe("makale");
    expect(parseHmSyncSourceKind("yekpare-hm-sync:1:news:7")).toBe("news");
    expect(parseHmSyncSourceKind("other")).toBeNull();
  });

  it("detects köşe articles", () => {
    expect(isKoseArticle({ contentKind: "makale" })).toBe(true);
    expect(isKoseArticle({ categorySlug: "kose" })).toBe(true);
    expect(isKoseArticle({ categorySlug: "gundem" })).toBe(false);
    expect(isKoseArticle({ rssSourceUrl: "yekpare-hm-sync:3:makale:9" })).toBe(true);
  });

  it("requires positive author id for kose author block", () => {
    expect(hasKoseAuthorId({ authorId: 5 })).toBe(true);
    expect(hasKoseAuthorId({ authorId: 0 })).toBe(false);
    expect(hasKoseAuthorId({ authorId: null })).toBe(false);
  });

  it("builds public köşe URL under /makale/", () => {
    expect(buildKoseArticlePublicPath("modern-ritueller")).toBe("/makale/modern-ritueller");
    expect(resolveArticlePublicPath({ contentKind: "makale", slug: "foo" })).toBe("/makale/foo");
    expect(resolveArticlePublicPath({ categorySlug: "gundem", slug: "bar" })).toBe("/haber/bar");
  });
});
