/**
 * Yekpare Cloudflare Worker
 * - SPA: env.ASSETS
 * - /api/* → API_ORIGIN (Neon-backed API host; default keeps site live)
 *
 * Containers opsiyonel: API_CONTAINER binding varsa aynı origin Container kullanılır.
 */
const EDGE_FETCH_TIMEOUT_MS = 4000;
const DEFAULT_API = "https://goalgo-y7ze.onrender.com";

const STATIC_XML = new Set(["/sitemap-static.xml", "/browserconfig.xml"]);

const LEAK_ORIGINS = [
  "https://goalgo-production.up.railway.app",
  "http://goalgo-production.up.railway.app",
  "https://goalgo-y7ze.onrender.com",
  "http://goalgo-y7ze.onrender.com",
];

const YEKTUBE_SPA_PREFIXES = [
  "/yp",
  "/muzik",
  "/cocuk",
  "/canli",
  "/yek-gonder",
  "/hesabim",
  "/studio",
  "/yektube-v2",
];

const YEKTUBE_FILE_MAP = {
  "/yp/sw.js": "/yektube-v2/sw.js",
  "/yp/manifest.webmanifest": "/yektube-v2/manifest.webmanifest",
  "/yp/yektube-icon.png": "/yektube-v2/yektube-icon.png",
  "/yp/yektube-logo.png": "/yektube-v2/yektube-logo.png",
  "/yp/yektube-video-tv-logo.png": "/yektube-v2/yektube-video-tv-logo.png",
  "/yp/offline.html": "/yektube-v2/offline.html",
};

function apiOrigin(env) {
  return String(env.API_ORIGIN || env.RENDER_API_ORIGIN || env.RAILWAY_API_ORIGIN || DEFAULT_API).replace(
    /\/+$/,
    "",
  );
}

function hasApiContainer(env) {
  return Boolean(env.API_CONTAINER);
}

function getApiStub(env) {
  return env.API_CONTAINER.getByName("primary");
}

async function proxyToApi(request, env) {
  if (hasApiContainer(env)) {
    try {
      return await getApiStub(env).fetch(request);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "api_container_unavailable", detail: String(err?.message || err) }),
        {
          status: 502,
          headers: { "content-type": "application/json", "x-yekpare-frontend": "ahenkpress-cloudflare" },
        },
      );
    }
  }

  const incoming = new URL(request.url);
  const target = `${apiOrigin(env)}${incoming.pathname}${incoming.search}`;
  try {
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");
    headers.delete("content-length");
    const init = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
    const upstream = await fetch(target, init);
    const out = new Headers(upstream.headers);
    out.delete("content-encoding");
    out.delete("transfer-encoding");
    out.set("x-yekpare-frontend", "ahenkpress-cloudflare");
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "upstream_unavailable", detail: String(err?.message || err) }),
      {
        status: 502,
        headers: { "content-type": "application/json", "x-yekpare-frontend": "ahenkpress-cloudflare" },
      },
    );
  }
}

async function apiFetch(request, env, pathnameAndSearch, init = {}) {
  if (hasApiContainer(env)) {
    const target = new URL(pathnameAndSearch, new URL(request.url).origin);
    return getApiStub(env).fetch(new Request(target.toString(), init));
  }
  const target = `${apiOrigin(env)}${pathnameAndSearch.startsWith("/") ? "" : "/"}${pathnameAndSearch}`;
  return fetch(target, { ...init, redirect: "manual", signal: init.signal ?? shortAbortSignal(EDGE_FETCH_TIMEOUT_MS) });
}

function agentLabsOrigin(env) {
  return String(env.AGENTLABS_URL || "").replace(/\/+$/, "");
}

function shortAbortSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

function withAssetPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

async function proxyUpstream(request, targetUrl) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  headers.delete("content-length");
  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  const upstream = await fetch(targetUrl, init);
  const out = new Headers(upstream.headers);
  out.delete("content-encoding");
  out.delete("transfer-encoding");
  out.set("x-yekpare-frontend", "ahenkpress-cloudflare");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

function rootSitemapApiPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/sitemap.xml") return "/api/sitemap/index.xml";
  const mHmCat = /^\/news-hm\/([^/]+)\/([^/]+)\.xml$/i.exec(p);
  if (mHmCat) return `/api/sitemap/news-hm/${mHmCat[1]}/${mHmCat[2]}.xml`;
  const mCat = /^\/news-yekpare-cat-(.+)\.xml$/i.exec(p);
  if (mCat) return `/api/sitemap/news-yekpare-cat-${mCat[1]}.xml`;
  const mHm = /^\/news-hm-(.+)\.xml$/i.exec(p);
  if (mHm) return `/api/sitemap/news-hm-${mHm[1]}.xml`;
  const mProducts = /^\/products-(\d+)\.xml$/i.exec(p);
  if (mProducts) return `/api/sitemap/products-${mProducts[1]}.xml`;
  const mYektubeVideos = /^\/yektube-videos-(\d+)\.xml$/i.exec(p);
  if (mYektubeVideos) return `/api/sitemap/yektube-videos-${mYektubeVideos[1]}.xml`;
  const known = new Set([
    "/news-yekpare.xml",
    "/news.xml",
    "/businesses.xml",
    "/vendors-siparis.xml",
    "/vendors-alisveris.xml",
    "/vendors-magaza.xml",
    "/turizm.xml",
    "/bilgiagaci.xml",
    "/vendor-blogs.xml",
    "/authors.xml",
    "/yektube-static.xml",
  ]);
  if (p === "/ansiklopedi.xml") return "/api/sitemap/bilgiagaci.xml";
  if (known.has(p)) return `/api/sitemap${p}`;
  return null;
}

function rewriteSitemapOrigins(xml, publicOrigin) {
  const canonical = publicOrigin.replace(/\/+$/, "");
  let out = xml;
  for (const bad of LEAK_ORIGINS) {
    if (out.includes(bad)) out = out.split(bad).join(canonical);
  }
  return out;
}

function xmlResponse(request, xml, cacheControl = "public, max-age=1800, stale-while-revalidate=86400") {
  const headers = new Headers({
    "content-type": "application/xml; charset=utf-8",
    "x-content-type-options": "nosniff",
    "cache-control": cacheControl,
    "x-yekpare-frontend": "ahenkpress-cloudflare",
  });
  if (request.method === "HEAD") {
    headers.set("content-length", String(new TextEncoder().encode(xml).byteLength));
    return new Response(null, { status: 200, headers });
  }
  return new Response(xml, { status: 200, headers });
}

async function proxySitemap(request, incoming, apiPath, env) {
  try {
    const upstream = await apiFetch(request, env, `${apiPath}${incoming.search}`, {
      method: request.method === "HEAD" ? "GET" : request.method,
      headers: {
        accept: "application/xml, text/xml, */*",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", ""),
      },
    });
    const ct = String(upstream.headers.get("content-type") ?? "").toLowerCase();
    if (!upstream.ok || (!ct.includes("xml") && !ct.includes("text/plain"))) return null;
    const text = rewriteSitemapOrigins(await upstream.text(), incoming.origin);
    const cache = upstream.headers.get("cache-control") || "public, max-age=1800, stale-while-revalidate=86400";
    return xmlResponse(request, text, cache);
  } catch {
    return null;
  }
}

function isSocialPreviewBot(userAgent) {
  const ua = String(userAgent ?? "").toLowerCase();
  return /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|bingbot|googlebot|duckduckbot|yandexbot|gptbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot|google-extended|applebot|cohere-ai|bytespider|meta-externalagent|amazonbot/.test(
    ua,
  );
}

function parsePortalExtraHosts(env) {
  return String(env.VITE_PORTAL_HOSTS || env.PORTAL_EXTRA_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
}

function isDefaultPortalHost(host, env) {
  const h = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
  return (
    h === "yekpare.net" ||
    h === "www.yekpare.net" ||
    h === "turknet.app" ||
    h === "www.turknet.app" ||
    h === "goalgo.org" ||
    h === "turkiye.li" ||
    h === "getirsepeti.com.tr" ||
    h === "ahenk.net.tr" ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".vercel.app") ||
    h.endsWith(".netlify.app") ||
    h.endsWith(".pages.dev") ||
    h.endsWith(".workers.dev") ||
    parsePortalExtraHosts(env).includes(h)
  );
}

function isStaticAssetPath(pathname) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/yektube-v2/") ||
    pathname.startsWith("/yp/") ||
    /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$/i.test(pathname)
  );
}

