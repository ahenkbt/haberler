/**
 * gundemi.org Traefik gap bridge — PHP only (no SPA public UI).
 *
 * DNS A→187.77.84.201 (proxied) is live, but VPS Traefik may lack Host() routers →
 * origin returns plain "404 page not found".
 *
 * Apex (turkatahaber domain2 alias): reverse-proxy PHP from turkatahaber.com and
 * keep the public host as gundemi.org.
 *
 * Regionals (*.gundemi.org): never serve SPA ASSETS for public HTML. Orange cloud
 * → Traefik Host / HostRegexp for `/`. Worker still owns `*.gundemi.org/assets/*`
 * for /editor SPA bundles — PHP theme.css/js must NOT 503; bridge them to the
 * shared Yenişafak PHP origin (turkatahaber). Logos: ASSETS `/gundemi/logos/*`.
 *
 * Ops: hostinger/gundemi-bolge/traefik-gundemi.yml + DEPLOY.md
 */

import { TURKATA_ORIGIN, isTurkataHaberHost, turkataPublicOrigin } from "./turkata-haber.js";

/** Seed / docs catalog — known regionals (any new *.gundemi.org also works). */
const GUNDEMI_REGIONAL_APEX = Object.freeze([
  "ege.gundemi.org",
  "marmara.gundemi.org",
  "karadeniz.gundemi.org",
  "icanadolu.gundemi.org",
  "doguanadolu.gundemi.org",
  "guneydogu.gundemi.org",
  "akdeniz.gundemi.org",
  "kibris.gundemi.org",
]);

const GUNDEMI_ZONE = "gundemi.org";

/** Panel / API paths already bound to Worker — never PHP-bridge these. */
const SPA_PANEL_PREFIXES = Object.freeze([
  "/editor",
  "/api/",
  "/admin",
  "/panel",
  "/haber-merkezi",
  "/yazar/giris",
  "/yazar/sifre",
  "/yazar/haber",
  "/koseyazari/giris",
  "/koseyazari/sifre",
  "/koseyazari/haber",
  "/tr/",
  "/hm/",
  "/sw.js",
  "/llms.txt",
  "/ai.txt",
  "/manifest.json",
]);

function normalizeHostname(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
}

export function listGundemiRegionalApexHosts() {
  return [...GUNDEMI_REGIONAL_APEX];
}

/**
 * Any subdomain under gundemi.org (not apex).
 * New admin-created hosts (e.g. yeni.gundemi.org) work without wrangler.toml edits
 * when DNS + Traefik HostRegexp exist (no Worker SPA catch-all).
 */
export function isGundemiOrgSubdomainHost(hostname) {
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  if (!host || host === GUNDEMI_ZONE) return false;
  return host.endsWith(`.${GUNDEMI_ZONE}`);
}

/** @deprecated Prefer isGundemiOrgSubdomainHost — kept for callers/tests. */
export function isGundemiRegionalHost(hostname) {
  return isGundemiOrgSubdomainHost(hostname);
}

/** Apex alias only (gundemi.org / www) — turkatahaber PHP bridge. */
export function isGundemiApexBridgeHost(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) return false;
  if (isGundemiOrgSubdomainHost(host)) return false;
  return isTurkataHaberHost(host) && normalizeHostname(host).replace(/^www\./, "") === GUNDEMI_ZONE;
}

export function isGundemiBridgeCatchAllHost(hostname) {
  return isGundemiApexBridgeHost(hostname) || isGundemiOrgSubdomainHost(hostname);
}

/** Regional logos ship in Worker ASSETS (ahenkpress public/gundemi/logos). */
export function isGundemiLogoAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/gundemi/logos/");
}

/**
 * Public gundemi hosts must never get SPA index.html from ASSETS.
 * Panel paths + hashed /assets/index-* + /gundemi/logos stay on Worker ASSETS.
 */
