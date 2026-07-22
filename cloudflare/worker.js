/**
 * SPA → Workers Static Assets (ASSETS); /api → Render.
 * ASSETS yoksa (eski deploy) tüm trafik Render'a proxy edilir.
 * Eski Netlify SW / cache için TEK SEFERLIK purge (JS boot + cookie).
 * Clear-Site-Data HTML yanıtlarında kullanılmaz — Chrome navigasyonu ERR_FAILED
 * ile düşürüp cookie yazılmadan döngüye sokabiliyor (yekpare.net/admin).
 */

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";
/**
 * Cookie sürümü — artırınca tüm ziyaretçilerde Netlify SW yeniden temizlenir.
 * (Eski cookie ile purge atlanınca /tr/vkd Netlify 404 görünmeye devam ediyordu.)
 */
const PURGE_COOKIE = "__yekpare_sw_purged_v20260717a";
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
const FORCE_PURGE_COOKIE = "__yekpare_sw_purged_hm_20260717b";

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
      `<head>\n<meta name="x-yekpare-origin" content="cloudflare-assets">\n${boot}`,
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

function withAssetPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Kök sitemap .xml → /api/sitemap/* (Googlebot HTML SPA almasın). */
function rootSitemapApiPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/sitemap.xml") return "/api/sitemap/index.xml";
  const mHmCat = /^\/news-hm\/([^/]+)\/([^/]+)\.xml$/i.exec(p);
  if (mHmCat) return `/api/sitemap/news-hm/${mHmCat[1]}/${mHmCat[2]}.xml`;
  const mCat = /^\/news-yekpare-cat-(.+)\.xml$/i.exec(p);
  if (mCat) return `/api/sitemap/news-yekpare-cat-${mCat[1]}.xml`;
  const mHmMakale = /^\/news-hm-([^/]+)-makale\.xml$/i.exec(p);
  if (mHmMakale) return `/api/sitemap/news-hm-${mHmMakale[1]}-makale.xml`;
  const mHmYazarlar = /^\/news-hm-([^/]+)-yazarlar\.xml$/i.exec(p);
  if (mHmYazarlar) return `/api/sitemap/news-hm-${mHmYazarlar[1]}-yazarlar.xml`;
  const mHmSayfalar = /^\/news-hm-([^/]+)-sayfalar\.xml$/i.exec(p);
  if (mHmSayfalar) return `/api/sitemap/news-hm-${mHmSayfalar[1]}-sayfalar.xml`;
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
    "/sarisayfalar.xml",
    "/otomotiv.xml",
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

const SITEMAP_LEAK_ORIGINS = [
  "https://goalgo-production.up.railway.app",
  "http://goalgo-production.up.railway.app",
  "https://goalgo-y7ze.onrender.com",
  "http://goalgo-y7ze.onrender.com",
];

function rewriteSitemapOrigins(xml, publicOrigin) {
  const canonical = String(publicOrigin || "").replace(/\/+$/, "");
  let out = String(xml || "");
  for (const bad of SITEMAP_LEAK_ORIGINS) {
    if (out.includes(bad)) out = out.split(bad).join(canonical);
  }
  return out;
}

/**
 * GSC video sitemap: player_loc / content_loc <loc> ile aynı olamaz.
 * Render eski API hâlâ player_loc=loc yazıyorsa edge’de YouTube embed’e çevir;
 * watch?v= content_loc satırlarını kaldır (gerçek medya dosyası değil).
 */
