import assert from "node:assert/strict";
import { test } from "node:test";
import { sitemapFailXml, toGscWebSitemapXml, isGscWebSitemapPath } from "./sitemap-fail-xml.js";

test("sitemap.xml fail XML is a urlset with the homepage, not an empty index", () => {
  const xml = sitemapFailXml("/sitemap.xml", "https://vatanhaber.net");
  assert.match(xml, /<urlset /);
  assert.doesNotMatch(xml, /<sitemapindex/);
  assert.doesNotMatch(xml, /xmlns:news/);
  assert.match(xml, /<loc>https:\/\/vatanhaber\.net\/<\/loc>/);
});

test("child sitemap fail XML stays an empty urlset", () => {
  const xml = sitemapFailXml("/google-news.xml", "https://vatanhaber.net");
  assert.match(xml, /<urlset /);
  assert.doesNotMatch(xml, /<url>/);
});

test("vatanhaber.net slug is vatanhaber so Worker can map sitemap.xml to news-hm urlset", async () => {
  const { hmDomainSlugFallback } = await import("./hm-html-boot.js");
  assert.equal(hmDomainSlugFallback("vatanhaber.net"), "vatanhaber");
  assert.equal(hmDomainSlugFallback("www.suhaber.net"), "su");
});

test("toGscWebSitemapXml drops news tags so GSC does not treat the file as a News sitemap", () => {
  const src = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://vatanhaber.net/</loc>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://vatanhaber.net/haber/eski</loc>
    <lastmod>2026-09-02</lastmod>
    <news:news>
      <news:publication_date>2026-07-07T20:18:12.000Z</news:publication_date>
    </news:news>
  </url>
</urlset>`;
  const out = toGscWebSitemapXml(src);
  assert.match(out, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.doesNotMatch(out, /xmlns:news/);
  assert.doesNotMatch(out, /<news:/);
  assert.equal((out.match(/<url>/g) || []).length, 2);
  assert.match(out, /<loc>https:\/\/vatanhaber.net\/haber\/eski<\/loc>/);
  assert.match(out, /<lastmod>2026-09-02<\/lastmod>/);
  assert.equal(isGscWebSitemapPath("/sitemap.xml"), true);
  assert.equal(isGscWebSitemapPath("/sitemap-web.xml"), true);
  assert.equal(isGscWebSitemapPath("/google-news.xml"), false);
});

test("sitemap.xml fail XML is a urlset with the homepage, not an empty index", () => {
  const xml = sitemapFailXml("/sitemap.xml", "https://vatanhaber.net");
  assert.match(xml, /<urlset /);
  assert.doesNotMatch(xml, /<sitemapindex/);
  assert.match(xml, /<loc>https:\/\/vatanhaber\.net\/<\/loc>/);
});

test("child sitemap fail XML stays an empty urlset", () => {
  const xml = sitemapFailXml("/google-news.xml", "https://vatanhaber.net");
  assert.match(xml, /<urlset /);
  assert.doesNotMatch(xml, /<url>/);
});

test("vatanhaber.net slug is vatanhaber so Worker can map sitemap.xml to news-hm urlset", async () => {
  const { hmDomainSlugFallback } = await import("./hm-html-boot.js");
  assert.equal(hmDomainSlugFallback("vatanhaber.net"), "vatanhaber");
  assert.equal(hmDomainSlugFallback("www.suhaber.net"), "su");
});