export function shouldBlockGundemiSpaAssets(hostname, pathname) {
  if (!isGundemiBridgeCatchAllHost(hostname)) return false;
  const p = String(pathname || "").split("?")[0] || "/";
  if (isSpaPanelPath(p)) return false;
  // Logos: CF ASSETS (same files as ahenk.net.tr/gundemi/logos/…).
  if (isGundemiLogoAssetPath(p)) return false;
  // Hashed SPA bundles under /assets/index-* may still be needed for /editor;
  // public theme paths and HTML navigations are blocked from SPA fallback.
  if (p.startsWith("/assets/") && !isPhpThemeAssetPath(p)) return false;
  return true;
}

export function isPhpThemeAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  if (/^\/assets\/theme\.(css|js)$/i.test(p)) return true;
  if (p.startsWith("/brand/")) return true;
  if (p.startsWith("/manset/")) return true;
  if (p.startsWith("/uploads/")) return true;
  if (isGundemiLogoAssetPath(p)) return true;
  return false;
}

function isSpaPanelPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  for (const prefix of SPA_PANEL_PREFIXES) {
    if (prefix.endsWith("/")) {
      if (p === prefix.slice(0, -1) || p.startsWith(prefix)) return true;
    } else if (p === prefix || p.startsWith(`${prefix}/`) || p.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Apex paths that must be fetched from turkatahaber PHP (not SPA ASSETS).
 * Non-theme /assets/* stay on Worker ASSETS for the editor bundle.
 * Regional logos are served from ASSETS (not bridged).
 */
export function shouldBridgeGundemiApexPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  if (isSpaPanelPath(p)) return false;
  if (isGundemiLogoAssetPath(p)) return false;
  if (p.startsWith("/assets/")) return isPhpThemeAssetPath(p);
  return true;
}

/**
 * Regional Worker-owned paths that must pull shared PHP theme bytes (not 503 gap HTML).
 * Kept for /assets/theme.* while `*.gundemi.org/assets/*` exists for /editor bundles.
 */
export function shouldProxyRegionalPhpThemeAsset(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  if (isGundemiLogoAssetPath(p)) return false;
  if (!isPhpThemeAssetPath(p)) return false;
  // Only paths the Worker still intercepts (assets route). brand/manset go orange→origin.
  return p.startsWith("/assets/") || p.startsWith("/brand/");
}

function rewriteTurkataPublicUrls(text, publicOrigin) {
  if (!text || !publicOrigin) return text;
  const apex = publicOrigin.replace(/^https:\/\//, "");
  return String(text)
    .replaceAll("https://turkatahaber.com", publicOrigin)
    .replaceAll("http://turkatahaber.com", publicOrigin)
    .replaceAll("//turkatahaber.com", `//${apex}`)
    .replaceAll("https://www.turkatahaber.com", publicOrigin)
    .replaceAll("http://www.turkatahaber.com", publicOrigin)
    .replaceAll("//www.turkatahaber.com", `//${apex}`);
}

function rewriteLocationHeader(location, publicOrigin) {
  if (!location) return location;
  try {
    const url = new URL(location, TURKATA_ORIGIN);
    const host = normalizeHostname(url.hostname);
    if (host === "turkatahaber.com" || host === "www.turkatahaber.com") {
      return `${publicOrigin}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    /* keep */
  }
  return location;
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "true-client-ip",
]);

function traefikGapHtml(host) {
  const h = String(host || "gundemi.org");
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PHP origin — ${h}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#122}
code{background:#f2f4f7;padding:.1rem .35rem;border-radius:4px}
</style>
</head>
<body>
<h1>PHP tema bekleniyor</h1>
<p><strong>${h}</strong> için SPA kapalı. VPS Traefik’te <code>Host()</code> / <code>HostRegexp</code> yoksa origin <code>404 page not found</code> döner.</p>
<p>Uygula: <code>hostinger/gundemi-bolge/traefik-gundemi.yml</code> → Yenişafak PHP service.</p>
<p>Panel: <a href="/editor">/editor</a></p>
</body>
</html>`;
}

/**
 * Reverse-proxy a path from live turkatahaber.com PHP (shared Yenişafak pack).
 * @param {{ rewriteHost: boolean, frontendTag: string }} opts
 * @returns {Promise<Response>}
 */
async function proxyTurkataPhpPath(request, incoming, opts) {
  const rewriteHost = opts?.rewriteHost !== false;
  const frontendTag = opts?.frontendTag || "gundemi-php-bridge";
  const publicOrigin = rewriteHost
    ? turkataPublicOrigin(incoming.hostname)
    : `https://${normalizeHostname(incoming.hostname)}`;
  const upstreamUrl = new URL(incoming.pathname + incoming.search, TURKATA_ORIGIN);

  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (key.toLowerCase() === "host") continue;
    headers.set(key, value);
  }
  headers.set("Host", "turkatahaber.com");
  headers.set("Accept-Encoding", "identity");

  let upstream;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      redirect: "manual",
      cf: { cacheTtl: 0 },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "gundemi_php_bridge_upstream",
        detail: String(err?.message || err).slice(0, 200),
      }),
      {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-yekpare-frontend": "gundemi-php-bridge-error",
        },
      },
    );
  }

  const out = new Headers();
  for (const [key, value] of upstream.headers) {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) continue;
    if (k === "content-encoding" || k === "content-length") continue;
    if (k === "location") {
      out.set("Location", rewriteLocationHeader(value, publicOrigin));
      continue;
    }
    out.append(key, value);
  }
  out.set("x-yekpare-frontend", frontendTag);
  out.set("x-yekpare-bridge-upstream", "turkatahaber.com");

  const ct = String(upstream.headers.get("content-type") || "").toLowerCase();
  if (request.method === "HEAD") {
    return new Response(null, { status: upstream.status, headers: out });
  }

  // theme.css/js: no host rewrite needed; HTML/JSON on apex still rewrite.
  if (rewriteHost && (ct.includes("text/html") || ct.includes("text/css") || ct.includes("javascript") || ct.includes("json"))) {
    const body = rewriteTurkataPublicUrls(await upstream.text(), publicOrigin);
    return new Response(body, { status: upstream.status, headers: out });
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

/**
 * Reverse-proxy gundemi.org public pages to live turkatahaber.com PHP.
 * Regionals: theme assets on Worker assets-route → shared PHP origin; logos → ASSETS;
 * leftover catch-all → Traefik-gap page (never SPA).
 * @returns {Promise<Response|null>}
 */
export async function gundemiApexPhpBridgeResponse(request, incoming) {
  if (isGundemiOrgSubdomainHost(incoming.hostname)) {
    if (!shouldBridgeGundemiApexPath(incoming.pathname)) return null;
    if (request.method !== "GET" && request.method !== "HEAD") return null;
    // Worker still owns *.gundemi.org/assets/* for /editor bundles. Theme CSS/JS
    // must come from Yenişafak PHP (same bytes as turkatahaber / VPS :8095), not 503 gap HTML.
    if (shouldProxyRegionalPhpThemeAsset(incoming.pathname)) {
      return proxyTurkataPhpPath(request, incoming, {
        rewriteHost: false,
        frontendTag: "gundemi-php-theme-asset",
      });
    }
    // SPA catch-all removed; if a catch-all still hits the Worker, never serve ASSETS.
    return new Response(traefikGapHtml(normalizeHostname(incoming.hostname).replace(/^www\./, "")), {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-yekpare-frontend": "gundemi-php-traefik-gap",
      },
    });
  }

  if (!isGundemiApexBridgeHost(incoming.hostname)) return null;
  if (!shouldBridgeGundemiApexPath(incoming.pathname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  return proxyTurkataPhpPath(request, incoming, {
    rewriteHost: true,
    frontendTag: "gundemi-php-bridge",
  });
}
