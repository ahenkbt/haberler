import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AHENK_HSY_FAQS,
  AHENK_HSY_REFERENCES,
  buildAhenkHsyHtml,
  buildAhenkHsyJsonLd,
  serveAhenkHaberSitesiYazilimi,
} from "./hm-ahenk-haber-yazilimi.js";

const req = (m = "GET") => ({ method: m });
const u = (s) => new URL(s);

describe("hm-ahenk-haber-yazilimi", () => {
  it("serves the landing page only on ahenk.net.tr", async () => {
    const r = serveAhenkHaberSitesiYazilimi(req(), u("https://ahenk.net.tr/haber-sitesi-yazilimi"));
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/html/);
    const html = await r.text();
    assert.match(html, /<h1>Haber Sitesi Yazılımı<\/h1>/);
    assert.match(html, /Neden Ahenk Haber Sitesi Yazılımı\?/);
    assert.match(html, /rel="canonical" href="https:\/\/ahenk\.net\.tr\/haber-sitesi-yazilimi"/);
    assert.equal(serveAhenkHaberSitesiYazilimi(req(), u("https://www.ahenk.net.tr/haber-sitesi-yazilimi/")).status, 200);
    assert.equal(serveAhenkHaberSitesiYazilimi(req(), u("https://vatanhaber.net/haber-sitesi-yazilimi")), null);
    assert.equal(serveAhenkHaberSitesiYazilimi(req(), u("https://ahenk.net.tr/")), null);
    assert.equal(serveAhenkHaberSitesiYazilimi(req("POST"), u("https://ahenk.net.tr/haber-sitesi-yazilimi")), null);
    const head = serveAhenkHaberSitesiYazilimi(req("HEAD"), u("https://ahenk.net.tr/haber-sitesi-yazilimi"));
    assert.equal(head.status, 200);
  });

  it("301s search aliases to the landing page", () => {
    for (const p of ["/haber-scripti", "/php-haber-sitesi", "/haber-sitesi", "/yazilim/haber-medya-sitesi"]) {
      const r = serveAhenkHaberSitesiYazilimi(req(), u(`https://ahenk.net.tr${p}`));
      assert.equal(r.status, 301, p);
      assert.equal(r.headers.get("location"), "https://ahenk.net.tr/haber-sitesi-yazilimi");
    }
  });

  it("prices: monthly 3000, yearly 27000 TRY in page and schema", () => {
    const html = buildAhenkHsyHtml();
    assert.match(html, /3\.000 TL/);
    assert.match(html, /27\.000 TL/);
    assert.match(html, /2\.250 TL/);
    const ld = buildAhenkHsyJsonLd();
    const prod = ld["@graph"].find((n) => Array.isArray(n["@type"]) && n["@type"].includes("Product"));
    assert.deepEqual(prod.offers.map((o) => [o.price, o.priceCurrency]), [["3000", "TRY"], ["27000", "TRY"]]);
    const faq = ld["@graph"].find((n) => n["@type"] === "FAQPage");
    assert.equal(faq.mainEntity.length, AHENK_HSY_FAQS.length);
  });

  it("references exclude corporate and closed sites", () => {
    const domains = AHENK_HSY_REFERENCES.map((r) => r.domain);
    for (const bad of ["kirsehirhaber.org", "tukav.org", "vatankahramanlari.org", "trafik.gd", "goalgo.org"]) {
      assert.ok(!domains.includes(bad), bad);
    }
    assert.ok(domains.includes("vatanhaber.net"));
    assert.ok(AHENK_HSY_REFERENCES.every((r) => /^https:\/\/ahenk\.net\.tr\/api\/hm\/public\/news-sites\/\d+\/logo/.test(r.logo)));
  });

  it("json-ld is safe inside script tag", () => {
    const html = buildAhenkHsyHtml();
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m);
    JSON.parse(m[1]);
  });
});
