import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isNewsPageBundlePath,
  newsPageBundleSlug,
  wrapArticleAsPageBundle,
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
});
