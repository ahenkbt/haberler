/**
 * Geçici: trafik → Render (SPA + API).
 * Eski Netlify Service Worker / cache için TEK SEFERLIK purge.
 * Clear-Site-Data her HTML'de kalırsa hm_editor_jwt / HM domain cache silinir → editör siteleri kırılır.
 */

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";
const PURGE_COOKIE = "__yekpare_sw_purged";

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
const PURGE_BOOT = `
<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var done = false;
  function hasPurgeCookie() {
    try {
      return document.cookie.split(';').some(function (c) {
        return c.trim().indexOf('${PURGE_COOKIE}=1') === 0;
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
      try { localStorage.removeItem('nf_'); } catch (_) {}
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

/** Purge sonrası: sadece yeni SW register'ı engelle, storage'a dokunma. */
const SW_BLOCK_BOOT = `
<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.register = function () {
      return Promise.reject(new Error('sw-disabled-cf-render'));
    };
  } catch (_) {}
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

function hasPurgeCookie(request) {
  const raw = request.headers.get("cookie") || "";
  return new RegExp(`(?:^|;\\s*)${PURGE_COOKIE}=1(?:;|$)`).test(raw);
}

function normalizeHost(host) {
  return String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "")
    .trim();
}

function isPortalHost(host) {
  const h = normalizeHost(host);
  if (!h) return true;
  if (PORTAL_HOSTS.has(h) || PORTAL_HOSTS.has(`www.${h}`)) return true;
  if (h.endsWith(".workers.dev") || h.endsWith(".vercel.app") || h.endsWith(".netlify.app")) return true;
  if (h === "localhost" || h === "127.0.0.1") return true;
  return false;
}

function rewriteHtml(html, { oneShotPurge }) {
  let out = html;
  out = out.replace(
    /navigator\.serviceWorker\.register\s*\(\s*['`][^'"`]+['`]\s*\)[^;]*;?/g,
    "/* sw register stripped */;",
  );
  const boot = oneShotPurge ? PURGE_BOOT : SW_BLOCK_BOOT;
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
    return new Response(null, {
      status: 308,
      headers: {
        location: loc,
        "cache-control": "no-store",
        "x-yekpare-frontend": "cloudflare-render-proxy",
        "x-yekpare-hm-redirect": slug,
      },
    });
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

    const origin = upstreamOrigin(env);
    const target = new URL(incoming.pathname + incoming.search, origin);
    const oneShotPurge = !hasPurgeCookie(request);

    try {
      const upstream = await fetch(target.toString(), proxyInit(request, origin, incoming));
      const out = new Headers(upstream.headers);
      out.delete("content-encoding");
      out.delete("transfer-encoding");
      out.set("x-yekpare-frontend", "cloudflare-render-proxy");
      out.set("x-yekpare-upstream", origin);

      const ct = String(out.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        out.set("cache-control", "no-store, max-age=0, must-revalidate");
        // Cookie hayatta kalır (Clear-Site-Data "cookies" kullanılmıyor).
        // Storage temizliği SADECE ilk yüklemede — aksi halde hm_editor_jwt silinir.
        if (oneShotPurge) {
          out.set("clear-site-data", '"cache", "storage"');
          out.append(
            "set-cookie",
            `${PURGE_COOKIE}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`,
          );
          out.set("x-yekpare-purge", "netlify-sw-once");
        } else {
          out.set("x-yekpare-purge", "skipped");
        }
        if (request.method === "HEAD") {
          return new Response(null, { status: upstream.status, headers: out });
        }
        const html = await upstream.text();
        return new Response(rewriteHtml(html, { oneShotPurge }), {
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
