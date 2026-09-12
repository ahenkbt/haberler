import { describe, expect, it, vi } from "vitest";
import {
  wrapNewsArticleAsPageBundle,
  readHmNewsArticleBoot,
  readHmHeadlineAsPageBundle,
  fetchHmNewsPageBundle,
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
      expect(readHmNewsArticleBoot("ANKABIR-DEN-VALI-CANPOLAT-A-HAYIRLI-OLSUN-ZIYARETI")?.article?.title).toMatch(
        /Ankabir/,
      );
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

  it("returns page-bundle without waiting for a hung /api/news/:slug", async () => {
    const slug = "cevre-sehircilik-ve-i-klim-degisikligi-bakanligi-nda-gorev-degisikligi-1789220219760-5-m";
    const article = { id: 178451, slug, title: "Bakanlıkta görev değişikliği", siteId: null };
    const prevFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/news/page-bundle/")) {
        return new Response(JSON.stringify({ article, related: [], kose: null, sidebar: { authors: [], popular: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      await new Promise(() => undefined);
      return new Response("hang", { status: 599 });
    }) as typeof fetch;
    try {
      const bundle = await fetchHmNewsPageBundle(slug, 3);
      expect(bundle.article?.id).toBe(178451);
      expect(bundle.article?.title).toMatch(/görev/i);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});
