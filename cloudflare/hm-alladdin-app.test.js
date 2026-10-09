import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serveAlladdinApp, alladdinSitemapPaths, ALLADDIN_INDEXNOW_KEY } from "./hm-alladdin-app.js";

const env = { ASSETS: { fetch: async () => new Response("x", { status: 200, headers: { "content-type": "image/jpeg" } }) } };
const go = async (s, method = "GET") => {
  const url = new URL(s);
  return serveAlladdinApp(new Request(url, { method }), url, env);
};

describe("hm-alladdin-app", () => {
  it("renders every sitemap page with valid JSON-LD on alladdin.app", async () => {
    for (const p of alladdinSitemapPaths()) {
      const r = await go("https://alladdin.app" + p);
      assert.equal(r.status, 200, p);
      const html = await r.text();
      assert.match(html, /<\/html>$/);
      assert.match(html, new RegExp(`<link rel="canonical" href="https://alladdin\\.app${p === "/" ? "/" : p.replace(/[/-]/g, "\\$&")}"`));
      const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      JSON.parse(ld[1]);
      assert.doesNotMatch(html, /kirsehirhaber|goalgo/i);
    }
  });
  it("home: Aladdin motif, TRY offers, price", async () => {
    const html = await (await go("https://alladdin.app/")).text();
    assert.match(html, /Dile benden/);
    assert.match(html, /Cin Editör/);
    assert.match(html, /"priceCurrency":"TRY"/);
    assert.match(html, /3\.000 TL/);
    assert.match(html, /27\.000 TL/);
    assert.match(html, /bilgi@alladdin\.app/);
  });
  it("does not touch goalgo.com.tr; redirects www and aliases", async () => {
    assert.equal(await go("https://goalgo.com.tr/fiyatlar"), null);
    assert.equal(await go("https://www.goalgo.com.tr/"), null);
    assert.equal((await go("https://www.alladdin.app/sss")).headers.get("location"), "https://alladdin.app/sss");
    assert.equal((await go("https://alladdin.app/sss/")).status, 301);
    assert.equal((await go("https://alladdin.app/haber-sitesi-kurmak")).status, 301);
    assert.equal((await go("https://alladdin.app/olmayan")).status, 404);
  });
  it("serves SEO files", async () => {
    assert.match(await (await go("https://alladdin.app/robots.txt")).text(), /GPTBot[\s\S]*Sitemap: https:\/\/alladdin\.app\/sitemap\.xml/);
    assert.match(await (await go("https://alladdin.app/sitemap.xml")).text(), /<loc>https:\/\/alladdin\.app\/<\/loc>/);
    assert.match(await (await go("https://alladdin.app/llms.txt")).text(), /^# Alladdin Haber Sitesi Yazılımı/);
    assert.equal((await go("https://alladdin.app/ai.txt")).status, 200);
    assert.equal(await (await go(`https://alladdin.app/${ALLADDIN_INDEXNOW_KEY}.txt`)).text(), ALLADDIN_INDEXNOW_KEY);
  });
  it("passes panel/API through and ignores other hosts", async () => {
    for (const s of ["https://alladdin.app/editor", "https://alladdin.app/editor/giris", "https://alladdin.app/api/hm/public/contact", "https://alladdin.app/assets/x.js", "https://goalgo.org/", "https://pbx.goalgo.org/", "https://ahenk.net.tr/"]) {
      assert.equal(await go(s), null, s);
    }
    assert.equal(await go("https://alladdin.app/", "POST"), null);
    assert.equal((await go("https://alladdin.app/alladdin/og.jpg")).status, 200);
  });
});
