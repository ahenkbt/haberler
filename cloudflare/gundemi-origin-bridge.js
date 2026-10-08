/**
 * gundemi.org Traefik gap bridge — PHP only (no SPA public UI).
 *
 * DNS A→187.77.84.201 (proxied). VPS Traefik Host(`gundemi.org`) + HostRegexp
 * → Yenişafak PHP (`127.0.0.1:8095`). Apex is its OWN HM site (slug `gundemi`),
 * NOT a turkatahaber.com alias — do not reverse-proxy apex HTML to turkatahaber.
 *
 * Apex + regionals: orange cloud → Traefik when Worker catch-all is absent.
 * If Worker still owns a path (assets/theme, leftover catch-all):
 *   - theme.css/js → shared Yenişafak pack (turkatahaber origin bytes, no host rewrite)
 *   - public HTML → Traefik-gap page (never SPA, never turkatahaber rewrite)
 * Logos: ASSETS `/gundemi/logos/*` (also on VPS `:8095` as backup).
 *
 * Ops: hostinger/gundemi-bolge/traefik-gundemi.yml + DEPLOY.md
 */

import { phpThemeChromeCssPrefix } from "./hm-php-concept-colors.js";
import { TURKATA_ORIGIN } from "./turkata-haber.js";

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

/**
 * Apex gundemi.org / www — own HM site (not turkatahaber).
 * Used for SPA-block + Traefik-gap / theme-asset handling when Worker still sees the path.
 */
export function isGundemiApexBridgeHost(hostname) {
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  return host === GUNDEMI_ZONE;
}

export function isFixHaberBridgeHost(hostname) {
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  return host === "fix.tc";
}

export function isSosyalHizmetlerBridgeHost(hostname) {
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  return host === "sosyalhizmetler.tr";
}

export function isGundemiBridgeCatchAllHost(hostname) {
  return isGundemiApexBridgeHost(hostname) || isGundemiOrgSubdomainHost(hostname);
}

/** Concept Yenişafak PHP news hosts — Worker `/assets/*` may proxy theme.css. */
export function isPhpConceptNewsThemeHost(hostname) {
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  return (
    host === "yesilvatan.gen.tr" ||
    host === "yerel.net.tr" ||
    host === "turkatahaber.com" ||
    host === "sehitgazi.org.tr" ||
    host === "turksav.org" ||
    host === "dunyasaglik.org"
  );
}

/** Worker-owned PHP theme paths (gundemi + custom PHP apex assets routes). */
export function isPhpThemeOriginBridgeHost(hostname) {
  return (
    isGundemiBridgeCatchAllHost(hostname) ||
    isFixHaberBridgeHost(hostname) ||
    isSosyalHizmetlerBridgeHost(hostname) ||
    isPhpConceptNewsThemeHost(hostname)
  );
}

/** Regional logos ship in Worker ASSETS (ahenkpress public/gundemi/logos). */
export function isGundemiLogoAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/gundemi/logos/");
}

/** Fix Haber marka dosyaları — Worker ASSETS (`public/fix/*`). */
export function isFixHaberBrandAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/fix/");
}

/** Sosyal Hizmetler marka dosyaları — Worker ASSETS (`public/sh/*`). */
export function isSosyalHizmetlerBrandAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/sh/");
}

/** Yeşil Vatan marka dosyaları — Worker ASSETS (`public/yesilvatan/*`). */
export function isYesilVatanBrandAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/yesilvatan/");
}

/** TürkSav marka dosyaları — Worker ASSETS (`public/turksav/*`). */
export function isTurksavBrandAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/turksav/");
}

/** Yerel Haber marka dosyaları — Worker ASSETS (`public/yerel/*`). */
export function isYerelBrandAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/yerel/");
}

/** Şehit Gazi marka dosyaları — Worker ASSETS (`public/sehitgazi/*`). */
export function isSehitgaziBrandAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/sehitgazi/");
}

/** Dünya Sağlık marka dosyaları — Worker ASSETS (`public/dunyasaglik/*`). */
export function isDunyaSaglikBrandAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  return p.startsWith("/dunyasaglik/");
}

export function isWorkerBrandStaticAssetPath(pathname) {
  return (
    isGundemiLogoAssetPath(pathname) ||
    isFixHaberBrandAssetPath(pathname) ||
    isSosyalHizmetlerBrandAssetPath(pathname) ||
    isYesilVatanBrandAssetPath(pathname) ||
    isTurksavBrandAssetPath(pathname) ||
    isYerelBrandAssetPath(pathname) ||
    isSehitgaziBrandAssetPath(pathname) ||
    isDunyaSaglikBrandAssetPath(pathname)
  );
}

