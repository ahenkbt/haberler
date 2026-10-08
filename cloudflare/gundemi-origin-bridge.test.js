import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isGundemiApexBridgeHost,
  isGundemiBridgeCatchAllHost,
  isFixHaberBridgeHost,
  isSosyalHizmetlerBridgeHost,
  isSosyalHizmetlerBrandAssetPath,
  isPhpThemeOriginBridgeHost,
  isGundemiLogoAssetPath,
  isGundemiOrgSubdomainHost,
  isGundemiRegionalHost,
  isPhpThemeAssetPath,
  isWorkerBrandStaticAssetPath,
  isYesilVatanBrandAssetPath,
  isTurksavBrandAssetPath,
  isYerelBrandAssetPath,
  isSehitgaziBrandAssetPath,
  isDunyaSaglikBrandAssetPath,
  appendYsLogoHeaderCssFix,
  YS_LOGO_HEADER_CSS_FIX,
  isPhpNewsBrandThemeHost,
  phpNewsBrandThemeCssBridgeResponse,
  shouldBlockGundemiSpaAssets,
  shouldBridgeGundemiApexPath,
  shouldProxyRegionalPhpThemeAsset,
  gundemiApexPhpBridgeResponse,
} from "./gundemi-origin-bridge.js";

describe("gundemi-origin-bridge hosts", () => {
  it("detects apex (own site) vs any *.gundemi.org subdomain", () => {
    assert.equal(isGundemiApexBridgeHost("gundemi.org"), true);
    assert.equal(isGundemiApexBridgeHost("www.gundemi.org"), true);
    assert.equal(isGundemiApexBridgeHost("ege.gundemi.org"), false);
    assert.equal(isGundemiApexBridgeHost("turkatahaber.com"), false);
    assert.equal(isGundemiRegionalHost("ege.gundemi.org"), true);
    assert.equal(isGundemiRegionalHost("www.ege.gundemi.org"), true);
    assert.equal(isGundemiRegionalHost("gundemi.org"), false);
    assert.equal(isGundemiOrgSubdomainHost("yeni.gundemi.org"), true);
    assert.equal(isGundemiOrgSubdomainHost("www.yeni.gundemi.org"), true);
    assert.equal(isGundemiOrgSubdomainHost("gundemi.org"), false);
    assert.equal(isGundemiBridgeCatchAllHost("akdeniz.gundemi.org"), true);
    assert.equal(isGundemiBridgeCatchAllHost("yeni.gundemi.org"), true);
    assert.equal(isGundemiBridgeCatchAllHost("gundemi.org"), true);
    assert.equal(isFixHaberBridgeHost("fix.tc"), true);
    assert.equal(isFixHaberBridgeHost("www.fix.tc"), true);
    assert.equal(isSosyalHizmetlerBridgeHost("sosyalhizmetler.tr"), true);
    assert.equal(isSosyalHizmetlerBridgeHost("www.sosyalhizmetler.tr"), true);
    assert.equal(isSosyalHizmetlerBrandAssetPath("/sosyalhizmetler/sosyalhizmetler-logo.webp"), true);
    assert.equal(isSosyalHizmetlerBrandAssetPath("/sh/sosyal-hizmetler-logo.png"), true);
    assert.equal(isWorkerBrandStaticAssetPath("/sosyalhizmetler/sosyalhizmetler-logo.webp"), true);
    assert.equal(isPhpThemeOriginBridgeHost("fix.tc"), true);
    assert.equal(isPhpThemeOriginBridgeHost("sosyalhizmetler.tr"), true);
    assert.equal(isPhpThemeOriginBridgeHost("ege.gundemi.org"), true);
  });

  it("bridges PHP theme assets and HTML paths (not SPA panel/assets)", () => {
    assert.equal(shouldBridgeGundemiApexPath("/"), true);
    assert.equal(shouldBridgeGundemiApexPath("/haber/foo"), true);
    assert.equal(shouldBridgeGundemiApexPath("/assets/theme.css"), true);
    assert.equal(shouldBridgeGundemiApexPath("/assets/theme.js"), true);
    assert.equal(shouldBridgeGundemiApexPath("/brand/turkata/logo.png"), true);
    assert.equal(shouldBridgeGundemiApexPath("/assets/index-abc123.js"), false);
    assert.equal(shouldBridgeGundemiApexPath("/editor"), false);
    assert.equal(shouldBridgeGundemiApexPath("/api/hm/meta/by-domain"), false);
    assert.equal(shouldBridgeGundemiApexPath("/gundemi/logos/akdeniz-gundemi.png"), false);
    assert.equal(isPhpThemeAssetPath("/assets/theme.css"), true);
    assert.equal(isPhpThemeAssetPath("/assets/index.js"), false);
    assert.equal(isGundemiLogoAssetPath("/gundemi/logos/akdeniz-gundemi.png"), true);
    assert.equal(isGundemiLogoAssetPath("/gundemi/logos/gundemi-org.png"), true);
    assert.equal(shouldProxyRegionalPhpThemeAsset("/assets/theme.css"), true);
    assert.equal(shouldProxyRegionalPhpThemeAsset("/assets/theme.js"), true);
    assert.equal(shouldProxyRegionalPhpThemeAsset("/brand/turkata/logo.png"), true);
    assert.equal(shouldProxyRegionalPhpThemeAsset("/gundemi/logos/akdeniz-gundemi.png"), false);
    assert.equal(shouldProxyRegionalPhpThemeAsset("/assets/index-abc.js"), false);
    assert.equal(shouldProxyRegionalPhpThemeAsset("/"), false);
  });

  it("blocks SPA ASSETS for regional public pages; keeps panel + logos + hashed bundles", () => {
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/haber/x"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/assets/theme.css"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/editor"), false);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/assets/index-abc.js"), false);
    assert.equal(
      shouldBlockGundemiSpaAssets("ege.gundemi.org", "/gundemi/logos/ege-gundemi.png"),
      false,
    );
    assert.equal(shouldBlockGundemiSpaAssets("gundemi.org", "/"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ahenk.net.tr", "/"), false);
  });
});

