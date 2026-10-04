import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TURKATA_BRAND,
  TURKATA_DESCRIPTION,
  TURKATA_ORIGIN,
  buildTurkataGoogleNewsSitemapXml,
  buildTurkataLlmsTxt,
  buildTurkataNewsSitemapXml,
  buildTurkataRobotsTxt,
  isAhenkNewsMirrorPath,
  isRecentGoogleNewsItem,
  isTurkataHaberHost,
  rewriteAhenkNewsCanonicalHtml,
  rewriteTurkataSpaHtml,
  turkataCanonicalUrl,
  turkataPageKind,
} from "./turkata-haber.js";

const SHELL = `<!DOCTYPE html>
<html lang="tr">
<head>
<title>Ahenk Bilgi Teknolojileri</title>
<meta name="description" content="eski"/>
<meta name="title" content="eski"/>
<link rel="canonical" href="https://ahenk.net.tr/"/>
<link rel="alternate" hreflang="tr-TR" href="https://ahenk.net.tr/"/>
<meta property="og:title" content="eski"/>
<meta property="og:description" content="eski"/>
<meta property="og:url" content="https://ahenk.net.tr/"/>
<meta property="og:image" content="https://ahenk.net.tr/opengraph.jpg"/>
<meta property="og:site_name" content="Ahenk Bilgi Teknolojileri"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="eski"/>
<meta name="twitter:description" content="eski"/>
<meta name="twitter:image" content="https://ahenk.net.tr/opengraph.jpg"/>
<meta name="twitter:url" content="https://ahenk.net.tr/"/>
<script type="application/ld+json" data-yekpare-portal-jsonld="1">{"@type":"Organization","name":"Ahenk"}</script>
</head>
<body><div id="root"></div></body>
</html>`;

describe("turkata haber host", () => {
  it("detects apex and www only", () => {
    assert.equal(isTurkataHaberHost("turkatahaber.com"), true);
    assert.equal(isTurkataHaberHost("WWW.turkatahaber.com"), true);
    assert.equal(isTurkataHaberHost("ahenk.net.tr"), false);
    assert.equal(isTurkataHaberHost("kirsehirhaber.org"), false);
  });

  it("canonicalizes the news listing to the apex home", () => {
    assert.equal(turkataCanonicalUrl("/haberler"), `${TURKATA_ORIGIN}/`);
    assert.equal(turkataCanonicalUrl("/haber/ornek"), `${TURKATA_ORIGIN}/haber/ornek`);
    assert.equal(isAhenkNewsMirrorPath("/haberler"), true);
    assert.equal(isAhenkNewsMirrorPath("/"), false);
    assert.equal(turkataPageKind("/hakkimizda"), "about");
  });
});