function rewriteYektubeVideoSitemapXml(xml) {
  return String(xml || "").replace(/<url>([\s\S]*?)<\/url>/g, (block) => {
    const locM = /<loc>\s*([^<]+?)\s*<\/loc>/i.exec(block);
    const playerM =
      /<video:player_loc([^>]*)>\s*([^<]+?)\s*<\/video:player_loc>/i.exec(block);
    const contentM =
      /<video:content_loc>\s*https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^<&\s]+)\s*<\/video:content_loc>/i.exec(
        block,
      );
    let next = block;
    const loc = locM ? locM[1].trim() : "";
    const player = playerM ? playerM[2].trim() : "";
    let videoId = contentM ? decodeURIComponent(contentM[1].trim()) : "";
    if (!videoId && loc) {
      // .../title-slug-{youtubeId} — YouTube id genelde 11 karakter
      const seg = loc.split("/").pop() || "";
      const idM = /(?:^|-)([A-Za-z0-9_-]{11})$/.exec(seg);
      if (idM) videoId = idM[1];
    }
    if (playerM && loc && player === loc && videoId) {
      const embed = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
      next = next.replace(
        /<video:player_loc([^>]*)>\s*[^<]+?\s*<\/video:player_loc>/i,
        `<video:player_loc$1>${embed}</video:player_loc>`,
      );
    }
    // watch?v= content_loc gerçek medya dosyası değil — kaldır
    next = next.replace(
      /\n?\s*<video:content_loc>\s*https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[^<]+<\/video:content_loc>/gi,
      "",
    );
    return next;
  });
}

/** Bare /sitemap → /sitemap.xml (GSC «bilinmiyor» HTML girişini kes). */
function redirectBareSitemapPath(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/sitemap") return null;
  return new Response(null, {
    status: 301,
    headers: {
      location: `${incoming.origin}/sitemap.xml`,
      "cache-control": "public, max-age=86400",
      "x-yekpare-frontend": "cloudflare-sitemap-redirect",
    },
  });
}

/** HM + portal: robots.txt Sitemap satırı ziyaret edilen köke bağlanır (statik yekpare.net ezilmesin). */
function serveDynamicRobotsTxt(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/robots.txt") return null;
  const origin = incoming.origin.replace(/\/+$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
    "Disallow: /admin/",
    "Disallow: /api/admin/",
    "Disallow: /uye/",
    "Disallow: /editor/",
    "Disallow: /hesabim/",
    "Disallow: /siparislerim/",
    "Disallow: /isletme-paneli/",
    "Disallow: /firma-rehberi-paneli/",
    "Disallow: /servis-saglayici-paneli/",
    "Disallow: /turizm-paneli/",
    "Disallow: /ulasim-paneli/",
    "Disallow: /magaza/sepet",
    "Disallow: /magaza/odeme",
    "Disallow: /odeme",
    "",
  ].join("\n");
  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "public, max-age=3600",
    "x-yekpare-frontend": "cloudflare-robots",
  });
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

async function proxyRootSitemap(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const pathOnly = incoming.pathname.replace(/\/+$/, "") || "/";
  if (!pathOnly.endsWith(".xml")) return null;
  // Statik asset XML'ler (sitemap-static) CF Assets'ten gelsin
  if (pathOnly === "/sitemap-static.xml" || pathOnly === "/browserconfig.xml") return null;
  const apiPath = rootSitemapApiPath(pathOnly);
  if (!apiPath) return null;

  const origin = upstreamOrigin(env);
  const targetUrl = `${origin}${apiPath}${incoming.search}`;
  try {
    const upstream = await fetch(targetUrl, {
      method: request.method === "HEAD" ? "GET" : request.method,
      headers: {
        accept: "application/xml, text/xml, */*",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", "") || "https",
        "user-agent": request.headers.get("user-agent") || "yekpare-sitemap-proxy",
      },
      cf: { cacheTtl: 300, cacheEverything: true },
      redirect: "manual",
    });
    const ct = String(upstream.headers.get("content-type") || "").toLowerCase();
    if (!upstream.ok || (!ct.includes("xml") && !ct.includes("text/plain"))) {
      return null;
    }
    let text = rewriteSitemapOrigins(await upstream.text(), incoming.origin);
    if (/^\/yektube-videos-\d+\.xml$/i.test(pathOnly) || /yektube-videos-\d+/i.test(apiPath)) {
      text = rewriteYektubeVideoSitemapXml(text);
    }
    const headers = new Headers({
      "content-type": "application/xml; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control":
        upstream.headers.get("cache-control") || "public, max-age=1800, stale-while-revalidate=86400",
      "x-yekpare-frontend": "cloudflare-sitemap-proxy",
      "x-yekpare-sitemap-api": apiPath,
    });
    if (/yektube-videos/i.test(pathOnly)) {
      headers.set("x-yekpare-video-sitemap-rewrite", "1");
    }
    if (request.method === "HEAD") {
      headers.set("content-length", String(new TextEncoder().encode(text).byteLength));
      return new Response(null, { status: 200, headers });
    }
    return new Response(text, { status: 200, headers });
  } catch {
    return null;
  }
}