describe("gundemiApexPhpBridgeResponse", () => {
  it("returns Traefik-gap PHP page for regional HTML (never SPA)", async () => {
    const incoming = new URL("https://ege.gundemi.org/");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString()),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-traefik-gap");
    const html = await res.text();
    assert.match(html, /PHP tema bekleniyor|Traefik/i);
    assert.equal(html.includes("cloudflare-assets"), false);
  });

  it("proxies regional theme.css from PHP origin (not 503 gap)", async () => {
    const incoming = new URL("https://akdeniz.gundemi.org/assets/theme.css");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { method: "GET" }),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-theme-asset");
    assert.equal(res.headers.get("x-yekpare-bridge-upstream"), "turkatahaber.com");
    assert.equal(res.headers.get("x-yekpare-ys-logo-fix"), "v1");
    const ct = String(res.headers.get("content-type") || "").toLowerCase();
    assert.match(ct, /text\/css/);
    const body = await res.text();
    assert.ok(body.length > 1000);
    assert.equal(body.includes("PHP tema bekleniyor"), false);
    assert.match(body, /ys-logo-header-fix:v1/);
    assert.match(body, /object-fit:\s*contain/);
  });

  it("appendYsLogoHeaderCssFix is idempotent", () => {
    const once = appendYsLogoHeaderCssFix(".ys-logo img{height:64px}");
    const twice = appendYsLogoHeaderCssFix(once);
    assert.equal(once, twice);
  });

  it("proxies regional theme.js from PHP origin", async () => {
    const incoming = new URL("https://marmara.gundemi.org/assets/theme.js");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { method: "HEAD" }),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-theme-asset");
  });

  it("never returns Traefik-gap HTML for regional theme.css", async () => {
    const incoming = new URL("https://ege.gundemi.org/assets/theme.css");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { method: "GET" }),
      incoming,
    );
    assert.ok(res);
    assert.notEqual(res.headers.get("x-yekpare-frontend"), "gundemi-php-traefik-gap");
    assert.notEqual(res.status, 503);
  });

  it("returns null for regional logos so Worker ASSETS can serve them", async () => {
    const incoming = new URL("https://akdeniz.gundemi.org/gundemi/logos/akdeniz-gundemi.png");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString()),
      incoming,
    );
    assert.equal(res, null);
  });

  it("returns null for fix.tc brand assets (Worker /fix/* route)", async () => {
    const incoming = new URL("https://fix.tc/fix/fix-haber-logo.png");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { method: "GET" }),
      incoming,
    );
    assert.equal(res, null);
  });

  it("treats /yesilvatan/* as Worker brand static path", () => {
    assert.equal(isWorkerBrandStaticAssetPath("/yesilvatan/yesilvatan-logo.png"), true);
    assert.equal(isYesilVatanBrandAssetPath("/yesilvatan/yesilvatan-logo.png"), true);
  });

  it("treats /turksav/* as Worker brand static path", () => {
    assert.equal(isWorkerBrandStaticAssetPath("/turksav/turksav-logo.png"), true);
    assert.equal(isTurksavBrandAssetPath("/turksav/turksav-logo.png"), true);
  });

  it("treats /yerel/* and /sehitgazi/* as Worker brand static paths", () => {
    assert.equal(isWorkerBrandStaticAssetPath("/yerel/yerel-logo.png"), true);
    assert.equal(isYerelBrandAssetPath("/yerel/yerel-logo.png"), true);
    assert.equal(isWorkerBrandStaticAssetPath("/sehitgazi/sehitgazi-logo.png"), true);
    assert.equal(isSehitgaziBrandAssetPath("/sehitgazi/sehitgazi-logo.png"), true);
  });

  it("treats /dunyasaglik/* as Worker brand static path", () => {
    assert.equal(isWorkerBrandStaticAssetPath("/dunyasaglik/dunyasaglik-logo.png"), true);
    assert.equal(isDunyaSaglikBrandAssetPath("/dunyasaglik/dunyasaglik-logo.png"), true);
  });

  it("appends ys-logo-header-fix once to theme.css text", () => {
    const once = appendYsLogoHeaderCssFix(".ys-logo img{height:64px}");
    assert.match(once, /ys-logo-header-fix:v1/);
    assert.match(once, /max-height:\s*64px/);
    const twice = appendYsLogoHeaderCssFix(once);
    assert.equal(twice.split("ys-logo-header-fix:v1").length - 1, 1);
    assert.match(YS_LOGO_HEADER_CSS_FIX, /object-fit:\s*contain/);
  });

  it("detects PHP news brand theme hosts without owning HTML bridge", () => {
    assert.equal(isPhpNewsBrandThemeHost("yesilvatan.gen.tr"), true);
    assert.equal(isPhpNewsBrandThemeHost("www.yerel.net.tr"), true);
    assert.equal(isPhpNewsBrandThemeHost("dunyasaglik.org"), true);
    assert.equal(isPhpNewsBrandThemeHost("ege.gundemi.org"), false);
  });

  it("bridges only theme.css for yesilvatan brand host", async () => {
    const theme = new URL("https://yesilvatan.gen.tr/assets/theme.css");
    const themeRes = await phpNewsBrandThemeCssBridgeResponse(
      new Request(theme.toString()),
      theme,
    );
    assert.ok(themeRes);
    assert.equal(themeRes.status, 200);
    assert.equal(themeRes.headers.get("x-yekpare-ys-logo-fix"), "v1");
    assert.equal(themeRes.headers.get("x-yekpare-php-concept-colors"), "v1");
    const css = await themeRes.text();
    assert.match(css, /hm-php-concept-colors:yesilvatan/);
    assert.match(css, /ys-logo-header-fix:v1/);

    const home = new URL("https://yesilvatan.gen.tr/");
    const homeRes = await phpNewsBrandThemeCssBridgeResponse(
      new Request(home.toString()),
      home,
    );
    assert.equal(homeRes, null);
  });

  it("returns null for SPA panel paths on apex", async () => {
    const incoming = new URL("https://gundemi.org/editor");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString()),
      incoming,
    );
    assert.equal(res, null);
  });

  it("apex home is Traefik-gap (own site), NOT turkatahaber HTML bridge", async () => {
    const incoming = new URL("https://gundemi.org/");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { headers: { accept: "text/html" } }),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-traefik-gap");
    const html = await res.text();
    assert.match(html, /PHP tema bekleniyor|Traefik/i);
    assert.match(html, /turkatahaber alias değil/i);
    assert.equal(html.includes("https://turkatahaber.com"), false);
  });

  it("apex theme.css still proxies shared PHP pack", async () => {
    const incoming = new URL("https://gundemi.org/assets/theme.css");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { method: "GET" }),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-theme-asset");
  });

  it("fix.tc theme.css proxies shared PHP pack (Worker assets route)", async () => {
    const incoming = new URL("https://fix.tc/assets/theme.css");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { method: "GET" }),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-theme-asset");
  });

  it("sosyalhizmetler.tr theme.css proxies shared PHP pack (Worker assets route)", async () => {
    const incoming = new URL("https://sosyalhizmetler.tr/assets/theme.css");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { method: "GET" }),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-theme-asset");
  });
});