function isHmLegacyRedirectPath(pathOnly) {
  return (
    /^\/(?:etiket|tag|etiketler)(?:\/|$)/i.test(pathOnly) ||
    /^\/\d{4}\/\d{2}(?:\/|$)/.test(pathOnly) ||
    /^\/feed(?:\/|$)/i.test(pathOnly)
  );
}

function needsHmHostLookup(host, pathOnly, isBot, env) {
  if (isDefaultPortalHost(host, env)) return false;
  if (isBot) return true;
  if (pathOnly === "/llms.txt" || pathOnly === "/ai.txt") return true;
  return isHmLegacyRedirectPath(pathOnly);
}

function isPortalOgSharePath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (
    p === "/kesfet" ||
    p === "/haberler" ||
    p === "/siparis" ||
    p === "/alisveris" ||
    p === "/turizm" ||
    p === "/bilgiagaci" ||
    p === "/ansiklopedi" ||
    p === "/magaza"
  ) {
    return true;
  }
  if (p.startsWith("/bilgi/")) return true;
  if (p.startsWith("/bilgiagaci/") || p.startsWith("/ansiklopedi/")) return true;
  if (/^\/haberler\/rss\/[^/]+$/.test(p)) return true;
  if (/^\/(?:yp|yektube-v2)?\/kanal\/[^/]+\/[^/]+$/.test(p)) return true;
  if (/^\/kanal\/[^/]+\/[^/]+$/.test(p)) return true;
  if (/^\/(siparis\/satici|alisveris\/magaza|magaza\/magaza)\/[^/]+\/blog(?:\/[^/]+)?$/.test(p)) return true;
  return (
    /^\/siparis\/satici\/[^/]+$/.test(p) ||
    /^\/alisveris\/magaza\/[^/]+$/.test(p) ||
    /^\/magaza\/magaza\/[^/]+$/.test(p) ||
    /^\/magaza\/urun\/[^/]+$/.test(p) ||
    /^\/kesfet\/[^/]+$/.test(p) ||
    /^\/haber\/[^/]+$/.test(p) ||
    /^\/turizm\/[^/]+\/[^/]+$/.test(p)
  );
}

function isYektubeWatchPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return /^\/(?:yp|yektube-v2)?\/kanal\/[^/]+\/[^/]+$/.test(p) || /^\/kanal\/[^/]+\/[^/]+$/.test(p);
}

function isYektubeSpaPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return YEKTUBE_SPA_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

async function handleYektube(request, env) {
  const incoming = new URL(request.url);
  const pathOnly = incoming.pathname.replace(/\/+$/, "") || "/";
  const mapped = YEKTUBE_FILE_MAP[pathOnly] || YEKTUBE_FILE_MAP[incoming.pathname];
  if (mapped) return env.ASSETS.fetch(withAssetPath(request, mapped));
  if (isYektubeSpaPath(pathOnly) || isYektubeSpaPath(incoming.pathname)) {
    return env.ASSETS.fetch(withAssetPath(request, "/yektube-v2/index.html"));
  }
  return null;
}

async function handleCallCenter(request, env) {
  const base = agentLabsOrigin(env);
  if (!base) return null;
  const incoming = new URL(request.url);
  const p = incoming.pathname;
  if (p.startsWith("/call-center-api/")) {
    return proxyUpstream(request, `${base}/api/${p.slice("/call-center-api/".length)}${incoming.search}`);
  }
  if (p === "/call-center-app" || p === "/call-center-app/") {
    return proxyUpstream(request, `${base}/${incoming.search}`);
  }
  if (p.startsWith("/call-center-app/")) {
    return proxyUpstream(request, `${base}/${p.slice("/call-center-app/".length)}${incoming.search}`);
  }
  return null;
}

async function handleSitemap(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const incoming = new URL(request.url);
  const pathOnly = incoming.pathname.replace(/\/+$/, "") || "/";
  if (!pathOnly.endsWith(".xml") || STATIC_XML.has(pathOnly)) return null;
  const apiPath = rootSitemapApiPath(pathOnly);
  if (!apiPath) return null;
  const proxied = await proxySitemap(request, incoming, apiPath, env);
  if (proxied) return proxied;
  if (apiPath !== "/api/sitemap/index.xml") {
    return xmlResponse(
      request,
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
    );
  }
  return null;
}