/** Appended to proxied `/assets/theme.css` so header logos fill ~48–72px without canvas padding. */
export const YS_LOGO_HEADER_CSS_FIX = `/* ys-logo-header-fix:v1 */
.ys-logo img,
.ys-logo .ys-logo-img {
  height: auto !important;
  max-height: 64px;
  width: auto;
  max-width: min(280px, 46vw);
  object-fit: contain;
  display: block;
}
.ys-bar { padding-top: 6px; padding-bottom: 6px; min-height: 72px; }
.ys-preset-nefes .ys-logo img { max-height: 72px; }
@media (max-width: 900px) {
  .ys-logo img, .ys-logo .ys-logo-img { max-height: 48px; }
  .ys-bar.has-ad .ys-logo img { max-height: 44px; max-width: 42vw; }
}
`;

export function appendYsLogoHeaderCssFix(cssText) {
  const raw = String(cssText || "");
  if (raw.includes("ys-logo-header-fix:v1")) return raw;
  return `${raw.trimEnd()}\n\n${YS_LOGO_HEADER_CSS_FIX}`;
}

/** Prepend host concept chrome vars onto proxied `/assets/theme.css` (nav/navy). */
export function decoratePhpThemeCss(cssText, hostname) {
  const chrome = phpThemeChromeCssPrefix(hostname);
  const body = String(cssText || "");
  if (!chrome || body.includes("hm-php-concept-colors:")) return body;
  return `${chrome}${body}`;
}

/** PHP news brand hosts that share Yenişafak `/assets/theme.css` (not Traefik-gap HTML). */
export function isPhpNewsBrandThemeHost(hostname) {
  const host = normalizeHostname(hostname).replace(/^www\./, "");
  return (
    host === "yesilvatan.gen.tr" ||
    host === "yerel.net.tr" ||
    host === "turksav.org" ||
    host === "sehitgazi.org.tr" ||
    host === "dunyasaglik.org" ||
    host === "turkatahaber.com" ||
    host === "fix.tc"
  );
}

/**
 * Only `/assets/theme.css` for PHP news brands — inject concept chrome + logo size fix.
 * Does not own HTML (orange→PHP origin stays intact).
 * @returns {Promise<Response|null>}
 */
