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
]);
const FORCE_PURGE_COOKIE = "__yekpare_sw_purged_hm_20260715f";

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

function upstreamCfCacheOptions(pathname, method) {
  if (method !== "GET" && method !== "HEAD") {
    return { cacheTtl: 0, cacheEverything: false };
  }
  if (isStaticAssetPath(pathname)) {
    return { cacheTtl: 86400, cacheEverything: true };
  }
  if (pathname.startsWith("/api/hm/meta/")) {
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
        cf: { cacheTtl: 60, cacheEverything: false },
      },
    );
    if (!metaRes.ok) return null;
    const meta = await metaRes.json().catch(() => null);
    const slug = String(meta?.slug || "").trim();
    if (!slug) return null;
    const loc = `${incoming.origin}/tr/${encodeURIComponent(slug)}`;
    const headers = {
      location: loc,
      "cache-control": "no-store",
      "cdn-cache-control": "no-store",
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
          // SW güncellemesi için Alt-Svc yok
        },
      });
    }

    // Kullanıcı ERR_FAILED ise: /__sw_reset → Clear-Site-Data (yalnız bu path)
    if (incoming.pathname === "/__sw_reset" || incoming.pathname === "/__sw_reset/") {
      return new Response(
        `<!doctype html><meta charset="utf-8"><title>Yekpare reset</title>
<body style="font-family:system-ui;max-width:36rem;margin:3rem auto;padding:0 1rem">
<h1>Önbellek temizlendi</h1>
<p>Service Worker / site verisi sıfırlandı. <a href="/">Ana sayfaya dön</a></p>
<script>
(async function () {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (_) {}
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (_) {}
  setTimeout(function () { location.replace('/'); }, 400);
})();
</script></body>`,
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "clear-site-data": '"cache", "cookies", "storage"',
            "x-yekpare-frontend": "cloudflare-render-proxy",
            "x-yekpare-purge": "sw-reset-path",
          },
        },
      );
    }

    const hmRedirect = await redirectHmCustomDomainRoot(request, env, incoming);
    if (hmRedirect) return hmRedirect;

    const origin = upstreamOrigin(env);
    const target = new URL(incoming.pathname + incoming.search, origin);
    const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
    const purgeCookie = purgeCookieName(incoming.hostname);

    try {
      const cfOpts = upstreamCfCacheOptions(incoming.pathname, request.method);
      const upstream = await fetchUpstreamWithRetry(
        target.toString(),
        proxyInit(request, origin, incoming),
        cfOpts,
      );
      const out = new Headers(upstream.headers);
      out.delete("content-encoding");
      out.delete("transfer-encoding");
      // Chrome ERR_FAILED: bozuk Netlify SW + HTTP/3(QUIC)/IPv6 happy-eyeballs.
      // Alt-Svc'yi sil → istemci HTTP/2'ye düşer.
      out.delete("alt-svc");
      out.set("x-yekpare-frontend", "cloudflare-render-proxy");
      out.set("x-yekpare-upstream", origin);
      if (isStaticAssetPath(incoming.pathname)) {
        out.set("cdn-cache-control", "public, max-age=86400");
        if (!out.get("cache-control")) {
          out.set("cache-control", "public, max-age=86400, immutable");
        }
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
