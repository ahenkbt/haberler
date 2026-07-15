/**
 * Geçici: trafik → Render (SPA + API).
 * Eski Netlify Service Worker / cache yüzünden tarayıcı hâlâ Netlify sanabiliyor —
 * /sw.js kill-switch + HTML rewrite + Clear-Site-Data ile temizlenir.
 */

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";

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
      const regs = await self.registration.unregister();
      void regs;
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

const PURGE_BOOT = `
<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var done = false;
  function purge() {
    if (done) return;
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
  // Netlify döneminden kalan register çağrılarını engelle
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

function rewriteHtml(html) {
  let out = html;
  // Eski register'ı kaldır / no-op
  out = out.replace(
    /navigator\.serviceWorker\.register\s*\(\s*['`][^'"`]+['`]\s*\)[^;]*;?/g,
    "/* sw register stripped */;",
  );
  // Boot purge'u mümkün olduğunca erken enjekte et
  if (out.includes("<head>")) {
    out = out.replace("<head>", `<head>\n<meta name="x-yekpare-origin" content="cloudflare-render">\n${PURGE_BOOT}`);
  } else if (out.includes("<body")) {
    out = out.replace(/<body[^>]*>/, (m) => `${m}\n${PURGE_BOOT}`);
  } else {
    out = PURGE_BOOT + out;
  }
  return out;
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    // Kill Netlify / stale SW immediately
    if (isSwPath(incoming.pathname)) {
      return new Response(KILL_SW, {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-store, max-age=0, must-revalidate",
          "clear-site-data": '"cache", "storage"',
          "x-yekpare-frontend": "cloudflare-render-proxy",
          "x-yekpare-sw": "kill-switch",
        },
      });
    }

    const origin = upstreamOrigin(env);
    const target = new URL(incoming.pathname + incoming.search, origin);

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

    try {
      const upstream = await fetch(target.toString(), init);
      const out = new Headers(upstream.headers);
      out.delete("content-encoding");
      out.delete("transfer-encoding");
      out.set("x-yekpare-frontend", "cloudflare-render-proxy");
      out.set("x-yekpare-upstream", origin);

      const ct = String(out.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        out.set("cache-control", "no-store, max-age=0, must-revalidate");
        // Tarayıcıdaki Netlify cache / SW storage temizliği
        out.set("clear-site-data", '"cache", "storage"');
        out.set("x-yekpare-purge", "netlify-sw");
        if (request.method === "HEAD") {
          return new Response(null, { status: upstream.status, headers: out });
        }
        const html = await upstream.text();
        return new Response(rewriteHtml(html), { status: upstream.status, headers: out });
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
          headers: { "content-type": "application/json", "x-yekpare-frontend": "cloudflare-render-proxy" },
        },
      );
    }
  },
};
