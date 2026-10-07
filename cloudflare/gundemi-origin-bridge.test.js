import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isGundemiApexBridgeHost,
  isGundemiBridgeCatchAllHost,
  isGundemiOrgSubdomainHost,
  isGundemiRegionalHost,
  isPhpThemeAssetPath,
  shouldBlockGundemiSpaAssets,
  shouldBridgeGundemiApexPath,
  gundemiApexPhpBridgeResponse,
} from "./gundemi-origin-bridge.js";

describe("gundemi-origin-bridge hosts", () => {
  it("detects apex alias vs any *.gundemi.org subdomain (incl. new sites)", () => {
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
  });

  it("bridges PHP theme assets and HTML, not SPA panel/assets", () => {
    assert.equal(shouldBridgeGundemiApexPath("/"), true);
    assert.equal(shouldBridgeGundemiApexPath("/haber/foo"), true);
    assert.equal(shouldBridgeGundemiApexPath("/assets/theme.css"), true);
    assert.equal(shouldBridgeGundemiApexPath("/assets/theme.js"), true);
    assert.equal(shouldBridgeGundemiApexPath("/brand/turkata/logo.png"), true);
    assert.equal(shouldBridgeGundemiApexPath("/assets/index-abc123.js"), false);
    assert.equal(shouldBridgeGundemiApexPath("/editor"), false);
    assert.equal(shouldBridgeGundemiApexPath("/api/hm/meta/by-domain"), false);
    assert.equal(isPhpThemeAssetPath("/assets/theme.css"), true);
    assert.equal(isPhpThemeAssetPath("/assets/index.js"), false);
  });

  it("blocks SPA ASSETS for regional public pages; keeps panel", () => {
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/haber/x"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/assets/theme.css"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/editor"), false);
    assert.equal(shouldBlockGundemiSpaAssets("ege.gundemi.org", "/assets/index-abc.js"), false);
    assert.equal(shouldBlockGundemiSpaAssets("gundemi.org", "/"), true);
    assert.equal(shouldBlockGundemiSpaAssets("ahenk.net.tr", "/"), false);
  });
});

describe("gundemiApexPhpBridgeResponse", () => {
  it("returns Traefik-gap PHP page for regional hosts (never SPA)", async () => {
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

  it("returns null for SPA panel paths on apex", async () => {
    const incoming = new URL("https://gundemi.org/editor");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString()),
      incoming,
    );
    assert.equal(res, null);
  });

  it("proxies apex home and rewrites turkatahaber host", async () => {
    const incoming = new URL("https://gundemi.org/");
    const res = await gundemiApexPhpBridgeResponse(
      new Request(incoming.toString(), { headers: { accept: "text/html" } }),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-yekpare-frontend"), "gundemi-php-bridge");
    const html = await res.text();
    assert.match(html, /TÜRKATA|TürkAta|turkata/i);
    assert.equal(html.includes("https://turkatahaber.com/"), false);
    assert.match(html, /https:\/\/gundemi\.org/);
  });
});
