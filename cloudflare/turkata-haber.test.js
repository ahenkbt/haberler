import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sitemapFailXml } from "./sitemap-fail-xml.js";
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
  portalHaberlerArticleAliasPath,
  isTurkataAuthorPanelPath,
  rewriteAhenkNewsCanonicalHtml,
  rewriteTurkataSpaHtml,
  turkataCanonicalUrl,
  turkataPageKind,
  turkataSitemapFromUpstream,
  turkataUpstreamSitemapApiPath,
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

describe("portal haberler article alias", () => {
  it("maps /haberler/haber/:slug to the portal article path", () => {
    assert.equal(
      portalHaberlerArticleAliasPath("/haberler/haber/ornek-haber"),
      "/haber/ornek-haber",
    );
    assert.equal(
      portalHaberlerArticleAliasPath("/haberler/haber/ornek-haber/"),
      "/haber/ornek-haber",
    );
    assert.equal(portalHaberlerArticleAliasPath("/haber/ornek-haber"), null);
    assert.equal(portalHaberlerArticleAliasPath("/tr/asg/haber/ornek-haber"), null);
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
    assert.match(html, /<div id="root">[\s\S]*<h1>TÜRKATA HABER AJANSI<\/h1>/);
    assert.match(html, /id="seo-boot-shell"/);
    assert.match(html, /clip-path:inset\(50%\)/);
    assert.match(html, /hm-spa-ready/);
    assert.doesNotMatch(html, /cloneNode/);
    assert.doesNotMatch(html, /#root\{display:none/);
    assert.match(html, /"alternateName":\["THA"/);
    assert.match(html, /Tükav Gaziler Eğitim Kültür Hizmetleri Ltd\. Şti\./);
    assert.match(html, /Meşrutiyet Mah\. Karanfil Sok\. 4\/91/);
    assert.match(html, /Başak Mah\. Özalp Cad\. 5\/2/);
    assert.match(html, /"telephone":"\+905322291892"/);
    assert.match(html, /bilgi@turkatahaber\.com/);
    assert.match(html, /Nail Türkoğlu/);
    assert.doesNotMatch(html, /Başka Mah/);
    assert.match(html, /property="og:image" content="https:\/\/turkatahaber\.com\/turkata\/og-default\.png"/);
    assert.match(html, /"url":"https:\/\/turkatahaber\.com\/turkata\/turkata-logo\.png"/);
    assert.match(html, /"width":960,"height":313/);
    assert.match(html, /href="\/turkata\/favicon-32\.png"/);
    assert.match(html, /href="\/turkata\/apple-touch-icon\.png"/);
    assert.doesNotMatch(html, /turkata-wordmark\.svg/);
    assert.doesNotMatch(html, /__YEKPARE_HM_DOMAIN_BOOT__/);
  });

  it("boots the HM author-panel slug on /yazar/giris", () => {
    assert.equal(isTurkataAuthorPanelPath("/yazar/giris"), true);
    assert.equal(isTurkataAuthorPanelPath("/yazar/sifre"), true);
    assert.equal(isTurkataAuthorPanelPath("/yazar/haberler"), true);
    assert.equal(isTurkataAuthorPanelPath("/yazar/ahmet"), false);
    const html = rewriteTurkataSpaHtml(SHELL, { pathname: "/yazar/giris" });
    assert.match(html, /__YEKPARE_HM_DOMAIN_BOOT__/);
    assert.match(html, /"slug":"turkatahaber"/);
    assert.match(html, /"host":"turkatahaber.com"/);
  });

  it("renders the official about page verbatim", () => {
    const html = rewriteTurkataSpaHtml(SHELL, { pathname: "/hakkimizda" });
    assert.match(html, /<title>TürkAta Haber Ajansı – Hakkımızda<\/title>/);
    assert.match(html, /Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı/);
    assert.match(html, /çeyrek asırlık kurumsal birikim/);
    assert.match(html, /Misyonumuz: &quot;Sesiniz, Gücünüz ve Tanıtım Yüzünüz&quot;/);
    assert.match(html, /Sosyal Sorumluluk ve Eğitim Bütçesine Katkı/);
    assert.match(html, /Yayın İlkelerimiz ve Yapımız/);
    assert.doesNotMatch(html, /Misyonomuz/);
    assert.doesNotMatch(html, /<h2>Haber müdürlükleri<\/h2>/);
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
    assert.equal(
      isRecentGoogleNewsItem(
        {
          title: "Guncel",
          publishedAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-10-04T08:00:00.000Z",
        },
        now,
      ),
      true,
    );
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

  it("maps turkata sitemaps to article urlsets, not the index route that 500s", async () => {
    const { hmDomainSlugFallback } = await import("./hm-html-boot.js");
    assert.equal(hmDomainSlugFallback("turkatahaber.com"), "");
    assert.equal(hmDomainSlugFallback("vatanhaber.net"), "vatanhaber");
    assert.equal(turkataUpstreamSitemapApiPath("/sitemap.xml"), "/api/sitemap/news-yekpare.xml");
    assert.equal(turkataUpstreamSitemapApiPath("/google-news.xml"), "/api/sitemap/google-news.xml");
    assert.equal(turkataUpstreamSitemapApiPath("/sitemap-news.xml"), "/api/sitemap/news-yekpare.xml");
  });

  it("rewrites ahenk article URLs into a GSC urlset on the happy path", () => {
    const upstream = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://ahenk.net.tr/haber/ornek-haber</loc>
    <lastmod>2026-10-04</lastmod>
    <news:news>
      <news:publication>
        <news:name>Ahenk Bilgi Teknolojileri</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>2026-10-03T10:00:00.000Z</news:publication_date>
      <news:title>Ornek</news:title>
    </news:news>
  </url>
</urlset>`;
    const web = turkataSitemapFromUpstream("/sitemap.xml", { ok: true, xml: upstream });
    assert.equal(web.status, 200);
    assert.equal(web.failed, false);
    assert.match(web.body, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    assert.doesNotMatch(web.body, /<sitemapindex/);
    assert.doesNotMatch(web.body, /xmlns:news/);
    assert.doesNotMatch(web.body, /ahenk\.net\.tr/);
    assert.match(web.body, /<loc>https:\/\/turkatahaber\.com\/haber\/ornek-haber<\/loc>/);
    assert.match(web.body, /<loc>https:\/\/turkatahaber\.com\/<\/loc>/);
    assert.match(web.body, /<loc>https:\/\/turkatahaber\.com\/hakkimizda<\/loc>/);

    const news = turkataSitemapFromUpstream("/google-news.xml", { ok: true, xml: upstream });
    assert.equal(news.status, 200);
    assert.match(news.body, /<loc>https:\/\/turkatahaber\.com\/haber\/ornek-haber<\/loc>/);
    assert.match(news.body, /<news:name>TÜRKATA HABER AJANSI<\/news:name>/);
    assert.match(news.body, /xmlns:news=/);
    assert.doesNotMatch(news.body, /Ahenk Bilgi Teknolojileri/);
  });

  it("uses sitemapFailXml when the upstream sitemap fails", () => {
    for (const path of ["/sitemap.xml", "/google-news.xml"]) {
      const failed = turkataSitemapFromUpstream(path, { ok: false, xml: "Sitemap hatası" });
      assert.equal(failed.status, 503);
      assert.equal(failed.failed, true);
      assert.equal(failed.body, sitemapFailXml(path, TURKATA_ORIGIN));
      const html = turkataSitemapFromUpstream(path, {
        ok: true,
        xml: "<!doctype html><title>500</title>",
      });
      assert.equal(html.status, 503);
      assert.equal(html.body, sitemapFailXml(path, TURKATA_ORIGIN));
    }
    const home = sitemapFailXml("/sitemap.xml", TURKATA_ORIGIN);
    assert.match(home, /<urlset /);
    assert.doesNotMatch(home, /<sitemapindex/);
    assert.match(home, /<loc>https:\/\/turkatahaber\.com\/<\/loc>/);
  });
});
