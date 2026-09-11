import { describe, expect, it } from "vitest";
import {
  wrapNewsArticleAsPageBundle,
  readHmNewsArticleBoot,
  readHmHeadlineAsPageBundle,
} from "./fetchHmNewsPageBundle";

describe("wrapNewsArticleAsPageBundle", () => {
  it("fills HaberDetay article field from a bare /api/news row", () => {
    const bundle = wrapNewsArticleAsPageBundle({
      title: "Ankabir’den Vali Canpolat’a Hayırlı Olsun Ziyareti",
      slug: "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
    });
    expect(bundle.article?.slug).toBe("ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti");
    expect(bundle.related).toEqual([]);
    expect(bundle.fetchFailed).toBeUndefined();
  });

  it("reads injected article boot for the matching slug", () => {
    const prev = globalThis.window;
    globalThis.window = {
      __YEKPARE_HM_ARTICLE_BUNDLE__: {
        slug: "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
        bundle: wrapNewsArticleAsPageBundle({
          title: "Ankabir’den Vali Canpolat’a Hayırlı Olsun Ziyareti",
          slug: "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
        }),
      },
    } as typeof globalThis.window;
    try {
      const boot = readHmNewsArticleBoot("ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti");
      expect(boot?.article?.title).toMatch(/Ankabir/);
      expect(readHmNewsArticleBoot("baska-haber")).toBeUndefined();
    } finally {
      globalThis.window = prev;
    }
  });

  it("opens a manuel haber from home-bundle even when APIs are down", () => {
    const prev = globalThis.window;
    const slug = "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti";
    globalThis.window = {
      __YEKPARE_HM_HOME_BUNDLE__: {
        siteId: 3,
        savedAt: Date.now(),
        bundle: {
          siteId: 3,
          featured: [
            {
              title: "Ankabir’den Vali Canpolat’a Hayırlı Olsun Ziyareti",
              slug,
              spot: "Vali ziyareti",
            },
          ],
        },
      },
    } as typeof globalThis.window;
    try {
      const local = readHmHeadlineAsPageBundle(slug, 3);
      expect(local?.article?.title).toMatch(/Ankabir/);
      expect(local?.fetchFailed).toBe(true);
      expect(readHmHeadlineAsPageBundle("rss-olmayan", 3)).toBeUndefined();
    } finally {
      globalThis.window = prev;
    }
  });
});
