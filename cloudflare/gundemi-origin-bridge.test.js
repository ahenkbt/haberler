import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isGundemiApexBridgeHost,
  isGundemiBridgeCatchAllHost,
  isFixHaberBridgeHost,
  isSosyalHizmetlerBridgeHost,
  isPhpThemeOriginBridgeHost,
  isGundemiLogoAssetPath,
  isGundemiOrgSubdomainHost,
  isGundemiRegionalHost,
  isPhpThemeAssetPath,
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
    const ct = String(res.headers.get("content-type") || "").toLowerCase();
    assert.match(ct, /text\/css/);
    const body = await res.text();
    assert.ok(body.length > 1000);
    assert.equal(body.includes("PHP tema bekleniyor"), false);
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
