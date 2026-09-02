/**
 * SPA → Workers Static Assets (ASSETS); /api → Cloudflare Container (Neon + R2).
 * ASSETS yoksa SPA 404; API Container bağından gider. Render kullanılmaz.
 * Eski Netlify SW / cache için TEK SEFERLIK purge (JS boot + cookie).
 * Clear-Site-Data HTML yanıtlarında kullanılmaz — Chrome navigasyonu ERR_FAILED
 * ile düşürüp cookie yazılmadan döngüye sokabiliyor (turk.eco/admin).
 */
import {
  brandMetaJsonResponse,
  ensureBrandHmSiteMeta,
  matchBrandBinding,
  repairAsgEditorMisassignmentOnNeon,
  ensureHmBreakingRssDefaultsOnNeon,
  ensureHmSiteRssDefaultsOnNeon,
  ensureKhYekpareEditorOnNeon,
  purgeAhgRssCampaignNewsOnNeon,
} from "./hm-brand-db-ensure.js";
import { cloneDefaultHmSiteRssFeedRows } from "./hm-site-rss-defaults.js";
import { handleHmEditorProfileEdge, handleHmEditorMediaUploadEdge } from "./hm-editor-profile-edge.js";
import {
  handleKhEditorDataEdge,
  injectKhNeonNewsIntoPublicResponse,
} from "./hm-editor-kh-data-edge.js";
import { maybeFilterHmPublicNewsUpstream } from "./hm-public-news-edge-filter.js";
import { fetchApi, fetchApiWithRetry, FRONTEND_TAG, resolveApiOrigin } from "./api-upstream.js";
import {
  buildAhenkAiTxtFallback,
  buildAhenkAgencyEntityHtml,
  buildAhenkLlmsTxtFallback,
  buildGeoRobotsTxt,
  buildHmAiTxtFallback,
  buildHmLlmsTxtFallback,
  firstHmBootImageUrl,
  hmDomainSlugFallback,
  hmHomeSlugFromPath,
  injectHmHtmlBoot,
  isAhenkAgencyGeoPath,
  isAhenkAgencyHost,
  isHmAiKnowledgePath,
  isHmPublicHomeHtmlPath,
  raceHmHtmlBoot,
  shouldInstantHmRootRedirect,
  withBudget,
} from "./hm-html-boot.js";
import { handleMediaEdgeHealth, handleMediaGetFromR2, handleMediaR2PutProxy, parseMediaUploadFname } from "./hm-editor-media-s3-edge.js";
import {
  fetchStaticAssets,
  isYektubeSpaHtml,
  isYektubeSurfacePath,
  rewriteYektubeSpaPath,
} from "./yektube-spa.js";

export { GoalgoApiContainer } from "./goalgo-api-container.js";
/**
 * Cookie sürümü — artırınca tüm ziyaretçilerde Netlify SW yeniden temizlenir.
 * (Eski cookie ile purge atlanınca /tr/vkd Netlify 404 görünmeye devam ediyordu.)
 */
const PURGE_COOKIE = "__yekpare_sw_purged_v20260717a";
/**
 * HM + portal: bir kez daha agresif Clear-Site-Data.
 */
const FORCE_PURGE_HOSTS = new Set([
  "ahenk.net.tr",
  "www.ahenk.net.tr",
  "turk.eco",
  "www.turk.eco",
  "haberler.ahenkbt.workers.dev",
  "vatanhaber.net",
  "www.vatanhaber.net",
  "vatankahramanlari.org",
  "www.vatankahramanlari.org",
  "ankarasehirgazetesi.com",
  "www.ankarasehirgazetesi.com",
  "ankarahabergundemi.com",
  "www.ankarahabergundemi.com",
  "suhaber.net",
  "www.suhaber.net",
  "suhaberajansi.com",
  "www.suhaberajansi.com",
  "kirsehri.com",
  "www.kirsehri.com",
  "kirsehirhaber.org",
  "www.kirsehirhaber.org",
  "kirsehir.net",
  "www.kirsehir.net",
  "yektube.com",
  "www.yektube.com",
]);
const FORCE_PURGE_COOKIE = "__yekpare_sw_purged_hm_20260802d";

const PORTAL_HOSTS = new Set([
  "ahenk.net.tr",
  "www.ahenk.net.tr",
  "turk.eco",
  "www.turk.eco",
  "turknet.app",
  "www.turknet.app",
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
  "haberler.ahenkbt.workers.dev",
]);

/** www.ahenk.net.tr + iptal turk.eco → ahenk.net.tr. */
const CANONICAL_PORTAL_ORIGIN = "https://ahenk.net.tr";
const APEX_PORTAL_REDIRECT_HOSTS = new Set(["www.ahenk.net.tr", "turk.eco", "www.turk.eco"]);

/** suhaberajansi.com iptal → suhaber.net. */
const CANONICAL_SU_ORIGIN = "https://suhaber.net";
const LEGACY_SU_REDIRECT_HOSTS = new Set(["suhaberajansi.com", "www.suhaberajansi.com"]);

/** ahenk.net.tr/yp → yektube.com (kanonik Yektube alanı). */
const CANONICAL_YEKTUBE_ORIGIN = "https://yektube.com";
const YEKTUBE_DEDICATED_HOSTS = new Set(["yektube.com", "www.yektube.com"]);
const APEX_YEKTUBE_REDIRECT_HOSTS = new Set(["www.yektube.com"]);

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
        // Netlify + bayat HM tema/meta localStorage anahtarlarını temizle
        var rm = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (!k) continue;
          if (
            k.indexOf('nf_') === 0 ||
            k.indexOf('netlify') !== -1 ||
            k.indexOf('hm-nested-meta:') === 0 ||
            k.indexOf('hm-domain-slug:') === 0 ||
            k.indexOf('hm-meta-by-domain:') === 0 ||
            k.indexOf('hm-home-hybrid:') === 0
          ) {
            rm.push(k);
          }
        }
        rm.forEach(function (k) { localStorage.removeItem(k); });
        try {
          for (var j = sessionStorage.length - 1; j >= 0; j--) {
            var sk = sessionStorage.key(j);
            if (sk && sk.indexOf('hm-meta-by-domain:') === 0) sessionStorage.removeItem(sk);
          }
        } catch (_) {}
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
      return Promise.reject(new Error('sw-disabled-cf-worker'));
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
      return Promise.reject(new Error('sw-disabled-cf-worker'));
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

function upstreamOrigin(env, incoming) {
  return resolveApiOrigin(env, incoming?.origin);
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

/**
 * Upstream Set-Cookie'leri tarayıcıya güvenli aktar.
 * - getSetCookie ile çoklu çerez kaybını önle (+ boşsa headers.get fallback)
 * - Domain=onrender.com vb. kaldır → çerez turk.eco hostuna yazılsın (admin giriş)
 * - SameSite=None → Lax (aynı origin /api vekili; Chrome third-party cookie engeli admin girişi kırıyordu)
 */
function collectUpstreamSetCookies(upstream) {
  const fromGetter =
    typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : null;
  if (Array.isArray(fromGetter) && fromGetter.length > 0) {
    return fromGetter.map((c) => String(c || "")).filter(Boolean);
  }
  const single = upstream.headers.get("set-cookie");
  if (!single) return [];
  return [String(single)];
}

function rewriteSessionCookieForBrowser(cookie) {
  let c = String(cookie || "");
  if (!c) return "";
  c = c.replace(/;\s*Domain=[^;]*/gi, "");
  if (/;\s*SameSite\s*=\s*None/i.test(c)) {
    c = c.replace(/;\s*SameSite\s*=\s*None/gi, "; SameSite=Lax");
  } else if (!/;\s*SameSite\s*=/i.test(c)) {
    c += "; SameSite=Lax";
  }
  return c;
}

function copyUpstreamHeadersForBrowser(upstream) {
  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (String(key).toLowerCase() === "set-cookie") return;
    out.append(key, value);
  });
  for (const cookie of collectUpstreamSetCookies(upstream)) {
    const c = rewriteSessionCookieForBrowser(cookie);
    if (!c) continue;
    out.append("Set-Cookie", c);
  }
  return out;
}

/** Oturum / giriş uçları — kenar ve tarayıcı önbelleği yasak. */
function isAuthSessionApiPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  return (
    p === "/api/members/admin-panel-session" ||
    p === "/api/members/admin-panel-status" ||
    p === "/api/members/logout" ||
    p === "/api/members/login" ||
    p === "/api/hm/editor/login" ||
    p === "/api/hm/editor/session-bridge" ||
    p === "/api/hm/editor/me" ||
    p === "/api/hm/editor/me/password" ||
    p === "/api/hm/author/login" ||
    p === "/api/hm/author/me"
  );
}

