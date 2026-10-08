import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  injectExtraPageIntoShell,
  isKamuYerelExtraPageHost,
  kamuYerelExtraPageSlugFromPath,
} from "./hm-kamu-yerel-extra-pages-edge.js";

describe("hm-kamu-yerel-extra-pages-edge", () => {
  it("recognizes turkatahaber / yerel hosts", () => {
    assert.equal(isKamuYerelExtraPageHost("turkatahaber.com"), true);
    assert.equal(isKamuYerelExtraPageHost("www.yerel.net.tr"), true);
    assert.equal(isKamuYerelExtraPageHost("fix.tc"), false);
  });

  it("maps /daha and /iller; skips native PHP paths", () => {
    assert.equal(kamuYerelExtraPageSlugFromPath("/daha"), "daha");
    assert.equal(kamuYerelExtraPageSlugFromPath("/iller/"), "iller");
    assert.equal(kamuYerelExtraPageSlugFromPath("/hakkimizda"), null);
    assert.equal(kamuYerelExtraPageSlugFromPath("/kategori/ankara"), null);
  });

  it("injects article into shell main", () => {
    const shell = `<!DOCTYPE html><html><head><title>X</title></head><body><main id="icerik"><p>old</p></main></body></html>`;
    const html = injectExtraPageIntoShell(
      shell,
      { slug: "iller", title: "İller", bodyHtml: '<div class="hm-iller-page"><a class="hm-iller-il-link" href="/kategori/bolge-marmara">Marmara</a></div>' },
      "TÜRKATA HABER AJANSI",
    );
    assert.match(html, /<title>İller \| TÜRKATA HABER AJANSI<\/title>/);
    assert.match(html, /data-extra-slug="iller"/);
    assert.match(html, /hm-iller-il-link/);
    assert.match(html, /bolge-marmara/);
    assert.doesNotMatch(html, /<p>old<\/p>/);
  });
});