async function handleSocialOg(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const incoming = new URL(request.url);
  const host = (incoming.hostname || "").toLowerCase();
  const pathOnly = incoming.pathname.replace(/\/+$/, "") || "/";
  if (isStaticAssetPath(incoming.pathname) && pathOnly !== "/llms.txt" && pathOnly !== "/ai.txt") return null;

  const ua = request.headers.get("user-agent") ?? "";
  const isBot = isSocialPreviewBot(ua);
  let hmBound = false;
  if (needsHmHostLookup(host, pathOnly, isBot, env)) {
    try {
      const domain = host.replace(/^www\./, "").split(":")[0];
      const res = await apiFetch(
        request,
        env,
        `/api/hm/meta/by-domain?domain=${encodeURIComponent(domain)}`,
        { headers: { accept: "application/json" } },
      );
      if (res.ok) {
        const meta = await res.json().catch(() => null);
        hmBound = Boolean(String(meta?.slug ?? meta?.data?.slug ?? "").trim());
      }
    } catch {
      hmBound = false;
    }
  }

  if (hmBound) {
    if (isHmLegacyRedirectPath(pathOnly)) {
      const dest = new URL("/sondakika", incoming.origin);
      dest.search = incoming.search;
      return Response.redirect(dest.toString(), 301);
    }
    if (pathOnly === "/llms.txt" || pathOnly === "/ai.txt") {
      const apiPath = pathOnly === "/llms.txt" ? "/api/hm/llms.txt" : "/api/hm/ai.txt";
      try {
        const upstream = await apiFetch(request, env, apiPath, {
          headers: { accept: "text/plain", "x-forwarded-host": incoming.host },
        });
        if (upstream.ok) {
          const headers = new Headers(upstream.headers);
          headers.set("cache-control", "public, max-age=3600");
          headers.set("x-yekpare-frontend", "ahenkpress-cloudflare");
          if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
          return new Response(upstream.body, { status: upstream.status, headers });
        }
      } catch {
        /* fallthrough */
      }
    }
  }

  if (!isBot) return null;

  const cleanPath = incoming.pathname.replace(/\/+$/, "") || "/";
  if (isYektubeWatchPath(cleanPath)) {
    try {
      const upstream = await apiFetch(
        request,
        env,
        `/api/video/og/watch-by-path?path=${encodeURIComponent(cleanPath)}&origin=${encodeURIComponent(incoming.origin)}`,
        { headers: { accept: "text/html", "user-agent": ua } },
      );
      if (upstream.ok) {
        const headers = new Headers(upstream.headers);
        headers.delete("content-encoding");
        headers.set("cache-control", "public, max-age=600, s-maxage=600");
        headers.set("x-yekpare-frontend", "ahenkpress-cloudflare");
        if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
        return new Response(upstream.body, { status: upstream.status, headers });
      }
    } catch {
      /* fallthrough */
    }
  }

  const isHmSlugPath = /^\/tr\/[^/]+(?:\/.*)?$/.test(cleanPath);
  const isPortalSharePath = (isDefaultPortalHost(host, env) || !hmBound) && isPortalOgSharePath(cleanPath);
  if (!isHmSlugPath && !hmBound && !isPortalSharePath) return null;

  try {
    const upstream = await apiFetch(
      request,
      env,
      `/api/public/og-html?path=${encodeURIComponent(cleanPath)}&origin=${encodeURIComponent(incoming.origin)}`,
      { headers: { accept: "text/html", "user-agent": ua } },
    );
    if (!upstream.ok) return null;
    const headers = new Headers(upstream.headers);
    headers.delete("content-encoding");
    headers.set("cache-control", "public, max-age=300, s-maxage=300");
    headers.set("x-yekpare-frontend", "ahenkpress-cloudflare");
    if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.pathname.startsWith("/api/")) return proxyToApi(request, env);

    const call = await handleCallCenter(request, env);
    if (call) return call;
    const sitemap = await handleSitemap(request, env);
    if (sitemap) return sitemap;
    const og = await handleSocialOg(request, env);
    if (og) return og;
    const yektube = await handleYektube(request, env);
    if (yektube) return yektube;

    const assetResp = await env.ASSETS.fetch(request);
    if (assetResp.status === 404 && request.method === "GET" && incoming.pathname.startsWith("/maps/place/")) {
      return env.ASSETS.fetch(withAssetPath(request, "/index.html"));
    }
    return assetResp;
  },
};
