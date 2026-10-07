/**
 * gundemi.org Traefik gap bridge.
 *
 * DNS A→187.77.84.201 (proxied) is live, but VPS Traefik has no Host() routers for
 * gundemi.org / *.gundemi.org yet → origin returns plain "404 page not found".
 *
 * Apex (turkatahaber domain2 alias): reverse-proxy PHP from turkatahaber.com and
 * keep the public host as gundemi.org.
 * Any *.gundemi.org subdomain (seed regionals + admin-created): caller serves SPA
 * assets until Traefik Host() rules exist (see hostinger/gundemi-bolge/traefik-gundemi.yml).
 * Catch-all Worker route `*.gundemi.org/*` covers new hosts without wrangler.toml edits.
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
 * when DNS + `*.gundemi.org/*` Worker route exist.
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

export function isPhpThemeAssetPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  if (/^\/assets\/theme\.(css|js)$/i.test(p)) return true;
  if (p.startsWith("/brand/")) return true;
  if (p.startsWith("/manset/")) return true;
  if (p.startsWith("/uploads/")) return true;
  if (p.startsWith("/gundemi/logos/")) return true;
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
 */
export function shouldBridgeGundemiApexPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "/";
  if (isSpaPanelPath(p)) return false;
  if (p.startsWith("/assets/")) return isPhpThemeAssetPath(p);
  return true;
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

/**
 * Reverse-proxy gundemi.org public pages to live turkatahaber.com PHP.
 * @returns {Promise<Response|null>}
 */
export async function gundemiApexPhpBridgeResponse(request, incoming) {
  if (!isGundemiApexBridgeHost(incoming.hostname)) return null;
  if (!shouldBridgeGundemiApexPath(incoming.pathname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const publicOrigin = turkataPublicOrigin(incoming.hostname);
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
  out.set("x-yekpare-frontend", "gundemi-php-bridge");
  out.set("x-yekpare-bridge-upstream", "turkatahaber.com");

  const ct = String(upstream.headers.get("content-type") || "").toLowerCase();
  if (request.method === "HEAD") {
    return new Response(null, { status: upstream.status, headers: out });
  }

  if (ct.includes("text/html") || ct.includes("text/css") || ct.includes("javascript") || ct.includes("json")) {
    const body = rewriteTurkataPublicUrls(await upstream.text(), publicOrigin);
    return new Response(body, { status: upstream.status, headers: out });
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
