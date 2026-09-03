import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hmDomainSlugFallback,
  shouldInstantHmRootRedirect,
  hmHomeSlugFromPath,
  isHmPublicHomeHtmlPath,
  firstHmBootImageUrl,
  injectHmHtmlBoot,
  withBudget,
  buildGeoRobotsTxt,
  buildHmLlmsTxtFallback,
  isHmAiKnowledgePath,
  isAhenkAgencyHost,
  isAhenkAgencyGeoPath,
  buildAhenkLlmsTxtFallback,
  buildAhenkAgencyEntityHtml,
  buildHmSiteEntityHtml,
  isSharePreviewUserAgent,
  rewriteSpaShellOgForHmHost,
} from "./hm-html-boot.js";

describe("hm-html-boot", () => {
  it("maps known editor domains to slugs", () => {
    assert.equal(hmDomainSlugFallback("ankarahabergundemi.com"), "ankarahabergundemi");
    assert.equal(hmDomainSlugFallback("www.vatanhaber.net"), "vatanhaber");
    assert.equal(hmDomainSlugFallback("suhaber.net"), "su");
    assert.equal(hmDomainSlugFallback("www.suhaber.net"), "su");
    assert.equal(hmDomainSlugFallback("turk.eco"), "");
    assert.equal(hmDomainSlugFallback("ahenk.net.tr"), "");
  });

  it("redirects known HM roots instantly without waiting for meta", () => {
    assert.equal(shouldInstantHmRootRedirect("GET", "/", "ankarahabergundemi.com"), true);
    assert.equal(shouldInstantHmRootRedirect("GET", "/tr/ankarahabergundemi", "ankarahabergundemi.com"), false);
    assert.equal(shouldInstantHmRootRedirect("GET", "/", "turk.eco"), false);
    assert.equal(shouldInstantHmRootRedirect("GET", "/", "ahenk.net.tr"), false);
    assert.equal(shouldInstantHmRootRedirect("POST", "/", "vatanhaber.net"), false);
    assert.equal(shouldInstantHmRootRedirect("GET", "/", "suhaber.net"), true);
    assert.equal(hmHomeSlugFromPath("/", "suhaber.net"), "su");
  });

  it("reads /tr/{slug} and domain fallback for HTML boot", () => {
    assert.equal(hmHomeSlugFromPath("/tr/vatanhaber", "vatanhaber.net"), "vatanhaber");
    assert.equal(hmHomeSlugFromPath("/", "ankarahabergundemi.com"), "ankarahabergundemi");
    assert.equal(isHmPublicHomeHtmlPath("/tr/asg", "ankarasehirgazetesi.com"), true);
  });

  it("injects bundle JSON after charset so the early IIFE can read it", () => {
    const html =
      '<html><head><meta charset="UTF-8" /><script>window.__EARLY__=1</script></head><body></body></html>';
    const out = injectHmHtmlBoot(html, {
      siteId: 8,
      slug: "ankarahabergundemi",
      bundle: { siteId: 8, featured: [{ title: "<img>" }] },
    });
    assert.match(out, /__YEKPARE_HM_HOME_BUNDLE__/);
    assert.match(out, /\\u003cimg>/);
    assert.ok(out.indexOf("<img>") === -1);
    assert.ok(out.indexOf("__YEKPARE_HM_HOME_BUNDLE__") < out.indexOf("__EARLY__"));
  });

  it("picks first http(s) cover for preload", () => {
    assert.equal(
      firstHmBootImageUrl({
        featured: [{ imageUrl: "https://cdn.example/a.jpg" }],
      }),
      "https://cdn.example/a.jpg",
    );
    assert.equal(
      firstHmBootImageUrl({ featured: [{ imageUrl: "/api/media/uploads/x.jpg" }] }, "https://site.test"),
      "https://site.test/api/media/uploads/x.jpg",
    );
  });

  it("withBudget returns null when the promise is slower than the budget", async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 50));
    assert.equal(await withBudget(slow, 5), null);
    assert.equal(await withBudget(Promise.resolve("ok"), 50), "ok");
  });

  it("builds GEO robots and HM llms fallback for vatanhaber.net / suhaber.net", () => {
    const robots = buildGeoRobotsTxt("https://vatanhaber.net");
    assert.match(robots, /Sitemap: https:\/\/vatanhaber\.net\/sitemap\.xml/);
    assert.match(robots, /Sitemap: https:\/\/vatanhaber\.net\/sitemap-web\.xml/);
    assert.match(robots, /Sitemap: https:\/\/vatanhaber\.net\/google-news\.xml/);
    assert.match(robots, /User-agent: GPTBot\nAllow: \//);
    assert.match(robots, /User-agent: Google-Extended\nAllow: \//);
    assert.equal(isHmAiKnowledgePath("/llms.txt"), true);
    const llms = buildHmLlmsTxtFallback("vatanhaber", "https://vatanhaber.net");
    assert.match(llms, /# Vatan Haber/);
    assert.match(llms, /https:\/\/vatanhaber\.net\/sitemap\.xml/);
    assert.match(llms, /hakkinda/);
    assert.match(llms, /gazetevatan\.com/);
  });

  it("builds Ahenk BT GEO llms and entity HTML", () => {
    assert.equal(isAhenkAgencyHost("www.ahenk.net.tr"), true);
    assert.equal(isAhenkAgencyGeoPath("/"), true);
    assert.equal(isAhenkAgencyGeoPath("/hakkimizda"), true);
    assert.equal(isAhenkAgencyGeoPath("/haberler"), false);
    assert.equal(isAhenkAgencyGeoPath("/web-yazilimi"), true);
    assert.equal(isAhenkAgencyGeoPath("/avukat-sitesi"), true);
    assert.equal(isAhenkAgencyGeoPath("/ucretsiz-haber-sitesi"), true);
    const llms = buildAhenkLlmsTxtFallback("https://ahenk.net.tr");
    assert.match(llms, /Ahenk Bilgi Teknolojileri/);
    assert.match(llms, /ahenk\.net\.tr/);
    const html = buildAhenkAgencyEntityHtml("/");
    assert.match(html, /Ahenk Bilgi Teknolojileri/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /ahenk\.net\.tr/);
  });

  it("builds HM entity HTML with site name, not Ahenk as og:title", () => {
    const html = buildHmSiteEntityHtml("vatanhaber", "https://vatanhaber.net", "/");
    assert.match(html, /Vatan Haber — vatanhaber\.net resmi haber sitesi/);
    assert.match(html, /og:site_name" content="Vatan Haber"/);
    assert.match(html, /gazetevatan\.com/);
    assert.match(html, /Ahenk Bilgi Teknolojileri/);
    assert.equal(/og:title" content="Ahenk/i.test(html), false);
    assert.equal(isSharePreviewUserAgent("WhatsApp/2.23.20.0"), true);
    assert.equal(isSharePreviewUserAgent("facebookexternalhit/1.1"), true);
    assert.equal(isSharePreviewUserAgent("Mozilla/5.0 Chrome/120"), false);
  });

  it("rewrites SPA Ahenk OG tags on editor hosts", () => {
    const spa = `<html><head><title>Ahenk Bilgi Teknolojileri</title>
<meta property="og:title" content="Ahenk Bilgi Teknolojileri" />
<meta property="og:site_name" content="Ahenk Bilgi Teknolojileri" />
<meta property="og:url" content="https://ahenk.net.tr/" />
<meta property="og:image" content="https://ahenk.net.tr/opengraph.jpg" />
<meta name="description" content="Ahenk Bilgi Teknolojileri (ahenk.net.tr)" />
<script type="application/ld+json" data-yekpare-portal-jsonld="1">{"name":"Ahenk Bilgi Teknolojileri"}</script>
</head><body></body></html>`;
    const out = rewriteSpaShellOgForHmHost(spa, "vatanhaber.net", "https://vatanhaber.net");
    assert.match(out, /<title>Vatan Haber — vatanhaber\.net resmi haber sitesi<\/title>/);
    assert.match(out, /og:site_name" content="Vatan Haber"/);
    assert.match(out, /og:url" content="https:\/\/vatanhaber\.net\/"/);
    assert.equal(out.includes("https://ahenk.net.tr/opengraph.jpg"), false);
    assert.match(out, /NewsMediaOrganization/);
    const ahenk = rewriteSpaShellOgForHmHost(spa, "ahenk.net.tr", "https://ahenk.net.tr");
    assert.match(ahenk, /Ahenk Bilgi Teknolojileri/);
  });
});
