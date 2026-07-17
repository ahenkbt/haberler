/**
 * Geçici: trafik → Render (SPA + API).
 * Eski Netlify Service Worker / cache için TEK SEFERLIK purge (JS boot + cookie).
 * Clear-Site-Data HTML yanıtlarında kullanılmaz — Chrome navigasyonu ERR_FAILED
 * ile düşürüp cookie yazılmadan döngüye sokabiliyor (yekpare.net/admin).
 */

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";
/**
 * Cookie sürümü — artırınca tüm ziyaretçilerde Netlify SW yeniden temizlenir.
 * (Eski cookie ile purge atlanınca /tr/vkd Netlify 404 görünmeye devam ediyordu.)
 */
const PURGE_COOKIE = "__yekpare_sw_purged_v20260715c";
/**
 * HM + portal: bir kez daha agresif Clear-Site-Data.
 */
const FORCE_PURGE_HOSTS = new Set([
  "yekpare.net",
  "www.yekpare.net",
  "haberler.ahenkbt.workers.dev",
  "vatanhaber.net",
  "www.vatanhaber.net",
  "vatankahramanlari.org",
  "www.vatankahramanlari.org",
  "ankarasehirgazetesi.com",
  "www.ankarasehirgazetesi.com",
  "ankarahabergundemi.com",
  "www.ankarahabergundemi.com",
  "suhaberajansi.com",
  "www.suhaberajansi.com",
]);
const FORCE_PURGE_COOKIE = "__yekpare_sw_purged_hm_20260715e";

const PORTAL_HOSTS = new Set([
  "yekpare.net",
  "www.yekpare.net",
  "turknet.app",
  "www.turknet.app",
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
  "ahenk.net.tr",
  "haberler.ahenkbt.workers.dev",
]);

/** Eski Netlify SW'yi öldürür; kendini de kaldırır. */
const KILL_SW = `/* yekpare-netlify-purge */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) {}
    try {
      await self.registration.unregister();
    } catch (_) {}
    try {
      const clientsList = await self.clients.matchAll({ type: 'window' });
      for (const c of clientsList) {
        try { c.navigate(c.url); } catch (_) {}
      }
    } catch (_) {}
  })());
});
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
`;

/** Tek seferlik SW unregister (+ gerektiğinde bir reload). Cookie ile tekrarlanmaz. */
function purgeBootScript(cookieName) {
  return `
<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var done = false;
  var COOKIE = ${JSON.stringify(cookieName)};
  function hasPurgeCookie() {
    try {
      return document.cookie.split(';').some(function (c) {
        return c.trim().indexOf(COOKIE + '=1') === 0;
      });
    } catch (_) { return false; }
  }
  function purge() {
    if (done || hasPurgeCookie()) return;
    done = true;
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.unregister(); }));
    }).then(function () {
      if (!window.caches) return;
      return caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      });
    }).then(function () {
      try {
        // Netlify / eski HM cache anahtarlarını temizle
        var rm = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && (k.indexOf('nf_') === 0 || k.indexOf('netlify') !== -1)) rm.push(k);
        }
        rm.forEach(function (k) { localStorage.removeItem(k); });
      } catch (_) {}
      var u = new URL(location.href);
      if (!u.searchParams.has('_cf_purge')) {
        u.searchParams.set('_cf_purge', '1');
        location.replace(u.toString());
      }
    }).catch(function () {});
  }
  purge();
  try {
    navigator.serviceWorker.register = function () {
      return Promise.reject(new Error('sw-disabled-cf-render'));
    };
  } catch (_) {}
})();
</script>
`;
}

/**
 * Her HTML'de: yeni SW register engelle + kalan Netlify SW'yi unregister et.
 * Clear-Site-Data yapmaz (editör JWT korunur); sadece SW katmanını öldürür.
 */