function isStaticAssetPath(pathname) {
  const p = String(pathname || "");
  if (p === "/api" || p.startsWith("/api/")) return false;
  return (
    /\.(js|mjs|cjs|css|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico|map|avif|webmanifest)(\?|$)/i.test(p) ||
    p.startsWith("/assets/") ||
    p.startsWith("/yektube-v2/assets/") ||
    p.includes("/public/assets/")
  );
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
  const mHmGoogleNews = /^\/news-hm-([^/]+)-google-news\.xml$/i.exec(p);
  if (mHmGoogleNews) return `/api/sitemap/news-hm-${mHmGoogleNews[1]}-google-news.xml`;
  if (p === "/google-news.xml") return "/api/sitemap/google-news.xml";
  if (p === "/news-yekpare-google-news.xml") return "/api/sitemap/news-yekpare-google-news.xml";
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
 * Eski API hâlâ player_loc=loc yazıyorsa edge’de YouTube embed’e çevir;
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

/** ahenk.net.tr web yazılım vitrini — haber sitemap yerine ajans haritası. */
function serveAhenkAgencyRobots(request, incoming) {
  if (!isAhenkAgencyHost(incoming.hostname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/robots.txt") return null;
  const origin = incoming.origin.replace(/\/+$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes, use=full",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
    "Disallow: /admin/",
    "Disallow: /editor/",
    "",
  ].join("\n");
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-yekpare-frontend": "cloudflare-ahenk-robots",
    },
  });
}

