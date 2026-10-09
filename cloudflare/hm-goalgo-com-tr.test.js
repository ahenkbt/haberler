import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serveGoalgoComTr, goalgoSitemapPaths, GOALGO_INDEXNOW_KEY } from "./hm-goalgo-com-tr.js";

const env = { ASSETS: { fetch: async () => new Response("x", { status: 200, headers: { "content-type": "image/jpeg" } }) } };
const go = async (s, method = "GET") => {
  const url = new URL(s);
  return serveGoalgoComTr(new Request(url, { method }), url, env);
};

describe("hm-goalgo-com-tr", () => {
  it("renders every sitemap page with valid JSON-LD", async () => {
    for (const p of goalgoSitemapPaths()) {
      const r = await go("https://goalgo.com.tr" + p);
      assert.equal(r.status, 200, p);
      const html = await r.text();
      assert.match(html, /<\/html>$/);
      const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(ld, p);
      JSON.parse(ld[1]);
      assert.doesNotMatch(html, /kirsehirhaber/i);
    }
  });
  it("home has TRY offers and price", async () => {
    const html = await (await go("https://goalgo.com.tr/")).text();
    assert.match(html, /"priceCurrency":"TRY"/);
    assert.match(html, /3\.000 TL/);
    assert.match(html, /27\.000 TL/);
  });
  it("redirects www, trailing slash and aliases", async () => {
    assert.equal((await go("https://www.goalgo.com.tr/fiyatlar")).headers.get("location"), "https://goalgo.com.tr/fiyatlar");
    assert.equal((await go("https://goalgo.com.tr/sss/")).status, 301);
    assert.equal((await go("https://goalgo.com.tr/haber-scripti")).status, 301);
    assert.equal((await go("https://goalgo.com.tr/olmayan")).status, 404);
  });
  it("serves SEO files", async () => {
    assert.match(await (await go("https://goalgo.com.tr/robots.txt")).text(), /GPTBot[\s\S]*Sitemap: https:\/\/goalgo\.com\.tr\/sitemap\.xml/);
    assert.match(await (await go("https://goalgo.com.tr/sitemap.xml")).text(), /<urlset/);
    assert.match(await (await go("https://goalgo.com.tr/llms.txt")).text(), /^# Goalgo Haber Yazılımı/);
    assert.equal((await go("https://goalgo.com.tr/ai.txt")).status, 200);
    assert.equal(await (await go(`https://goalgo.com.tr/${GOALGO_INDEXNOW_KEY}.txt`)).text(), GOALGO_INDEXNOW_KEY);
  });
  it("passes the panel, API and other hosts through", async () => {
    for (const s of ["https://goalgo.com.tr/editor", "https://goalgo.com.tr/editor/giris", "https://goalgo.com.tr/api/hm/public/contact", "https://goalgo.com.tr/assets/x.js", "https://goalgo.org/", "https://pbx.goalgo.org/", "https://ahenk.net.tr/"]) {
      assert.equal(await go(s), null, s);
    }
    assert.equal(await go("https://goalgo.com.tr/", "POST"), null);
    assert.equal((await go("https://goalgo.com.tr/goalgo-haber/og.jpg")).status, 200);
  });
});