describe("ys logo header css fix", () => {
  it("appends once", () => {
    const once = appendYsLogoHeaderCssFix(":root{--ys-accent:#c8102e}");
    assert.match(once, /ys-logo-header-fix:v1/);
    assert.match(once, /max-height:\s*64px/);
    const twice = appendYsLogoHeaderCssFix(once);
    assert.equal(twice, once);
  });
});

describe("theme asset edge cache", () => {
  it("MISS stores per host, then HIT without upstream; STALE triggers one refresh", async () => {
    const store = new Map();
    const prevCaches = globalThis.caches;
    const prevFetch = globalThis.fetch;
    let upstreamCalls = 0;
    globalThis.caches = {
      default: {
        async match(key) {
          const v = store.get(String(key));
          return v ? new Response(v.body, { status: 200, headers: v.headers }) : undefined;
        },
        async put(key, res) {
          store.set(String(key), { body: await res.text(), headers: new Headers(res.headers) });
        },
      },
    };
    globalThis.fetch = async () => {
      upstreamCalls += 1;
      return new Response(":root{--ys-accent:#c8102e}", { status: 200, headers: { "content-type": "text/css" } });
    };
    try {
      const mk = (u) => {
        const incoming = new URL(u);
        return gundemiApexPhpBridgeResponse(new Request(incoming.toString(), { method: "GET" }), incoming);
      };
      const a = await mk("https://ege.gundemi.org/assets/theme.css");
      assert.equal(a.headers.get("x-hm-edge-cache"), "MISS");
      assert.equal(upstreamCalls, 1);
      const b = await mk("https://ege.gundemi.org/assets/theme.css");
      assert.equal(b.headers.get("x-hm-edge-cache"), "HIT");
      assert.equal(upstreamCalls, 1);
      assert.match(await b.text(), /ys-accent/);
      assert.match(b.headers.get("cache-control"), /stale-while-revalidate/);
      // Per-host key: another host misses.
      const c = await mk("https://fix.tc/assets/theme.css");
      assert.equal(c.headers.get("x-hm-edge-cache"), "MISS");
      assert.equal(upstreamCalls, 2);
      // Age the ege entry past TTL -> STALE + background refresh.
      for (const [k, v] of store) {
        if (k.includes("ege.gundemi.org")) v.headers.set("x-hm-edge-cached-at", String(Date.now() - 10 * 60_000));
      }
      const jobs = [];
      const incoming = new URL("https://ege.gundemi.org/assets/theme.css");
      const d = await gundemiApexPhpBridgeResponse(new Request(incoming.toString()), incoming, {
        waitUntil: (p) => jobs.push(p),
      });
      assert.equal(d.headers.get("x-hm-edge-cache"), "STALE");
      await Promise.all(jobs);
      assert.equal(upstreamCalls, 3);
    } finally {
      globalThis.caches = prevCaches;
      globalThis.fetch = prevFetch;
    }
  });
});