export async function phpNewsBrandThemeCssBridgeResponse(request, incoming, opts) {
  if (!isPhpNewsBrandThemeHost(incoming.hostname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const pathOnly = String(incoming.pathname || "").split("?")[0] || "/";
  if (!/\/assets\/theme\.css$/i.test(pathOnly)) return null;
  return cachedSharedPhpThemePath(request, incoming, {
    frontendTag: "php-news-brand-theme-css",
    waitUntil: opts?.waitUntil,
  });
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
  if (isWorkerBrandStaticAssetPath(p)) return true;
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
 * Paths that must leave Worker ASSETS / panel alone.
 * Logos stay on ASSETS; hashed SPA /assets/* stay for /editor.
 */
export function shouldBridgeGundemiApexPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  if (isSpaPanelPath(p)) return false;
  if (isWorkerBrandStaticAssetPath(p)) return false;
  if (p.startsWith("/assets/")) return isPhpThemeAssetPath(p);
  return true;
}

/**
 * Worker-owned theme paths that must pull shared PHP theme bytes (not 503 gap HTML).
 * Kept for /assets/theme.* while `*.gundemi.org/assets/*` (and apex assets) exist for /editor.
 */
export function shouldProxyRegionalPhpThemeAsset(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  if (isGundemiLogoAssetPath(p)) return false;
  if (!isPhpThemeAssetPath(p)) return false;
  // Only paths the Worker still intercepts (assets route). brand/manset go orange→origin.
  return p.startsWith("/assets/") || p.startsWith("/brand/");
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
<p>Apex <code>gundemi.org</code> kendi HM sitesidir (turkatahaber alias değil).</p>
<p>Panel: <a href="/editor">/editor</a></p>
</body>
</html>`;
}

/**
 * Fetch shared Yenişafak theme bytes from live turkatahaber.com PHP pack
 * (same container as VPS :8095). No public-host rewrite — theme assets are host-agnostic.
 * @returns {Promise<Response>}
 */
async function proxySharedPhpThemePath(request, incoming, opts) {
  const frontendTag = opts?.frontendTag || "gundemi-php-theme-asset";
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
          "cache-control": "no-store",
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
    if (k === "age" || k === "cf-cache-status") continue;
    out.append(key, value);
  }
  out.set("x-yekpare-frontend", frontendTag);
  out.set("x-yekpare-bridge-upstream", "turkatahaber.com");

  if (request.method === "HEAD") {
    return new Response(null, { status: upstream.status, headers: out });
  }

  const pathOnly = String(incoming.pathname || "").split("?")[0] || "/";
  const ct = String(upstream.headers.get("content-type") || "").toLowerCase();
  if (/theme\.css$/i.test(pathOnly) && upstream.ok && ct.includes("text/css")) {
    const chrome = phpThemeChromeCssPrefix(incoming.hostname);
    const body = appendYsLogoHeaderCssFix(
      decoratePhpThemeCss(await upstream.text(), incoming.hostname),
    );
    out.set("content-type", "text/css; charset=utf-8");
    out.set("x-yekpare-ys-logo-fix", "v1");
    if (chrome) out.set("x-yekpare-php-concept-colors", "v1");
    out.set("cache-control", "public, max-age=300");
    return new Response(body, { status: upstream.status, headers: out });
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

/**
 * Edge cache for per-host theme.css / theme.js (2026-10-08).
 * Before: every request re-fetched turkatahaber.com/assets/theme.* from the PHP origin and re-decorated it
 * (0.3–0.9 s). Now: caches.default, key per host (+query), fresh for THEME_EDGE_TTL_S, then served stale
 * for up to THEME_EDGE_SWR_S while one background refresh runs. Only 200 + css/js bodies are stored.
 */
export const THEME_EDGE_TTL_S = 120;
export const THEME_EDGE_SWR_S = 86400;
const THEME_EDGE_CACHED_AT = "x-hm-edge-cached-at";
const themeEdgeRefreshing = new Set();

export function themeEdgeCacheKeyUrl(incoming) {
  const host = normalizeHostname(incoming.hostname).replace(/^www\./, "");
  const pathOnly = String(incoming.pathname || "").split("?")[0] || "/";
  const u = new URL(`https://${host}${pathOnly}`);
  u.search = String(incoming.search || "");
  u.searchParams.set("__hm_theme_edge", "v1");
  return u.toString();
}

function themeEdgeCacheable(request, incoming) {
  if (request.method !== "GET") return false;
  if (typeof caches === "undefined" || !caches?.default) return false;
  const pathOnly = String(incoming.pathname || "").split("?")[0] || "/";
  return /\/assets\/theme\.(css|js)$/i.test(pathOnly);
}

function themeEdgeStorable(res) {
  if (!res || res.status !== 200) return false;
  const ct = String(res.headers.get("content-type") || "").toLowerCase();
  return ct.includes("text/css") || ct.includes("javascript") || ct.includes("ecmascript");
}

function withThemeEdgeHeaders(res, state, ageS) {
  const h = new Headers(res.headers);
  h.delete(THEME_EDGE_CACHED_AT);
  h.set("x-hm-edge-cache", state);
  if (ageS != null) h.set("x-hm-edge-age", String(Math.max(0, Math.round(ageS))));
  h.set("cache-control", `public, max-age=${THEME_EDGE_TTL_S}, stale-while-revalidate=${THEME_EDGE_SWR_S}`);
  return new Response(res.body, { status: res.status, headers: h });
}

async function themeEdgeFetchAndStore(request, incoming, opts, key) {
  const res = await proxySharedPhpThemePath(request, incoming, opts);
  if (!themeEdgeStorable(res)) return { res, stored: false };
  try {
    const copy = res.clone();
    const h = new Headers(copy.headers);
    h.set(THEME_EDGE_CACHED_AT, String(Date.now()));
    h.set("cache-control", `public, max-age=${THEME_EDGE_TTL_S + THEME_EDGE_SWR_S}`);
    h.delete("set-cookie");
    await caches.default.put(key, new Response(copy.body, { status: 200, headers: h }));
    return { res, stored: true };
  } catch {
    return { res, stored: false };
  }
}

async function cachedSharedPhpThemePath(request, incoming, opts) {
  if (!themeEdgeCacheable(request, incoming)) return proxySharedPhpThemePath(request, incoming, opts);
  const key = themeEdgeCacheKeyUrl(incoming);
  let hit = null;
  try {
    hit = await caches.default.match(key);
  } catch {
    hit = null;
  }
  if (hit) {
    const cachedAt = Number(hit.headers.get(THEME_EDGE_CACHED_AT) || 0);
    const ageS = cachedAt > 0 ? (Date.now() - cachedAt) / 1000 : Number.POSITIVE_INFINITY;
    if (ageS < THEME_EDGE_TTL_S) return withThemeEdgeHeaders(hit, "HIT", ageS);
    if (ageS < THEME_EDGE_TTL_S + THEME_EDGE_SWR_S) {
      if (!themeEdgeRefreshing.has(key)) {
        themeEdgeRefreshing.add(key);
        const job = themeEdgeFetchAndStore(new Request(request.url, { method: "GET", headers: request.headers }), incoming, opts, key)
          .catch(() => null)
          .finally(() => themeEdgeRefreshing.delete(key));
        if (typeof opts?.waitUntil === "function") opts.waitUntil(job);
      }
      return withThemeEdgeHeaders(hit, "STALE", ageS);
    }
  }
  const { res, stored } = await themeEdgeFetchAndStore(request, incoming, opts, key);
  return stored ? withThemeEdgeHeaders(res, "MISS", 0) : res;
}

/**
 * Theme under Worker `*.gundemi.org/assets/*` (and apex assets). Never emit Traefik-gap HTML
 * (browsers would treat 503 HTML as CSS → unstyled sites).
 */
async function proxyRegionalPhpThemeAsset(request, incoming, opts) {
  const res = await cachedSharedPhpThemePath(request, incoming, {
    frontendTag: "gundemi-php-theme-asset",
    waitUntil: opts?.waitUntil,
  });
  const ct = String(res.headers.get("content-type") || "").toLowerCase();
  const p = String(incoming.pathname || "").split("?")[0] || "/";
  const okCss = /theme\.css$/i.test(p) && ct.includes("text/css") && res.status === 200;
  const okJs = /theme\.js$/i.test(p) && (ct.includes("javascript") || ct.includes("ecmascript")) && res.status === 200;
  const okOther = res.status === 200 && !ct.includes("text/html");
  if (okCss || okJs || (!/theme\.(css|js)$/i.test(p) && okOther)) {
    return res;
  }
  return new Response(
    JSON.stringify({
      error: "gundemi_php_theme_asset_unavailable",
      status: res.status,
      contentType: ct || null,
    }),
    {
      status: 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-yekpare-frontend": "gundemi-php-theme-asset-error",
      },
    },
  );
}

/**
 * Apex + regionals: theme assets from shared PHP pack; public HTML → Traefik-gap
 * (never SPA, never turkatahaber HTML rewrite). Prefer orange→origin when catch-all removed.
 * @returns {Promise<Response|null>}
 */
export async function gundemiApexPhpBridgeResponse(request, incoming, opts) {
  if (!isPhpThemeOriginBridgeHost(incoming.hostname)) return null;
  if (!shouldBridgeGundemiApexPath(incoming.pathname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  // Worker still owns */assets/* for /editor bundles. Theme CSS/JS
  // must come from Yenişafak PHP pack, never 503 gap HTML.
  if (shouldProxyRegionalPhpThemeAsset(incoming.pathname)) {
    return proxyRegionalPhpThemeAsset(request, incoming, opts);
  }

  // Concept news hosts: only theme assets are bridged (HTML stays orange→PHP origin).
  if (isPhpConceptNewsThemeHost(incoming.hostname)) {
    return null;
  }

  // Defensive: theme-shaped paths must never fall through to gap HTML (unstyled sites).
  if (isPhpThemeAssetPath(incoming.pathname) && String(incoming.pathname).startsWith("/assets/")) {
    return new Response(
      JSON.stringify({ error: "gundemi_php_theme_asset_unrouted", path: incoming.pathname }),
      {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-yekpare-frontend": "gundemi-php-theme-asset-error",
        },
      },
    );
  }

  // Public HTML: never proxy to turkatahaber. Traefik Host should serve own Neon site.
  return new Response(traefikGapHtml(normalizeHostname(incoming.hostname).replace(/^www\./, "")), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-yekpare-frontend": "gundemi-php-traefik-gap",
    },
  });
}
