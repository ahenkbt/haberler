import assert from "node:assert/strict";
import { test } from "node:test";
import { sitemapFailXml } from "./sitemap-fail-xml.js";

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