/** CF Assets'ten HTML yanıtını SW purge boot ile sar. */
async function respondAssetHtml(request, assetResp, { oneShotPurge, purgeCookie, hostname }) {
  const out = new Headers(assetResp.headers);
  out.delete("content-encoding");
  out.delete("transfer-encoding");
  out.set("x-yekpare-frontend", "cloudflare-assets");
  out.set("cache-control", "no-store, max-age=0, must-revalidate");
  out.set("cdn-cache-control", "no-store");
  if (oneShotPurge) {
    out.append(
      "set-cookie",
      `${purgeCookie}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`,
    );
    out.set(
      "x-yekpare-purge",
      needsForcePurge(hostname) ? "hm-force-once" : "netlify-sw-once",
    );
  } else {
    out.set("x-yekpare-purge", "skipped");
  }
  if (request.method === "HEAD") {
    return new Response(null, { status: assetResp.status, headers: out });
  }
  const html = await assetResp.text();
  return new Response(rewriteHtml(html, { oneShotPurge, purgeCookie }), {
    status: assetResp.status,
    headers: out,
  });
}

/** SPA + statik: ASSETS; yoksa null (Render proxy'ye düş). */
async function tryServeAssets(request, env, incoming) {
  if (!env.ASSETS) return null;
  if (isApiPath(incoming.pathname)) return null;

  const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
  const purgeCookie = purgeCookieName(incoming.hostname);
  const yektubeRewrite = rewriteYektubeSpaPath(incoming.pathname);
  const assetReq = yektubeRewrite ? withAssetPath(request, yektubeRewrite) : request;

  // .xml sitemap yollarını SPA index.html'e düşürme — proxy kaçırırsa boş XML yerine HTML olmasın
  if (incoming.pathname.toLowerCase().endsWith(".xml") && !isStaticAssetPath(incoming.pathname)) {
    return null;
  }

  let assetResp = await env.ASSETS.fetch(assetReq);
  if (
    assetResp.status === 404 &&
    request.method === "GET" &&
    !isStaticAssetPath(incoming.pathname)
  ) {
    assetResp = await env.ASSETS.fetch(withAssetPath(request, "/index.html"));
  }

  const ct = String(assetResp.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("text/html")) {
    return respondAssetHtml(request, assetResp, {
      oneShotPurge,
      purgeCookie,
      hostname: incoming.hostname,
    });
  }

  if (isStaticAssetPath(incoming.pathname) || assetResp.ok) {
    const out = new Headers(assetResp.headers);
    out.set("x-yekpare-frontend", "cloudflare-assets");
    if (isStaticAssetPath(incoming.pathname)) {
      out.set("cdn-cache-control", "public, max-age=86400");
      if (!out.get("cache-control")) {
        out.set("cache-control", "public, max-age=86400, immutable");
      }
    }
    if (yektubeRewrite) out.set("x-yekpare-yektube-rewrite", yektubeRewrite);
    return new Response(assetResp.body, { status: assetResp.status, headers: out });
  }

  return null;
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
 * Render eski kodu: parseInt("2026-yili-...") → id 2026 (yanlış haber).
 * Edge’de slug uyuşmazlığını yakala; listeden doğru id’yi bulup bundle’ı yeniden çek.
 */
function parseNewsSlugApiRequest(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  let m = /^\/api\/news\/page-bundle\/([^/]+)\/?$/.exec(p);
  if (m) {
    return { kind: "page-bundle", slug: decodeURIComponent(m[1]) };
  }
  m = /^\/api\/news\/([^/]+)\/?$/.exec(p);
  if (!m) return null;
  const seg = decodeURIComponent(m[1]);
  // Statik alt yollar — dokunma.
  if (
    seg === "hybrid" ||
    seg === "featured" ||
    seg === "breaking" ||
    seg === "popular" ||
    seg === "by-category" ||
    seg === "hm-nearest-slug" ||
    seg === "deleted-redirect" ||
    seg === "page-bundle" ||
    seg === "tepe-featured" ||
    seg.startsWith("hm-")
  ) {
    return null;
  }
  return { kind: "news", slug: seg };
}

async function resolveNewsIdByExactSlug(origin, init, slug, siteId) {
  const want = String(slug || "").trim();
  if (!want) return null;
  const qs = new URLSearchParams({ limit: "120" });
  if (siteId) qs.set("siteId", String(siteId));
  try {
    const res = await fetch(`${origin}/api/news?${qs}`, {
      ...init,
      method: "GET",
      cf: { cacheTtl: 30, cacheEverything: true },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const items = Array.isArray(data) ? data : data?.items || data?.news || [];
    const hit = items.find((it) => String(it?.slug || "").trim() === want);
    const id = hit?.id != null ? Number(hit.id) : NaN;
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

async function maybeRepairMismatchedNewsJson(origin, init, method, incoming, upstreamPath, upstreamRes) {
  if (method !== "GET" && method !== "HEAD") return null;
  if (upstreamRes.status !== 200 && upstreamRes.status !== 404) return null;
  const parsed = parseNewsSlugApiRequest(upstreamPath);
  if (!parsed) return null;
  const slug = parsed.slug;
  // Saf sayısal id isteği — bilinçli id lookup; dokunma.
  if (/^\d+$/.test(slug)) return null;

  const ct = String(upstreamRes.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) return null;

  let body;
  try {
    body = await upstreamRes.clone().json();
  } catch {
    return null;
  }

  const article =
    parsed.kind === "page-bundle"
      ? body?.article
      : body && typeof body === "object" && body.slug != null
        ? body
        : null;
  const gotSlug = article ? String(article.slug || "").trim() : "";
  // Yanlış haber (slug uyuşmuyor) veya boş sonuç — listeden id bul.
  if (gotSlug && gotSlug === slug) return null;

  const siteIdRaw = incoming.searchParams.get("siteId");
  const siteIdNum =
    siteIdRaw != null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const fixedId = await resolveNewsIdByExactSlug(
    origin,
    init,
    slug,
    Number.isFinite(siteIdNum) && siteIdNum > 0 ? String(siteIdNum) : "",
  );
  if (!fixedId) return null;

  const repairUrl =
    parsed.kind === "page-bundle"
      ? new URL(`/api/news/page-bundle/${fixedId}${incoming.search}`, origin)
      : new URL(`/api/news/${fixedId}${incoming.search}`, origin);
  try {
    const repaired = await fetch(repairUrl.toString(), {
      ...init,
      method: "GET",
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!repaired.ok) return null;
    const repairedBody = await repaired.json().catch(() => null);
    const repairedArticle =
      parsed.kind === "page-bundle" ? repairedBody?.article : repairedBody;
    if (!repairedArticle || String(repairedArticle.slug || "").trim() !== slug) {
      return null;
    }
    const headers = new Headers(repaired.headers);
    headers.delete("content-encoding");
    headers.delete("transfer-encoding");
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("x-yekpare-slug-repair", "1");
    headers.set("x-yekpare-slug-repair-id", String(fixedId));
    headers.set("cache-control", "public, max-age=30, s-maxage=60");
    headers.set("x-yekpare-frontend", "cloudflare-render-proxy");
    headers.set("x-yekpare-upstream", origin);
    return new Response(JSON.stringify(repairedBody), {
      status: 200,
      headers,
    });
  } catch {
    return null;
  }
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
  const p = String(pathname || "");
  return (
    p.startsWith("/api") ||
    p.startsWith("/assets/") ||
    p.startsWith("/_next/") ||
    p.startsWith("/yektube-v2/") ||
    p.startsWith("/yp/") ||
    // Googlebot sitemap tararken OG HTML dönmesin (HM custom domain)
    /\.xml$/i.test(p) ||
    p === "/robots.txt" ||
    p === "/sitemap.xml" ||
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

const NTV_DUNYA_RSS_URL = "https://www.ntv.com.tr/dunya.rss";
const WORLD_BRIEFS_TR_CHARS = /[çğıöşüÇĞİÖŞÜıI]/;
const WORLD_BRIEFS_EN_WORDS =
  /\b(the|and|for|with|from|news|breaking|live|report|says|world|global|update|today|latest)\b/i;

function decodeXmlEntities(raw) {
  return String(raw || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .trim();
}

function xmlTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(block || "").match(re);
  return m ? decodeXmlEntities(m[1]) : "";
}

function xmlAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = String(block || "").match(re);
  return m ? decodeXmlEntities(m[1]) : "";
}

function isTurkishWorldBriefTitle(title) {
  const t = String(title || "").trim();
  if (!t) return false;
  if (WORLD_BRIEFS_TR_CHARS.test(t)) return true;
  if (WORLD_BRIEFS_EN_WORDS.test(t) && !WORLD_BRIEFS_TR_CHARS.test(t)) return false;
  return /[ğüşıöçĞÜŞİÖÇ]/.test(t) || /\b(ve|bir|için|ile|bu|da|de|haber|türkiye)\b/i.test(t);
}

function parseNtvDunyaAtom(xml, limit = 24) {
  const entries = String(xml || "").match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const out = [];
  for (const entry of entries) {
    const title = xmlTag(entry, "title");
    if (!isTurkishWorldBriefTitle(title)) continue;
    const href =
      xmlAttr(entry, "link", "href") ||
      xmlTag(entry, "id") ||
      "";
    if (!href) continue;
    const published =
      xmlTag(entry, "published") ||
      xmlTag(entry, "updated") ||
      new Date().toISOString();
    const spot = xmlTag(entry, "summary") || null;
    const imageUrl =
      xmlAttr(entry, "media:thumbnail", "url") ||
      xmlAttr(entry, "media:content", "url") ||
      null;
    const idMatch = href.match(/(\d+)(?:\/)?$/);
    out.push({
      id: idMatch ? `ntv:${idMatch[1]}` : `ntv:${out.length + 1}`,
      title,
      spot,
      href,
      publishedAt: new Date(published).toISOString(),
      sourceName: "Dünya",
      feedLabel: "Dünya",
      countryCode: null,
      countryName: null,
      continent: "global",
      imageUrl,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Edge: Dünyadan Kısa Kısa — NTV Dünya RSS (Render API deploy gecikmesinde donmasın).
 * İsteğe bağlı siteId ile upstream Dünya DB haberlerini de birleştirir.
 */
async function serveWorldBriefsEdge(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (incoming.pathname !== "/api/news/world-briefs") return null;

  const perFeedRaw = Number(incoming.searchParams.get("perFeed") || incoming.searchParams.get("limit") || 3);
  const perFeed = Number.isFinite(perFeedRaw) && perFeedRaw > 0 ? Math.min(Math.round(perFeedRaw), 8) : 3;
  const siteIdRaw = Number(incoming.searchParams.get("siteId") || 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? Math.floor(siteIdRaw) : null;
  const itemCap = Math.min(perFeed * 4, 32);

  let rssItems = [];
  try {
    const rssRes = await fetch(NTV_DUNYA_RSS_URL, {
      headers: {
        accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
        "user-agent": "YekpareWorldBriefs/1.0",
      },
      cf: { cacheTtl: 120, cacheEverything: true },
    });
    if (rssRes.ok) {
      rssItems = parseNtvDunyaAtom(await rssRes.text(), itemCap * 2);
    }
  } catch {
    /* NTV best-effort */
  }

  const seen = new Set();
  const items = [];
  const push = (item) => {
    if (!item?.title || !item?.href) return;
    const key = String(item.href).trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };
  for (const item of rssItems) push(item);

  if (siteId != null) {
    try {
      const origin = upstreamOrigin(env);
      const hybridUrl = new URL("/api/news/hybrid", origin);
      hybridUrl.searchParams.set("siteId", String(siteId));
      hybridUrl.searchParams.set("categorySlug", "dunya");
      hybridUrl.searchParams.set("dbFirst", "1");
      hybridUrl.searchParams.set("limit", String(itemCap));
      const hybridRes = await fetch(hybridUrl.toString(), {
        headers: {
          accept: "application/json",
          "x-forwarded-host": incoming.host,
          "x-forwarded-proto": "https",
        },
        cf: { cacheTtl: 60, cacheEverything: true },
      });
      if (hybridRes.ok) {
        const data = await hybridRes.json().catch(() => null);
        for (const row of data?.items || []) {
          const title = String(row.title || "").trim();
          if (!isTurkishWorldBriefTitle(title)) continue;
          const slug = String(row.slug || "").trim();
          const href = slug
            ? `/haber/${slug}`
            : String(row.href || row.originUrl || "").trim();
          if (!href) continue;
          push({
            id: `db:${row.id}`,
            title,
            spot: row.spot || null,
            href,
            publishedAt: row.publishedAt || row.createdAt || new Date().toISOString(),
            sourceName: row.categoryName || "Dünya",
            feedLabel: row.categoryName || "Dünya",
            countryCode: null,
            countryName: null,
            continent: "global",
            imageUrl: row.imageUrl || null,
          });
        }
      }
    } catch {
      /* upstream DB merge best-effort */
    }
  }

  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const slice = items.slice(0, itemCap);
  const payload = {
    continents:
      slice.length === 0
        ? []
        : [
            {
              id: "global",
              label: "Küresel",
              items: slice,
              countries: [],
            },
          ],
    totalItems: slice.length,
    feedCount: slice.length > 0 ? 1 : 0,
    checkedAt: new Date().toISOString(),
  };

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=180",
    "cdn-cache-control": "public, max-age=60, stale-while-revalidate=180",
    "x-yekpare-frontend": "cloudflare-world-briefs",
    "x-yekpare-world-briefs": "ntv-dunya-edge",
  };
  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(JSON.stringify(payload), { status: 200, headers });
}

function slugifyCategoryKey(raw) {
  return String(raw || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function hashRssEdgeId(link) {
  const s = String(link || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `edge-${(h >>> 0).toString(16)}`;
}

function parseFeedEntries(xml, limit = 6) {
  const atom = String(xml || "").match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const rss = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const blocks = atom.length ? atom : rss;
  const out = [];
  for (const block of blocks) {
    const title = xmlTag(block, "title");
    if (!title) continue;
    const href =
      xmlAttr(block, "link", "href") ||
      xmlTag(block, "link") ||
      xmlTag(block, "guid") ||
      xmlTag(block, "id") ||
      "";
    if (!/^https?:\/\//i.test(href)) continue;
    const published =
      xmlTag(block, "published") ||
      xmlTag(block, "updated") ||
      xmlTag(block, "pubDate") ||
      xmlTag(block, "dc:date") ||
      new Date().toISOString();
    const spot = xmlTag(block, "summary") || xmlTag(block, "description") || null;
    const imageUrl =
      xmlAttr(block, "media:thumbnail", "url") ||
      xmlAttr(block, "media:content", "url") ||
      xmlAttr(block, "enclosure", "url") ||
      null;
    let publishedAt = new Date(published).toISOString();
    if (Number.isNaN(Date.parse(publishedAt))) publishedAt = new Date().toISOString();
    out.push({ title, href, publishedAt, spot, imageUrl });
    if (out.length >= limit) break;
  }
  return out;
}

const DEFAULT_SITE_RSS_FEEDS = [
  { id: "turkiye", label: "Türkiye", url: "https://www.ntv.com.tr/turkiye.rss" },
  { id: "dunya", label: "Dünya", url: "https://www.ntv.com.tr/dunya.rss" },
  { id: "ekonomi", label: "Ekonomi", url: "https://www.ntv.com.tr/ekonomi.rss" },
  { id: "teknoloji", label: "Teknoloji", url: "https://www.ntv.com.tr/teknoloji.rss" },
  { id: "saglik", label: "Sağlık", url: "https://www.ntv.com.tr/saglik.rss" },
  { id: "yasam", label: "Yaşam", url: "https://www.ntv.com.tr/yasam.rss" },
];

async function loadSiteRssFeedRowsFromMeta(origin, incoming, siteId) {
  const host = normalizeHost(incoming.hostname);
  try {
    const metaUrl = new URL("/api/hm/meta/by-domain", origin);
    metaUrl.searchParams.set("domain", host);
    const metaRes = await fetch(metaUrl.toString(), {
      headers: {
        accept: "application/json",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": "https",
      },
      cf: { cacheTtl: 120, cacheEverything: true },
    });
    if (!metaRes.ok) return { enabled: true, feeds: DEFAULT_SITE_RSS_FEEDS };
    const meta = await metaRes.json().catch(() => null);
    const layout = meta?.layout && typeof meta.layout === "object" ? meta.layout : {};
    if (siteId != null && meta?.id != null && Number(meta.id) !== Number(siteId)) {
      /* domain mismatch — still use layout if hybrid on */
    }
    const enabled = layout.hybridRssEnabled === true;
    const rows = Array.isArray(layout.hmNewsSiteRssFeedRows) ? layout.hmNewsSiteRssFeedRows : [];
    const feeds = rows
      .map((row) => ({
        id: String(row?.id || row?.categoryKey || "").trim() || slugifyCategoryKey(row?.label),
        label: String(row?.label || row?.id || "RSS").trim() || "RSS",
        url: String(row?.url || "").trim(),
      }))
      .filter((row) => /^https?:\/\//i.test(row.url));
    return {
      enabled,
      feeds: feeds.length ? feeds : enabled ? DEFAULT_SITE_RSS_FEEDS : [],
    };
  } catch {
    return { enabled: true, feeds: DEFAULT_SITE_RSS_FEEDS };
  }
}

async function fetchSiteRssHybridItems(feeds, perFeed = 4) {
  const selected = (feeds || []).filter((f) => f.url).slice(0, 8);
  const bags = await Promise.all(
    selected.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: {
            accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
            "user-agent": "YekpareSiteRssEdge/1.0",
          },
          cf: { cacheTtl: 180, cacheEverything: true },
        });
        if (!res.ok) return [];
        const entries = parseFeedEntries(await res.text(), perFeed);
        const categorySlug = slugifyCategoryKey(feed.id || feed.label) || "gundem";
        return entries.map((entry) => {
          const edgeId = hashRssEdgeId(entry.href);
          return {
            id: `rss:${edgeId}`,
            source: "rss",
            title: entry.title,
            slug: null,
            href: `/haberler/rss/${encodeURIComponent(edgeId)}`,
            spot: entry.spot,
            content: null,
            imageUrl: entry.imageUrl,
            categorySlug,
            categoryName: feed.label || categorySlug,
            categoryId: null,
            categoryColor: "#CC0000",
            externalUrl: null,
            rssSourceUrl: entry.href,
            originUrl: entry.href,
            sourceSiteUrl: null,
            publishedOnSiteId: null,
            sourceSiteSlug: null,
            publishedAt: entry.publishedAt,
            feedId: `edge-site-${categorySlug}`,
            feedLabel: feed.label || categorySlug,
            authorName: feed.label || categorySlug,
            isFeatured: false,
            isBreaking: false,
            views: 0,
            isEditorManual: false,
            hmSyncKind: null,
            contentKind: "news",
            authorId: null,
          };
        });
      } catch {
        return [];
      }
    }),
  );
  return bags.flat();
}

/**
 * Site içi RSS açıkken Render cache boş kalırsa Cloudflare edge NTV/site feed’lerini doldurur.
 */
async function enrichHybridWithSiteRssEdge(request, env, incoming, upstream, outHeaders) {
  if (request.method !== "GET") return null;
  if (incoming.pathname !== "/api/news/hybrid") return null;
  const siteIdRaw = Number(incoming.searchParams.get("siteId") || 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? Math.floor(siteIdRaw) : null;
  if (siteId == null) return null;
  const rssScope = String(incoming.searchParams.get("rssScope") || "all").trim().toLowerCase();
  if (rssScope === "box") return null;

  const ct = String(outHeaders.get("content-type") || upstream.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) return null;

  let payload;
  try {
    payload = await upstream.clone().json();
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const sources = payload.sources && typeof payload.sources === "object" ? payload.sources : {};
  const rssCount = Number(sources.rss || 0);
  if (payload.hybridRssEnabled === false) return null;
  if (rssCount > 0) return null;

  const origin = upstreamOrigin(env);
  const { enabled, feeds } = await loadSiteRssFeedRowsFromMeta(origin, incoming, siteId);
  if (!enabled && payload.hybridRssEnabled !== true) return null;
  if (!feeds.length) return null;

  const limit = Math.min(Math.max(Number(payload.limit || incoming.searchParams.get("limit") || 40) || 40, 1), 200);
  const rssItems = await fetchSiteRssHybridItems(feeds, 4);
  if (!rssItems.length) return null;

  const existing = Array.isArray(payload.items) ? payload.items : [];
  const seen = new Set(
    existing.map((item) => String(item?.rssSourceUrl || item?.originUrl || item?.href || item?.id || "").trim().toLowerCase()).filter(Boolean),
  );
  const mergedRss = [];
  for (const item of rssItems) {
    const key = String(item.rssSourceUrl || item.href || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    mergedRss.push(item);
  }
  if (!mergedRss.length) return null;

  const categorySlug = String(incoming.searchParams.get("categorySlug") || "").trim().toLowerCase();
  const filteredRss = categorySlug
    ? mergedRss.filter((item) => {
        const slug = String(item.categorySlug || "").toLowerCase();
        return slug === categorySlug || slug.endsWith(`-${categorySlug}`) || categorySlug.endsWith(`-${slug}`);
      })
    : mergedRss;

  const combined = [...existing, ...filteredRss].sort(
    (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
  );
  const offset = Math.max(Number(payload.offset || 0) || 0, 0);
  const page = combined.slice(offset, offset + limit);

  const next = {
    ...payload,
    items: page,
    total: page.length,
    hybridRssEnabled: true,
    sources: {
      db: Number(sources.db || existing.filter((i) => i?.source !== "rss").length || 0),
      rss: filteredRss.length,
    },
  };

  outHeaders.set("content-type", "application/json; charset=utf-8");
  outHeaders.set("cache-control", "public, max-age=60, s-maxage=60, stale-while-revalidate=180");
  outHeaders.set("cdn-cache-control", "public, max-age=60, stale-while-revalidate=180");
  outHeaders.set("x-yekpare-frontend", "cloudflare-site-rss-edge");
  outHeaders.set("x-yekpare-site-rss", "edge-fill");
  outHeaders.delete("content-length");
  return new Response(JSON.stringify(next), { status: upstream.status, headers: outHeaders });
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

    const bareSitemap = redirectBareSitemapPath(request, incoming);
    if (bareSitemap) return bareSitemap;

    const robotsTxt = serveDynamicRobotsTxt(request, incoming);
    if (robotsTxt) return robotsTxt;

    const ogHtml = await socialPreviewOgHtml(request, env, incoming);
    if (ogHtml) return ogHtml;

    const sitemapXml = await proxyRootSitemap(request, env, incoming);
    if (sitemapXml) return sitemapXml;

    const worldBriefs = await serveWorldBriefsEdge(request, env, incoming);
    if (worldBriefs) return worldBriefs;

    const fromAssets = await tryServeAssets(request, env, incoming);
    if (fromAssets) return fromAssets;

    const origin = upstreamOrigin(env);
    const yektubeRewrite = rewriteYektubeSpaPath(incoming.pathname);
    const upstreamPath = yektubeRewrite || incoming.pathname;
    const target = new URL(upstreamPath + incoming.search, origin);
    const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
    const purgeCookie = purgeCookieName(incoming.hostname);

    try {
      const cfOpts = upstreamCfCacheOptions(upstreamPath, request.method);
      const proxyOpts = proxyInit(request, origin, incoming);
      const upstream = await fetchUpstreamWithRetry(
        target.toString(),
        proxyOpts,
        cfOpts,
      );
      const repaired = await maybeRepairMismatchedNewsJson(
        origin,
        proxyOpts,
        request.method,
        incoming,
        upstreamPath,
        upstream,
      );
      if (repaired) return repaired;
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

      const siteRssEnriched = await enrichHybridWithSiteRssEdge(request, env, incoming, upstream, out);
      if (siteRssEnriched) return siteRssEnriched;

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