const SW_BLOCK_BOOT = `
<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.register = function () {
      return Promise.reject(new Error('sw-disabled-cf-render'));
    };
  } catch (_) {}
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    if (!regs || !regs.length) return;
    return Promise.all(regs.map(function (r) { return r.unregister(); })).then(function () {
      if (!window.caches) return;
      return caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      });
    }).then(function () {
      // Kontrollü bir kez yenile — Netlify "Site not found" SW yanıtını düşür
      try {
        var u = new URL(location.href);
        if (!u.searchParams.has('_sw_kill')) {
          u.searchParams.set('_sw_kill', '1');
          location.replace(u.toString());
        }
      } catch (_) {}
    });
  }).catch(function () {});
})();
</script>
`;

function upstreamOrigin(env) {
  return String(env.API_ORIGIN || env.RENDER_API_ORIGIN || DEFAULT_API).replace(/\/+$/, "");
}

function isSwPath(pathname) {
  return (
    pathname === "/sw.js" ||
    pathname === "/yp/sw.js" ||
    pathname === "/yektube-v2/sw.js" ||
    pathname.endsWith("/sw.js")
  );
}

function cookieHas(request, name) {
  const raw = request.headers.get("cookie") || "";
  return new RegExp(`(?:^|;\\s*)${name}=1(?:;|$)`).test(raw);
}

function normalizeHost(host) {
  return String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "")
    .trim();
}

function needsForcePurge(hostname) {
  const h = String(hostname || "").toLowerCase().split(":")[0];
  return FORCE_PURGE_HOSTS.has(h) || FORCE_PURGE_HOSTS.has(h.replace(/^www\./, ""));
}

/** true → Clear-Site-Data + purge boot; false → atla */
function shouldOneShotPurge(request, hostname) {
  if (needsForcePurge(hostname)) {
    return !cookieHas(request, FORCE_PURGE_COOKIE);
  }
  return !cookieHas(request, PURGE_COOKIE);
}

function purgeCookieName(hostname) {
  return needsForcePurge(hostname) ? FORCE_PURGE_COOKIE : PURGE_COOKIE;
}

function isPortalHost(host) {
  const h = normalizeHost(host);
  if (!h) return true;
  if (PORTAL_HOSTS.has(h) || PORTAL_HOSTS.has(`www.${h}`)) return true;
  if (h.endsWith(".workers.dev") || h.endsWith(".vercel.app") || h.endsWith(".netlify.app")) return true;
  if (h === "localhost" || h === "127.0.0.1") return true;
  return false;
}

