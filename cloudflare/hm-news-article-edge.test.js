import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isNewsPageBundlePath,
  newsPageBundleSlug,
  newsArticleSlugFromApiPath,
  headlineToArticle,
  wrapArticleAsPageBundle,
  findNewsItemBySlug,
  articleBundleFromJson,
  fetchHmArticleBundleFromOrigin,
} from "./hm-news-article-edge.js";

describe("hm-news-article-edge", () => {
  it("detects page-bundle paths and slugs", () => {
    assert.equal(
      isNewsPageBundlePath("/api/news/page-bundle/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti"),
      true,
    );
    assert.equal(isNewsPageBundlePath("/api/news/hybrid"), false);
    assert.equal(
      newsPageBundleSlug("/api/news/page-bundle/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti"),
      "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
    );
  });

  it("wraps a bare article so HaberDetay article field is filled", () => {
    const bundle = wrapArticleAsPageBundle({ title: "Ankabir", slug: "ankabir" });
    assert.equal(bundle.article.title, "Ankabir");
    assert.deepEqual(bundle.related, []);
    assert.equal(bundle.kose, null);
    assert.deepEqual(bundle.sidebar, { authors: [], popular: [] });
  });

  it("turns a manşet row into an article so manuel haber page-bundle can 200 without origin", () => {
    assert.equal(
      newsArticleSlugFromApiPath("/api/news/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti"),
      "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
    );
    const article = headlineToArticle(
      {
        title: "Ankabir’den Vali Canpolat’a Hayırlı Olsun Ziyareti",
        slug: "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
        spot: "Vali ziyareti",
        imageUrl: "https://cdn.example/a.jpg",
      },
      "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
    );
    assert.equal(article.content, "");
    const bundle = wrapArticleAsPageBundle(article);
    assert.equal(bundle.article.title.includes("Ankabir"), true);
  });

  it("finds a manuel haber in hybrid / published list JSON by slug", () => {
    const slug = "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti";
    const hit = findNewsItemBySlug(
      {
        items: [
          { title: "RSS", slug: "rss-haber", href: "/haberler/rss/1" },
          {
            title: "Ankabir’den Vali Canpolat’a Hayırlı Olsun Ziyareti",
            slug,
            href: `/haber/${slug}`,
            spot: "Vali ziyareti",
          },
        ],
      },
      slug,
    );
    assert.equal(hit.slug, slug);
    assert.equal(findNewsItemBySlug({ items: [{ title: "Yok", slug: "baska" }] }, slug), null);
  });

  it("builds a page-bundle from /api/news JSON so article first-paint has a title", () => {
    const slug = "serhat-kilic-in-olumuyle-gundeme-geldi-oyuncularin-guvencesizligi-artik-kaniksan-1789220211156-2-m";
    const fromRow = articleBundleFromJson({
      title: "Serhat Kılıç",
      slug,
      content: "<p>Gövde</p>",
    });
    assert.equal(fromRow.article.title, "Serhat Kılıç");
    assert.match(fromRow.article.content, /Gövde/);
    const fromBundle = articleBundleFromJson({
      article: { title: "Paket", slug, content: "<p>x</p>" },
      related: [{ title: "Benzer" }],
    });
    assert.equal(fromBundle.article.title, "Paket");
    assert.equal(fromBundle.related.length, 1);
    assert.equal(articleBundleFromJson({ slug }), null);
  });

  it("fetches unscoped /api/news/:slug first so SHA pool articles paint", async () => {
    const slug = "serhat-kilic-in-olumuyle-gundeme-geldi-oyuncularin-guvencesizligi-artik-kaniksan-1789220211156-2-m";
    const urls = [];
    const bundle = await fetchHmArticleBundleFromOrigin({
      origin: "https://origin.example",
      slug,
      siteId: 3,
      incoming: { host: "ankarasehirgazetesi.com" },
      fetchApi: async (_env, url) => {
        urls.push(url);
        if (String(url).includes("siteId=")) {
          return { ok: false, json: async () => ({}) };
        }
        return {
          ok: true,
          json: async () => ({
            title: "Serhat Kılıç",
            slug,
            content: "<p>Gövde</p>",
          }),
        };
      },
    });
    assert.equal(urls[0], `https://origin.example/api/news/${encodeURIComponent(slug)}`);
    assert.equal(bundle.article.title, "Serhat Kılıç");
  });
});