async function serveAhenkAgencySeoFiles(request, env, incoming) {
  if (!isAhenkAgencyHost(incoming.hostname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  let assetPath = "";
  let contentType = "";
  if (path === "/sitemap.xml" || path === "/sitemap-static.xml") {
    assetPath = "/ahenk-sitemap.xml";
    contentType = "application/xml; charset=utf-8";
  } else if (path === "/llms.txt") {
    assetPath = "/ahenk-llms.txt";
    contentType = "text/plain; charset=utf-8";
  } else {
    return null;
  }
  try {
    const assetResp = await fetchStaticAssets(env, request, assetPath);
    if (!assetResp || !assetResp.ok) return null;
    const headers = new Headers({
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
      "x-yekpare-frontend": "cloudflare-ahenk-seo",
    });
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(await assetResp.text(), { status: 200, headers });
  } catch {
    return null;
  }
}

function serveDynamicRobotsTxt(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/robots.txt") return null;
  const origin = incoming.origin.replace(/\/+$/, "");
  const body = buildGeoRobotsTxt(origin);
  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "public, max-age=3600",
    "x-yekpare-frontend": "cloudflare-robots",
  });
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

/** HM özel alan — siteye özel llms.txt / ai.txt (SPA public/llms.txt portal metnini ezmesin). */
async function proxyHmAiKnowledgeText(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isHmAiKnowledgePath(incoming.pathname)) return null;
  const host = normalizeHost(incoming.hostname);
  if (!host) return null;
  const slug = hmDomainSlugFallback(incoming.hostname);
  const origin = incoming.origin.replace(/\/+$/, "");
  const p = incoming.pathname.replace(/\/+$/, "") || "/";
  const ahenkHost = isAhenkAgencyHost(host);
  if (isPortalHost(host) && !ahenkHost) return null;
  const apiPath = p === "/llms.txt" ? "/api/hm/llms.txt" : "/api/hm/ai.txt";
  const apiOrigin = upstreamOrigin(env, incoming);
  try {
    const upstream = await fetchApi(env, `${apiOrigin}${apiPath}`, {
      method: request.method === "HEAD" ? "GET" : request.method,
      headers: {
        accept: "text/plain",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", "") || "https",
      },
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    const ct = String(upstream.headers.get("content-type") || "").toLowerCase();
    if (upstream.ok && (ct.includes("text/plain") || ct.includes("text/markdown"))) {
      const headers = new Headers(upstream.headers);
      headers.set("content-type", "text/plain; charset=utf-8");
      headers.set("cache-control", "public, max-age=3600");
      headers.set("x-yekpare-frontend", ahenkHost ? "cloudflare-ahenk-llms" : "cloudflare-hm-llms");
      if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
      return new Response(upstream.body, { status: upstream.status, headers });
    }
  } catch {
    /* fallback */
  }
  if (ahenkHost) {
    const body = p === "/llms.txt" ? buildAhenkLlmsTxtFallback(origin) : buildAhenkAiTxtFallback(origin);
    const headers = new Headers({
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600",
      "x-yekpare-frontend": "cloudflare-ahenk-llms-fallback",
    });
    return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
  }
  if (!slug) return null;
  const body = p === "/llms.txt" ? buildHmLlmsTxtFallback(slug, origin) : buildHmAiTxtFallback(slug, origin);
  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "public, max-age=600",
    "x-yekpare-frontend": "cloudflare-hm-llms-fallback",
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

  const origin = upstreamOrigin(env, incoming);
  const targetUrl = `${origin}${apiPath}${incoming.search}`;
  const xmlHeaders = (extra = {}) => {
    const headers = new Headers({
      "content-type": "application/xml; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "x-yekpare-frontend": "cloudflare-sitemap-proxy",
      "x-yekpare-sitemap-api": apiPath,
      ...extra,
    });
    return headers;
  };
  const failXml = (status) => {
    const headers = xmlHeaders({ "retry-after": "60" });
    headers.set("x-yekpare-sitemap-error", "1");
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n</urlset>`;
    if (request.method === "HEAD") return new Response(null, { status, headers });
    return new Response(body, { status, headers });
  };
  try {
    const upstream = await fetchApiWithRetry(env, targetUrl, {
      method: request.method === "HEAD" ? "GET" : request.method,
      headers: {
        accept: "application/xml, text/xml, */*",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", "") || "https",
        "user-agent": request.headers.get("user-agent") || "yekpare-sitemap-proxy",
      },
      cf: { cacheTtl: pathOnly === "/sitemap.xml" || pathOnly === "/google-news.xml" ? 600 : 300, cacheEverything: true },
      redirect: "manual",
    });
    const ct = String(upstream.headers.get("content-type") || "").toLowerCase();
    if (!upstream.ok || (!ct.includes("xml") && !ct.includes("text/plain") && !ct.includes("text/xml"))) {
      return failXml(upstream.status >= 500 ? 503 : upstream.status || 503);
    }
    let text = rewriteSitemapOrigins(await upstream.text(), incoming.origin);
    if (/^\/yektube-videos-\d+\.xml$/i.test(pathOnly) || /yektube-videos-\d+/i.test(apiPath)) {
      text = rewriteYektubeVideoSitemapXml(text);
    }
    const headers = xmlHeaders();
    headers.set(
      "cache-control",
      upstream.headers.get("cache-control") || "public, max-age=1800, stale-while-revalidate=86400",
    );
    if (/yektube-videos/i.test(pathOnly)) {
      headers.set("x-yekpare-video-sitemap-rewrite", "1");
    }
    if (request.method === "HEAD") {
      headers.set("content-length", String(new TextEncoder().encode(text).byteLength));
      return new Response(null, { status: 200, headers });
    }
    return new Response(text, { status: 200, headers });
  } catch {
    return failXml(503);
  }
}

/** CF Assets'ten HTML yanıtını SW purge boot ile sar. */
async function respondAssetHtml(request, assetResp, { oneShotPurge, purgeCookie, hostname, env, incoming }) {
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
  let html = rewriteHtml(await assetResp.text(), { oneShotPurge, purgeCookie });
  const homeHtml = incoming && isHmPublicHomeHtmlPath(incoming.pathname, incoming.hostname);
  if (homeHtml && env && incoming) {
    const slug = hmHomeSlugFromPath(incoming.pathname, incoming.hostname);
    if (slug) {
      const metaPreload = `/api/hm/meta/by-slug/${encodeURIComponent(slug)}?domain=${encodeURIComponent(incoming.hostname)}`;
      out.append("Link", `<${metaPreload}>; rel=preload; as=fetch; crossorigin`);
      out.append(
        "Link",
        `</api/hm/home-bundle?slug=${encodeURIComponent(slug)}&sliderLimit=15>; rel=preload; as=fetch; crossorigin`,
      );
    }
    try {
      const origin = upstreamOrigin(env, incoming);
      const boot = await withBudget(raceHmHtmlBoot({ fetchApi, origin, env, incoming }));
      if (boot) {
        html = injectHmHtmlBoot(html, boot);
        out.set("x-yekpare-hm-html-boot", boot.bundle ? "bundle" : "meta");
        const hero = firstHmBootImageUrl(boot.bundle, incoming.origin);
        if (hero) out.append("Link", `<${hero}>; rel=preload; as=image`);
      }
    } catch (err) {
      console.error("[hm-html-boot]", String(err?.message || err).slice(0, 180));
    }
  }
  return new Response(html, {
    status: assetResp.status,
    headers: out,
  });
}

/** SPA + statik: ASSETS; yoksa null (API/Container vekiline düş). */
async function tryServeAssets(request, env, incoming) {
  if (!env.ASSETS) return null;
  if (isApiPath(incoming.pathname)) return null;

  const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
  const purgeCookie = purgeCookieName(incoming.hostname);
  const yektubeRewrite = rewriteYektubeSpaPath(incoming.pathname);
  const assetPathForFetch = yektubeRewrite || incoming.pathname;
  const wantsStatic =
    isStaticAssetPath(incoming.pathname) || isStaticAssetPath(assetPathForFetch);

  // .xml sitemap yollarını SPA index.html'e düşürme — proxy kaçırırsa boş XML yerine HTML olmasın
  if (incoming.pathname.toLowerCase().endsWith(".xml") && !wantsStatic) {
    return null;
  }

  let assetResp = await fetchStaticAssets(env, request, assetPathForFetch);
  let ct = String(assetResp.headers.get("content-type") || "").toLowerCase();

  /**
   * CF Assets `not_found_handling=single-page-application` eksik dosyada 200 + HTML döner.
   * /yektube-v2/assets/*.js HTML gelirse tarayıcı JS çalıştıramaz → /yp beyaz ekran.
   * Statik istekte HTML = miss → Container vekili (dosyalar image'da varsa).
   */
  if (wantsStatic) {
    if (!assetResp.ok || ct.includes("text/html")) {
      return null;
    }
    const out = new Headers(assetResp.headers);
    out.set("x-yekpare-frontend", "cloudflare-assets");
    out.set("cdn-cache-control", "public, max-age=86400");
    if (!out.get("cache-control")) {
      out.set("cache-control", "public, max-age=86400, immutable");
    }
    if (yektubeRewrite) out.set("x-yekpare-yektube-rewrite", yektubeRewrite);
    return new Response(assetResp.body, { status: assetResp.status, headers: out });
  }

  if (assetResp.status === 404 && request.method === "GET") {
    assetResp = await fetchStaticAssets(env, request, "/index.html");
    ct = String(assetResp.headers.get("content-type") || "").toLowerCase();
  }

  if (ct.includes("text/html")) {
    // /yp → yektube-v2/index.html rewrite sonrası Assets portal index döndüyse Container'a bırak
    if (yektubeRewrite || isYektubeSurfacePath(incoming.pathname)) {
      try {
        const html = await assetResp.clone().text();
        if (!isYektubeSpaHtml(html)) {
          return null;
        }
        return respondAssetHtml(
          request,
          new Response(html, { status: assetResp.status, headers: assetResp.headers }),
          { oneShotPurge, purgeCookie, hostname: incoming.hostname, env, incoming },
        );
      } catch {
        return null;
      }
    }
    return respondAssetHtml(request, assetResp, {
      oneShotPurge,
      purgeCookie,
      hostname: incoming.hostname,
      env,
      incoming,
    });
  }

  if (assetResp.ok) {
    const out = new Headers(assetResp.headers);
    out.set("x-yekpare-frontend", "cloudflare-assets");
    if (yektubeRewrite) out.set("x-yekpare-yektube-rewrite", yektubeRewrite);
    return new Response(assetResp.body, { status: assetResp.status, headers: out });
  }

  return null;
}

function isYektubeDedicatedHost(host) {
  const h = String(host || "")
    .toLowerCase()
    .split(":")[0]
    .trim();
  return YEKTUBE_DEDICATED_HOSTS.has(h);
}

function isYektubeEmbedRequest(incoming) {
  const embed = String(incoming.searchParams.get("embed") || "").toLowerCase();
  if (embed === "1" || embed === "true" || embed === "yes") return true;
  const hm = incoming.searchParams.get("hm");
  return hm != null && String(hm).trim() !== "";
}

/** Portal (turk.eco) Yektube yüzey yollarını kanonik /yp düzenine çevir. */
function mapPortalYektubePathToDedicated(pathname) {
  const raw = String(pathname || "/") || "/";
  const path = raw.replace(/\/+$/, "") || "/";
  if (path === "/yektube-v2") return "/yp/";
  if (path.startsWith("/yektube-v2/")) return path.replace(/^\/yektube-v2(?=\/|$)/, "/yp");
  if (path === "/yektube") return "/yp/";
  if (path.startsWith("/yektube/")) return path.replace(/^\/yektube(?=\/|$)/, "/yp");
  if (path === "/yeklive") return "/yek-gonder";
  if (path.startsWith("/yeklive/")) return path.replace(/^\/yeklive(?=\/|$)/, "/yek-gonder");
  if (path === "/yp") return "/yp/";
  return path;
}

/**
 * turk.eco/yp (ve diğer Yektube yüzeyleri) → https://yektube.com/...
 * HM iframe (embed=1 / hm=) aynı origin'de kalsın.
 */
function redirectPortalYektubeToCanonical(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isPortalHost(incoming.hostname)) return null;
  if (isYektubeDedicatedHost(incoming.hostname)) return null;
  if (isYektubeEmbedRequest(incoming)) return null;
  if (!isYektubeSurfacePath(incoming.pathname)) return null;
  // Asset uzantılı istekleri (js/css/png) domain değiştirme
  const last = (incoming.pathname.split("/").pop() || "");
  if (last.includes(".") && !/\.html?$/i.test(last)) return null;

  const nextPath = mapPortalYektubePathToDedicated(incoming.pathname);
  const dest = new URL(nextPath, CANONICAL_YEKTUBE_ORIGIN);
  dest.search = incoming.search;
  return new Response(null, {
    status: 308,
    headers: {
      Location: dest.toString(),
      "cache-control": "public, max-age=3600",
      "x-yekpare-frontend": "yektube-canonical-redirect",
    },
  });
}

/**
 * yektube.com kök + eski yollar → /yp (turk.eco/yp ile aynı yüzey).
 */
function redirectYektubeDedicatedHost(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isYektubeDedicatedHost(incoming.hostname)) return null;

  const raw = String(incoming.pathname || "/") || "/";
  const path = raw.replace(/\/+$/, "") || "/";

  if (path === "/") {
    const dest = new URL("/yp/", CANONICAL_YEKTUBE_ORIGIN);
    dest.search = incoming.search;
    return new Response(null, {
      status: 301,
      headers: {
        Location: dest.toString(),
        "cache-control": "public, max-age=3600",
        "x-yekpare-frontend": "yektube-root-redirect",
      },
    });
  }

  let nextPath = null;
  if (path === "/tr" || path.startsWith("/tr/")) {
    nextPath = path.replace(/^\/tr(?=\/|$)/, "/yp") || "/yp/";
  } else if (path === "/v2" || path.startsWith("/v2/")) {
    nextPath = path.replace(/^\/v2(?=\/|$)/, "/yp") || "/yp/";
  } else if (path === "/yektube-v2" || path.startsWith("/yektube-v2/")) {
    // Asset yolu (/yektube-v2/assets/...) rewrite'ta kalır
    if (path.startsWith("/yektube-v2/assets/") || /\.[a-z0-9]+$/i.test(path)) return null;
    nextPath = path.replace(/^\/yektube-v2(?=\/|$)/, "/yp") || "/yp/";
  } else if (path === "/yektube" || path.startsWith("/yektube/")) {
    nextPath = path.replace(/^\/yektube(?=\/|$)/, "/yp") || "/yp/";
  } else if (path === "/yeklive" || path.startsWith("/yeklive/")) {
    nextPath = path.replace(/^\/yeklive(?=\/|$)/, "/yek-gonder");
  } else if (path === "/yp") {
    nextPath = "/yp/";
  }

  if (!nextPath || nextPath === incoming.pathname) return null;
  const dest = new URL(nextPath, CANONICAL_YEKTUBE_ORIGIN);
  dest.search = incoming.search;
  return new Response(null, {
    status: 301,
    headers: {
      Location: dest.toString(),
      "cache-control": "public, max-age=3600",
      "x-yekpare-frontend": "yektube-path-redirect",
    },
  });
}

/**
 * HM haber listeleri — edge cache.
 * Public meta kısa kenar önbelleği (includePageContent/fresh hariç); editör kaydı purge eder.
 */
function isCacheableHmNewsApi(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  return (
    p === "/api/hm/home-bundle" ||
    p === "/api/news" ||
    p === "/api/news/hybrid" ||
    p === "/api/news/featured" ||
    p === "/api/news/breaking" ||
    // /api/categories ASLA kenar cache'lenmez — admin silme sonrası bayat liste dönmesin.
    p === "/api/authors"
  );
}

function isHmMetaApiPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  return p.startsWith("/api/hm/meta/");
}

/** Su markası: domain onarımını uygula ve kanonik /tr/su metasını tercih et. Diğer markalar: yalnız 404.
 * @param {{ waitUntil?: (p: Promise<unknown>) => void }} [opts]
 */
async function maybeEnsureBrandMetaResponse(env, incoming, upstream, opts = {}) {
  if (!upstream) return null;
  if (!isHmMetaApiPath(incoming.pathname)) return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "";
  let domain = incoming.searchParams.get("domain") || "";
  let slug = "";
  const bySlug = path.match(/^\/api\/hm\/meta\/by-slug\/([^/]+)$/i);
  if (bySlug) slug = decodeURIComponent(bySlug[1] || "");
  const byDomain = path === "/api/hm/meta/by-domain";
  if (byDomain && !domain) return null;
  const binding = matchBrandBinding({ domain, slug });
  if (!binding) return null;

  const slugKey = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  const isSuBrand =
    binding.slug === "su" ||
    normalizeHost(domain) === "suhaber.net" ||
    normalizeHost(domain) === "suhaberajansi.com" ||
    slugKey === "su" ||
    slugKey === "suhaber";

  const khHosts = new Set(["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"]);
  const isKhBrand =
    binding.slug === "kirsehirhaber" ||
    binding.slug === "kh" ||
    slugKey === "kirsehirhaber" ||
    slugKey === "kh" ||
    slugKey === "kirsehir" ||
    khHosts.has(normalizeHost(domain));

  const isAsgBrand =
    binding.slug === "asg" ||
    slugKey === "asg" ||
    normalizeHost(domain).includes("ankarasehirgazetesi");

  // ASG: yazar + köşe yazısını arka planda hizala (makale kopyası meta yanıtını geciktirmesin).
  if (isAsgBrand && upstream.ok) {
    const job = ensureBrandHmSiteMeta(env, { domain, slug: binding.slug || "asg" }).catch((err) => {
      console.error("[hm-brand-db-ensure/asg-authors-makale]", String(err?.message || err).slice(0, 200));
    });
    if (typeof opts.waitUntil === "function") {
      opts.waitUntil(job);
    } else {
      // waitUntil yoksa kısa fingerprint no-op için yine de dene; uzun kopya riskli
      try {
        await Promise.race([job, new Promise((r) => setTimeout(r, 2500))]);
      } catch (_) {}
    }
    return null;
  }

  // Su + KH: Neon meta (KH editör veri kenarı Neon'a yazıyor).
  // Diğer markalar: yalnızca upstream 404 iken fallback.
  if (!isSuBrand && !isKhBrand && upstream.status !== 404) return null;

  try {
    const ensured = await ensureBrandHmSiteMeta(env, { domain, slug });
    if (!ensured?.meta?.id) return null;
    if (slug && String(ensured.meta.slug || "").toLowerCase() !== slug.toLowerCase()) {
      return null;
    }
    return brandMetaJsonResponse(ensured.meta, {
      "x-yekpare-hm-brand-ensure-action":
        ensured.action || (isSuBrand ? "su-domain-repair" : isKhBrand ? "kh-neon-meta" : "ok"),
    });
  } catch (err) {
    console.error("[hm-brand-db-ensure]", String(err?.message || err).slice(0, 240));
    return null;
  }
}

function upstreamCfCacheOptions(pathname, method, search = "") {
  if (method !== "GET" && method !== "HEAD") {
    return { cacheTtl: 0, cacheEverything: false };
  }
  if (isStaticAssetPath(pathname)) {
    return { cacheTtl: 86400, cacheEverything: true };
  }
  // Admin / oturum — asla kenar önbelleği yok.
  if (isAuthSessionApiPath(pathname)) {
    return { cacheTtl: 0, cacheEverything: false };
  }
  // Tema/layout meta — kısa kenar önbelleği (editör yayınında purgeHmSitePublicEdgeCache).
  if (isHmMetaApiPath(pathname)) {
    const qs = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    if (qs.get("includePageContent") === "1" || qs.get("fresh") === "1") {
      return { cacheTtl: 0, cacheEverything: false };
    }
    return { cacheTtl: 20, cacheEverything: true };
  }
  if (isCacheableHmNewsApi(pathname)) {
    const qs = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    if (qs.get("fresh") === "1" || qs.get("fresh") === "true") {
      return { cacheTtl: 0, cacheEverything: false };
    }
    // home-bundle: ilk boyama; 90s kenar + SWR.
    const p = String(pathname || "").split("?")[0] || "";
    if (p === "/api/hm/home-bundle") {
      return { cacheTtl: 90, cacheEverything: true };
    }
    return { cacheTtl: 120, cacheEverything: true };
  }
  return { cacheTtl: 0, cacheEverything: false };
}

async function fetchUpstreamWithRetry(env, url, init, cfOpts, retries = 2) {
  return fetchApiWithRetry(env, url, { ...init, cf: cfOpts }, retries);
}

/**
 * Eski API: parseInt("2026-yili-...") → id 2026 (yanlış haber).
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

async function resolveNewsIdByExactSlug(env, origin, init, slug, siteId) {
  const want = String(slug || "").trim();
  if (!want) return null;
  const qs = new URLSearchParams({ limit: "120" });
  if (siteId) qs.set("siteId", String(siteId));
  try {
    const res = await fetchApi(env, `${origin}/api/news?${qs}`, {
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

async function maybeRepairMismatchedNewsJson(env, origin, init, method, incoming, upstreamPath, upstreamRes) {
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
    env,
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
    const repaired = await fetchApi(env, repairUrl.toString(), {
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
    headers.set("x-yekpare-frontend", FRONTEND_TAG);
    headers.set("x-yekpare-upstream", origin);
    return new Response(JSON.stringify(repairedBody), {
      status: 200,
      headers,
    });
  } catch {
    return null;
  }
}

function hmCustomDomainRootRedirectResponse(incoming, request, slug, via) {
  const loc = `${incoming.origin}/tr/${encodeURIComponent(slug)}${incoming.search || ""}`;
  const headers = {
    location: loc,
    "cache-control": "public, max-age=30",
    "cdn-cache-control": "public, max-age=30",
    "x-yekpare-frontend": FRONTEND_TAG,
    "x-yekpare-hm-redirect": slug,
    "x-yekpare-hm-redirect-via": via,
  };
  if (needsForcePurge(incoming.hostname) && !cookieHas(request, FORCE_PURGE_COOKIE)) {
    headers["set-cookie"] =
      `${FORCE_PURGE_COOKIE}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`;
    headers["x-yekpare-purge"] = "hm-force-redirect";
  }
  return new Response(null, { status: 308, headers });
}

/**
 * Edge soft-redirect: HM özel alan kökü → /tr/{slug}
 * (Vercel middleware CF Worker yolunda çalışmadığı için Worker'da tekrarlanır.)
 */
async function redirectHmCustomDomainRoot(request, env, incoming, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (isPortalHost(incoming.hostname)) return null;

  const domain = incoming.hostname.toLowerCase();
  const fallbackSlug = hmDomainSlugFallback(domain);

  // HM özel alanda /admin → /editor (turk.eco/admin'e atma)
  if (fallbackSlug || !isPortalHost(domain)) {
    const bare = path.toLowerCase();
    if (bare === "/admin" || bare === "/admin/giris" || bare.startsWith("/admin/")) {
      if (fallbackSlug || needsForcePurge(domain)) {
        const target = new URL("/editor", incoming.origin);
        return new Response(null, {
          status: 302,
          headers: {
            location: target.toString(),
            "cache-control": "no-store",
            "cdn-cache-control": "no-store",
            "x-yekpare-frontend": "cloudflare-worker",
            "x-yekpare-hm-admin-to-editor": "1",
          },
        });
      }
    }
  }

  if (path !== "/") return null;

  // Bilinen HM alanları: meta API bekleme (0.5–2s TTFB). Slug tablosu yeterli.
  if (shouldInstantHmRootRedirect(request.method, path, domain) && fallbackSlug) {
    if (ctx && typeof ctx.waitUntil === "function") {
      const origin = upstreamOrigin(env, incoming);
      ctx.waitUntil(
        fetchApi(
          env,
          `${origin}/api/hm/meta/by-domain?domain=${encodeURIComponent(domain)}`,
          {
            headers: {
              accept: "application/json",
              "x-forwarded-host": incoming.host,
              "x-forwarded-proto": "https",
            },
            cf: { cacheTtl: 60, cacheEverything: true },
          },
        ).catch(() => null),
      );
    }
    return hmCustomDomainRootRedirectResponse(incoming, request, fallbackSlug, "fallback-instant");
  }

  const origin = upstreamOrigin(env, incoming);
  try {
    const metaRes = await fetchApi(
      env,
      `${origin}/api/hm/meta/by-domain?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          accept: "application/json",
          "x-forwarded-host": incoming.host,
          "x-forwarded-proto": "https",
        },
        cf: { cacheTtl: 0, cacheEverything: false },
      },
    );
    if (metaRes.ok) {
      const meta = await metaRes.json().catch(() => null);
      const slug = String(meta?.slug || "").trim();
      if (slug) {
        return hmCustomDomainRootRedirectResponse(incoming, request, slug, "meta");
      }
    } else if (metaRes.status === 404 && fallbackSlug) {
      // Meta 404 — Neon'da marka siteyi oluştur/bağla (sonraki /api/hm/meta çağrıları için).
      try {
        await ensureBrandHmSiteMeta(env, { domain, slug: fallbackSlug });
      } catch (err) {
        console.error("[hm-brand-db-ensure/root]", String(err?.message || err).slice(0, 200));
      }
    }
  } catch {
    /* fallback below */
  }

  // Meta yok/404: bilinen HM editör alanlarında asla Yekpare portal anasayfasına düşme.
  if (fallbackSlug) {
    return hmCustomDomainRootRedirectResponse(incoming, request, fallbackSlug, "fallback");
  }
  if (needsForcePurge(domain)) {
    // FORCE_PURGE listesindeki alanlar editör siteleri — portal SPA gösterme.
    return new Response(
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Haber sitesi</title>
<meta name="robots" content="noindex"><meta http-equiv="refresh" content="2;url=/editor">
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fff;color:#111}
p{max-width:28rem;text-align:center;line-height:1.5}</style></head>
<body><p>Bu alan adı bir haber sitesine aittir. Yapılandırma tamamlanıyor…</p></body></html>`,
      {
        status: 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "cdn-cache-control": "no-store",
          "x-yekpare-frontend": "cloudflare-worker",
          "x-yekpare-hm-unmapped": "1",
        },
      },
    );
  }
  return null;
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
    p === "/llms.txt" ||
    p === "/ai.txt" ||
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

async function fetchHmSlugForHost(env, apiOrigin, host) {
  const h = normalizeHost(host);
  if (!h || isPortalHost(h)) return null;
  try {
    const res = await fetchApi(
      env,
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
 * Sosyal önizleme botları: SPA index.html (turk.eco OG) yerine
 * /api/public/og-html ile haber başlık/açıklama/görsel döndür.
 * (Vercel middleware / Netlify edge CF Worker yolunda çalışmadığı için burada tekrarlanır.)
 */
async function socialPreviewOgHtml(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isSocialPreviewBot(request)) return null;
  if (isOgProxySkipPath(incoming.pathname)) return null;

  const host = (incoming.hostname || "").toLowerCase();
  const cleanPath = incoming.pathname.replace(/\/+$/, "") || "/";
  const apiOrigin = upstreamOrigin(env, incoming);
  const isHmSlugPath = /^\/tr\/[^/]+(?:\/.*)?$/.test(cleanPath);
  const hmBound = !isPortalHost(host) ? Boolean(await fetchHmSlugForHost(env, apiOrigin, host)) : false;
  const isCustomHmDomainPath = hmBound;
  const isPortalSharePath = (isPortalHost(host) || !hmBound) && isPortalOgSharePath(cleanPath);
  const isAhenkAgencyPath = isAhenkAgencyHost(host) && isAhenkAgencyGeoPath(cleanPath);
  if (!isHmSlugPath && !isCustomHmDomainPath && !isPortalSharePath && !isAhenkAgencyPath) return null;

  const target = new URL("/api/public/og-html", apiOrigin);
  target.searchParams.set("path", cleanPath);
  target.searchParams.set("origin", incoming.origin);

  try {
    const upstream = await fetchApi(env, target.toString(), {
      headers: {
        accept: "text/html",
        "user-agent": request.headers.get("user-agent") ?? "",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", "") || "https",
      },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!upstream.ok) {
      if (isAhenkAgencyPath) return ahenkAgencyEntityResponse(request, cleanPath);
      return null;
    }
    const headers = new Headers(upstream.headers);
    headers.delete("content-encoding");
    headers.delete("transfer-encoding");
    headers.set("cache-control", "public, max-age=300, s-maxage=300");
    headers.set("cdn-cache-control", "public, max-age=300");
    headers.set("x-yekpare-frontend", FRONTEND_TAG);
    headers.set("x-yekpare-og", isAhenkAgencyPath ? "ahenk-entity" : "social-preview");
    headers.set("x-robots-tag", "index, follow, max-image-preview:large, max-snippet:-1");
    if (request.method === "HEAD") {
      return new Response(null, { status: upstream.status, headers });
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    if (isAhenkAgencyPath) return ahenkAgencyEntityResponse(request, cleanPath);
    return null;
  }
}

function ahenkAgencyEntityResponse(request, pathname) {
  const body = buildAhenkAgencyEntityHtml(pathname);
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=300",
    "x-yekpare-frontend": FRONTEND_TAG,
    "x-yekpare-og": "ahenk-entity-fallback",
    "x-robots-tag": "index, follow, max-image-preview:large, max-snippet:-1",
  });
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(body, { status: 200, headers });
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

function hashRssEdgeId(link) {
  const s = String(link || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `edge-${(h >>> 0).toString(16)}`;
}

function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** RSS gövdesindeki harici bağlantıları kaldırır (yalnızca metin kalır) — NTV’ye sızma olmasın. */
function stripExternalAnchorsFromHtml(html) {
  return String(html || "")
    .replace(/<a\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<a\b[^>]*\bhref\s*=\s*["']\/\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1");
}

function parseNtvDunyaAtom(xml, limit = 24) {
  const entries = String(xml || "").match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const out = [];
  for (const entry of entries) {
    const title = xmlTag(entry, "title");
    if (!isTurkishWorldBriefTitle(title)) continue;
    const sourceUrl =
      xmlAttr(entry, "link", "href") ||
      xmlTag(entry, "id") ||
      "";
    if (!/^https?:\/\//i.test(sourceUrl)) continue;
    const published =
      xmlTag(entry, "published") ||
      xmlTag(entry, "updated") ||
      new Date().toISOString();
    const spot = xmlTag(entry, "summary") || null;
    const imageUrl =
      xmlAttr(entry, "media:thumbnail", "url") ||
      xmlAttr(entry, "media:content", "url") ||
      null;
    const edgeId = hashRssEdgeId(sourceUrl);
    out.push({
      id: edgeId,
      title,
      spot,
      href: `/haberler/rss/${encodeURIComponent(edgeId)}`,
      publishedAt: new Date(published).toISOString(),
      sourceName: "Dünya",
      feedLabel: "Dünya",
      countryCode: null,
      countryName: null,
      continent: "global",
      imageUrl,
      originUrl: sourceUrl,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Edge: Dünyadan Kısa Kısa — NTV Dünya RSS (API gecikmesinde donmasın).
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
    const key = String(item.originUrl || item.href).trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };
  for (const item of rssItems) push(item);

  if (siteId != null) {
    try {
      const origin = upstreamOrigin(env, incoming);
      const hybridUrl = new URL("/api/news/hybrid", origin);
      hybridUrl.searchParams.set("siteId", String(siteId));
      hybridUrl.searchParams.set("categorySlug", "dunya");
      hybridUrl.searchParams.set("dbFirst", "1");
      hybridUrl.searchParams.set("limit", String(itemCap));
      const hybridRes = await fetchApi(env, hybridUrl.toString(), {
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
          const rawId = String(row.id || "").trim();
          const isRss =
            row.source === "rss" ||
            rawId.startsWith("rss:") ||
            rawId.startsWith("edge-") ||
            String(row.href || "").includes("/haberler/rss/");
          let href = "";
          if (slug && !isRss) {
            href = `/haber/${slug}`;
          } else {
            const candidate = String(row.href || "").trim();
            if (candidate.startsWith("/") && !/^\/\//.test(candidate)) {
              href = candidate;
            } else if (isRss) {
              const edgeId = rawId.startsWith("rss:")
                ? rawId.slice(4)
                : rawId.startsWith("edge-")
                  ? rawId
                  : hashRssEdgeId(String(row.originUrl || row.rssSourceUrl || candidate || title));
              if (edgeId) href = `/haberler/rss/${encodeURIComponent(edgeId)}`;
            }
          }
          // Harici originUrl (NTV vb.) kart href’i olmaz — site içi yol şart.
          if (!href || /^https?:\/\//i.test(href) || /^\/\//.test(href)) continue;
          push({
            id: isRss
              ? rawId.startsWith("rss:")
                ? rawId
                : rawId.startsWith("edge-")
                  ? rawId
                  : `rss:${rawId}`
              : rawId.startsWith("db:")
                ? rawId
                : `db:${rawId}`,
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
  const slice = items.slice(0, itemCap).map((item) => {
    // İstemciye harici originUrl verme — kartlar yalnızca site içi href kullanır.
    const { originUrl: _originUrl, ...publicItem } = item;
    return publicItem;
  });
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
    const contentEncoded =
      xmlTag(block, "content:encoded") ||
      xmlTag(block, "content") ||
      null;
    let imageUrl =
      xmlAttr(block, "media:thumbnail", "url") ||
      xmlAttr(block, "media:content", "url") ||
      xmlAttr(block, "enclosure", "url") ||
      null;
    if (!imageUrl && contentEncoded) {
      const img = String(contentEncoded).match(/<img[^>]+src=["']([^"']+)["']/i);
      if (img?.[1] && /^https?:\/\//i.test(img[1])) imageUrl = img[1];
    }
    let publishedAt = new Date(published).toISOString();
    if (Number.isNaN(Date.parse(publishedAt))) publishedAt = new Date().toISOString();
    out.push({ title, href, publishedAt, spot, contentHtml: contentEncoded, imageUrl });
    if (out.length >= limit) break;
  }
  return out;
}

const DEFAULT_SITE_RSS_FEEDS = cloneDefaultHmSiteRssFeedRows();

async function loadSiteRssFeedRowsFromMeta(env, origin, incoming, siteId) {
  const host = normalizeHost(incoming.hostname);
  try {
    const metaUrl = new URL("/api/hm/meta/by-domain", origin);
    metaUrl.searchParams.set("domain", host);
    const metaRes = await fetchApi(env, metaUrl.toString(), {
      headers: {
        accept: "application/json",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": "https",
      },
      cf: { cacheTtl: 120, cacheEverything: true },
    });
    if (!metaRes.ok) return { enabled: true, mode: "live", feeds: DEFAULT_SITE_RSS_FEEDS };
    const meta = await metaRes.json().catch(() => null);
    const layout = meta?.layout && typeof meta.layout === "object" ? meta.layout : {};
    const enabled = layout.hybridRssEnabled === true;
    const modeRaw = String(layout.hmRssIntegrationMode || "live").trim().toLowerCase();
    const mode =
      modeRaw === "persistent" || modeRaw === "kalici" || modeRaw === "kalıcı"
        ? "persistent"
        : modeRaw === "manual" || modeRaw === "manuel"
          ? "manual"
          : "live";
    // Kutu içi + site içi RSS — aynı kategoride birden fazla URL korunur.
    const boxRows = Array.isArray(layout.hmNewsBreakingRssFeedRows)
      ? layout.hmNewsBreakingRssFeedRows
      : [];
    const siteRows = Array.isArray(layout.hmNewsSiteRssFeedRows) ? layout.hmNewsSiteRssFeedRows : [];
    const feeds = [];
    const seenUrls = new Set();
    for (const row of [...boxRows, ...siteRows]) {
      const label = String(row?.label || row?.id || "RSS").trim() || "RSS";
      const key =
        slugifyCategoryKey(row?.categoryKey) ||
        slugifyCategoryKey(row?.id) ||
        slugifyCategoryKey(label) ||
        "rss";
      const url = String(row?.url || "").trim();
      if (!/^https?:\/\//i.test(url)) continue;
      const urlKey = url.toLowerCase();
      if (seenUrls.has(urlKey)) continue;
      seenUrls.add(urlKey);
      const canon = canonicalizeRssCategorySlugEdge(key) || key;
      feeds.push({
        id: key.startsWith("spor") ? "spor" : canon,
        label,
        url,
      });
    }
    return {
      enabled,
      mode,
      feeds: feeds.length ? feeds : enabled ? DEFAULT_SITE_RSS_FEEDS : [],
    };
  } catch {
    return { enabled: true, mode: "live", feeds: DEFAULT_SITE_RSS_FEEDS };
  }
}

async function findEdgeRssEntryById(env, itemId, origin, incoming) {
  const raw = decodeURIComponent(String(itemId || "").trim());
  const id = raw.startsWith("rss:") ? raw.slice(4) : raw;
  if (!id.startsWith("edge-")) return null;

  const meta = await loadSiteRssFeedRowsFromMeta(env, origin, incoming, null);
  const feeds = [
    ...(meta.feeds || []),
    { id: "dunya", label: "Dünya", url: NTV_DUNYA_RSS_URL },
  ];
  const seenUrls = new Set();
  for (const feed of feeds) {
    const url = String(feed.url || "").trim();
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
          "user-agent": "YekpareSiteRssEdge/1.0",
        },
        cf: { cacheTtl: 180, cacheEverything: true },
      });
      if (!res.ok) continue;
      const entries = parseFeedEntries(await res.text(), 40);
      for (const entry of entries) {
        if (hashRssEdgeId(entry.href) === id) {
          return { entry, feed, mode: meta.mode || "live" };
        }
      }
    } catch {
      /* next feed */
    }
  }
  return null;
}

/**
 * Edge RSS detay — `/haberler/rss/edge-*` site içi önizleme (NTV’ye dışarı atmaz).
 * Anlık modda feed içeriği; kalıcı/manuel için de önce site içi gövde gösterilir.
 */
async function serveEdgeRssPreview(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const m = incoming.pathname.match(/^\/api\/news\/hybrid\/rss\/([^/]+)\/?$/i);
  if (!m) return null;
  const itemId = decodeURIComponent(m[1] || "").trim();
  const edgeKey = itemId.startsWith("rss:") ? itemId.slice(4) : itemId;
  if (!edgeKey.startsWith("edge-")) return null;

  const origin = upstreamOrigin(env, incoming);
  const found = await findEdgeRssEntryById(env, itemId, origin, incoming);
  if (!found) {
    return new Response(JSON.stringify({ error: "RSS haber bulunamadı" }), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-yekpare-frontend": "cloudflare-site-rss-edge",
      },
    });
  }

  const { entry, feed } = found;
  const spot = entry.spot || null;
  const rawContentHtml =
    entry.contentHtml ||
    (spot ? `<p>${escapeHtmlText(spot.replace(/…$/, "").trim())}</p>` : null);
  // Editör sitelerinde gövde içi NTV vb. harici <a> kaldırılır; kart tıklaması zaten site içi.
  const contentHtml = rawContentHtml ? stripExternalAnchorsFromHtml(rawContentHtml) : null;
  const siteIdRaw = Number(incoming.searchParams.get("siteId") || 0);
  const isEditorSite = Number.isFinite(siteIdRaw) && siteIdRaw > 0;
  const payload = {
    id: edgeKey,
    title: entry.title,
    spot,
    contentHtml,
    imageUrl: entry.imageUrl || null,
    href: `/haberler/rss/${encodeURIComponent(edgeKey)}`,
    publishedAt: entry.publishedAt,
    categorySlug: slugifyCategoryKey(feed.id || feed.label) || "dunya",
    categoryName: feed.label || "Dünya",
    categoryColor: "#CC0000",
    feedId: `edge-site-${slugifyCategoryKey(feed.id || feed.label) || "dunya"}`,
    feedLabel: feed.label || "Dünya",
    sourceName: isEditorSite ? "Yekpare Haberleri" : feed.label || "RSS",
    // Editör sitelerinde kaynak bağlantısı yok; haber yalnızca site içinde açılır.
    feedUrl: isEditorSite ? null : feed.url || null,
    sourceScope: isEditorSite ? "editor" : "portal",
    readCount: null,
    // Editör vitrininde originUrl gösterme/sızdırma — NTV’ye çıkış yolu olmasın.
    originUrl: isEditorSite ? null : entry.href,
  };

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=180",
    "cdn-cache-control": "public, max-age=60",
    "x-yekpare-frontend": "cloudflare-site-rss-edge",
    "x-yekpare-rss-preview": "edge",
  };
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(JSON.stringify(payload), { status: 200, headers });
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
            rssSourceUrl: null,
            originUrl: null,
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
 * Site içi RSS açıkken API cache boş kalırsa Cloudflare edge NTV/site feed’lerini doldurur.
 */
/** RSS anahtar ↔ site kategori (son-dakika/turkiye → gundem). */
const RSS_CATEGORY_ALIAS_GROUPS = [
  ["gundem", "sondakika", "son-dakika", "turkiye", "turkey"],
  ["dunya", "world"],
  ["ekonomi", "para", "ntvpara", "ntv-para", "economy"],
  ["politika", "siyaset"],
  ["spor", "sport", "sporskor", "spor-skor"],
  ["teknoloji", "technology"],
  ["egitim", "education"],
  ["saglik", "health"],
  ["yasam", "life", "kultur", "kultur-sanat"],
  ["otomobil", "auto"],
  ["savunma-sanayi", "savunmasanayi"],
];
const RSS_CATEGORY_CANON = Object.fromEntries(
  RSS_CATEGORY_ALIAS_GROUPS.flatMap((group) => {
    const canon = group[0];
    return group.map((slug) => [slug, canon]);
  }),
);

function canonicalizeRssCategorySlugEdge(raw) {
  const slug = slugifyCategoryKey(raw);
  if (!slug) return "";
  return RSS_CATEGORY_CANON[slug] || slug;
}

function rssCategorySlugsMatchEdge(a, b) {
  const left = slugifyCategoryKey(a);
  const right = slugifyCategoryKey(b);
  if (!right) return true;
  if (!left) return false;
  if (left === right) return true;
  if (left.endsWith(`-${right}`) || right.endsWith(`-${left}`)) return true;
  const leftCanon = canonicalizeRssCategorySlugEdge(left);
  const rightCanon = canonicalizeRssCategorySlugEdge(right);
  return Boolean(leftCanon && rightCanon && leftCanon === rightCanon);
}

function hybridItemMatchesCategorySlug(item, categorySlug) {
  const want = String(categorySlug || "").trim().toLowerCase();
  if (!want) return true;
  const slug = String(item?.categorySlug || "").toLowerCase();
  if (!slug) return false;
  return rssCategorySlugsMatchEdge(slug, want);
}

function prioritizeFeedsForCategory(feeds, categorySlug) {
  const want = String(categorySlug || "").trim().toLowerCase();
  if (!want || !Array.isArray(feeds) || !feeds.length) return feeds || [];
  const matched = [];
  const rest = [];
  for (const feed of feeds) {
    const key = slugifyCategoryKey(feed?.id || feed?.label) || "";
    if (rssCategorySlugsMatchEdge(key, want)) {
      matched.push(feed);
    } else {
      rest.push(feed);
    }
  }
  // Kategori isteğinde önce eşleşen feed’ler; yoksa tümünü dene (slug sapması).
  return matched.length ? matched : feeds;
}

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

  const categorySlug = String(incoming.searchParams.get("categorySlug") || "").trim().toLowerCase();
  const existing = Array.isArray(payload.items) ? payload.items : [];
  const existingCategoryHits = categorySlug
    ? existing.filter((item) => hybridItemMatchesCategorySlug(item, categorySlug))
    : existing;
  // Genel istekte RSS zaten doluysa dokunma. Kategori isteğinde hedef slug yoksa doldur.
  if (rssCount > 0 && (!categorySlug || existingCategoryHits.length > 0)) return null;

  const origin = upstreamOrigin(env, incoming);
  const { enabled, feeds } = await loadSiteRssFeedRowsFromMeta(env, origin, incoming, siteId);
  if (!enabled && payload.hybridRssEnabled !== true) return null;
  if (!feeds.length) return null;

  const limit = Math.min(Math.max(Number(payload.limit || incoming.searchParams.get("limit") || 40) || 40, 1), 200);
  const feedPlan = prioritizeFeedsForCategory(feeds, categorySlug);
  const perFeed = categorySlug ? 8 : 4;
  const rssItems = await fetchSiteRssHybridItems(feedPlan, perFeed);
  if (!rssItems.length) return null;

  const seen = new Set(
    existing
      .map((item) =>
        String(item?.rssSourceUrl || item?.originUrl || item?.href || item?.id || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  const mergedRss = [];
  for (const item of rssItems) {
    const key = String(item.rssSourceUrl || item.href || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    mergedRss.push(item);
  }
  if (!mergedRss.length) return null;

  const filteredRss = categorySlug
    ? mergedRss.filter((item) => hybridItemMatchesCategorySlug(item, categorySlug))
    : mergedRss;
  // Kategori isteğinde eşleşen RSS yoksa boş edge-fill dönme (üst akışı koru).
  if (!filteredRss.length) return null;

  const baseItems = categorySlug ? existingCategoryHits : existing;
  const combined = [...baseItems, ...filteredRss].sort(
    (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
  );
  const offset = Math.max(Number(payload.offset || 0) || 0, 0);
  const page = combined.slice(offset, offset + limit);
  const totalCombined = combined.length;

  const next = {
    ...payload,
    items: page,
    total: totalCombined,
    hasMore: offset + page.length < totalCombined,
    hybridRssEnabled: true,
    sources: {
      db: Number(sources.db || baseItems.filter((i) => i?.source !== "rss").length || 0),
      rss: filteredRss.length,
    },
  };

  outHeaders.set("content-type", "application/json; charset=utf-8");
  outHeaders.set("cache-control", "public, max-age=60, s-maxage=60, stale-while-revalidate=180");
  outHeaders.set("cdn-cache-control", "public, max-age=60, stale-while-revalidate=180");
  outHeaders.set("x-yekpare-frontend", "cloudflare-site-rss-edge");
  outHeaders.set("x-yekpare-site-rss", "edge-fill");
  if (categorySlug) outHeaders.set("x-yekpare-site-rss-category", categorySlug);
  outHeaders.delete("content-length");
  return new Response(JSON.stringify(next), { status: upstream.status, headers: outHeaders });
}

export default {
  async fetch(request, env, ctx) {
    const incoming = new URL(request.url);
    const hostKeyEarly = normalizeHost(incoming.hostname);

    // www.ahenk.net.tr / turk.eco → ahenk.net.tr
    if (APEX_PORTAL_REDIRECT_HOSTS.has(hostKeyEarly)) {
      const dest = new URL(incoming.pathname + incoming.search, CANONICAL_PORTAL_ORIGIN);
      return new Response(null, {
        status: 301,
        headers: {
          Location: dest.toString(),
          "cache-control": "public, max-age=3600",
          "x-yekpare-frontend": "canonical-portal-redirect",
        },
      });
    }

    // suhaberajansi.com → suhaber.net
    if (LEGACY_SU_REDIRECT_HOSTS.has(hostKeyEarly)) {
      const dest = new URL(incoming.pathname + incoming.search, CANONICAL_SU_ORIGIN);
      return new Response(null, {
        status: 301,
        headers: {
          Location: dest.toString(),
          "cache-control": "public, max-age=3600",
          "x-yekpare-frontend": "canonical-su-redirect",
        },
      });
    }

    // www.yektube.com → apex
    if (APEX_YEKTUBE_REDIRECT_HOSTS.has(String(incoming.hostname || "").toLowerCase().split(":")[0])) {
      const dest = new URL(incoming.pathname + incoming.search, CANONICAL_YEKTUBE_ORIGIN);
      return new Response(null, {
        status: 301,
        headers: {
          Location: dest.toString(),
          "cache-control": "public, max-age=3600",
          "x-yekpare-frontend": "canonical-yektube-redirect",
        },
      });
    }

    // turk.eco/yp → yektube.com/yp
    const portalYektubeRedirect = redirectPortalYektubeToCanonical(request, incoming);
    if (portalYektubeRedirect) return portalYektubeRedirect;

    // yektube.com / → /yp/ (+ eski yollar)
    const dedicatedYektubeRedirect = redirectYektubeDedicatedHost(request, incoming);
    if (dedicatedYektubeRedirect) return dedicatedYektubeRedirect;

    if (isSwPath(incoming.pathname)) {
      return new Response(KILL_SW, {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-store, max-age=0, must-revalidate",
          "x-yekpare-frontend": "cloudflare-worker",
          "x-yekpare-sw": "kill-switch",
        },
      });
    }

    // Ortak editör (sehirgazetesiankara): ASG + AHB senkron + username.
    const hostKey = hostKeyEarly;
    if (
      hostKey === "ankarasehirgazetesi.com" ||
      hostKey === "ankarahabergundemi.com" ||
      incoming.pathname.replace(/\/+$/, "") === "/api/hm/editor/login"
    ) {
      try {
        const job = repairAsgEditorMisassignmentOnNeon(env).catch((err) => {
          console.error("[hm-asg-editor-repair]", String(err?.message || err).slice(0, 200));
        });
        if (typeof ctx.waitUntil === "function") ctx.waitUntil(job);
      } catch (err) {
        console.error("[hm-asg-editor-repair]", String(err?.message || err).slice(0, 200));
      }
    }
    if (hostKey === "ankarahabergundemi.com") {
      try {
        const job = purgeAhgRssCampaignNewsOnNeon(env).catch((err) => {
          console.error("[hm-ahg-rss-news-purge]", String(err?.message || err).slice(0, 200));
        });
        if (typeof ctx.waitUntil === "function") ctx.waitUntil(job);
      } catch (err) {
        console.error("[hm-ahg-rss-news-purge]", String(err?.message || err).slice(0, 200));
      }
    }
    // Kırşehir: ikinci editör hesabı (yekpare@gmail.com) — paralel oturum.
    if (
      hostKey === "kirsehirhaber.org" ||
      hostKey === "kirsehri.com" ||
      hostKey === "kirsehir.net" ||
      incoming.pathname.replace(/\/+$/, "") === "/api/hm/editor/login"
    ) {
      try {
        const job = ensureKhYekpareEditorOnNeon(env).catch((err) => {
          console.error("[hm-kh-yekpare-editor]", String(err?.message || err).slice(0, 200));
        });
        if (typeof ctx.waitUntil === "function") ctx.waitUntil(job);
      } catch (err) {
        console.error("[hm-kh-yekpare-editor]", String(err?.message || err).slice(0, 200));
      }
    }
    // Tüm editör siteleri: RSS varsayılanları arka planda (sayfa/API'yi bekletme).
    {
      const bootPath = incoming.pathname.replace(/\/+$/, "") || "/";
      if (
        request.method === "GET" &&
        (bootPath === "/" ||
          bootPath.startsWith("/api/hm/") ||
          bootPath.startsWith("/api/news/") ||
          bootPath.startsWith("/editor"))
      ) {
        const rssJob = Promise.all([
          ensureHmBreakingRssDefaultsOnNeon(env),
          ensureHmSiteRssDefaultsOnNeon(env),
        ]).catch((err) => {
          console.error("[hm-rss-defaults]", String(err?.message || err).slice(0, 200));
        });
        if (typeof ctx.waitUntil === "function") ctx.waitUntil(rssJob);
      }
    }

    const mediaEdgeHealth = await handleMediaEdgeHealth(request, env);
    if (mediaEdgeHealth) return mediaEdgeHealth;

    const mediaPutProxy = await handleMediaR2PutProxy(request, env);
    if (mediaPutProxy) return mediaPutProxy;

    // Haber görselleri — R2'de varsa Container'a gitmeden kenardan.
    const mediaMiss = {};
    try {
      const mediaGet = await handleMediaGetFromR2(request, env, mediaMiss);
      if (mediaGet) return mediaGet;
    } catch (err) {
      console.error("[media-r2-get]", String(err?.message || err).slice(0, 200));
    }

    // Editör görsel yükleme — kenar JWT + R2.
    try {
      const mediaEdge = await handleHmEditorMediaUploadEdge(request, env);
      if (mediaEdge) return mediaEdge;
    } catch (err) {
      console.error("[hm-editor-media-edge]", String(err?.message || err).slice(0, 200));
    }

    // Editör login + /me + profil + layout — kenarda Neon (tüm HM siteleri).
    // clone: kenar null dönerse (KH dışı layout / captcha) body Container'a bozulmadan gitsin.
    try {
      const edgePath = String(incoming.pathname || "").replace(/\/+$/, "") || "/";
      const edgeMethod = String(request.method || "GET").toUpperCase();
      const needsClone =
        edgeMethod === "POST" || edgeMethod === "PATCH"
          ? edgePath === "/api/hm/editor/login" ||
            edgePath === "/api/hm/editor/me" ||
            edgePath === "/api/hm/editor/me/password" ||
            edgePath === "/api/hm/editor/site-layout" ||
            edgePath === "/api/hm/editor/site-home-module-order" ||
            edgePath === "/api/hm/editor/authors/bulk-delete" ||
            edgePath === "/api/hm/editor/authors/order"
          : false;
      const profileEdge = await handleHmEditorProfileEdge(
        needsClone ? request.clone() : request,
        env,
        incoming,
      );
      if (profileEdge) return profileEdge;
    } catch (err) {
      console.error("[hm-editor-profile-edge]", String(err?.message || err).slice(0, 200));
    }

    // HM editör haber/yazar/makale — kenar JWT ile Neon (tüm siteler).
    try {
      const edgePath = String(incoming.pathname || "").replace(/\/+$/, "") || "/";
      const edgeMethod = String(request.method || "GET").toUpperCase();
      const khNeedsClone =
        (edgeMethod === "POST" || edgeMethod === "PUT" || edgeMethod === "PATCH" || edgeMethod === "DELETE") &&
        (edgePath === "/api/hm/editor/authors" ||
          edgePath === "/api/hm/editor/authors/bulk-delete" ||
          edgePath === "/api/hm/editor/authors/order" ||
          edgePath === "/api/hm/editor/news" ||
          edgePath === "/api/hm/editor/makale" ||
          edgePath === "/api/hm/editor/makale/bulk-delete" ||
          edgePath === "/api/hm/editor/rss/campaigns" ||
          /^\/api\/hm\/editor\/authors\/\d+$/.test(edgePath) ||
          /^\/api\/hm\/editor\/pool\/authors\/\d+\/publish$/.test(edgePath) ||
          /^\/api\/hm\/editor\/news\/\d+/.test(edgePath) ||
          /^\/api\/hm\/editor\/makale\/\d+$/.test(edgePath) ||
          /^\/api\/hm\/editor\/rss\/campaigns\/\d+/.test(edgePath));
      const khData = await handleKhEditorDataEdge(
        khNeedsClone ? request.clone() : request,
        env,
        incoming,
      );
      if (khData) return khData;
    } catch (err) {
      console.error("[hm-editor-kh-data-edge]", String(err?.message || err).slice(0, 200));
    }

    const apiRequest = request;

    const hmRedirect = await redirectHmCustomDomainRoot(request, env, incoming, ctx);
    if (hmRedirect) return hmRedirect;

    const bareSitemap = redirectBareSitemapPath(request, incoming);
    if (bareSitemap) return bareSitemap;

    const ahenkRobots = serveAhenkAgencyRobots(request, incoming);
    if (ahenkRobots) return ahenkRobots;

    const ahenkSeoFiles = await serveAhenkAgencySeoFiles(request, env, incoming);
    if (ahenkSeoFiles) return ahenkSeoFiles;

    const robotsTxt = serveDynamicRobotsTxt(request, incoming);
    if (robotsTxt) return robotsTxt;

    const hmLlms = await proxyHmAiKnowledgeText(request, env, incoming);
    if (hmLlms) return hmLlms;

    const ogHtml = await socialPreviewOgHtml(request, env, incoming);
    if (ogHtml) return ogHtml;

    const sitemapXml = await proxyRootSitemap(request, env, incoming);
    if (sitemapXml) return sitemapXml;

    const worldBriefs = await serveWorldBriefsEdge(request, env, incoming);
    if (worldBriefs) return worldBriefs;

    const edgeRssPreview = await serveEdgeRssPreview(request, env, incoming);
    if (edgeRssPreview) return edgeRssPreview;

    const fromAssets = await tryServeAssets(request, env, incoming);
    if (fromAssets) return fromAssets;

    const origin = upstreamOrigin(env, incoming);
    const yektubeRewrite = rewriteYektubeSpaPath(incoming.pathname);
    const upstreamPath = yektubeRewrite || incoming.pathname;
    const target = new URL(upstreamPath + incoming.search, origin);
    const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
    const purgeCookie = purgeCookieName(incoming.hostname);

    try {
      const cfOpts = upstreamCfCacheOptions(upstreamPath, apiRequest.method, incoming.search || "");
      const proxyOpts = proxyInit(apiRequest, origin, incoming);
      const upstream = await fetchUpstreamWithRetry(
        env,
        target.toString(),
        proxyOpts,
        cfOpts,
      );
      const brandMeta = await maybeEnsureBrandMetaResponse(env, incoming, upstream, {
        waitUntil: typeof ctx?.waitUntil === "function" ? (p) => ctx.waitUntil(p) : undefined,
      });
      if (brandMeta) return brandMeta;
      const repaired = await maybeRepairMismatchedNewsJson(
        env,
        origin,
        proxyOpts,
        apiRequest.method,
        incoming,
        upstreamPath,
        upstream,
      );
      if (repaired) return repaired;

      const out = copyUpstreamHeadersForBrowser(upstream);
      out.delete("content-encoding");
      out.delete("transfer-encoding");
      out.set("x-yekpare-frontend", FRONTEND_TAG);
      out.set("x-yekpare-upstream", origin);
      if (parseMediaUploadFname(incoming.pathname) && mediaMiss.lastS3) {
        out.set("x-yekpare-media", "miss");
        out.set("x-yekpare-media-s3", String(mediaMiss.lastS3));
        out.set("x-yekpare-media-ready", String(mediaMiss.ready || "0"));
      }
      if (yektubeRewrite) {
        out.set("x-yekpare-yektube-rewrite", yektubeRewrite);
      }
      if (isStaticAssetPath(incoming.pathname)) {
        out.set("cdn-cache-control", "public, max-age=86400");
        if (!out.get("cache-control")) {
          out.set("cache-control", "public, max-age=86400, immutable");
        }
      } else if (isAuthSessionApiPath(upstreamPath)) {
        out.set("cache-control", "private, no-store, max-age=0, must-revalidate");
        out.set("cdn-cache-control", "no-store");
        out.set("vary", "Origin, Authorization, Cookie");
      } else if (isHmMetaApiPath(upstreamPath)) {
        const includePage = incoming.searchParams.get("includePageContent") === "1";
        const freshVisit =
          incoming.searchParams.get("fresh") === "1" || incoming.searchParams.get("fresh") === "true";
        if (includePage || freshVisit) {
          out.set("cache-control", "private, no-store, max-age=0, must-revalidate");
          out.set("cdn-cache-control", "no-store");
        } else {
          out.set("cache-control", "public, max-age=15, s-maxage=20, stale-while-revalidate=60");
          out.set("cdn-cache-control", "public, max-age=20");
        }
        out.set("vary", "Origin");
      } else if (isCacheableHmNewsApi(upstreamPath)) {
        const freshVisit =
          incoming.searchParams.get("fresh") === "1" ||
          incoming.searchParams.get("fresh") === "true";
        if (freshVisit) {
          out.set("cache-control", "private, no-store, max-age=0, must-revalidate");
          out.set("cdn-cache-control", "no-store");
        } else {
        // API zaten s-maxage veriyor; Worker no-store ile ezmesin.
        const p = String(upstreamPath || "").split("?")[0] || "";
        if (p === "/api/hm/home-bundle") {
          out.set("cache-control", "public, max-age=30, s-maxage=90, stale-while-revalidate=300");
          out.set("cdn-cache-control", "public, max-age=90, stale-while-revalidate=300");
        } else {
          if (!out.get("cache-control")) {
            out.set(
              "cache-control",
              "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
            );
          }
          out.set("cdn-cache-control", "public, max-age=120, stale-while-revalidate=300");
        }
        }
      } else {
        out.set("cdn-cache-control", "no-store");
      }

      const siteRssEnriched = await enrichHybridWithSiteRssEdge(request, env, incoming, upstream, out);
      if (siteRssEnriched) {
        const filteredEnriched = await maybeFilterHmPublicNewsUpstream(
          incoming,
          siteRssEnriched,
          new Headers(siteRssEnriched.headers),
        );
        const enrichedBase = filteredEnriched || siteRssEnriched;
        const withKhNeon = await injectKhNeonNewsIntoPublicResponse(env, incoming, enrichedBase);
        return withKhNeon || enrichedBase;
      }

      const filteredNews = await maybeFilterHmPublicNewsUpstream(incoming, upstream, out);
      if (filteredNews) {
        const withKhNeon = await injectKhNeonNewsIntoPublicResponse(env, incoming, filteredNews);
        return withKhNeon || filteredNews;
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
          error: "api_unavailable",
          detail: String(err?.message || err),
          upstream: origin,
        }),
        {
          status: 502,
          headers: {
            "content-type": "application/json",
            "x-yekpare-frontend": "cloudflare-worker",
          },
        },
      );
    }
  },
};