describe("turkata spa html", () => {
  it("injects home title, geo, canonical, hreflang and organization JSON-LD", () => {
    const html = rewriteTurkataSpaHtml(SHELL, { pathname: "/" });
    assert.match(html, new RegExp(`<title>${TURKATA_BRAND}</title>`));
    assert.match(html, /rel="canonical" href="https:\/\/turkatahaber\.com\/"/);
    assert.match(html, /hreflang="tr"/);
    assert.match(html, /name="geo.region" content="TR-06"/);
    assert.match(html, /name="ICBM" content="39.9272, 32.8548"/);
    assert.match(html, /NewsMediaOrganization/);
    assert.match(html, /LocalBusiness/);
    assert.match(html, /"foundingDate":"1998"/);
    assert.match(html, /Yerel Yönetimler Haber Müdürlüğü/);
    assert.match(html, /https:\/\/turkatav\.org/);
    assert.match(html, /https:\/\/tukav\.org/);
    assert.doesNotMatch(html, /data-yekpare-portal-jsonld/);
    assert.match(html, /<h1>TÜRKATA HABER AJANSI<\/h1>/);
    assert.match(html, /"alternateName":\["THA"/);
    assert.match(html, /Tükav Gaziler Eğitim Kültür Hizmetleri Ltd\. Şti\./);
    assert.match(html, /Meşrutiyet Mah\. Karanfil Sok\. 4\/91/);
    assert.match(html, /Başak Mah\. Özalp Cad\. 5\/2/);
    assert.match(html, /"telephone":"\+905322291892"/);
    assert.match(html, /bilgi@turkatahaber\.com/);
    assert.match(html, /Nail Türkoğlu/);
    assert.doesNotMatch(html, /Başka Mah/);
  });

  it("titles the imprint exactly and lists the three addresses", () => {
    const html = rewriteTurkataSpaHtml(SHELL, { pathname: "/kunye" });
    assert.match(html, /<title>Künye \| TürkAta Haber Ajansı<\/title>/);
    assert.match(html, /rel="canonical" href="https:\/\/turkatahaber\.com\/kunye"/);
    assert.match(html, /Sağlık Mah\. Aksu Cad\. 13\/5 Çankaya - Ankara/);
    assert.match(html, /Mustafa ÖZDEMİR/);
    assert.match(html, /Melek Acar/);
    assert.match(html, /publishingPrinciples":"https:\/\/turkatahaber\.com\/kunye#yayin-ilkeleri"/);
  });

  it("injects a NewsArticle with image, dates and publisher", () => {
    const html = rewriteTurkataSpaHtml(SHELL, {
      pathname: "/haber/ornek-haber",
      article: {
        title: "Örnek manşet",
        description: "Kısa spot",
        imageUrl: "https://cdn.example/a.jpg",
        authorName: "Ayşe Yılmaz",
        datePublished: "2026-10-04T08:00:00.000Z",
        dateModified: "2026-10-04T09:00:00.000Z",
        categoryName: "Gündem",
      },
    });
    assert.match(html, /<title>Örnek manşet \| TÜRKATA HABER AJANSI<\/title>/);
    assert.match(html, /rel="canonical" href="https:\/\/turkatahaber\.com\/haber\/ornek-haber"/);
    assert.match(html, /property="og:image" content="https:\/\/cdn\.example\/a\.jpg"/);
    assert.match(html, /"@type":"NewsArticle"/);
    assert.match(html, /"headline":"Örnek manşet"/);
    assert.match(html, /"datePublished":"2026-10-04T08:00:00.000Z"/);
    assert.match(html, /"dateModified":"2026-10-04T09:00:00.000Z"/);
    assert.match(html, /Ayşe Yılmaz/);
    assert.match(html, /BreadcrumbList/);
  });

  it("points ahenk news canonical at turkatahaber.com without renaming the agency title", () => {
    const html = rewriteAhenkNewsCanonicalHtml(SHELL, "/haber/ornek-haber");
    assert.match(html, /<title>Ahenk Bilgi Teknolojileri<\/title>/);
    assert.match(html, /rel="canonical" href="https:\/\/turkatahaber\.com\/haber\/ornek-haber"/);
    assert.match(html, /property="og:url" content="https:\/\/turkatahaber\.com\/haber\/ornek-haber"/);
    const home = rewriteAhenkNewsCanonicalHtml(SHELL, "/");
    assert.match(home, /rel="canonical" href="https:\/\/ahenk\.net\.tr\/"/);
  });
});

describe("turkata seo files", () => {
  it("robots and llms name the agency, foundation and sitemaps", () => {
    const robots = buildTurkataRobotsTxt();
    assert.match(robots, /Sitemap: https:\/\/turkatahaber\.com\/sitemap\.xml/);
    assert.match(robots, /Sitemap: https:\/\/turkatahaber\.com\/google-news\.xml/);
    const llms = buildTurkataLlmsTxt();
    assert.match(llms, /Türk Kültürünü Araştırma ve Tanıtma Vakfı/);
    assert.match(llms, /1998/);
    assert.match(llms, /Sağlık Mah\. Aksu Cad\. 13\/5/);
    assert.match(llms, /STK ve Sektörel Haber Müdürlükleri/);
    assert.ok(llms.includes(TURKATA_DESCRIPTION.slice(0, 40)));
    assert.match(llms, /Başak Mah\. Özalp Cad\. 5\/2/);
    assert.doesNotMatch(llms, /Başka Mah/);
  });

  it("keeps only the last 48 hours in the Google News sitemap", () => {
    const now = Date.parse("2026-10-04T12:00:00.000Z");
    const items = [
      {
        title: "Yeni",
        slug: "yeni",
        href: "/haber/yeni",
        publishedAt: "2026-10-04T06:00:00.000Z",
        imageUrl: "https://cdn.example/y.jpg",
      },
      {
        title: "Eski",
        slug: "eski",
        href: "/haber/eski",
        publishedAt: "2026-10-01T06:00:00.000Z",
      },
    ];
    assert.equal(isRecentGoogleNewsItem(items[0], now), true);
    assert.equal(isRecentGoogleNewsItem(items[1], now), false);
    const news = buildTurkataGoogleNewsSitemapXml(items, now);
    assert.match(news, /https:\/\/turkatahaber\.com\/haber\/yeni/);
    assert.match(news, /<news:name>TÜRKATA HABER AJANSI<\/news:name>/);
    assert.match(news, /<news:language>tr<\/news:language>/);
    assert.doesNotMatch(news, /haber\/eski/);
    const web = buildTurkataNewsSitemapXml(items);
    assert.match(web, /haber\/yeni/);
    assert.match(web, /haber\/eski/);
    assert.match(web, /cdn\.example\/y\.jpg/);
  });
});