function rewriteHtml(html, { oneShotPurge, purgeCookie }) {
  let out = html;
  out = out.replace(
    /navigator\.serviceWorker\.register\s*\(\s*['`][^'"`]+['`]\s*\)[^;]*;?/g,
    "/* sw register stripped */;",
  );
  const boot = oneShotPurge ? purgeBootScript(purgeCookie) : SW_BLOCK_BOOT;
  if (out.includes("<head>")) {
    out = out.replace(
      "<head>",
      `<head>\n<meta name="x-yekpare-origin" content="cloudflare-render">\n${boot}`,
    );
  } else if (out.includes("<body")) {
    out = out.replace(/<body[^>]*>/, (m) => `${m}\n${boot}`);
  } else {
    out = boot + out;
  }
  return out;
}

function proxyInit(request, origin, incoming) {
  const headers = new Headers(request.headers);
  headers.set("host", new URL(origin).host);
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", "") || "https");
  headers.set("x-forwarded-for", request.headers.get("cf-connecting-ip") || "");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  headers.delete("content-length");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }
  return init;
}

function isStaticAssetPath(pathname) {
  return (
    /\.(js|css|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico|map|avif)(\?|$)/i.test(pathname) ||
    pathname.startsWith("/assets/") ||
    pathname.includes("/public/assets/")
  );
}

/**
 * /yp ve Yektube yüzeyleri → yektube-v2/index.html
 * (Vercel/Netlify rewrite'ları CF Worker → Render yolunda çalışmıyor;
 *  aksi halde portal SPA /yp'yi vendor short-path sanıp beyaz ekran veriyor.)
 */
function rewriteYektubeSpaPath(pathname) {
  const raw = String(pathname || "/") || "/";
  const noQuery = raw.split("?")[0] || "/";

  const ypStaticMap = {
    "/yp/sw.js": "/yektube-v2/sw.js",
    "/yp/manifest.webmanifest": "/yektube-v2/manifest.webmanifest",
    "/yp/yektube-icon.png": "/yektube-v2/yektube-icon.png",
    "/yp/yektube-logo.png": "/yektube-v2/yektube-logo.png",
    "/yp/yektube-video-tv-logo.png": "/yektube-v2/yektube-video-tv-logo.png",
    "/yp/offline.html": "/yektube-v2/offline.html",
  };
  if (ypStaticMap[noQuery]) return ypStaticMap[noQuery];

  // Gerçek dosya uzantılı asset'leri (js/css/png…) rewrite etme
  const last = noQuery.split("/").pop() || "";
  if (last.includes(".") && !/\.html?$/i.test(last)) return null;

  const p = noQuery.replace(/\/+$/, "") || "/";
  if (
    p === "/yp" ||
    p.startsWith("/yp/") ||
    p === "/muzik" ||
    p.startsWith("/muzik/") ||
    p === "/cocuk" ||
    p.startsWith("/cocuk/") ||
    p === "/canli" ||
    p.startsWith("/canli/") ||
    p === "/yek-gonder" ||
    p.startsWith("/yek-gonder/") ||
    p === "/yeklive" ||
    p.startsWith("/yeklive/") ||
    p === "/hesabim" ||
    p.startsWith("/hesabim/") ||
    p === "/studio" ||
    p.startsWith("/studio/") ||
    p === "/yektube" ||
    p.startsWith("/yektube/") ||
    p === "/yektube-v2" ||
    p.startsWith("/yektube-v2/")
  ) {
    return "/yektube-v2/index.html";
  }
  return null;
}

/** HM anasayfa haber API'leri — soğuk Render'ı edge cache ile kes. */
function isCacheableHmNewsApi(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  return (
    p.startsWith("/api/hm/meta/") ||
    p === "/api/hm/home-bundle" ||
    p === "/api/news" ||
    p === "/api/news/hybrid" ||
    p === "/api/news/featured" ||
    p === "/api/news/breaking" ||
    p === "/api/categories" ||
    p === "/api/authors"
  );
}

function upstreamCfCacheOptions(pathname, method) {
  if (method !== "GET" && method !== "HEAD") {
    return { cacheTtl: 0, cacheEverything: false };
  }
  if (isStaticAssetPath(pathname)) {
    return { cacheTtl: 86400, cacheEverything: true };
  }
  if (isCacheableHmNewsApi(pathname)) {
    return { cacheTtl: 120, cacheEverything: true };
  }
  return { cacheTtl: 0, cacheEverything: false };
}

async function fetchUpstreamWithRetry(url, init, cfOpts, retries = 2) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, cf: cfOpts });
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error("upstream_unavailable");
}

/**
 * Edge soft-redirect: HM özel alan kökü → /tr/{slug}
 * (Vercel middleware CF Worker yolunda çalışmadığı için Worker'da tekrarlanır.)
 */
