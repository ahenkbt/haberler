import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isNewsPageBundlePath,
  newsPageBundleSlug,
  newsArticleSlugFromApiPath,
  headlineToArticle,
  wrapArticleAsPageBundle,
  findNewsItemBySlug,
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
    assert.equal(article.content, "Vali ziyareti");
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
});
