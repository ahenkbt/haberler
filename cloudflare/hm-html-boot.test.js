import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hmDomainSlugFallback,
  shouldInstantHmRootRedirect,
  hmHomeSlugFromPath,
  isHmPublicHomeHtmlPath,
  firstHmBootImageUrl,
  injectHmHtmlBoot,
  buildHmBootPaintHtml,
  buildHmClassicHomePaintHtml,
  listKnownHmEditorSites,
  parseHmNewsArticlePath,
  findHmBundleHeadlineBySlug,
  buildHmNewsArticleOgHtml,
  raceHmHtmlBoot,
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
  sanitizeOgShareImages,
} from "./hm-html-boot.js";
import { putHmEdgeCache } from "./hm-edge-cache.js";

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
    assert.equal(hmHomeSlugFromPath("/tr/asg", "ankarasehirgazetesi.com"), "asg");
    assert.equal(
      hmHomeSlugFromPath("/tr/asg/haber/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti", "ankarasehirgazetesi.com"),
      "asg",
    );
    assert.equal(
      hmHomeSlugFromPath("/haber/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti", "ankarasehirgazetesi.com"),
      "asg",
    );
    assert.equal(isHmPublicHomeHtmlPath("/tr/asg", "ankarasehirgazetesi.com"), true);
    assert.equal(
      isHmPublicHomeHtmlPath("/haber/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti", "ankarasehirgazetesi.com"),
      false,
    );
  });

  it("injects bundle JSON after charset so the early IIFE can read it", () => {
    const html =
      '<html><head><meta charset="UTF-8" /><script>window.__EARLY__=1</script></head><body><div id="root"></div></body></html>';
    const out = injectHmHtmlBoot(html, {
      siteId: 8,
      slug: "ankarahabergundemi",
      meta: { id: 8, slug: "ankarahabergundemi", displayName: "Ankara Haber Gündemi" },
      bundle: { siteId: 8, featured: [{ title: "<img>", slug: "haber-1", imageUrl: "https://cdn.example/a.jpg" }] },
    });
    assert.match(out, /__YEKPARE_HM_HOME_BUNDLE__/);
    assert.match(out, /\\u003cimg>/);
    assert.ok(out.indexOf("<img>") === -1);
    assert.ok(out.indexOf("__YEKPARE_HM_HOME_BUNDLE__") < out.indexOf("__EARLY__"));
    assert.equal(out.includes("hm-boot-paint"), false);
    assert.equal(out.includes("Manşet yükleniyor"), false);
    assert.match(out, /data-hm-first-paint="classic"/);
    assert.match(out, /Ankara Haber Gündemi/);
    assert.match(out, /Piyasa · Hava/);
    assert.match(out, /<div id="root">[\s\S]*data-hm-first-paint="classic"/);
  });

  it("parses haber paths and injects article JSON without homepage paint", () => {
    assert.deepEqual(
      parseHmNewsArticlePath("/haber/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti"),
      { kind: "haber", slug: "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti" },
    );
    assert.equal(
      parseHmNewsArticlePath("/tr/asg/haber/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti")?.slug,
      "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
    );
    const html = '<html><head><meta charset="UTF-8" /></head><body><div id="root"></div></body></html>';
    const out = injectHmHtmlBoot(html, {
      siteId: 3,
      slug: "asg",
      skipPaint: true,
      articleSlug: "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
      articleBundle: {
        article: { title: "Ankabir’den Vali Canpolat’a Hayırlı Olsun Ziyareti" },
        related: [],
        kose: null,
        sidebar: { authors: [], popular: [] },
      },
    });
    assert.match(out, /__YEKPARE_HM_ARTICLE_BUNDLE__/);
    assert.equal(out.includes("hm-boot-paint"), false);
    assert.equal(out.includes("data-hm-first-paint"), false);
    assert.equal(out.includes("Manşet yükleniyor"), false);
  });

  it("builds WhatsApp article OG from a home-bundle headline", () => {
    const item = findHmBundleHeadlineBySlug(
      {
        featured: [
          {
            slug: "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
            title: "Ankabir’den Vali Canpolat’a Hayırlı Olsun Ziyareti",
            spot: "Vali ziyareti",
            imageUrl: "https://cdn.example/haber.jpg",
          },
        ],
      },
      "ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
    );
    assert.equal(item.title.includes("Ankabir"), true);
    const html = buildHmNewsArticleOgHtml({
      origin: "https://ankarasehirgazetesi.com",
      path: "/haber/ankabir-den-vali-canpolat-a-hayirli-olsun-ziyareti",
      siteName: "Ankara Şehir Gazetesi",
      title: item.title,
      description: item.spot,
      image: item.imageUrl,
    });
    assert.match(html, /og:title" content="Ankabir/);
    assert.match(html, /og:image" content="https:\/\/cdn.example\/haber.jpg"/);
    assert.match(html, /og:type" content="article"/);
    assert.match(html, /og:site_name" content="Ankara Şehir Gazetesi"/);
  });

  it("lists unique known editor hosts for keepalive warm", () => {
    const sites = listKnownHmEditorSites();
    const hosts = sites.map((s) => s.host);
    assert.ok(hosts.includes("suhaber.net"));
    assert.ok(hosts.includes("vatanhaber.net"));
    assert.equal(hosts.includes("www.suhaber.net"), false);
    assert.equal(
      sites.find((s) => s.host === "kirsehirhaber.org")?.slug,
      "kirsehirhaber",
    );
  });

  it("builds classic homepage first paint (not the yükleniyor overlay)", () => {
    const html = buildHmBootPaintHtml({
      slug: "su",
      host: "suhaber.net",
      meta: { displayName: "Su Haber" },
      bundle: {
        featured: [
          { title: "Birinci", slug: "birinci", imageUrl: "https://cdn.example/a.jpg" },
          { title: "İkinci", slug: "ikinci" },
        ],
      },
    });
    assert.match(html, /Su Haber/);
    assert.match(html, /Birinci/);
    assert.match(html, /ikinci/);
    assert.match(html, /data-hm-first-paint="classic"/);
    assert.match(html, /Piyasa · Hava/);
    assert.match(html, /Anasayfa/);
    assert.match(html, /hm-fp-num/);
    assert.equal(html.includes("hm-boot-paint"), false);
    assert.equal(html.includes("Manşet yükleniyor"), false);
  });

  it("seeds ASG-style chrome from editor menu + numbered manşet 1–5", () => {
    const html = buildHmClassicHomePaintHtml({
      slug: "asg",
      host: "ankarasehirgazetesi.com",
      meta: {
        displayName: "Ankara Şehir Gazetesi",
        layout: {
          hmVitrinTheme: "esen",
          faviconUrl: "/api/media/uploads/logo.png",
          logoUrl: "data:image/png;base64,AAAA",
          hmCorporateMenuItems: [
            { label: "Anasayfa", href: "/tr/asg", enabled: true },
            { label: "Sondakika", href: "/sondakika", enabled: true },
            { label: "Tüm Haberler", href: "/tr/asg/tum-haberler", enabled: true },
            { label: "Yerel", href: "/kategori/yerel", enabled: true },
            { label: "Ankara", href: "/kategori/ankara", enabled: true },
            { label: "Gündem", href: "/kategori/gundem", enabled: true },
            { label: "Dünya", href: "/kategori/dunya", enabled: true },
            { label: "Ekonomi", href: "/kategori/ekonomi", enabled: true },
            { label: "Spor", href: "/kategori/spor", enabled: true },
            { label: "Künye", href: "/kunye", enabled: true },
            { label: "Video TV", href: "/video-tv", enabled: true },
          ],
        },
      },
      bundle: {
        featured: [
          { title: "Ankabir ziyareti", slug: "ankabir", imageUrl: "/api/media/uploads/hero.jpg" },
          { title: "İkinci", slug: "ikinci", imageUrl: "https://cdn.example/b.jpg" },
          { title: "Üçüncü", slug: "ucuncu" },
          { title: "Dördüncü", slug: "dorduncu" },
          { title: "Beşinci", slug: "besinci" },
        ],
      },
    });
    assert.match(html, /Ankara Şehir Gazetesi|logo\.png/);
    assert.equal(html.includes("data:image"), false);
    assert.match(html, /https:\/\/ankarasehirgazetesi\.com\/api\/media\/uploads\/hero\.jpg/);
    assert.match(html, />1<\/a>/);
    assert.match(html, />5<\/a>/);
    assert.match(html, /Tüm Haberler/);
    assert.match(html, /USD\/TRY/);
    assert.match(html, /Gram Altın/);
    assert.equal(html.includes("Manşet yükleniyor"), false);
  });

  it("raceHmHtmlBoot prefers edge cache and does not wait on origin", async () => {
    const cache = {
      store: new Map(),
      async match(req) {
        return this.store.get(typeof req === "string" ? req : req.url) || null;
      },
      async put(req, res) {
        this.store.set(typeof req === "string" ? req : req.url, res);
      },
    };
    const origin = "https://suhaber.net";
    await putHmEdgeCache(
      cache,
      `${origin}/api/hm/meta/by-slug/su?domain=suhaber.net`,
      new Response(JSON.stringify({ id: 2, slug: "su", displayName: "Su Haber" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await putHmEdgeCache(
      cache,
      `${origin}/api/hm/home-bundle?slug=su&sliderLimit=15`,
      new Response(JSON.stringify({ siteId: 2, featured: [{ title: "Manşet", slug: "manset" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    let originHits = 0;
    const boot = await raceHmHtmlBoot({
      fetchApi: async () => {
        originHits += 1;
        await new Promise((r) => setTimeout(r, 50));
        return new Response("{}", { status: 500 });
      },
      origin,
      env: {},
      incoming: new URL("https://suhaber.net/tr/su"),
      cache,
    });
    assert.equal(boot.fromCache, true);
    assert.equal(boot.siteId, 2);
    assert.equal(boot.bundle.featured[0].title, "Manşet");
    assert.equal(originHits, 0);
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
    assert.equal(isAhenkAgencyGeoPath("/haberler"), true);
    assert.equal(isAhenkAgencyGeoPath("/destek"), true);
    assert.equal(isAhenkAgencyGeoPath("/iletisim-kunye"), true);
    assert.equal(isAhenkAgencyGeoPath("/web-yazilimi"), true);
    assert.equal(isAhenkAgencyGeoPath("/avukat-sitesi"), true);
    assert.equal(isAhenkAgencyGeoPath("/ucretsiz-haber-sitesi"), true);
    assert.equal(isAhenkAgencyGeoPath("/aiaddin"), true);
    assert.equal(isAhenkAgencyGeoPath("/polis-ai"), true);
    assert.equal(isAhenkAgencyGeoPath("/cagri-merkezi-crm"), true);
    assert.equal(isAhenkAgencyGeoPath("/yapay-zeka-cagri-merkezi"), true);
    assert.equal(isAhenkAgencyGeoPath("/kariyer"), true);
    assert.equal(isAhenkAgencyGeoPath("/urun-satisi"), true);
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

  it("strips data: og:image so WhatsApp can load a real URL", () => {
    const dirty =
      '<meta property="og:image" content="https://vatanhaber.net/data:image/png;base64,AAA"/><script type="application/ld+json">{"logo":{"url":"https://vatanhaber.net/data:image/png;base64,AAA"}}</script>';
    const clean = sanitizeOgShareImages(dirty, "https://vatanhaber.net");
    assert.match(clean, /og:image" content="https:\/\/vatanhaber\.net\/apple-touch-icon\.png"/);
    assert.match(clean, /"url":"https:\/\/vatanhaber\.net\/apple-touch-icon\.png"/);
    assert.equal(clean.includes("data:image"), false);
  });
});
