import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractFirstContentImageUrl,
  extractOgImageFromHtml,
} from "./hm-turkata-rss-covers-edge.js";

describe("hm-turkata-rss-covers-edge", () => {
  it("extracts first content image and skips logos", () => {
    const html = `
      <p><img src="/brand/logo.png" alt=""></p>
      <p><img src="https://cumha.com.tr/uploads/images/202610/image_870x_abc.webp" alt="haber"></p>
    `;
    assert.equal(
      extractFirstContentImageUrl(html),
      "https://cumha.com.tr/uploads/images/202610/image_870x_abc.webp",
    );
  });

  it("reads og:image from article head", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://static.birgun.net/resim/haber/a.jpg">
    </head></html>`;
    assert.equal(
      extractOgImageFromHtml(html, "https://www.birgun.net/haber/a"),
      "https://static.birgun.net/resim/haber/a.jpg",
    );
  });

  it("decodes &amp; in img src", () => {
    assert.equal(
      extractFirstContentImageUrl(
        `<img src="https://images.ntv.com.tr/images/x.jpg?width=930&amp;format=webp">`,
      ),
      "https://images.ntv.com.tr/images/x.jpg?width=930&format=webp",
    );
  });
});