async function redirectHmCustomDomainRoot(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/") return null;
  if (isPortalHost(incoming.hostname)) return null;

  const origin = upstreamOrigin(env);
  const domain = incoming.hostname.toLowerCase();
  try {
    const metaRes = await fetch(
      `${origin}/api/hm/meta/by-domain?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          accept: "application/json",
          "x-forwarded-host": incoming.host,
          "x-forwarded-proto": "https",
        },
        cf: { cacheTtl: 120, cacheEverything: true },
      },
    );
    if (!metaRes.ok) return null;
    const meta = await metaRes.json().catch(() => null);
    const slug = String(meta?.slug || "").trim();
    if (!slug) return null;
    const loc = `${incoming.origin}/tr/${encodeURIComponent(slug)}`;
    const headers = {
      location: loc,
      "cache-control": "public, max-age=60",
      "cdn-cache-control": "public, max-age=120",
      "x-yekpare-frontend": "cloudflare-render-proxy",
      "x-yekpare-hm-redirect": slug,
    };
    // HM alanlarında 308: cookie işaretle (Clear-Site-Data YOK —
    // Chrome document navigasyonunda ERR_FAILED üretebiliyor).
    if (needsForcePurge(incoming.hostname) && !cookieHas(request, FORCE_PURGE_COOKIE)) {
      headers["set-cookie"] =
        `${FORCE_PURGE_COOKIE}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`;
      headers["x-yekpare-purge"] = "hm-force-redirect";
    }
    return new Response(null, { status: 308, headers });
  } catch {
    return null;
  }
}

/** WhatsApp / Facebook / Telegram vb. — JS çalıştırmaz, SPA index.html OG'sini okur. */
function isSocialPreviewBot(request) {
  const ua = String(request.headers.get("user-agent") ?? "").toLowerCase();
  return /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|bingbot|googlebot|duckduckbot|yandexbot|gptbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot|google-extended|applebot|cohere-ai|bytespider|meta-externalagent|amazonbot/.test(
    ua,
  );
}

function isOgProxySkipPath(pathname) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/yektube-v2/") ||
    pathname.startsWith("/yp/") ||
    isStaticAssetPath(pathname)
  );
}

/** Portal paylaşım yolları (middleware / Netlify edge ile aynı). */
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
  if (/^\/(siparis\/satici|alisveris\/magaza|magaza\/magaza)\/[^/]+\/blog(?:\/[^/]+)?$/.test(p)) {
    return true;
  }
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

async function fetchHmSlugForHost(apiOrigin, host) {
  const h = normalizeHost(host);
  if (!h || isPortalHost(h)) return null;
  try {
    const res = await fetch(
      `${apiOrigin}/api/hm/meta/by-domain?domain=${encodeURIComponent(h)}`,
      {
        headers: { accept: "application/json" },
        cf: { cacheTtl: 60, cacheEverything: false },
      },
    );
    if (!res.ok) return null;
    const meta = await res.json().catch(() => null);
    const slug = String(meta?.slug ?? meta?.data?.slug ?? "").trim();
    return slug || null;
  } catch {
    return null;
  }
}

/**
 * Sosyal önizleme botları: SPA index.html (yekpare.net OG) yerine
 * /api/public/og-html ile haber başlık/açıklama/görsel döndür.
 * (Vercel middleware / Netlify edge CF Worker yolunda çalışmadığı için burada tekrarlanır.)
 */
async function socialPreviewOgHtml(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isSocialPreviewBot(request)) return null;
  if (isOgProxySkipPath(incoming.pathname)) return null;

  const host = (incoming.hostname || "").toLowerCase();
  const cleanPath = incoming.pathname.replace(/\/+$/, "") || "/";
  const apiOrigin = upstreamOrigin(env);
  const isHmSlugPath = /^\/tr\/[^/]+(?:\/.*)?$/.test(cleanPath);
  const hmBound = !isPortalHost(host) ? Boolean(await fetchHmSlugForHost(apiOrigin, host)) : false;
  const isCustomHmDomainPath = hmBound;
  const isPortalSharePath = (isPortalHost(host) || !hmBound) && isPortalOgSharePath(cleanPath);
  if (!isHmSlugPath && !isCustomHmDomainPath && !isPortalSharePath) return null;

  const target = new URL("/api/public/og-html", apiOrigin);
  target.searchParams.set("path", cleanPath);
  target.searchParams.set("origin", incoming.origin);

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        accept: "text/html",
        "user-agent": request.headers.get("user-agent") ?? "",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", "") || "https",
      },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!upstream.ok) return null;
    const headers = new Headers(upstream.headers);
    headers.delete("content-encoding");
    headers.delete("transfer-encoding");
    headers.set("cache-control", "public, max-age=300, s-maxage=300");
    headers.set("cdn-cache-control", "public, max-age=300");
    headers.set("x-yekpare-frontend", "cloudflare-render-proxy");
    headers.set("x-yekpare-og", "social-preview");
    if (request.method === "HEAD") {
      return new Response(null, { status: upstream.status, headers });
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    if (isSwPath(incoming.pathname)) {
      return new Response(KILL_SW, {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-store, max-age=0, must-revalidate",
          "x-yekpare-frontend": "cloudflare-render-proxy",
          "x-yekpare-sw": "kill-switch",
        },
      });
    }

    const hmRedirect = await redirectHmCustomDomainRoot(request, env, incoming);
    if (hmRedirect) return hmRedirect;

    const ogHtml = await socialPreviewOgHtml(request, env, incoming);
    if (ogHtml) return ogHtml;

    const origin = upstreamOrigin(env);
    const yektubeRewrite = rewriteYektubeSpaPath(incoming.pathname);
    const upstreamPath = yektubeRewrite || incoming.pathname;
    const target = new URL(upstreamPath + incoming.search, origin);
    const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
    const purgeCookie = purgeCookieName(incoming.hostname);

    try {
      const cfOpts = upstreamCfCacheOptions(upstreamPath, request.method);
      const upstream = await fetchUpstreamWithRetry(
        target.toString(),
        proxyInit(request, origin, incoming),
        cfOpts,
      );
      const out = new Headers(upstream.headers);
      out.delete("content-encoding");
      out.delete("transfer-encoding");
      out.set("x-yekpare-frontend", "cloudflare-render-proxy");
      out.set("x-yekpare-upstream", origin);
      if (yektubeRewrite) {
        out.set("x-yekpare-yektube-rewrite", yektubeRewrite);
      }
      if (isStaticAssetPath(incoming.pathname)) {
        out.set("cdn-cache-control", "public, max-age=86400");
        if (!out.get("cache-control")) {
          out.set("cache-control", "public, max-age=86400, immutable");
        }
      } else if (isCacheableHmNewsApi(upstreamPath)) {
        // API zaten s-maxage veriyor; Worker no-store ile ezmesin.
        if (!out.get("cache-control")) {
          out.set(
            "cache-control",
            "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
          );
        }
        out.set("cdn-cache-control", "public, max-age=120, stale-while-revalidate=300");
      } else {
        out.set("cdn-cache-control", "no-store");
      }

      const ct = String(out.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        out.set("cache-control", "no-store, max-age=0, must-revalidate");
        // Eski Netlify SW temizliği: yalnızca JS boot + cookie.
        // Clear-Site-Data HTML navigasyonunda Chrome'da ERR_FAILED yapabiliyor
        // (özellikle /admin); cookie de yazılamadan döngü oluşuyor.
        if (oneShotPurge) {
          out.append(
            "set-cookie",
            `${purgeCookie}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`,
          );
          out.set(
            "x-yekpare-purge",
            needsForcePurge(incoming.hostname) ? "hm-force-once" : "netlify-sw-once",
          );
        } else {
          out.set("x-yekpare-purge", "skipped");
        }
        if (request.method === "HEAD") {
          return new Response(null, { status: upstream.status, headers: out });
        }
        const html = await upstream.text();
        return new Response(rewriteHtml(html, { oneShotPurge, purgeCookie }), {
          status: upstream.status,
          headers: out,
        });
      }

      return new Response(upstream.body, { status: upstream.status, headers: out });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "render_upstream_unavailable",
          detail: String(err?.message || err),
          upstream: origin,
        }),
        {
          status: 502,
          headers: {
            "content-type": "application/json",
            "x-yekpare-frontend": "cloudflare-render-proxy",
          },
        },
      );
    }
  },
};
