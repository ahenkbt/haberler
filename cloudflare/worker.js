/**
 * SPA ÔåÆ Workers Static Assets (ASSETS); /api ÔåÆ Cloudflare Container (Neon + R2).
 * ASSETS yoksa SPA 404; API Container ba─ş─▒ndan gider. Render kullan─▒lmaz.
 * Eski Netlify SW / cache i├ğin TEK SEFERLIK purge (JS boot + cookie).
 * Clear-Site-Data HTML yan─▒tlar─▒nda kullan─▒lmaz ÔÇö Chrome navigasyonu ERR_FAILED
 * ile d├╝┼ş├╝r├╝p cookie yaz─▒lmadan d├Âng├╝ye sokabiliyor (turk.eco/admin).
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
import {
  hybridEdgeFillHttpStatus,
  HM_SITE_RSS_EDGE_FETCH_TIMEOUT_MS,
  shouldFillHybridSiteRssAtEdge,
} from "./hm-hybrid-rss-edge.js";
import {
  findNewsItemBySlug,
  headlineToArticle,
  isNewsPageBundlePath,
  newsArticleSlugFromApiPath,
  newsPageBundleSlug,
  wrapArticleAsPageBundle,
} from "./hm-news-article-edge.js";
import { fetchApi, fetchApiWithRetry, FRONTEND_TAG, resolveApiOrigin } from "./api-upstream.js";
import {
  hmYektubeCatalogDegradeResponse,
  hmYektubeCatalogJsonResponse,
  hmYektubeCatalogRssFillBody,
  hmYektubeCatalogShouldFillFromRss,
  hmYektubeCatalogVideosOrRss,
  isHmYektubeCatalogPath,
  shouldDegradeHmYektubeCatalog,
} from "./hm-yektube-catalog-edge.js";
import {
  getHmEdgeCache,
  isHmEdgeCacheableRequest,
  isHmNewsArticleCachePath,
  putHmEdgeCache,
  matchHmEdgeCache,
  readHmHtmlBootFromCache,
  resolveHmEdgeCache,
  warmKnownHmNewsSites,
} from "./hm-edge-cache.js";
import {
  buildAhenkAiTxtFallback,
  buildAhenkAgencyEntityHtml,
  buildAhenkLlmsTxtFallback,
  buildGeoRobotsTxt,
  buildHmAiTxtFallback,
  buildHmLlmsTxtFallback,
  buildHmNewsArticleOgHtml,
  buildHmSiteEntityHtml,
  firstHmBootImageUrl,
  findHmBundleHeadlineBySlug,
  hmDomainSlugFallback,
  hmHomeSlugFromPath,
  hmSlugDisplayName,
  injectHmHtmlBoot,
  isCorporateHmHtmlBoot,
  isAhenkAgencyGeoPath,
  isAhenkAgencyHost,
  isHmAiKnowledgePath,
  isHmPublicHomeHtmlPath,
  parseHmNewsArticlePath,
  parseHmNewsCategoryPath,
  isSharePreviewUserAgent,
  listKnownHmEditorSites,
  raceHmHtmlBoot,
  rewriteSpaShellOgForHmHost,
  sanitizeOgShareImages,
  shouldInstantHmRootRedirect,
  articleBundleFromPayload,
  hmArticlePageBundleUrls,
  HM_ARTICLE_BOOT_BUDGET_MS,
  HM_HTML_BOOT_BUDGET_MS,
  HM_SOCIAL_OG_BUDGET_MS,
  withBudget,
} from "./hm-html-boot.js";
import { sitemapFailXml, toGscWebSitemapXml, isGscWebSitemapPath } from "./sitemap-fail-xml.js";
import { handleMediaEdgeHealth, handleMediaGetFromR2, handleMediaR2PutProxy, parseMediaUploadFname } from "./hm-editor-media-s3-edge.js";
import {
  fetchStaticAssets,
  isYektubeSpaHtml,
  isYektubeSurfacePath,
  rewriteYektubeSpaPath,
} from "./yektube-spa.js";

export { GoalgoApiContainer } from "./goalgo-api-container.js";
export { YektubeApiContainer } from "./yektube-api-container.js";
/**
 * Cookie s├╝r├╝m├╝ ÔÇö art─▒r─▒nca t├╝m ziyaret├ğilerde Netlify SW yeniden temizlenir.
 * (Eski cookie ile purge atlan─▒nca /tr/vkd Netlify 404 g├Âr├╝nmeye devam ediyordu.)
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
  "vatankahramanlari.org.tr",
  "www.vatankahramanlari.org.tr",
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
const FORCE_PURGE_COOKIE = "__yekpare_sw_purged_hm_20260913a";

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

/** www.ahenk.net.tr + iptal turk.eco ÔåÆ ahenk.net.tr. */
const CANONICAL_PORTAL_ORIGIN = "https://ahenk.net.tr";
const APEX_PORTAL_REDIRECT_HOSTS = new Set(["www.ahenk.net.tr", "turk.eco", "www.turk.eco"]);

/** suhaberajansi.com iptal ÔåÆ suhaber.net. */
const CANONICAL_SU_ORIGIN = "https://suhaber.net";
const LEGACY_SU_REDIRECT_HOSTS = new Set(["suhaberajansi.com", "www.suhaberajansi.com"]);

/** ahenk.net.tr/yp ÔåÆ yektube.com (kanonik Yektube alan─▒). */
const CANONICAL_YEKTUBE_ORIGIN = "https://yektube.com";
const YEKTUBE_DEDICATED_HOSTS = new Set(["yektube.com", "www.yektube.com"]);
const APEX_YEKTUBE_REDIRECT_HOSTS = new Set(["www.yektube.com"]);

/** Eski Netlify SW'yi ├Âld├╝r├╝r; kendini de kald─▒r─▒r. */
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

/** Tek seferlik SW unregister (+ gerekti─şinde bir reload). Cookie ile tekrarlanmaz. */
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
        // Netlify + bayat HM tema/meta localStorage anahtarlar─▒n─▒ temizle
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
 * Clear-Site-Data yapmaz (edit├Âr JWT korunur); sadece SW katman─▒n─▒ ├Âld├╝r├╝r.
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
      // Kontroll├╝ bir kez yenile ÔÇö Netlify "Site not found" SW yan─▒t─▒n─▒ d├╝┼ş├╝r
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

/** true ÔåÆ Clear-Site-Data + purge boot; false ÔåÆ atla */
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
 * Upstream Set-Cookie'leri taray─▒c─▒ya g├╝venli aktar.
 * - getSetCookie ile ├ğoklu ├ğerez kayb─▒n─▒ ├Ânle (+ bo┼şsa headers.get fallback)
 * - Domain=onrender.com vb. kald─▒r ÔåÆ ├ğerez turk.eco hostuna yaz─▒ls─▒n (admin giri┼ş)
 * - SameSite=None ÔåÆ Lax (ayn─▒ origin /api vekili; Chrome third-party cookie engeli admin giri┼şi k─▒r─▒yordu)
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

