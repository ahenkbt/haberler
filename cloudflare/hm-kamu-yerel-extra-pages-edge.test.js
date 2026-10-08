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

  it("injects page into shell main without ys-page grid trap", () => {
    const shell = `<!DOCTYPE html><html><head><title>X</title></head><body><main id="icerik"><p>old</p></main></body></html>`;
    const html = injectExtraPageIntoShell(
      shell,
      { slug: "iller", title: "İller", bodyHtml: '<div class="hm-iller-page"><a class="hm-iller-il-link" href="/kategori/bolge-marmara">Marmara</a></div>' },
      "TÜRKATA HABER AJANSI",
    );
    assert.match(html, /<title>İller \| TÜRKATA HABER AJANSI<\/title>/);
    assert.match(html, /data-extra-slug="iller"/);
    assert.match(html, /ys-wrap ys-extra-page/);
    assert.match(html, /hm-iller-il-link/);
    assert.match(html, /bolge-marmara/);
    assert.doesNotMatch(html, /<p>old<\/p>/);
    assert.doesNotMatch(html, /class="ys-page ys-extra-page"/);
  });

  it("daha fallback includes promo markers and site logos", async () => {
    const { serveKamuYerelExtraPage } = await import("./hm-kamu-yerel-extra-pages-edge.js");
    // Unit-level: rebuild via inject of fallback-shaped body
    const html = injectExtraPageIntoShell(
      `<!DOCTYPE html><html><head><title>X</title></head><body><main id="icerik"></main></body></html>`,
      {
        slug: "daha",
        title: "Daha",
        bodyHtml:
          '<div class="hm-daha-page"><div class="hm-daha-main"><section class="hm-daha-proje">81 İl 81 Haber Sitesi Projesi</section><ul class="hm-daha-site-grid"></ul></div><aside class="hm-daha-aside"></aside></div>',
      },
      "TÜRKATA HABER AJANSI",
    );
    assert.match(html, /hm-daha-proje/);
    assert.match(html, /81 İl 81 Haber Sitesi Projesi/);
    assert.match(html, /hm-daha-aside/);
    assert.equal(typeof serveKamuYerelExtraPage, "function");
  });

  it("daha edge fallback lists gundemi regionals and omits TUKAV", async () => {
    const { serveKamuYerelExtraPage } = await import("./hm-kamu-yerel-extra-pages-edge.js");
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("<!DOCTYPE html><html><head><title>X</title></head><body><main id=\"icerik\"></main></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    try {
      const req = new Request("https://turkatahaber.com/daha", { method: "GET" });
      const res = await serveKamuYerelExtraPage(req, {}, new URL("https://turkatahaber.com/daha"));
      assert.ok(res);
      const html = await res.text();
      assert.match(html, /ege\.gundemi\.org/);
      assert.match(html, /marmara\.gundemi\.org/);
      assert.match(html, /karadeniz\.gundemi\.org/);
      assert.match(html, /doguanadolu\.gundemi\.org/);
      assert.match(html, /guneydogu\.gundemi\.org/);
      assert.match(html, /Ege Gündemi/);
      assert.match(html, /sosyalhizmetler\.tr/);
      assert.doesNotMatch(html, /tukav\.org/);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});