/** Oturum / giri┼ş u├ğlar─▒ ÔÇö kenar ve taray─▒c─▒ ├Ânbelle─şi yasak. */
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

/** K├Âk sitemap .xml ÔåÆ /api/sitemap/* (Googlebot HTML SPA almas─▒n). */
function rootSitemapApiPath(pathname, hostname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/sitemap.xml" || p === "/sitemap-web.xml") {
    // GSC submitted file must be a urlset. HM index.xml was a sitemapindex (0 pages)
    // until the Container rolled; news-hm-{slug}.xml already has the article URLs.
    const slug = hmDomainSlugFallback(hostname);
    if (slug) return `/api/sitemap/news-hm-${encodeURIComponent(slug)}.xml`;
    return "/api/sitemap/index.xml";
  }
  if (p === "/sitemap-index.xml") return "/api/sitemap/index-shards.xml";
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
 * GSC video sitemap: player_loc / content_loc <loc> ile ayn─▒ olamaz.
 * Eski API h├ól├ó player_loc=loc yaz─▒yorsa edgeÔÇÖde YouTube embedÔÇÖe ├ğevir;
 * watch?v= content_loc sat─▒rlar─▒n─▒ kald─▒r (ger├ğek medya dosyas─▒ de─şil).
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
      // .../title-slug-{youtubeId} ÔÇö YouTube id genelde 11 karakter
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
    // watch?v= content_loc ger├ğek medya dosyas─▒ de─şil ÔÇö kald─▒r
    next = next.replace(
      /\n?\s*<video:content_loc>\s*https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[^<]+<\/video:content_loc>/gi,
      "",
    );
    return next;
  });
}

/** Bare /sitemap ÔåÆ /sitemap.xml (GSC ┬½bilinmiyor┬╗ HTML giri┼şini kes). */
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

/** ahenk.net.tr web yaz─▒l─▒m vitrini ÔÇö haber sitemap yerine ajans haritas─▒. */
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

/** HM ├Âzel alan ÔÇö siteye ├Âzel llms.txt / ai.txt (SPA public/llms.txt portal metnini ezmesin). */
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
  const apiPath = rootSitemapApiPath(pathOnly, incoming.hostname);
  if (!apiPath) return null;

  const origin = upstreamOrigin(env, incoming);
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
    const body = sitemapFailXml(pathOnly, incoming.origin);
    if (request.method === "HEAD") return new Response(null, { status, headers });
    return new Response(body, { status, headers });
  };
  try {
    const target = new URL(`${origin}${apiPath}`);
    if (incoming.search) {
      new URLSearchParams(incoming.search).forEach((value, key) => {
        target.searchParams.set(key, value);
      });
    }
    target.searchParams.set("xfh", incoming.host);
    const targetUrl = target.toString();
    const upstream = await fetchApiWithRetry(env, targetUrl, {
      method: request.method === "HEAD" ? "GET" : request.method,
      headers: {
        accept: "application/xml, text/xml, */*",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", "") || "https",
        "user-agent": request.headers.get("user-agent") || "yekpare-sitemap-proxy",
      },
      cf: {
        cacheTtl: isGscWebSitemapPath(pathOnly) ? 0 : pathOnly === "/google-news.xml" ? 600 : 300,
        cacheEverything: !isGscWebSitemapPath(pathOnly),
      },
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
    if (isGscWebSitemapPath(pathOnly)) {
      text = toGscWebSitemapXml(text);
    }
    const headers = xmlHeaders();
    headers.set(
      "cache-control",
      upstream.headers.get("cache-control") || "public, max-age=1800, stale-while-revalidate=86400",
    );
    if (isGscWebSitemapPath(pathOnly)) {
      headers.set("x-yekpare-gsc-web-sitemap", "1");
    }
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

/** CF Assets'ten HTML yan─▒t─▒n─▒ SW purge boot ile sar. */
async function respondAssetHtml(request, assetResp, { oneShotPurge, purgeCookie, hostname, env, incoming, waitUntil }) {
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
  const hmHostSlug = hmDomainSlugFallback(hostname);
  if (hmHostSlug && !isAhenkAgencyHost(hostname)) {
    const ogOrigin = incoming?.origin || `https://${String(hostname || "").replace(/^www\./, "")}`;
    html = rewriteSpaShellOgForHmHost(html, hostname, ogOrigin);
    out.set("x-yekpare-hm-og-rewrite", hmHostSlug);
  }
  const homeHtml = incoming && isHmPublicHomeHtmlPath(incoming.pathname, incoming.hostname);
  const articlePath = incoming ? parseHmNewsArticlePath(incoming.pathname) : null;
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
      const boot = await withBudget(
        raceHmHtmlBoot({
          fetchApi,
          origin,
          env,
          incoming,
          cache: getHmEdgeCache(),
          waitUntil: typeof waitUntil === "function" ? waitUntil : undefined,
        }),
      );
      if (boot) {
        const corporateHome = isCorporateHmHtmlBoot(boot);
        // Haber siteleri: klasik chrome #root. Kurumsal: haber man┼şet boyamas─▒ yok.
        html = injectHmHtmlBoot(html, { ...boot, skipPaint: corporateHome });
        out.set(
          "x-yekpare-hm-html-boot",
          `${boot.bundle ? "bundle" : "meta"}${boot.fromCache ? "-cache" : ""}`,
        );
        if (!corporateHome) {
          out.set("x-yekpare-hm-first-paint", "classic");
          const hero = firstHmBootImageUrl(boot.bundle, incoming.origin);
          if (hero) out.append("Link", `<${hero}>; rel=preload; as=image`);
        } else {
          out.set("x-yekpare-hm-first-paint", "corporate");
        }
      }
    } catch (err) {
      console.error("[hm-html-boot]", String(err?.message || err).slice(0, 180));
    }
  } else if (articlePath && hmHostSlug && env && incoming) {
    const articleSlug = articlePath.slug;
    out.append(
      "Link",
      `</api/news/page-bundle/${encodeURIComponent(articleSlug)}>; rel=preload; as=fetch; crossorigin`,
    );
    try {
      const origin = upstreamOrigin(env, incoming);
      const bootP = withBudget(
        raceHmHtmlBoot({
          fetchApi,
          origin,
          env,
          incoming,
          cache: getHmEdgeCache(),
          waitUntil: typeof waitUntil === "function" ? waitUntil : undefined,
        }),
        HM_HTML_BOOT_BUDGET_MS,
      );
      const originBundleP = withBudget(
        fetchApi(env, `${origin}/api/news/page-bundle/${encodeURIComponent(articleSlug)}`, {
          headers: { accept: "application/json" },
        }).then(async (r) => (r && r.ok ? r.json().catch(() => null) : null)),
        HM_ARTICLE_BOOT_BUDGET_MS,
      );
      const boot = await bootP;
      const edgeCache = getHmEdgeCache();
      let articleBundle = articleBundleFromPayload(await originBundleP);
      const siteId = Number(boot?.siteId || 0);
      const candidates = hmArticlePageBundleUrls(incoming.origin, articleSlug, siteId);
      for (const url of candidates) {
        if (articleBundle) break;
        const hit = await matchHmEdgeCache(edgeCache, url);
        if (!hit?.ok) continue;
        articleBundle = articleBundleFromPayload(await hit.clone().json().catch(() => null));
      }
      if (!articleBundle && Number.isFinite(siteId) && siteId > 0) {
        const scoped = await withBudget(
          fetchApi(
            env,
            `${origin}/api/news/page-bundle/${encodeURIComponent(articleSlug)}?siteId=${siteId}`,
            { headers: { accept: "application/json" } },
          ).then(async (r) => (r && r.ok ? r.json().catch(() => null) : null)),
          400,
        );
        articleBundle = articleBundleFromPayload(scoped);
      }
      if (!articleBundle && boot?.bundle) {
        const fromManset = headlineToArticle(
          findHmBundleHeadlineBySlug(boot.bundle, articleSlug),
          articleSlug,
        );
        if (fromManset) articleBundle = wrapArticleAsPageBundle(fromManset);
      }
      if (boot || articleBundle) {
        html = injectHmHtmlBoot(html, {
          ...(boot || {
            slug: hmHostSlug,
            host: incoming.hostname,
            siteId: Number.isFinite(siteId) && siteId > 0 ? siteId : 0,
            savedAt: Date.now(),
          }),
          articleSlug,
          articleBundle,
          paintKind: "article",
          skipPaint: false,
        });
        out.set(
          "x-yekpare-hm-html-boot",
          articleBundle ? "article-cache" : boot?.fromCache ? "article-meta-cache" : "article-meta",
        );
        if (articleBundle) out.set("x-yekpare-hm-first-paint", "article");
      }
    } catch (err) {
      console.error("[hm-html-boot/article]", String(err?.message || err).slice(0, 180));
    }
  } else if (incoming && parseHmNewsCategoryPath(incoming.pathname) && hmHostSlug && env) {
    const categorySlug = parseHmNewsCategoryPath(incoming.pathname).slug;
    try {
      const origin = upstreamOrigin(env, incoming);
      const boot = await withBudget(
        raceHmHtmlBoot({
          fetchApi,
          origin,
          env,
          incoming,
          cache: getHmEdgeCache(),
          waitUntil: typeof waitUntil === "function" ? waitUntil : undefined,
        }),
      );
      if (boot) {
        html = injectHmHtmlBoot(html, {
          ...boot,
          categorySlug,
          paintKind: "category",
          skipPaint: false,
        });
        out.set(
          "x-yekpare-hm-html-boot",
          `${boot.bundle ? "bundle" : "meta"}${boot.fromCache ? "-cache" : ""}`,
        );
        out.set("x-yekpare-hm-first-paint", "category");
      }
    } catch (err) {
      console.error("[hm-html-boot/category]", String(err?.message || err).slice(0, 180));
    }
  }
  return new Response(html, {
    status: assetResp.status,
    headers: out,
  });
}

/** SPA + statik: ASSETS; yoksa null (API/Container vekiline d├╝┼ş). */
async function tryServeAssets(request, env, incoming, waitUntil) {
  if (!env.ASSETS) return null;
  if (isApiPath(incoming.pathname)) return null;

  const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
  const purgeCookie = purgeCookieName(incoming.hostname);
  const yektubeRewrite = rewriteYektubeSpaPath(incoming.pathname);
  const assetPathForFetch = yektubeRewrite || incoming.pathname;
  const wantsStatic =
    isStaticAssetPath(incoming.pathname) || isStaticAssetPath(assetPathForFetch);

  // .xml sitemap yollar─▒n─▒ SPA index.html'e d├╝┼ş├╝rme ÔÇö proxy ka├ğ─▒r─▒rsa bo┼ş XML yerine HTML olmas─▒n
  if (incoming.pathname.toLowerCase().endsWith(".xml") && !wantsStatic) {
    return null;
  }

  let assetResp = await fetchStaticAssets(env, request, assetPathForFetch);
  let ct = String(assetResp.headers.get("content-type") || "").toLowerCase();

  /**
   * CF Assets `not_found_handling=single-page-application` eksik dosyada 200 + HTML d├Âner.
   * /yektube-v2/assets/*.js HTML gelirse taray─▒c─▒ JS ├ğal─▒┼şt─▒ramaz ÔåÆ /yp beyaz ekran.
   * Statik istekte HTML = miss ÔåÆ Container vekili (dosyalar image'da varsa).
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
    // /yp ÔåÆ yektube-v2/index.html rewrite sonras─▒ Assets portal index d├Ând├╝yse Container'a b─▒rak
    if (yektubeRewrite || isYektubeSurfacePath(incoming.pathname)) {
      try {
        const html = await assetResp.clone().text();
        if (!isYektubeSpaHtml(html)) {
          return null;
        }
        return respondAssetHtml(
          request,
          new Response(html, { status: assetResp.status, headers: assetResp.headers }),
          { oneShotPurge, purgeCookie, hostname: incoming.hostname, env, incoming, waitUntil },
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
      waitUntil,
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

/** Portal (turk.eco) Yektube y├╝zey yollar─▒n─▒ kanonik /yp d├╝zenine ├ğevir. */
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
 * turk.eco/yp (ve di─şer Yektube y├╝zeyleri) ÔåÆ https://yektube.com/...
 * HM iframe (embed=1 / hm=) ayn─▒ origin'de kals─▒n.
 */
function redirectPortalYektubeToCanonical(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isPortalHost(incoming.hostname)) return null;
  if (isYektubeDedicatedHost(incoming.hostname)) return null;
  if (isYektubeEmbedRequest(incoming)) return null;
  if (!isYektubeSurfacePath(incoming.pathname)) return null;
  // Asset uzant─▒l─▒ istekleri (js/css/png) domain de─şi┼ştirme
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
 * yektube.com k├Âk + eski yollar ÔåÆ /yp (turk.eco/yp ile ayn─▒ y├╝zey).
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
    // Asset yolu (/yektube-v2/assets/...) rewrite'ta kal─▒r
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
 * HM haber listeleri ÔÇö edge cache.
 * Public meta k─▒sa kenar ├Ânbelle─şi (includePageContent/fresh hari├ğ); edit├Âr kayd─▒ purge eder.
 */
function isCacheableHmNewsApi(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  return (
    p === "/api/hm/home-bundle" ||
    p === "/api/hm/yektube/videos" ||
    p === "/api/hm/yektube/categories" ||
    p === "/api/news" ||
    p === "/api/news/hybrid" ||
    p === "/api/news/featured" ||
    p === "/api/news/breaking" ||
    // /api/categories ASLA kenar cache'lenmez ÔÇö admin silme sonras─▒ bayat liste d├Ânmesin.
    p === "/api/authors" ||
    isHmNewsArticleCachePath(p)
  );
}

function isHmMetaApiPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  return p.startsWith("/api/hm/meta/");
}

/** Su markas─▒: domain onar─▒m─▒n─▒ uygula ve kanonik /tr/su metas─▒n─▒ tercih et. Di─şer markalar: yaln─▒z 404.
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

  // ASG: yazar + k├Â┼şe yaz─▒s─▒n─▒ arka planda hizala (makale kopyas─▒ meta yan─▒t─▒n─▒ geciktirmesin).
  if (isAsgBrand && upstream.ok) {
    const job = ensureBrandHmSiteMeta(env, { domain, slug: binding.slug || "asg" }).catch((err) => {
      console.error("[hm-brand-db-ensure/asg-authors-makale]", String(err?.message || err).slice(0, 200));
    });
    if (typeof opts.waitUntil === "function") {
      opts.waitUntil(job);
    } else {
      // waitUntil yoksa k─▒sa fingerprint no-op i├ğin yine de dene; uzun kopya riskli
      try {
        await Promise.race([job, new Promise((r) => setTimeout(r, 2500))]);
      } catch (_) {}
    }
    return null;
  }

  // Su + KH: meta 200 ise Neon onar─▒m─▒n─▒ arka planda yap (TTFB'yi 5-7sn ┼şi┼şirme).
  // 404'te h├ól├ó senkron fallback ÔÇö aksi halde ilk ziyarette bo┼ş kal─▒r.
  if ((isSuBrand || isKhBrand) && upstream.ok) {
    const job = ensureBrandHmSiteMeta(env, { domain, slug }).catch((err) => {
      console.error("[hm-brand-db-ensure/bg]", String(err?.message || err).slice(0, 200));
    });
    if (typeof opts.waitUntil === "function") opts.waitUntil(job);
    return null;
  }

  // Di─şer markalar: yaln─▒zca upstream 404 iken fallback.
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
  // Admin / oturum ÔÇö asla kenar ├Ânbelle─şi yok.
  if (isAuthSessionApiPath(pathname)) {
    return { cacheTtl: 0, cacheEverything: false };
  }
  // Tema/layout meta ÔÇö k─▒sa kenar ├Ânbelle─şi (edit├Âr yay─▒n─▒nda purgeHmSitePublicEdgeCache).
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
      return { cacheTtl: 600, cacheEverything: true };
    }
    return { cacheTtl: 120, cacheEverything: true };
  }
  return { cacheTtl: 0, cacheEverything: false };
}

async function fetchUpstreamWithRetry(env, url, init, cfOpts, retries = 2) {
  return fetchApiWithRetry(env, url, { ...init, cf: cfOpts }, retries);
}

async function maybeRecoverNewsPageBundle(env, origin, init, incoming, upstream) {
  if (upstream?.ok) return null;
  if (!isNewsPageBundlePath(incoming.pathname)) return null;
  const slug = newsPageBundleSlug(incoming.pathname);
  if (!slug) return null;
  try {
    const articleUrl = `${origin}/api/news/${encodeURIComponent(slug)}${incoming.search || ""}`;
    const articleRes = await fetchApi(env, articleUrl, { ...init, method: "GET" });
    if (!articleRes?.ok) return null;
    const article = await articleRes.json().catch(() => null);
    if (!article || typeof article !== "object" || !String(article.title || "").trim()) return null;
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=90, stale-while-revalidate=300",
      "x-yekpare-frontend": FRONTEND_TAG,
      "x-yekpare-upstream": origin,
      "x-yekpare-page-bundle-recover": "article",
    });
    return new Response(JSON.stringify(wrapArticleAsPageBundle(article)), { status: 200, headers });
  } catch {
    return null;
  }
}

async function findCachedHeadlineForArticleSlug(incoming, edgeCache, slug) {
  const siteSlug = hmDomainSlugFallback(incoming.hostname);
  if (!siteSlug || !edgeCache) return null;
  const boot = await readHmHtmlBootFromCache(edgeCache, incoming.origin, siteSlug, incoming.hostname);
  const fromBundle = findHmBundleHeadlineBySlug(boot?.bundle, slug);
  if (fromBundle) return fromBundle;
  const siteId = Number(boot?.siteId || boot?.meta?.id || boot?.bundle?.siteId);
  if (!Number.isFinite(siteId) || siteId <= 0) return null;
  const origin = incoming.origin;
  const urls = [
    `${origin}/api/hm/home-bundle?siteId=${siteId}&sliderLimit=15`,
    `${origin}/api/news?siteId=${siteId}&status=published&limit=40`,
    `${origin}/api/news/hybrid?siteId=${siteId}&limit=24&offset=0&rssScope=all&dbFirst=1`,
  ];
  for (const url of urls) {
    const hit = await matchHmEdgeCache(edgeCache, url);
    if (!hit?.ok) continue;
    const json = await hit.clone().json().catch(() => null);
    const row = findHmBundleHeadlineBySlug(json, slug) || findNewsItemBySlug(json, slug);
    if (row) return row;
  }
  return null;
}

async function maybeFillArticleFromHomeBundle(incoming, edgeCache) {
  if (!edgeCache) return null;
  const path = incoming.pathname;
  if (!isNewsPageBundlePath(path) && !isHmNewsArticleCachePath(path)) return null;
  const slug = newsArticleSlugFromApiPath(path);
  if (!slug) return null;
  try {
    const headline = await findCachedHeadlineForArticleSlug(incoming, edgeCache, slug);
    const article = headlineToArticle(headline, slug);
    if (!article) return null;
    const payload = isNewsPageBundlePath(path) ? wrapArticleAsPageBundle(article) : article;
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "x-yekpare-frontend": FRONTEND_TAG,
      "x-yekpare-page-bundle-recover": "home-bundle",
    });
    return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch {
    return null;
  }
}

const HM_ORIGIN_BUDGET_MS = 60_000; // cold container boot; 12s still too tight after dual-worker rolls

/**
 * Eski API: parseInt("2026-yili-...") ÔåÆ id 2026 (yanl─▒┼ş haber).
 * EdgeÔÇÖde slug uyu┼şmazl─▒─ş─▒n─▒ yakala; listeden do─şru idÔÇÖyi bulup bundleÔÇÖ─▒ yeniden ├ğek.
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
  // Statik alt yollar ÔÇö dokunma.
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
  // Saf say─▒sal id iste─şi ÔÇö bilin├ğli id lookup; dokunma.
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
  // Yanl─▒┼ş haber (slug uyu┼şmuyor) veya bo┼ş sonu├ğ ÔÇö listeden id bul.
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
 * Edge soft-redirect: HM ├Âzel alan k├Âk├╝ ÔåÆ /tr/{slug}
 * (Vercel middleware CF Worker yolunda ├ğal─▒┼şmad─▒─ş─▒ i├ğin Worker'da tekrarlan─▒r.)
 */
async function redirectHmCustomDomainRoot(request, env, incoming, ctx) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (isPortalHost(incoming.hostname)) return null;

  const domain = incoming.hostname.toLowerCase();
  const fallbackSlug = hmDomainSlugFallback(domain);

  // HM ├Âzel alanda /admin ÔåÆ /editor (turk.eco/admin'e atma)
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

  // Bilinen HM alanlar─▒: meta API bekleme (0.5ÔÇô2s TTFB). Slug tablosu yeterli.
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
      // Meta 404 ÔÇö Neon'da marka siteyi olu┼ştur/ba─şla (sonraki /api/hm/meta ├ğa─şr─▒lar─▒ i├ğin).
      try {
        await ensureBrandHmSiteMeta(env, { domain, slug: fallbackSlug });
      } catch (err) {
        console.error("[hm-brand-db-ensure/root]", String(err?.message || err).slice(0, 200));
      }
    }
  } catch {
    /* fallback below */
  }

  // Meta yok/404: bilinen HM edit├Âr alanlar─▒nda asla Yekpare portal anasayfas─▒na d├╝┼şme.
  if (fallbackSlug) {
    return hmCustomDomainRootRedirectResponse(incoming, request, fallbackSlug, "fallback");
  }
  if (needsForcePurge(domain)) {
    // FORCE_PURGE listesindeki alanlar edit├Âr siteleri ÔÇö portal SPA g├Âsterme.
    return new Response(
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Haber sitesi</title>
<meta name="robots" content="noindex"><meta http-equiv="refresh" content="2;url=/editor">
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fff;color:#111}
p{max-width:28rem;text-align:center;line-height:1.5}</style></head>
<body><p>Bu alan ad─▒ bir haber sitesine aittir. Yap─▒land─▒rma tamamlan─▒yorÔÇĞ</p></body></html>`,
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

/** WhatsApp / Facebook / Telegram vb. ÔÇö JS ├ğal─▒┼şt─▒rmaz, SPA index.html OG'sini okur. */
function isSocialPreviewBot(request) {
  return isSharePreviewUserAgent(request.headers.get("user-agent") ?? "");
}

function isOgProxySkipPath(pathname) {
  const p = String(pathname || "");
  return (
    p.startsWith("/api") ||
    p.startsWith("/assets/") ||
    p.startsWith("/_next/") ||
    p.startsWith("/yektube-v2/") ||
    p.startsWith("/yp/") ||
    // Googlebot sitemap tararken OG HTML d├Ânmesin (HM custom domain)
    /\.xml$/i.test(p) ||
    p === "/robots.txt" ||
    p === "/sitemap.xml" ||
    p === "/llms.txt" ||
    p === "/ai.txt" ||
    isStaticAssetPath(pathname)
  );
}

/** Portal payla┼ş─▒m yollar─▒ (middleware / Netlify edge ile ayn─▒). */
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

function socialOgHtmlResponse(request, html, ogTag) {
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=300, s-maxage=300",
    "cdn-cache-control": "public, max-age=300",
    "x-yekpare-frontend": FRONTEND_TAG,
    "x-yekpare-og": ogTag,
    "x-robots-tag": "index, follow, max-image-preview:large, max-snippet:-1",
  });
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(html, { status: 200, headers });
}

function articleFieldsFromJson(json) {
  const article = json?.article && typeof json.article === "object" ? json.article : json;
  if (!article || typeof article !== "object") return null;
  const title = String(article.title || "").trim();
  if (!title) return null;
  return {
    title,
    slug: String(article.slug || "").trim(),
    description: String(article.spot || article.summary || article.description || title).trim(),
    imageUrl: article.imageUrl || article.image || article.thumbnailUrl || "",
  };
}

async function loadCachedHmArticleForOg(incoming, slug, siteSlug) {
  const cache = getHmEdgeCache();
  const origin = incoming.origin;
  const urls = [
    `${origin}/api/news/${encodeURIComponent(slug)}`,
    `${origin}/api/news/page-bundle/${encodeURIComponent(slug)}`,
  ];
  for (const url of urls) {
    const hit = await matchHmEdgeCache(cache, url);
    if (!hit?.ok) continue;
    const json = await hit.clone().json().catch(() => null);
    const fields = articleFieldsFromJson(json);
    if (fields) return fields;
  }
  if (siteSlug) {
    const boot = await readHmHtmlBootFromCache(cache, origin, siteSlug, incoming.hostname);
    const item = findHmBundleHeadlineBySlug(boot?.bundle, slug);
    if (item?.title) {
      return {
        title: String(item.title).trim(),
        slug,
        description: String(item.spot || item.summary || item.description || item.title).trim(),
        imageUrl: item.imageUrl || item.image || item.thumbnailUrl || "",
      };
    }
  }
  return null;
}

/**
 * Sosyal ├Ânizleme botlar─▒: SPA index.html (turk.eco OG) yerine
 * /api/public/og-html ile haber ba┼şl─▒k/a├ğ─▒klama/g├Ârsel d├Ând├╝r.
 * Container as─▒l─▒rsa kenar cache / site entity ile 800ms i├ğinde cevap ver.
 */
async function socialPreviewOgHtml(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isSocialPreviewBot(request)) return null;
  if (isOgProxySkipPath(incoming.pathname)) return null;

  const host = (incoming.hostname || "").toLowerCase();
  const cleanPath = incoming.pathname.replace(/\/+$/, "") || "/";
  const apiOrigin = upstreamOrigin(env, incoming);
  const isHmSlugPath = /^\/tr\/[^/]+(?:\/.*)?$/.test(cleanPath);
  const fallbackSlug = !isPortalHost(host) && !isAhenkAgencyHost(host) ? hmDomainSlugFallback(host) : "";
  const hmSlug =
    fallbackSlug ||
    (!isPortalHost(host) && !isAhenkAgencyHost(host)
      ? await withBudget(fetchHmSlugForHost(env, apiOrigin, host), 400)
      : "") ||
    "";
  const hmBound = Boolean(hmSlug);
  const isCustomHmDomainPath = hmBound;
  const isPortalSharePath = (isPortalHost(host) || !hmBound) && isPortalOgSharePath(cleanPath);
  const isAhenkAgencyPath = isAhenkAgencyHost(host) && isAhenkAgencyGeoPath(cleanPath);
  if (!isHmSlugPath && !isCustomHmDomainPath && !isPortalSharePath && !isAhenkAgencyPath) return null;

  const articlePath = parseHmNewsArticlePath(cleanPath);
  if (articlePath && hmSlug) {
    const cachedArticle = await loadCachedHmArticleForOg(incoming, articlePath.slug, hmSlug);
    if (cachedArticle?.title) {
      const html = buildHmNewsArticleOgHtml({
        origin: incoming.origin,
        path: `/${articlePath.kind}/${encodeURIComponent(articlePath.slug)}`,
        siteName: hmSlugDisplayName(hmSlug),
        title: cachedArticle.title,
        description: cachedArticle.description,
        image: cachedArticle.imageUrl,
      });
      return socialOgHtmlResponse(request, html, "article-cache");
    }
  }

  const target = new URL("/api/public/og-html", apiOrigin);
  target.searchParams.set("path", cleanPath);
  target.searchParams.set("origin", incoming.origin);

  try {
    const upstream = await withBudget(
      fetchApi(env, target.toString(), {
        headers: {
          accept: "text/html",
          "user-agent": request.headers.get("user-agent") ?? "",
          "x-forwarded-host": incoming.host,
          "x-forwarded-proto": incoming.protocol.replace(":", "") || "https",
        },
        cf: { cacheTtl: 0, cacheEverything: false },
      }),
      HM_SOCIAL_OG_BUDGET_MS,
    );
    if (!upstream || !upstream.ok) {
      if (isAhenkAgencyPath) return ahenkAgencyEntityResponse(request, cleanPath);
      if (hmSlug) return hmSiteEntityResponse(request, hmSlug, incoming.origin, cleanPath);
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
    if (hmSlug) {
      const text = sanitizeOgShareImages(await upstream.text(), incoming.origin);
      if (/\/apple-touch-icon\.png/.test(text)) headers.set("x-yekpare-og-image-fix", "1");
      return new Response(text, { status: upstream.status, headers });
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    if (isAhenkAgencyPath) return ahenkAgencyEntityResponse(request, cleanPath);
    if (hmSlug) return hmSiteEntityResponse(request, hmSlug, incoming.origin, cleanPath);
    return null;
  }
}

function hmSiteEntityResponse(request, slug, origin, pathname) {
  const body = buildHmSiteEntityHtml(slug, origin, pathname);
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=300",
    "x-yekpare-frontend": FRONTEND_TAG,
    "x-yekpare-og": "hm-entity-fallback",
    "x-robots-tag": "index, follow, max-image-preview:large, max-snippet:-1",
  });
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(body, { status: 200, headers });
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
const WORLD_BRIEFS_TR_CHARS = /[├ğ─ş─▒├Â┼ş├╝├ç─Ş─░├û┼Ş├£─▒I]/;
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
  return /[─ş├╝┼ş─▒├Â├ğ─Ş├£┼Ş─░├û├ç]/.test(t) || /\b(ve|bir|i├ğin|ile|bu|da|de|haber|t├╝rkiye)\b/i.test(t);
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

/** RSS g├Âvdesindeki harici ba─şlant─▒lar─▒ kald─▒r─▒r (yaln─▒zca metin kal─▒r) ÔÇö NTVÔÇÖye s─▒zma olmas─▒n. */
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
      sourceName: "D├╝nya",
      feedLabel: "D├╝nya",
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
 * Edge: D├╝nyadan K─▒sa K─▒sa ÔÇö NTV D├╝nya RSS (API gecikmesinde donmas─▒n).
 * ─░ste─şe ba─şl─▒ siteId ile upstream D├╝nya DB haberlerini de birle┼ştirir.
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
          // Harici originUrl (NTV vb.) kart hrefÔÇÖi olmaz ÔÇö site i├ği yol ┼şart.
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
            sourceName: row.categoryName || "D├╝nya",
            feedLabel: row.categoryName || "D├╝nya",
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
    // ─░stemciye harici originUrl verme ÔÇö kartlar yaln─▒zca site i├ği href kullan─▒r.
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
              label: "K├╝resel",
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
    .replace(/─▒/g, "i")
    .replace(/─ş/g, "g")
    .replace(/├╝/g, "u")
    .replace(/┼ş/g, "s")
    .replace(/├Â/g, "o")
    .replace(/├ğ/g, "c")
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
      modeRaw === "persistent" || modeRaw === "kalici" || modeRaw === "kal─▒c─▒"
        ? "persistent"
        : modeRaw === "manual" || modeRaw === "manuel"
          ? "manual"
          : "live";
    // Kutu i├ği + site i├ği RSS ÔÇö ayn─▒ kategoride birden fazla URL korunur.
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
    { id: "dunya", label: "D├╝nya", url: NTV_DUNYA_RSS_URL },
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
 * Edge RSS detay ÔÇö `/haberler/rss/edge-*` site i├ği ├Ânizleme (NTVÔÇÖye d─▒┼şar─▒ atmaz).
 * Anl─▒k modda feed i├ğeri─şi; kal─▒c─▒/manuel i├ğin de ├Ânce site i├ği g├Âvde g├Âsterilir.
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
    return new Response(JSON.stringify({ error: "RSS haber bulunamad─▒" }), {
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
    (spot ? `<p>${escapeHtmlText(spot.replace(/ÔÇĞ$/, "").trim())}</p>` : null);
  // Edit├Âr sitelerinde g├Âvde i├ği NTV vb. harici <a> kald─▒r─▒l─▒r; kart t─▒klamas─▒ zaten site i├ği.
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
    categoryName: feed.label || "D├╝nya",
    categoryColor: "#CC0000",
    feedId: `edge-site-${slugifyCategoryKey(feed.id || feed.label) || "dunya"}`,
    feedLabel: feed.label || "D├╝nya",
    sourceName: isEditorSite ? "Yekpare Haberleri" : feed.label || "RSS",
    // Edit├Âr sitelerinde kaynak ba─şlant─▒s─▒ yok; haber yaln─▒zca site i├ğinde a├ğ─▒l─▒r.
    feedUrl: isEditorSite ? null : feed.url || null,
    sourceScope: isEditorSite ? "editor" : "portal",
    readCount: null,
    // Edit├Âr vitrininde originUrl g├Âsterme/s─▒zd─▒rma ÔÇö NTVÔÇÖye ├ğ─▒k─▒┼ş yolu olmas─▒n.
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
          signal: AbortSignal.timeout(HM_SITE_RSS_EDGE_FETCH_TIMEOUT_MS),
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
 * Site i├ği RSS a├ğ─▒kken API cache bo┼ş kal─▒rsa Cloudflare edge NTV/site feedÔÇÖlerini doldurur.
 */
/** RSS anahtar Ôåö site kategori (son-dakika/turkiye ÔåÆ gundem). */
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
  // Kategori iste─şinde ├Ânce e┼şle┼şen feedÔÇÖler; yoksa t├╝m├╝n├╝ dene (slug sapmas─▒).
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
  const dbFirst =
    incoming.searchParams.get("dbFirst") === "1" ||
    incoming.searchParams.get("dbFirst") === "true";
  if (
    !shouldFillHybridSiteRssAtEdge({
      method: request.method,
      pathname: incoming.pathname,
      upstreamOk: Boolean(upstream?.ok),
      dbFirst,
      rssCount,
      itemCount: existing.length,
      categorySlug,
      categoryHitCount: existingCategoryHits.length,
    })
  ) {
    return null;
  }

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
  // Kategori iste─şinde e┼şle┼şen RSS yoksa bo┼ş edge-fill d├Ânme (├╝st ak─▒┼ş─▒ koru).
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
  return new Response(JSON.stringify(next), {
    status: hybridEdgeFillHttpStatus(Boolean(upstream?.ok), page.length),
    headers: outHeaders,
  });
}

export default {
  async fetch(request, env, ctx) {
    const incoming = new URL(request.url);
    const hostKeyEarly = normalizeHost(incoming.hostname);

    // www.ahenk.net.tr / turk.eco ÔåÆ ahenk.net.tr
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

    // suhaberajansi.com ÔåÆ suhaber.net
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

    // www.yektube.com ÔåÆ apex
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

    // turk.eco/yp ÔåÆ yektube.com/yp
    const portalYektubeRedirect = redirectPortalYektubeToCanonical(request, incoming);
    if (portalYektubeRedirect) return portalYektubeRedirect;

    // yektube.com / ÔåÆ /yp/ (+ eski yollar)
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

    // Ortak edit├Âr (sehirgazetesiankara): ASG + AHB senkron + username.
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
        // SHA i├ğerik AHG+ASGÔÇÖde isteniyor ÔÇö purge no-op (eski silmeyi tekrarlamaz).
        const job = purgeAhgRssCampaignNewsOnNeon(env).catch((err) => {
          console.error("[hm-ahg-rss-news-purge]", String(err?.message || err).slice(0, 200));
        });
        if (typeof ctx.waitUntil === "function") ctx.waitUntil(job);
      } catch (err) {
        console.error("[hm-ahg-rss-news-purge]", String(err?.message || err).slice(0, 200));
      }
    }
    // K─▒r┼şehir: ikinci edit├Âr hesab─▒ (yekpare@gmail.com) ÔÇö paralel oturum.
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
    // T├╝m edit├Âr siteleri: RSS varsay─▒lanlar─▒ arka planda (sayfa/API'yi bekletme).
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

    // Haber g├Ârselleri ÔÇö R2'de varsa Container'a gitmeden kenardan.
    const mediaMiss = {};
    try {
      const mediaGet = await handleMediaGetFromR2(request, env, mediaMiss);
      if (mediaGet) return mediaGet;
    } catch (err) {
      console.error("[media-r2-get]", String(err?.message || err).slice(0, 200));
    }

    // Edit├Âr g├Ârsel y├╝kleme ÔÇö kenar JWT + R2.
    try {
      const mediaEdge = await handleHmEditorMediaUploadEdge(request, env);
      if (mediaEdge) return mediaEdge;
    } catch (err) {
      console.error("[hm-editor-media-edge]", String(err?.message || err).slice(0, 200));
    }

    // Edit├Âr login + /me + profil + layout ÔÇö kenarda Neon (t├╝m HM siteleri).
    // clone: kenar null d├Ânerse (KH d─▒┼ş─▒ layout / captcha) body Container'a bozulmadan gitsin.
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

    // HM edit├Âr haber/yazar/makale ÔÇö kenar JWT ile Neon (t├╝m siteler).
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

    // Sosyal / Googlebot k├Âkte 308'e d├╝┼şmeden site ad─▒+logo OG g├Ârs├╝n.
    const ogHtml = await socialPreviewOgHtml(request, env, incoming);
    if (ogHtml) return ogHtml;

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

    const sitemapXml = await proxyRootSitemap(request, env, incoming);
    if (sitemapXml) return sitemapXml;

    const worldBriefs = await serveWorldBriefsEdge(request, env, incoming);
    if (worldBriefs) return worldBriefs;

    const edgeRssPreview = await serveEdgeRssPreview(request, env, incoming);
    if (edgeRssPreview) return edgeRssPreview;

    const fromAssets = await tryServeAssets(
      request,
      env,
      incoming,
      typeof ctx?.waitUntil === "function" ? (p) => ctx.waitUntil(p) : undefined,
    );
    if (fromAssets) return fromAssets;

    const origin = upstreamOrigin(env, incoming);
    const yektubeRewrite = rewriteYektubeSpaPath(incoming.pathname);
    const upstreamPath = yektubeRewrite || incoming.pathname;
    const target = new URL(upstreamPath + incoming.search, origin);
    const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
    const purgeCookie = purgeCookieName(incoming.hostname);
    const waitUntil = typeof ctx?.waitUntil === "function" ? (p) => ctx.waitUntil(p) : undefined;
    const edgeCache = getHmEdgeCache();
    const cacheablePublicApi = isHmEdgeCacheableRequest(request, incoming.pathname, incoming.search);
    let staleEdgeFallback = null;
    if (cacheablePublicApi && edgeCache) {
      const resolved = await resolveHmEdgeCache(edgeCache, incoming.href, {
        waitUntil,
        revalidate: async () => {
          const fresh = await fetchApi(env, target.toString(), proxyInit(request, origin, incoming));
          if (fresh?.ok) await putHmEdgeCache(edgeCache, incoming.href, fresh);
        },
      });
      if (resolved.response) return resolved.response;
      staleEdgeFallback = resolved.cached;
    }

    const rememberPublicApi = (resp) => {
      if (cacheablePublicApi && edgeCache && resp && resp.ok) {
        const job = putHmEdgeCache(edgeCache, incoming.href, resp.clone());
        if (waitUntil) waitUntil(job);
      }
      return resp;
    };

    try {
      const homeFill = await maybeFillArticleFromHomeBundle(incoming, edgeCache);
      if (homeFill) {
        if (waitUntil) {
          waitUntil(
            withBudget(
              fetchApi(env, target.toString(), proxyInit(apiRequest, origin, incoming)),
              HM_ORIGIN_BUDGET_MS,
            )
              .then((fresh) => (fresh?.ok ? putHmEdgeCache(edgeCache, incoming.href, fresh) : null))
              .catch(() => null),
          );
        }
        // Recovered manset stub must NOT enter public edge cache (spotÔëáfull content)
        return homeFill;
      }
      const cfOpts = upstreamCfCacheOptions(upstreamPath, apiRequest.method, incoming.search || "");
      const proxyOpts = proxyInit(apiRequest, origin, incoming);
      const pageBundleRetries = isNewsPageBundlePath(incoming.pathname) ? 0 : 2;
      // Cold container boot after CONTAINER_ROLL often exceeds 20ÔÇô60s; keep warm path fast via edge cache.
      const originMs = isYektubeDedicatedHost(incoming.hostname)
        ? 120_000
        : cacheablePublicApi
          ? HM_ORIGIN_BUDGET_MS
          : 120_000;
      const upstream = await withBudget(
        fetchUpstreamWithRetry(
          env,
          target.toString(),
          proxyOpts,
          cfOpts,
          pageBundleRetries,
        ),
        originMs,
      );
      const originTimedOut = !upstream;
      if (staleEdgeFallback && (!upstream || !upstream.ok || upstream.status >= 500)) {
        const headers = new Headers(staleEdgeFallback.headers);
        headers.set("x-yekpare-edge-cache", "stale-error");
        return new Response(staleEdgeFallback.body, {
          status: staleEdgeFallback.status,
          headers,
        });
      }
      if (!originTimedOut) {
        const recoveredBundle = await withBudget(
          maybeRecoverNewsPageBundle(env, origin, proxyOpts, incoming, upstream),
          HM_ORIGIN_BUDGET_MS,
        );
        if (recoveredBundle) return rememberPublicApi(recoveredBundle);
      }
      if (!upstream) {
        if (isHmYektubeCatalogPath(upstreamPath)) {
          return hmYektubeCatalogVideosOrRss(upstreamPath, incoming.searchParams, "timeout");
        }
        return new Response(JSON.stringify({ ok: false, error: "Sunucu me┼şgul" }), {
          status: 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "x-yekpare-frontend": FRONTEND_TAG,
            "x-yekpare-origin-budget": "timeout",
          },
        });
      }
      if (
        isHmYektubeCatalogPath(upstreamPath) &&
        shouldDegradeHmYektubeCatalog(upstream.status, upstream.headers.get("content-type"))
      ) {
        return hmYektubeCatalogVideosOrRss(upstreamPath, incoming.searchParams, `status-${upstream.status || 0}`);
      }
      const brandMeta = await maybeEnsureBrandMetaResponse(env, incoming, upstream, {
        waitUntil,
      });
      if (brandMeta) return rememberPublicApi(brandMeta);
      const repaired = await maybeRepairMismatchedNewsJson(
        env,
        origin,
        proxyOpts,
        apiRequest.method,
        incoming,
        upstreamPath,
        upstream,
      );
      if (repaired) return rememberPublicApi(repaired);

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
          out.set("cache-control", "public, max-age=60, s-maxage=600, stale-while-revalidate=3600");
          out.set("cdn-cache-control", "public, max-age=600, stale-while-revalidate=3600");
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
        return rememberPublicApi(withKhNeon || enrichedBase);
      }

      const filteredNews = await maybeFilterHmPublicNewsUpstream(incoming, upstream, out);
      if (filteredNews) {
        const withKhNeon = await injectKhNeonNewsIntoPublicResponse(env, incoming, filteredNews);
        return rememberPublicApi(withKhNeon || filteredNews);
      }

      const ct = String(out.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        if (
          isHmYektubeCatalogPath(upstreamPath) ||
          isHmYektubeCatalogPath(incoming.pathname)
        ) {
          return hmYektubeCatalogVideosOrRss(
            isHmYektubeCatalogPath(upstreamPath) ? upstreamPath : incoming.pathname,
            incoming.searchParams,
            "html-upstream",
          );
        }
        out.set("cache-control", "no-store, max-age=0, must-revalidate");
        // Eski Netlify SW temizli─şi: yaln─▒zca JS boot + cookie.
        // Clear-Site-Data HTML navigasyonunda Chrome'da ERR_FAILED yapabiliyor
        // (├Âzellikle /admin); cookie de yaz─▒lamadan d├Âng├╝ olu┼şuyor.
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

      if (isHmYektubeCatalogPath(upstreamPath) && ct.includes("json")) {
        const text = await upstream.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        if (hmYektubeCatalogShouldFillFromRss(upstreamPath, parsed)) {
          const filled = await hmYektubeCatalogRssFillBody(incoming.searchParams);
          if (filled) return rememberPublicApi(hmYektubeCatalogJsonResponse(filled, "rss"));
        }
        return rememberPublicApi(new Response(text, { status: upstream.status, headers: out }));
      }

      return rememberPublicApi(new Response(upstream.body, { status: upstream.status, headers: out }));
    } catch (err) {
      if (staleEdgeFallback) {
        const headers = new Headers(staleEdgeFallback.headers);
        headers.set("x-yekpare-edge-cache", "stale-error");
        return new Response(staleEdgeFallback.body, { status: staleEdgeFallback.status, headers });
      }
      if (isHmYektubeCatalogPath(incoming.pathname) || isHmYektubeCatalogPath(upstreamPath)) {
        return hmYektubeCatalogVideosOrRss(
          isHmYektubeCatalogPath(upstreamPath) ? upstreamPath : incoming.pathname,
          incoming.searchParams,
          "proxy-error",
        );
      }
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
  async scheduled(_event, env, ctx) {
    const waitUntil = typeof ctx?.waitUntil === "function" ? (p) => ctx.waitUntil(p) : async (p) => p;
    waitUntil(
      (async () => {
        const origin = resolveApiOrigin(env) || "https://ahenk.net.tr";
        try {
          await fetchApi(env, `${origin}/api/healthz`);
        } catch (err) {
          console.error("[hm-keepalive/healthz]", String(err?.message || err).slice(0, 160));
        }
        try {
          await warmKnownHmNewsSites(env, {
            fetchApi,
            cache: getHmEdgeCache(),
            sites: listKnownHmEditorSites(),
          });
        } catch (err) {
          console.error("[hm-keepalive/warm]", String(err?.message || err).slice(0, 160));
        }
      })(),
    );
  },
};