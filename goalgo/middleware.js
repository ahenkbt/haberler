/**
 * Vercel Edge — tek dosya (yerel import yok; Edge bundle kısıtı).
 * SEO doğrulama, API degrade fallback, /api Railway vekili.
 */

/** --- public-vitrin-paths (edge degrade) --- */
const OPTIONAL_PUBLIC_GET = [
  "/settings",
  "/public/",
  "/news",
  "/wiki",
  "/authors",
  "/categories",
  "/modules",
  "/ads",
  "/video",
  "/hm/meta/",
  "/hm/showcase-sites",
  "/hm/makale",
  "/hm/pwa-",
  "/tourism/listings",
  "/tourism/cities",
  "/tourism/destinations",
  "/tourism/tours",
  "/delivery/categories",
  "/delivery/module-items",
  "/delivery/marketplace",
  "/delivery/vendors",
  "/delivery/module-banners",
  "/ecommerce-product-categories",
  "/vendors/meta/",
  "/map/homepage-businesses",
  "/map/homepage-featured-offers",
  "/map/categories",
  "/map/stats",
  "/map/discover-categories",
  "/map/insaatfirmalarim",
  "/map/businesses",
  "/tr-address/provinces",
  "/tr-address/districts",
  "/tr-address/neighborhoods",
  "/broadcasts",
].map((prefix) => new RegExp(`^/api${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

/** Yektube kategori kataloğu — stale Railway 404 yedeği (yektubeCategoryCatalog ADMIN_CATEGORY_SLUGS) */
const YEKTUBE_CATEGORY_LABELS = {
  haberler: "Haberler ve Politika",
  sinema: "Film ve Animasyon",
  dizi: "Dizi",
  muzik: "Müzik",
  oyun: "Oyun",
  spor: "Spor",
  eglence: "Eğlence",
  komedi: "Komedi",
  bilim: "Bilim",
  teknoloji: "Bilim ve Teknoloji",
  egitim: "Eğitim",
  seyahat: "Seyahat ve Etkinlikler",
  otomobil: "Otomobiller ve Araçlar",
  "evcil-hayvan": "Evcil Hayvanlar",
  doga: "Doğa",
  "nasil-yapilir": "Nasıl Yapılır ve Stil",
  vlog: "Kişiler ve Bloglar",
  tarih: "Tarih",
  saglik: "Sağlık",
  cocuk: "Çocuk",
  aktivizm: "STK ve Aktivizm",
  belgesel: "Belgesel",
  podcast: "Podcast",
  yemek: "Yemek",
};
const YEKTUBE_CATEGORY_SLUGS = Object.keys(YEKTUBE_CATEGORY_LABELS);

const DEFAULT_MUZIK_SECTION_CATEGORIES = [
  { id: "all", label: "Tümü" },
  { id: "pop", label: "Pop", keywords: ["pop", "türk pop"] },
  { id: "enerji", label: "Enerji", keywords: ["enerji", "edm", "dance"] },
  { id: "rahatlama", label: "Rahatlama", keywords: ["chill", "lofi", "rahat"] },
  { id: "romantik", label: "Romantik", keywords: ["romantik", "aşk", "ballad"] },
];

const DEFAULT_COCUK_SECTION_CATEGORIES = [
  { id: "onerilen", label: "Önerilen", keywords: [] },
  { id: "muzik", label: "Müzik", keywords: ["müzik", "music", "song", "şarkı", "nursery"] },
  { id: "kesfet", label: "Keşfet", keywords: ["keşfet", "explore", "macera"] },
  { id: "ogrenme", label: "Öğrenme", keywords: ["öğren", "learn", "eğitim", "education", "okul"] },
  { id: "sovlar", label: "Şovlar", keywords: ["show", "şov", "episodes", "bölüm", "dizi"] },
];

function yektubeCategoryCatalogFallback() {
  return YEKTUBE_CATEGORY_SLUGS.map((slug) => ({
    slug,
    label: YEKTUBE_CATEGORY_LABELS[slug] ?? slug,
    videoCount: 0,
  }));
}

function yektubeSectionConfigFallback() {
  return {
    yektubeCategories: YEKTUBE_CATEGORY_SLUGS.map((slug) => ({
      slug,
      label: YEKTUBE_CATEGORY_LABELS[slug] ?? slug,
    })),
    muzikCategories: DEFAULT_MUZIK_SECTION_CATEGORIES,
    cocukCategories: DEFAULT_COCUK_SECTION_CATEGORIES,
  };
}

function isOptionalPublicGetPath(pathname) {
  const p = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return OPTIONAL_PUBLIC_GET.some((re) => re.test(p));
}

function optionalPublicGetFallbackBody(pathname, method, search = "") {
  if (method !== "GET" && method !== "HEAD") return null;
  if (!isOptionalPublicGetPath(pathname)) return null;
  const p = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  const qs = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (p === "/api/settings") {
    return JSON.stringify({ siteName: "Yekpare", homepageDesignJson: null });
  }
  if (p === "/api/map/homepage-businesses" || p === "/api/map/homepage-featured-offers") {
    return JSON.stringify({ success: true, data: [] });
  }
  if (p === "/api/map/categories" || p === "/api/map/discover-categories") {
    return JSON.stringify({ success: true, data: [] });
  }
  if (p === "/api/map/stats") {
    return JSON.stringify({
      success: true,
      data: { businesses: 0, categories: 0, activeBusinesses: 0, insaatfirmalarim: 0 },
    });
  }
  if (/^\/api\/map\/insaatfirmalarim\/catalog$/.test(p)) {
    return JSON.stringify({ success: true, data: { categories: [] } });
  }
  if (p === "/api/map/businesses" || /^\/api\/map\/businesses\/[^/]+$/.test(p)) {
    return JSON.stringify({ success: true, data: [], total: 0 });
  }
  if (p === "/api/delivery/marketplace") {
    return JSON.stringify({
      success: true,
      data: {
        vendors: [],
        categories: [],
        products: [],
        featuredProducts: [],
        bestSelling: [],
        newest: [],
        campaigns: [],
        stats: { vendorCount: 0, productCount: 0, categoryCount: 0, campaignCount: 0 },
        pagination: { limit: 0, offset: 0, total: 0, hasMore: false },
      },
    });
  }
  if (p.startsWith("/api/delivery/vendors")) {
    return JSON.stringify({ error: "not_found" });
  }
  if (p === "/api/wiki/homepage" || p === "/api/wiki/featured") {
    return JSON.stringify({ items: [] });
  }
  if (p.startsWith("/api/wiki/")) {
    return JSON.stringify({ title: null, extract: null, items: [] });
  }
  if (p.startsWith("/api/news")) {
    return JSON.stringify({ items: [], total: 0 });
  }
  if (p.startsWith("/api/tourism/listings")) {
    return JSON.stringify({ listings: [], total: 0 });
  }
  if (p.startsWith("/api/tourism/")) {
    return JSON.stringify([]);
  }
  if (p === "/api/hm/meta/slugs" || p === "/api/hm/showcase-sites") {
    return JSON.stringify([]);
  }
  if (p.startsWith("/api/hm/meta/")) {
    return JSON.stringify({
      id: null,
      slug: null,
      domain: null,
      domain2: null,
      domain3: null,
      displayName: null,
      description: null,
      contact: null,
      layout: null,
      seoVerification: null,
      createdAt: null,
    });
  }
  if (p.startsWith("/api/hm/makale")) {
    return JSON.stringify({ items: [], total: 0 });
  }
  if (p === "/api/public/portal-seo") {
    return JSON.stringify({ siteName: "Yekpare", seoVerification: null });
  }
  if (p === "/api/vendors/meta/by-domain") {
    return JSON.stringify({ slug: null, storefrontPath: null, shortPath: null });
  }
  if (p.startsWith("/api/authors")) {
    return JSON.stringify([]);
  }
  if (p.startsWith("/api/categories") || p.startsWith("/api/modules") || p.startsWith("/api/ads")) {
    return JSON.stringify([]);
  }
  if (p.startsWith("/api/delivery/categories") || p.startsWith("/api/delivery/module-items")) {
    return JSON.stringify([]);
  }
  if (p.startsWith("/api/delivery/module-banners")) {
    return JSON.stringify([]);
  }
  if (p === "/api/ecommerce-product-categories") {
    return JSON.stringify({ tree: [] });
  }
  if (p.startsWith("/api/tr-address/")) {
    return JSON.stringify([]);
  }
  if (p.startsWith("/api/broadcasts")) {
    return JSON.stringify([]);
  }
  if (p === "/api/video/categories") {
    return JSON.stringify({ items: yektubeCategoryCatalogFallback() });
  }
  if (p === "/api/video/admin/section-config") {
    return JSON.stringify(yektubeSectionConfigFallback());
  }
  if (p === "/api/video/admin/section-stats") {
    return JSON.stringify({ sections: [] });
  }
  if (p === "/api/video/section-categories") {
    const section = qs.get("section");
    const categories =
      section === "cocuk" ? DEFAULT_COCUK_SECTION_CATEGORIES : DEFAULT_MUZIK_SECTION_CATEGORIES;
    return JSON.stringify({ categories });
  }
  if (p.startsWith("/api/video/youtube-engagement/")) {
    const videoId = decodeURIComponent(p.slice("/api/video/youtube-engagement/".length).split("/")[0] ?? "");
    return JSON.stringify({
      videoId,
      likeCount: null,
      commentCount: null,
      viewCount: null,
      comments: [],
      source: "api",
    });
  }
  if (p.startsWith("/api/video/youtube-comments/")) {
    const videoId = decodeURIComponent(p.slice("/api/video/youtube-comments/".length).split("/")[0] ?? "");
    return JSON.stringify({ videoId, comments: [], commentCount: null });
  }
  if (p.startsWith("/api/video/youtube-stream")) {
    return null;
  }
  if (p.startsWith("/api/video/videos") || p.startsWith("/api/video/shorts")) {
    return JSON.stringify({ items: [], total: 0 });
  }
  if (p === "/api/video/live/status") {
    return JSON.stringify({
      tvLiveCount: 0,
      channelLiveCount: 0,
      totalLiveCount: 0,
      liveVideoIds: [],
      updatedAt: new Date().toISOString(),
    });
  }
  if (p === "/api/video/live") {
    return JSON.stringify({ sources: [], tvVideos: [], channelLiveVideos: [], videos: [] });
  }
  if (p.startsWith("/api/video")) {
    return JSON.stringify([]);
  }
  return "[]";
}

/** --- middleware-api-degrade --- */
function isNavigationPrefetch(request) {
  const purpose = String(request.headers.get("purpose") ?? request.headers.get("Purpose") ?? "").toLowerCase();
  const secPurpose = String(request.headers.get("sec-purpose") ?? request.headers.get("Sec-Purpose") ?? "").toLowerCase();
  if (purpose.includes("prefetch") || secPurpose.includes("prefetch")) return true;
  if (request.headers.get("x-middleware-prefetch")) return true;
  if (String(request.headers.get("next-router-prefetch") ?? "") === "1") return true;
  return false;
}

function buildDegradedApiResponse(request, pathname, body) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    "x-yekpare-api-degraded": "1",
  });
  if (body) headers.set("content-length", String(new TextEncoder().encode(body).byteLength));
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

function isUpstreamUnavailable(status) {
  return status === 502 || status === 503 || status === 504;
}

/** Eski Railway sürümünde kayıtlı olmayan rotalar Express HTML 404 döner */
function isStaleExpressRoute404(upstream) {
  if (upstream.status !== 404) return false;
  const ct = String(upstream.headers.get("content-type") ?? "").toLowerCase();
  return ct.includes("text/html");
}

function shouldUsePublicGetFallback(upstream, pathname, method) {
  if (method !== "GET" && method !== "HEAD") return false;
  if (!isOptionalPublicGetPath(pathname)) return false;
  return isUpstreamUnavailable(upstream.status) || isStaleExpressRoute404(upstream);
}

async function tryYoutubeMetaOembedFallback(pathname) {
  const p = String(pathname || "").split("?")[0];
  const prefix = "/api/video/youtube-meta/";
  if (!p.startsWith(prefix)) return null;
  const id = decodeURIComponent(p.slice(prefix.length).split("/")[0] ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { headers: { "User-Agent": "Yekpare/1.0 (+https://yekpare.net)" }, signal: shortAbortSignal(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.stringify({
      videoId: id,
      title: String(data.title ?? "").slice(0, 500),
      description: "",
      duration: null,
      thumbnail: typeof data.thumbnail_url === "string" ? data.thumbnail_url : undefined,
    });
  } catch {
    return null;
  }
}

async function resolvePublicGetFallbackBody(pathname, method, search) {
  let body = optionalPublicGetFallbackBody(pathname, method, search);
  if (body != null) return body;
  const p = String(pathname || "").split("?")[0];
  if (p.startsWith("/api/video/youtube-meta/")) {
    body = await tryYoutubeMetaOembedFallback(pathname);
  }
  return body;
}

function shortAbortSignal(ms) {
  try {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
  } catch {
    // ignore
  }
  return undefined;
}

/** --- middleware-seo-verification --- */
function createMiddlewareSeoVerification(deps) {
  const { railwayApiOrigin, rootSitemapApiPath, isSitemapApiProxyPath } = deps;

  function parsePortalExtraHostsSeo() {
    return String(process.env.PORTAL_EXTRA_HOSTS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
      .filter(Boolean);
  }

  function isPortalHost(host) {
    const h = String(host || "")
      .toLowerCase()
      .replace(/^www\./, "")
      .split(":")[0];
    return (
      !h ||
      h === "yekpare.net" ||
      h === "turknet.app" ||
      h === "goalgo.org" ||
      h === "turkiye.li" ||
      h === "getirsepeti.com.tr" ||
      h === "ahenk.net.tr" ||
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.indexOf(".vercel.app") !== -1 ||
      parsePortalExtraHostsSeo().includes(h)
    );
  }

  function isVerificationBot(uaRaw) {
    const ua = String(uaRaw || "").toLowerCase();
    return (
      ua.includes("google-site-verification") ||
      ua.includes("googlebot") ||
      ua.includes("google-inspectiontool") ||
      ua.includes("bingbot") ||
      ua.includes("yandex") ||
      ua.includes("duckduckbot") ||
      ua.includes("baiduspider")
    );
  }

  function isStaticShellExcluded(pathname) {
    return (
      pathname.startsWith("/api") ||
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/_next/") ||
      /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$/i.test(pathname)
    );
  }

  function isSitemapFeedPath(pathname) {
    const p = String(pathname || "").replace(/\/+$/, "") || "/";
    if (p === "/robots.txt" || p === "/sitemap-static.xml") return true;
    if (rootSitemapApiPath(p)) return true;
    if (isSitemapApiProxyPath(p)) return true;
    if (/^\/api\/rss\/.+\.xml$/i.test(p)) return true;
    if (/^\/rss\/.+\.xml$/i.test(p)) return true;
    return false;
  }

  function htmlEscape(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildVerificationMetaTags(seoVerification) {
    const v = seoVerification && typeof seoVerification === "object" ? seoVerification : null;
    if (!v) return "";
    const google = typeof v.googleSiteVerification === "string" ? v.googleSiteVerification.trim() : "";
    const bing = typeof v.bingSiteVerification === "string" ? v.bingSiteVerification.trim() : "";
    const yandex = typeof v.yandexVerification === "string" ? v.yandexVerification.trim() : "";
    const custom = Array.isArray(v.customMetaTags) ? v.customMetaTags : [];
    let metaTags = "";
    if (google) metaTags += `<meta name="google-site-verification" content="${htmlEscape(google)}" />\n    `;
    if (bing) metaTags += `<meta name="msvalidate.01" content="${htmlEscape(bing)}" />\n    `;
    if (yandex) metaTags += `<meta name="yandex-verification" content="${htmlEscape(yandex)}" />\n    `;
    for (const t of custom) {
      if (!t || typeof t !== "object") continue;
      const name = typeof t.name === "string" ? t.name.trim() : "";
      const content = typeof t.content === "string" ? t.content.trim() : "";
      if (!name || !content) continue;
      if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(name)) continue;
      metaTags += `<meta name="${htmlEscape(name)}" content="${htmlEscape(content)}" />\n    `;
    }
    return metaTags.trim();
  }

  function hasSeoVerification(seoVerification) {
    return Boolean(buildVerificationMetaTags(seoVerification));
  }

  function extractHmSlugFromPath(pathname) {
    const p = String(pathname || "").replace(/\/+$/, "") || "/";
    const tr = p.match(/^\/tr\/([^/?#]+)/i);
    if (tr) return decodeURIComponent(tr[1]);
    const hm = p.match(/^\/hm\/([^/?#]+)/i);
    if (hm) return decodeURIComponent(hm[1]);
    return null;
  }

  function isHmSlugPath(pathname) {
    return Boolean(extractHmSlugFromPath(pathname));
  }

  function isHmPublicShellPath(pathname, host) {
    if (isStaticShellExcluded(pathname)) return false;
    const p = String(pathname || "").replace(/\/+$/, "") || "/";
    if (p.startsWith("/admin") || p.startsWith("/editor") || p.startsWith("/uye") || p.startsWith("/api")) return false;
    if (isHmSlugPath(pathname)) return true;
    return p === "/";
  }

  function stripVerificationMetaFromHtml(html) {
    let out = String(html || "");
    out = out.replace(/<meta\s+[^>]*data-yekpare-verification=["']portal["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*name=["']google-site-verification["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*name=["']msvalidate\.01["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*name=["']yandex-verification["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*data-hm-verification=["']1["'][^>]*>\s*/gi, "");
    return out;
  }

  function applyVerificationToIndexHtml(html, seoVerification) {
    let out = stripVerificationMetaFromHtml(html);
    const metaTags = buildVerificationMetaTags(seoVerification);
    if (!metaTags || !/<head[^>]*>/i.test(out)) return out;
    return out.replace(/<head([^>]*)>/i, (m) => `${m}\n    ${metaTags}`);
  }

  function buildVerificationHtml(meta, requestUrl) {
    const v = meta && typeof meta === "object" ? meta.seoVerification : null;
    const metaTags = buildVerificationMetaTags(v);
    const title = (meta && typeof meta.displayName === "string" ? meta.displayName : "") || "Haber";
    const url = new URL(requestUrl);
    return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    ${metaTags}
    <title>${htmlEscape(title)}</title>
    <link rel="canonical" href="${htmlEscape(url.origin + url.pathname)}" />
  </head>
  <body>
    <noscript>${htmlEscape(title)}</noscript>
  </body>
</html>`;
  }

  function serveGoogleVerificationHtmlFile(pathname) {
    const m = /^\/(google[a-z0-9]+\.html)$/i.exec(String(pathname || "").replace(/\/+$/, "") || "/");
    if (!m) return null;
    const filename = m[1];
    return new Response(`google-site-verification: ${filename}`, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    });
  }

  async function fetchHmMetaForHost(apiOrigin, host, pathname) {
    const hmSlug = extractHmSlugFromPath(pathname);
    const url = hmSlug
      ? `${apiOrigin}/api/hm/meta/by-slug/${encodeURIComponent(hmSlug)}`
      : `${apiOrigin}/api/hm/meta/by-domain?domain=${encodeURIComponent(host)}`;
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        redirect: "manual",
        signal: shortAbortSignal(1800),
      });
      if (!res.ok) return null;
      const meta = await res.json().catch(() => null);
      if (!meta || typeof meta !== "object") return null;
      return meta.data && typeof meta.data === "object" ? meta.data : meta;
    } catch {
      return null;
    }
  }

  async function fetchSeoVerificationForHost(apiOrigin, host, pathname) {
    const hmMeta = await fetchHmMetaForHost(apiOrigin, host, pathname);
    if (hmMeta?.seoVerification && hasSeoVerification(hmMeta.seoVerification)) {
      return { seoVerification: hmMeta.seoVerification, displayName: hmMeta.displayName || "Haber" };
    }

    const hmSlugPath = isHmSlugPath(pathname);
    const hmBound = Boolean(hmMeta?.slug);
    if (hmSlugPath || hmBound) return null;

    try {
      const portalRes = await fetch(`${apiOrigin}/api/public/portal-seo`, {
        headers: { accept: "application/json", "x-forwarded-host": host },
        redirect: "manual",
      });
      if (portalRes.ok) {
        const portal = await portalRes.json().catch(() => null);
        if (portal?.seoVerification && hasSeoVerification(portal.seoVerification)) {
          return {
            seoVerification: portal.seoVerification,
            displayName: portal.siteName || "Yekpare",
          };
        }
      }
    } catch {
      /* fall through */
    }
    return null;
  }

  async function injectVerificationIntoSpaIndex(request, incoming) {
    if (request.headers.get("x-verification-inject-skip")) return null;
    if (request.method !== "GET" && request.method !== "HEAD") return null;
    if (!isHmPublicShellPath(incoming.pathname, incoming.hostname || "")) return null;

    const host = (incoming.hostname || "").toLowerCase();
    if (!isVerificationBot(request.headers.get("user-agent"))) {
      return null;
    }
    if (isPortalHost(host) && !isVerificationBot(request.headers.get("user-agent"))) {
      return null;
    }
    const apiOrigin = railwayApiOrigin(request.url);
    const resolved = await fetchSeoVerificationForHost(apiOrigin, host, incoming.pathname);
    const seoVerification = resolved?.seoVerification ?? null;
    const hmSlugPath = isHmSlugPath(incoming.pathname);
    const hmBound = Boolean((await fetchHmMetaForHost(apiOrigin, host, incoming.pathname))?.slug);
    const hmCustomDomain = hmBound;
    if (!seoVerification && !hmSlugPath && !hmCustomDomain) return null;

    if (seoVerification && isVerificationBot(request.headers.get("user-agent"))) {
      const html = buildVerificationHtml(
        { displayName: resolved?.displayName || "Site", seoVerification },
        request.url,
      );
      return new Response(request.method === "HEAD" ? null : html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }

    try {
      const indexUrl = new URL("/index.html", incoming.origin);
      const indexRes = await fetch(indexUrl.toString(), {
        headers: {
          accept: "text/html",
          "x-verification-inject-skip": "1",
          "x-middleware-subrequest": "1",
        },
        redirect: "manual",
      });
      if (!indexRes.ok) {
        if (!seoVerification) return null;
        const metaTags = buildVerificationMetaTags(seoVerification);
        const fallback = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/>${metaTags}</head><body></body></html>`;
        return new Response(request.method === "HEAD" ? null : fallback, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store, max-age=0, must-revalidate",
            "x-yekpare-frontend": "ahenkpress-vercel",
          },
        });
      }
      const html = applyVerificationToIndexHtml(await indexRes.text(), seoVerification);
      return new Response(request.method === "HEAD" ? null : html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store, max-age=0, must-revalidate",
          "x-yekpare-frontend": "ahenkpress-vercel",
        },
      });
    } catch {
      if (!seoVerification) return null;
      const html = buildVerificationHtml(
        { displayName: resolved?.displayName || "Site", seoVerification },
        request.url,
      );
      return new Response(request.method === "HEAD" ? null : html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
  }

  async function serveVerificationBotHtml(request, incoming, host, pathname) {
    if (pathname.startsWith("/api") || isSitemapFeedPath(pathname)) return null;
    if (!isVerificationBot(request.headers.get("user-agent"))) return null;
    if (request.method !== "GET" && request.method !== "HEAD") return null;

    try {
      const apiOrigin = railwayApiOrigin(request.url);
      const p = (pathname || "").replace(/\/+$/, "") || "/";
      const hmSlugPath = isHmSlugPath(p);
      const hmMeta = await fetchHmMetaForHost(apiOrigin, host, p);
      if (hmMeta?.seoVerification && hasSeoVerification(hmMeta.seoVerification)) {
        const html = buildVerificationHtml(hmMeta, request.url);
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }
      if (hmSlugPath || hmMeta?.slug) return null;
      const portalRes = await fetch(`${apiOrigin}/api/public/portal-seo`, {
        headers: { accept: "application/json", "x-forwarded-host": host },
        redirect: "manual",
      });
      if (portalRes.ok) {
        const portal = await portalRes.json().catch(() => null);
        if (portal?.seoVerification?.googleSiteVerification) {
          const html = buildVerificationHtml(
            { displayName: portal.siteName || "Yekpare", seoVerification: portal.seoVerification },
            request.url,
          );
          return new Response(html, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          });
        }
      }
    } catch {
      /* fall through */
    }
    return null;
  }

  return {
    isVerificationBot,
    isSitemapFeedPath,
    serveGoogleVerificationHtmlFile,
    injectVerificationIntoSpaIndex,
    serveVerificationBotHtml,
  };
}

export const config = {
  matcher: [
    "/api/:path*",
    "/call-center-app",
    "/call-center-app/:path*",
    "/call-center-api/:path*",
    "/((?!api/|assets/|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};

function shouldBypassMiddleware(pathname, request) {
  if (request.headers.get("x-middleware-subrequest") || request.headers.get("x-verification-inject-skip")) {
    if (!pathname.startsWith("/api") && !pathname.startsWith("/call-center")) return true;
  }
  /** `/api/media/uploads/*.png` vb. Railway vekiline gitmeli; uzantı yüzünden statik dosya sanılıp NOT_FOUND oluyordu. */
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/assets/") || pathname.startsWith("/_next/")) return true;
  if (/\.(avif|css|gif|ico|jpe?g|js|json|map|png|svg|webp|woff2?|html?|txt|xml)$/i.test(pathname)) return true;
  return false;
}

function railwayApiOrigin(requestUrl) {
  const configured = String(process.env.RAILWAY_API_ORIGIN ?? "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  const u = new URL(requestUrl);
  return `${u.protocol}//${u.host}`;
}

/** Kök düzey sitemap .xml yollarını Railway /api/sitemap/* karşılığına eşler. */
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

/** Edge vekaletinde HEAD yanıtlarında Content-Type düşebilir; nosniff ile birlikte GSC "Getirilemedi" verir. */
function finalizeSitemapXmlResponse(request, upstream, opts) {
  const headers = new Headers();
  headers.set("content-type", "application/xml; charset=utf-8");
  headers.set("x-content-type-options", "nosniff");
  const cacheControl = upstream.headers.get("cache-control");
  headers.set("cache-control", cacheControl || "public, max-age=3600");

  let contentLength = upstream.headers.get("content-length");
  if (!contentLength && opts?.bodyByteLength != null) {
    contentLength = String(opts.bodyByteLength);
  }
  if (contentLength) {
    headers.set("content-length", contentLength);
  }

  if (request.method === "HEAD") {
    return new Response(opts?.body ?? null, {
      status: upstream.ok ? 200 : upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function sitemapIndexXmlResponse(request, xml) {
  const bytes = new TextEncoder().encode(xml);
  const headers = new Headers({
    "content-type": "application/xml; charset=utf-8",
    "x-content-type-options": "nosniff",
    "cache-control": "public, max-age=3600",
    "content-length": String(bytes.byteLength),
  });
  // Vercel Edge drops Content-Type on HEAD when body is null (GSC "Getirilemedi").
  return new Response(xml, { status: 200, headers });
}

/** HM özel alan adı: Railway henüz domain index döndürmese bile doğru dizin üretir. */
async function buildHmSitemapIndexAtEdge(request, incoming, host) {
  const origin = incoming.origin.replace(/\/+$/, "");
  const today = new Date().toISOString().split("T")[0];
  const apiOrigin = railwayApiOrigin(request.url);
  const locs = new Set();

  try {
    const listRes = await fetch(`${apiOrigin}/api/sitemap/list.json`, {
      headers: {
        accept: "application/json",
        "x-forwarded-host": host,
        "x-forwarded-proto": incoming.protocol.replace(":", ""),
      },
      redirect: "manual",
    });
    if (listRes.ok) {
      const list = await listRes.json().catch(() => null);
      for (const group of list?.groups ?? []) {
        for (const item of group?.items ?? []) {
          const url = String(item?.url ?? "").trim();
          if (!url || /\/sitemap\.xml$/i.test(url)) continue;
          try {
            const pathname = new URL(url).pathname.toLowerCase();
            if (!pathname.endsWith(".xml")) continue;
            if (new URL(url).origin.replace(/\/+$/, "") === origin) locs.add(url);
          } catch {
            /* ignore */
          }
        }
      }
    }
  } catch {
    /* fall through */
  }

  if (locs.size === 0) {
    try {
      const metaRes = await fetch(
        `${apiOrigin}/api/hm/meta/by-domain?domain=${encodeURIComponent(host)}`,
        { headers: { accept: "application/json" }, redirect: "manual" },
      );
      if (metaRes.ok) {
        const meta = await metaRes.json().catch(() => null);
        const slug = String(meta?.data?.slug ?? meta?.slug ?? "").trim();
        if (slug) locs.add(`${origin}/news-hm-${encodeURIComponent(slug)}.xml`);
      }
    } catch {
      /* ignore */
    }
  }

  const body = Array.from(locs)
    .map((loc) => `  <sitemap><loc>${loc.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</loc><lastmod>${today}</lastmod></sitemap>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
  return sitemapIndexXmlResponse(request, xml);
}

async function buildMinimalSitemapIndexFallback(request, incoming) {
  const origin = incoming.origin.replace(/\/+$/, "");
  const host = (incoming.hostname || "").toLowerCase();
  if (host && !isDefaultPortalHost(host)) {
    const hmBound = await isHmBoundDomainHost(railwayApiOrigin(request.url), host);
    if (hmBound) {
      return buildHmSitemapIndexAtEdge(request, incoming, host);
    }
  }
  const today = new Date().toISOString().split("T")[0];
  const portalXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${origin}/sitemap-static.xml</loc><lastmod>${today}</lastmod></sitemap>\n  <sitemap><loc>${origin}/news-yekpare.xml</loc><lastmod>${today}</lastmod></sitemap>\n</sitemapindex>`;
  return sitemapIndexXmlResponse(request, portalXml);
}

/** HM özel alan adında robots.txt — ziyaret edilen köke göre sitemap. */
function serveDynamicRobotsTxt(request, incoming, host) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (incoming.pathname !== "/robots.txt") return null;

  const origin = incoming.origin.replace(/\/+$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
    "Disallow: /admin/",
    "Disallow: /editor/",
    "",
  ].join("\n");
  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "public, max-age=3600",
  });
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

/** Railway kesintisinde alt sitemap'ler için boş ama geçerli urlset (GSC JSON/HTML yerine XML bekler). */
function buildEmptyUrlsetFallback(request) {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
  const bytes = new TextEncoder().encode(xml);
  const headers = new Headers({
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=300",
    "content-length": String(bytes.byteLength),
  });
  return new Response(request.method === "HEAD" ? null : xml, { status: 200, headers });
}

function sitemapFallbackForApiPath(request, incoming, apiPath) {
  if (apiPath === "/api/sitemap/index.xml") return buildMinimalSitemapIndexFallback(request, incoming);
  return buildEmptyUrlsetFallback(request);
}

function isSitemapApiProxyPath(pathname) {
  return /^\/api\/sitemap\/.+\.xml$/i.test(String(pathname || ""));
}

const seoVerificationMw = createMiddlewareSeoVerification({
  railwayApiOrigin,
  rootSitemapApiPath,
  isSitemapApiProxyPath,
});

function upstreamLooksLikeXml(upstream) {
  const ct = String(upstream.headers.get("content-type") ?? "").toLowerCase();
  return upstream.ok && (ct.includes("xml") || ct.includes("text/plain"));
}

const SITEMAP_LEAK_ORIGINS = [
  "https://goalgo-production.up.railway.app",
  "http://goalgo-production.up.railway.app",
  "https://goalgo-y7ze.onrender.com",
  "http://goalgo-y7ze.onrender.com",
];

function rewriteSitemapXmlOrigins(xml, publicOrigin) {
  const canonical = String(publicOrigin || "").replace(/\/+$/, "");
  if (!canonical) return xml;
  let out = String(xml ?? "");
  for (const bad of SITEMAP_LEAK_ORIGINS) {
    if (out.includes(bad)) out = out.split(bad).join(canonical);
  }
  return out;
}

/** SPA index.html yerine kök sitemap XML veya /api/sitemap/* vekili. */
async function proxySitemapXml(request, incoming, apiPath) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const host = (incoming.hostname || "").toLowerCase();
  if (apiPath === "/api/sitemap/index.xml" && host && !isDefaultPortalHost(host)) {
    const hmBound = await isHmBoundDomainHost(railwayApiOrigin(request.url), host);
    if (hmBound) {
      const hmIndex = await buildHmSitemapIndexAtEdge(request, incoming, host);
      if (hmIndex) return hmIndex;
    }
  }
  const base = railwayApiOrigin(request.url);
  if (!base || !/^https?:\/\//i.test(base)) {
    return sitemapFallbackForApiPath(request, incoming, apiPath);
  }
  const targetUrl = `${base.replace(/\/+$/, "")}${apiPath}${incoming.search}`;
  const fetchMethod = request.method === "HEAD" ? "GET" : request.method;
  try {
    const upstream = await fetch(targetUrl, {
      method: fetchMethod,
      headers: {
        accept: "application/xml, text/xml, */*",
        "x-forwarded-host": incoming.hostname,
        "x-forwarded-proto": incoming.protocol.replace(":", ""),
      },
      redirect: "manual",
    });
    if (!upstreamLooksLikeXml(upstream)) {
      return sitemapFallbackForApiPath(request, incoming, apiPath);
    }
    const publicOrigin = incoming.origin.replace(/\/+$/, "");
    if (apiPath === "/api/sitemap/index.xml" && host && !isDefaultPortalHost(host)) {
      const hmBound = await isHmBoundDomainHost(railwayApiOrigin(request.url), host);
      if (hmBound) {
        const text = rewriteSitemapXmlOrigins(await upstream.text(), publicOrigin);
        const origin = publicOrigin;
        if (
          text.includes("turknet.app/") ||
          text.includes("yekpare.net/") ||
          text.includes(`${origin}/sitemap.xml`)
        ) {
          return buildHmSitemapIndexAtEdge(request, incoming, host);
        }
        return sitemapIndexXmlResponse(request, text);
      }
    }
    const rawText = await upstream.text();
    const text = rewriteSitemapXmlOrigins(rawText, publicOrigin);
    if (request.method === "HEAD") {
      const buf = new TextEncoder().encode(text);
      return finalizeSitemapXmlResponse(request, upstream, {
        bodyByteLength: buf.byteLength,
        body: buf,
      });
    }
    return sitemapIndexXmlResponse(request, text);
  } catch {
    return sitemapFallbackForApiPath(request, incoming, apiPath);
  }
}

function isHmHostedSitemapPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return /^\/news-hm-[^/]+\.xml$/i.test(p) || /^\/news-hm\/[^/]+\/[^/]+\.xml$/i.test(p);
}

async function proxyRootSitemapXml(request, incoming) {
  const host = (incoming.hostname || "").toLowerCase();
  const p = String(incoming.pathname || "").replace(/\/+$/, "") || "/";

  const childApiPath = p !== "/sitemap.xml" ? rootSitemapApiPath(p) : null;
  if (childApiPath) {
    if (isDefaultPortalHost(host)) {
      return proxySitemapXml(request, incoming, childApiPath);
    }
    if (isHmHostedSitemapPath(p)) {
      const hmBound = await isHmBoundDomainHost(railwayApiOrigin(request.url), host);
      if (hmBound) return proxySitemapXml(request, incoming, childApiPath);
    }
    return proxySitemapXml(request, incoming, childApiPath);
  }

  if (p === "/sitemap.xml") {
    return proxySitemapXml(request, incoming, "/api/sitemap/index.xml");
  }

  if (isSitemapApiProxyPath(incoming.pathname)) {
    return proxySitemapXml(request, incoming, incoming.pathname);
  }

  return null;
}

/** `/kesfet/isletme/:uuid` → `/kesfet/:slug` kalıcı yönlendirme. */
const KESFET_ISLETME_SLUG_ALIASES = {
  "d0ede46e-2921-4960-b51b-bb25cabbeea6": "merve-pide-1992-2",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function kesfetIsletmeSlugRedirect(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const m = /^\/kesfet\/isletme\/([^/]+)\/?$/i.exec(incoming.pathname);
  if (!m) return null;
  const id = decodeURIComponent(m[1]).trim();
  const idLower = id.toLowerCase();

  const aliasSlug = KESFET_ISLETME_SLUG_ALIASES[idLower];
  if (aliasSlug) {
    const dest = `${incoming.origin}/kesfet/${encodeURIComponent(aliasSlug)}${incoming.search}`;
    return Response.redirect(dest, 308);
  }

  if (!UUID_RE.test(id)) return null;

  const apiOrigin = railwayApiOrigin(request.url);
  try {
    const res = await fetch(`${apiOrigin}/api/map/businesses/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const payload = await res.json().catch(() => null);
    const slug = String(payload?.data?.slug ?? "").trim();
    if (!slug) return null;
    const dest = `${incoming.origin}/kesfet/${encodeURIComponent(slug)}${incoming.search}`;
    return Response.redirect(dest, 308);
  } catch {
    return null;
  }
}

function isSocialPreviewBot(request) {
  const ua = String(request.headers.get("user-agent") ?? "").toLowerCase();
  return /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|bingbot|googlebot|duckduckbot|yandexbot|gptbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot|google-extended|applebot|cohere-ai|bytespider|meta-externalagent|amazonbot/.test(ua);
}

function parsePortalExtraHosts() {
  return String(process.env.PORTAL_EXTRA_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
}

function isDefaultPortalHost(host) {
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
    parsePortalExtraHosts().includes(h)
  );
}

function isLocalOrPreviewHost(host) {
  const h = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
  return !h || h === "localhost" || h === "127.0.0.1" || h.endsWith(".vercel.app");
}

function isYektubeSurfacePath(pathname) {
  if (isStaticAssetPath(pathname)) return false;
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/yp" || p.startsWith("/yp/")) return true;
  if (p === "/yektube" || p.startsWith("/yektube/")) return true;
  if (p === "/yektube-v2" || p.startsWith("/yektube-v2/")) return true;
  if (p === "/yekcek" || p.startsWith("/yekcek/")) return true;
  if (p === "/muzik" || p.startsWith("/muzik/")) return true;
  if (p === "/cocuk" || p.startsWith("/cocuk/")) return true;
  if (p === "/canli" || p.startsWith("/canli/")) return true;
  if (p === "/yek-gonder" || p.startsWith("/yek-gonder/")) return true;
  if (p === "/yeklive" || p.startsWith("/yeklive/")) return true;
  if (p === "/hesabim" || p.startsWith("/hesabim/")) return true;
  if (p === "/studio" || p.startsWith("/studio/")) return true;
  if (/^\/admin\/(?:kaynaklar|videolar|hazir-kanallar|moduller|araclar)(?:\/|$)/.test(p)) return true;
  return false;
}

function mapLegacyYektubeSurfacePath(pathname) {
  const raw = String(pathname || "/") || "/";
  const path = raw.replace(/\/+$/, "") || "/";
  if (path === "/yektube-v2") return "/yp/";
  if (path.startsWith("/yektube-v2/")) return path.replace(/^\/yektube-v2(?=\/|$)/, "/yp");
  if (path === "/yektube") return "/yp/";
  if (path.startsWith("/yektube/")) return path.replace(/^\/yektube(?=\/|$)/, "/yp");
  if (path === "/yeklive") return "/yek-gonder";
  if (path.startsWith("/yeklive/")) return path.replace(/^\/yeklive(?=\/|$)/, "/yek-gonder");
  if (path === "/yekcek") return "/yp/yekcek";
  if (path.startsWith("/yekcek/")) return path.replace(/^\/yekcek(?=\/|$)/, "/yp/yekcek");
  if (/^\/admin\/(?:kaynaklar|videolar|hazir-kanallar|moduller|araclar)(?:\/|$)/.test(path)) {
    return `/yp${path}`;
  }
  if (path === "/yp") return "/yp/";
  return path;
}

async function guardHmCustomDomainYektubeSurface(request, incoming, host) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isYektubeSurfacePath(incoming.pathname)) return null;
  if (isDefaultPortalHost(host) || isLocalOrPreviewHost(host)) return null;
  // HM editör Video TV yönetimi — aynı origin /yp/admin iframe
  if (incoming.pathname === "/yp/admin" || incoming.pathname.startsWith("/yp/admin/")) {
    return null;
  }
  const hmBound = await isHmBoundDomainHost(railwayApiOrigin(request.url), host);
  if (!hmBound) return null;
  return Response.redirect(`${incoming.origin}/`, 302);
}

function redirectLegacyYektubeSurfaceToLocal(request, incoming, host) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isDefaultPortalHost(host) || isLocalOrPreviewHost(host)) return null;
  const nextPath = mapLegacyYektubeSurfacePath(incoming.pathname);
  if (nextPath === incoming.pathname || (incoming.pathname === "/yp" && nextPath === "/yp/")) return null;
  const dest = new URL(nextPath, incoming.origin);
  dest.search = incoming.search;
  return Response.redirect(dest.toString(), 308);
}

/** HM editöründe domain* ile kayıtlı haber merkezi alanı mı? */
async function isHmBoundDomainHost(apiOrigin, host) {
  const slug = await fetchHmSlugForHost(apiOrigin, host);
  return Boolean(slug);
}

/** HM özel alan adı → site slug (by-domain). */
async function fetchHmSlugForHost(apiOrigin, host) {
  const h = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
  if (!h || isDefaultPortalHost(h)) return null;
  try {
    const res = await fetch(
      `${String(apiOrigin || "").replace(/\/+$/, "")}/api/hm/meta/by-domain?domain=${encodeURIComponent(h)}`,
      { headers: { accept: "application/json" }, redirect: "manual", signal: shortAbortSignal(4000) },
    );
    if (!res.ok) return null;
    const meta = await res.json().catch(() => null);
    const slug = String(meta?.slug ?? meta?.data?.slug ?? "").trim();
    return slug || null;
  } catch {
    return null;
  }
}

/** HM özel alan — eski WordPress etiket/tarih yollarını son dakikaya yönlendir. */
async function redirectHmLegacyContentPaths(request, incoming, host) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (isDefaultPortalHost(host) || isLocalOrPreviewHost(host)) return null;
  const hmBound = await isHmBoundDomainHost(railwayApiOrigin(request.url), host);
  if (!hmBound) return null;
  const p = incoming.pathname.replace(/\/+$/, "") || "/";
  if (/^\/(?:etiket|tag|etiketler)(?:\/|$)/i.test(p)) {
    const dest = new URL("/sondakika", incoming.origin);
    dest.search = incoming.search;
    return Response.redirect(dest.toString(), 301);
  }
  if (/^\/\d{4}\/\d{2}(?:\/|$)/.test(p)) {
    return Response.redirect(new URL("/sondakika", incoming.origin).toString(), 301);
  }
  if (/^\/feed(?:\/|$)/i.test(p)) {
    return Response.redirect(new URL("/sondakika", incoming.origin).toString(), 301);
  }
  return null;
}

/** HM özel alan — siteye özel ai.txt / llms.txt (Yekpare Haber Merkezi atıfı). */
async function proxyHmAiKnowledgeText(request, incoming, host) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const p = incoming.pathname.replace(/\/+$/, "") || "/";
  if (p !== "/llms.txt" && p !== "/ai.txt") return null;
  if (isDefaultPortalHost(host)) return null;
  const hmBound = await isHmBoundDomainHost(railwayApiOrigin(request.url), host);
  if (!hmBound) return null;
  const apiOrigin = railwayApiOrigin(request.url);
  const apiPath = p === "/llms.txt" ? "/api/hm/llms.txt" : "/api/hm/ai.txt";
  try {
    const upstream = await fetch(`${apiOrigin}${apiPath}`, {
      headers: {
        accept: "text/plain",
        host: incoming.host,
        "x-forwarded-host": incoming.host,
      },
    });
    if (!upstream.ok) return null;
    const headers = new Headers(upstream.headers);
    headers.set("cache-control", "public, max-age=3600");
    if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return null;
  }
}

/** HM özel alan adında kök `/` → `/tr/{slug}` (SPA yüklenmeden, portal anasayfası flash'ını önler). */
async function redirectHmCustomDomainRoot(request, incoming, host) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const pathOnly = incoming.pathname.replace(/\/+$/, "") || "/";
  if (pathOnly !== "/") return null;
  if (isDefaultPortalHost(host) || isLocalOrPreviewHost(host)) return null;
  const slug = await fetchHmSlugForHost(railwayApiOrigin(request.url), host);
  if (!slug) return null;
  const dest = new URL(`/tr/${encodeURIComponent(slug)}`, incoming.origin);
  dest.search = incoming.search;
  return Response.redirect(dest.toString(), 308);
}

/** Silinen haber slug — yalnızca arama motoru botları için HTTP 301 (SPA yüklenmeden). */
async function redirectDeletedNewsArticleForBots(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const ua = String(request.headers.get("user-agent") ?? "");
  if (!/googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider/i.test(ua)) return null;

  const p = incoming.pathname.replace(/\/+$/, "") || "/";
  let slug = null;
  let siteSlug = null;
  const hmMatch = /^\/tr\/([^/]+)\/haber\/([^/]+)$/.exec(p);
  if (hmMatch) {
    siteSlug = decodeURIComponent(hmMatch[1] ?? "");
    slug = decodeURIComponent(hmMatch[2] ?? "");
  } else if (/^\/haber\/[^/]+$/.test(p)) {
    slug = decodeURIComponent(p.slice("/haber/".length));
  } else {
    return null;
  }
  if (!slug) return null;

  const apiOrigin = railwayApiOrigin(request.url);
  const q = new URLSearchParams();
  if (siteSlug) q.set("siteSlug", siteSlug);
  try {
    const res = await fetch(
      `${String(apiOrigin).replace(/\/+$/, "")}/api/news/deleted-redirect/${encodeURIComponent(slug)}?${q}`,
      { redirect: "manual", signal: shortAbortSignal(4000) },
    );
    if (res.status !== 301 && res.status !== 302) return null;
    const loc = res.headers.get("location");
    if (!loc) return null;
    const dest = /^https?:\/\//i.test(loc) ? loc : new URL(loc, incoming.origin).toString();
    return Response.redirect(dest, 301);
  } catch {
    return null;
  }
}

function isStaticAssetPath(pathname) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_next/") ||
    /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$/i.test(pathname)
  );
}

function isPortalOgSharePath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/kesfet" || p === "/haberler" || p === "/siparis" || p === "/alisveris" || p === "/turizm" || p === "/bilgiagaci" || p === "/ansiklopedi" || p === "/magaza") return true;
  if (p.startsWith("/bilgi/")) return true;
  if (p.startsWith("/bilgiagaci/") || p.startsWith("/ansiklopedi/")) return true;
  if (/^\/haberler\/rss\/[^/]+$/.test(p)) return true;
  if (/^\/(siparis\/satici|alisveris\/magaza|magaza\/magaza)\/[^/]+\/blog(?:\/[^/]+)?$/.test(p)) return true;
  if (/^\/(?:yp|yektube-v2)?\/kanal\/[^/]+\/[^/]+$/.test(p)) return true;
  if (/^\/kanal\/[^/]+\/[^/]+$/.test(p)) return true;
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

async function hmPublicOgHtml(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (seoVerificationMw.isVerificationBot(request.headers.get("user-agent"))) return null;
  if (!isSocialPreviewBot(request)) return null;
  if (isStaticAssetPath(incoming.pathname)) return null;

  const host = (incoming.hostname || "").toLowerCase();
  const isHmSlugPath = /^\/tr\/[^/]+(?:\/.*)?\/?$/.test(incoming.pathname);
  const apiOrigin = railwayApiOrigin(request.url);
  const hmBound = !isDefaultPortalHost(host) ? await isHmBoundDomainHost(apiOrigin, host) : false;
  const isCustomHmDomainPath = hmBound;
  const isPortalSharePath = (isDefaultPortalHost(host) || !hmBound) && isPortalOgSharePath(incoming.pathname);
  if (!isHmSlugPath && !isCustomHmDomainPath && !isPortalSharePath) return null;

  const cleanPath = incoming.pathname.replace(/\/+$/, "") || "/";
  const target = new URL("/api/public/og-html", apiOrigin);
  target.searchParams.set("path", cleanPath);
  target.searchParams.set("origin", incoming.origin);

  try {
    const upstream = await fetch(target.toString(), {
      headers: { accept: "text/html", "user-agent": request.headers.get("user-agent") ?? "" },
    });
    if (!upstream.ok) return null;
    const headers = new Headers(upstream.headers);
    headers.delete("content-encoding");
    headers.set("cache-control", "public, max-age=300, s-maxage=300");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch {
    return null;
  }
}

async function yektubeWatchOgHtml(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (seoVerificationMw.isVerificationBot(request.headers.get("user-agent"))) return null;
  if (!isSocialPreviewBot(request)) return null;
  if (isStaticAssetPath(incoming.pathname)) return null;
  const cleanPath = incoming.pathname.replace(/\/+$/, "") || "/";
  if (!/^\/(?:yp|yektube-v2)?\/kanal\/[^/]+\/[^/]+$/.test(cleanPath) && !/^\/kanal\/[^/]+\/[^/]+$/.test(cleanPath)) {
    return null;
  }

  const apiOrigin = railwayApiOrigin(request.url);
  const target = new URL("/api/video/og/watch-by-path", apiOrigin);
  target.searchParams.set("path", cleanPath);
  target.searchParams.set("origin", incoming.origin);

  try {
    const upstream = await fetch(target.toString(), {
      headers: { accept: "text/html", "user-agent": request.headers.get("user-agent") ?? "" },
      signal: shortAbortSignal(8000) ?? undefined,
    });
    if (!upstream.ok) return null;
    const headers = new Headers(upstream.headers);
    headers.delete("content-encoding");
    headers.set("cache-control", "public, max-age=600, s-maxage=600");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch {
    return null;
  }
}

/** @param {Request} request */
async function checkWorkspaceGate(request) {
  const apiOrigin = railwayApiOrigin(request.url);
  const gateUrl = `${apiOrigin}/api/call-center/workspace-gate`;
  try {
    const res = await fetch(gateUrl, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      redirect: "manual",
    });
    if (res.status === 401 || res.status === 403) return false;
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

/** @param {string} upstreamBase @param {string} upstreamPath @param {Request} request */
async function proxyToAgentLabs(upstreamBase, upstreamPath, request) {
  const base = upstreamBase.replace(/\/+$/, "");
  const path = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
  const target = new URL(path, `${base}/`);
  target.search = new URL(request.url).search;

  const headers = new Headers();
  const skip = new Set(["host", "connection", "content-length", "transfer-encoding"]);
  request.headers.forEach((value, key) => {
    if (!skip.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("x-forwarded-host", new URL(request.url).host);
  headers.set("x-forwarded-proto", new URL(request.url).protocol.replace(":", ""));

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target.toString(), init);
  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete("content-encoding");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

function isExternalMenuImportPath(pathname) {
  if (pathname === "/api/providers/import/external-menu/preview") return true;
  if (pathname === "/api/providers/import/external-menu") return true;
  if (pathname === "/api/delivery/admin/import-external-menu/preview") return true;
  if (/^\/api\/delivery\/admin\/vendors\/\d+\/import-external-menu$/.test(pathname)) return true;
  return false;
}

function isAllowedImportSourceUrl(url) {
  return /^https:\/\/(www\.)?(yemeksepeti\.com|getir\.com|getiryemek\.com|yemek\.getir\.com|migros\.com\.tr|trendyol\.com|tgoyemek\.com)\//i.test(
    String(url ?? "").trim(),
  );
}

function refererForImportUrl(url) {
  const u = String(url ?? "");
  if (u.includes("getir.com")) return "https://getir.com/yemek/";
  if (u.includes("yemeksepeti")) return "https://www.yemeksepeti.com/";
  return u;
}

/** @param {string} sourceUrl */
async function fetchExternalPlatformHtml(sourceUrl) {
  const trimmed = String(sourceUrl ?? "").trim();
  const variants = [...new Set([trimmed, trimmed.replace(/\/+$/, ""), `${trimmed.replace(/\/+$/, "")}/`])];
  const referer = refererForImportUrl(trimmed);
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  ];
  let lastStatus = 0;
  for (const variant of variants) {
    for (const ua of userAgents) {
      try {
        const upstream = await fetch(variant, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": ua,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9",
            Referer: referer,
          },
        });
        const html = await upstream.text();
        lastStatus = upstream.status;
        if (html.length > 400) return { status: upstream.status, html };
      } catch {
        /* next variant */
      }
    }
  }
  return { status: lastStatus, html: "" };
}

function parseJsonFromBraceJs(html, braceStart) {
  if (braceStart < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(braceStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractPreloadedStateJs(html) {
  const idx = html.indexOf("window.__PRELOADED_STATE__=");
  if (idx < 0) return null;
  return parseJsonFromBraceJs(html, html.indexOf("{", idx));
}

/** @param {string} html @param {string} sourceUrl */
async function fetchYemeksepetiMenuForHtml(html, sourceUrl) {
  const state = extractPreloadedStateJs(html);
  const vd = state?.vendor?.data ?? {};
  const vi = state?.vendorInfo ?? {};
  const code = String(vd.code ?? "").trim();
  if (!code) return null;
  const lat = Number(vd.latitude ?? vi.latitude ?? 38.4192);
  const lng = Number(vd.longitude ?? vi.longitude ?? 27.1287);
  const q = `language_id=2&opening_type=delivery&latitude=${lat}&longitude=${lng}`;
  const enc = encodeURIComponent(code);
  const referer = sourceUrl.includes("yemeksepeti") ? sourceUrl : "https://www.yemeksepeti.com/";
  const urls = [
    `https://tr.fd-api.com/api/v5/vendors/${enc}/menus?${q}`,
    `https://www.yemeksepeti.com/api/v5/vendors/${enc}/menus?${q}`,
  ];
  for (const url of urls) {
    try {
      const upstream = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "tr-TR,tr;q=0.9",
          Referer: referer,
          Origin: "https://www.yemeksepeti.com",
          "x-country-code": "tr",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": url.includes("fd-api.com") ? "cross-site" : "same-origin",
        },
      });
      if (!upstream.ok) continue;
      const json = await upstream.json();
      if (json?.data?.menu_categories || json?.menu_categories || json?.data?.menuCategories) return json;
    } catch {
      /* next url */
    }
  }
  return null;
}

function isAllowedEdgeFetchUrl(url) {
  if (
    /^https:\/\/(www\.)?(yemeksepeti\.com|getir\.com|getiryemek\.com|yemek\.getir\.com|migros\.com\.tr|trendyol\.com|tgoyemek\.com)\//i.test(
      url,
    )
  ) {
    return true;
  }
  if (/^https:\/\/tr\.fd-api\.com\/api\/v5\/vendors\/[^/]+\/menus/i.test(url)) return true;
  return false;
}

/** Menü içe aktarma POST gövdesine Vercel edge HTML ön çekimi ekler. */
async function augmentMenuImportRequestBody(request, pathname) {
  if (request.method !== "POST" || !isExternalMenuImportPath(pathname)) return null;
  let body;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return body;
  const sourceUrl = String(body.sourceUrl ?? body.source_url ?? "").trim();
  if (!sourceUrl || !isAllowedImportSourceUrl(sourceUrl)) return body;

  const existing = String(body.prefetchedHtml ?? "").trim();
  if (existing.length > 400) {
    if (sourceUrl.includes("yemeksepeti") && !body.prefetchedMenuJson) {
      const menuJson = await fetchYemeksepetiMenuForHtml(existing, sourceUrl);
      if (menuJson) {
        return { ...body, prefetchedMenuJson: menuJson, prefetchMenuVia: "vercel-edge" };
      }
    }
    return body;
  }

  const fetched = await fetchExternalPlatformHtml(sourceUrl);
  if (fetched.html.length > 400) {
    const augmented = {
      ...body,
      prefetchedHtml: fetched.html,
      prefetchStatus: fetched.status,
      prefetchVia: "vercel-edge",
    };
    if (sourceUrl.includes("yemeksepeti") && !body.prefetchedMenuJson) {
      const menuJson = await fetchYemeksepetiMenuForHtml(fetched.html, sourceUrl);
      if (menuJson) {
        augmented.prefetchedMenuJson = menuJson;
        augmented.prefetchMenuVia = "vercel-edge";
      }
    }
    return augmented;
  }
  return body;
}

/** @param {Request} request */
export default async function middleware(request) {
  const incoming = new URL(request.url);
  const host = (incoming.hostname || "").toLowerCase();
  const pathname = incoming.pathname;

  if (shouldBypassMiddleware(pathname, request)) return;

  /** Vercel Edge middleware ~25s limit — uzun akış vekaletini vercel.json → Railway rewrite'a bırak */
  if (
    pathname.startsWith("/api/video/youtube-stream") ||
    pathname.startsWith("/api/video/youtube-engagement") ||
    pathname.startsWith("/api/video/youtube-comments") ||
    pathname === "/api/video/shorts" ||
    pathname === "/api/map/scrape" ||
    pathname === "/api/map/scrape-gmaps" ||
    pathname.startsWith("/api/map/admin/scrape-places-job/") ||
    pathname.startsWith("/api/map/admin/scrape-gmaps-job/")
  ) {
    return;
  }

  const hmYektubeGuard = await guardHmCustomDomainYektubeSurface(request, incoming, host);
  if (hmYektubeGuard) return hmYektubeGuard;

  const yektubeLocalRedirect = redirectLegacyYektubeSurfaceToLocal(request, incoming, host);
  if (yektubeLocalRedirect) return yektubeLocalRedirect;

  const hmRootRedirect = await redirectHmCustomDomainRoot(request, incoming, host);
  if (hmRootRedirect) return hmRootRedirect;

  const hmLegacyRedirect = await redirectHmLegacyContentPaths(request, incoming, host);
  if (hmLegacyRedirect) return hmLegacyRedirect;

  const deletedNewsRedirect = await redirectDeletedNewsArticleForBots(request, incoming);
  if (deletedNewsRedirect) return deletedNewsRedirect;

  const hmAiKnowledge = await proxyHmAiKnowledgeText(request, incoming, host);
  if (hmAiKnowledge) return hmAiKnowledge;

  const kesfetRedir = await kesfetIsletmeSlugRedirect(request, incoming);
  if (kesfetRedir) return kesfetRedir;

  const dynamicRobots = serveDynamicRobotsTxt(request, incoming, host);
  if (dynamicRobots) return dynamicRobots;

  const rootSitemap = await proxyRootSitemapXml(request, incoming);
  if (rootSitemap) return rootSitemap;

  const googleVerifyFile = seoVerificationMw.serveGoogleVerificationHtmlFile(pathname);
  if (googleVerifyFile) return googleVerifyFile;

  const skipSeoUpstream = isNavigationPrefetch(request);

  const verifiedIndex = skipSeoUpstream
    ? null
    : await seoVerificationMw.injectVerificationIntoSpaIndex(request, incoming);
  if (verifiedIndex) return verifiedIndex;

  const verificationBotHtml = skipSeoUpstream
    ? null
    : await seoVerificationMw.serveVerificationBotHtml(request, incoming, host, pathname);
  if (verificationBotHtml) return verificationBotHtml;

  const ogHtml = skipSeoUpstream ? null : await hmPublicOgHtml(request, incoming);
  if (ogHtml) return ogHtml;

  const yektubeOg = skipSeoUpstream ? null : await yektubeWatchOgHtml(request, incoming);
  if (yektubeOg) return yektubeOg;

  const isCallCenterApp =
    pathname === "/call-center-app" || pathname.startsWith("/call-center-app/");
  const isCallCenterApi = pathname.startsWith("/call-center-api/") || pathname === "/call-center-api";

  if (isCallCenterApp || isCallCenterApi) {
    const allowed = await checkWorkspaceGate(request);
    if (!allowed) {
      const dest = new URL("/admin/yekpare-ai-call", incoming.origin);
      dest.searchParams.set("gate", "subscription");
      return Response.redirect(dest.toString(), 302);
    }

    const upstreamBase = String(process.env.AGENTLABS_URL ?? "").trim().replace(/\/+$/, "");
    if (!upstreamBase) {
      return new Response("AGENTLABS_URL tanımlı değil (Vercel Production).", { status: 503 });
    }

    if (isCallCenterApi) {
      const apiSuffix = pathname.replace(/^\/call-center-api/, "") || "/";
      return proxyToAgentLabs(upstreamBase, `/api${apiSuffix}`, request);
    }

    const appSuffix = pathname.replace(/^\/call-center-app/, "") || "/";
    return proxyToAgentLabs(upstreamBase, appSuffix, request);
  }

  const hostsRaw = process.env.HM_NEWS_CENTER_BRAND_HOSTS;
  const brandHosts =
    hostsRaw !== undefined && hostsRaw !== null
      ? String(hostsRaw)
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : ["suhaberajansi.com", "www.suhaberajansi.com"];

  const homePathRaw = String(process.env.HM_NEWS_CENTER_BRAND_HOME_PATH ?? "/tr/su").trim();
  const homePath = homePathRaw.startsWith("/") ? homePathRaw : `/${homePathRaw}`;
  const forceCanonicalRoot = String(process.env.HM_NEWS_CENTER_ROOT_REDIRECT_URL ?? "").trim();

  if (brandHosts.length > 0 && brandHosts.includes(host) && !pathname.startsWith("/api")) {
    const pathOnly = pathname.replace(/\/+$/, "") || "/";
    if (pathOnly === "/" && !/^\/(assets\/|_next\/)/i.test(pathname)) {
      const dest =
        forceCanonicalRoot && /^https?:\/\//i.test(forceCanonicalRoot)
          ? `${forceCanonicalRoot.replace(/\/+$/, "")}${incoming.search}`
          : `${incoming.origin}${homePath}${incoming.search}`;
      return Response.redirect(dest, 308);
    }
  }

  if (!pathname.startsWith("/api")) {
    return;
  }

  /** Kariyer uçları — Railway eski deploy 404 yedeği; Vercel serverless (goalgo/api/career/*). */
  if (
    pathname === "/api/career/apply" ||
    pathname === "/api/career/admin/applications" ||
    /^\/api\/career\/admin\/applications\/\d+\/read$/.test(pathname)
  ) {
    return;
  }

  if (isSitemapApiProxyPath(pathname)) {
    return proxySitemapXml(request, incoming, pathname);
  }

  /** Railway IP engellendiğinde (405) menü içe aktarma: Vercel edge üzerinden HTML çek. */
  if (pathname === "/api/internal/edge-fetch" && request.method === "POST") {
    const secret = String(process.env.EDGE_FETCH_SECRET ?? "").trim();
    const hdr = String(request.headers.get("x-edge-fetch-secret") ?? "").trim();
    if (!secret || hdr !== secret) {
      return new Response(JSON.stringify({ error: "Yetkisiz" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Geçersiz JSON" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    const url = String(body?.url ?? "").trim();
    const refererOverride = String(body?.referer ?? "").trim();
    const wantJson = Boolean(body?.json) || /fd-api\.com|\/api\/v5\//i.test(url);
    if (!isAllowedEdgeFetchUrl(url)) {
      return new Response(JSON.stringify({ error: "Geçersiz veya desteklenmeyen URL" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    const referer = refererOverride
      || (url.includes("getir.com")
        ? "https://getir.com/yemek/"
        : url.includes("yemeksepeti") || url.includes("fd-api.com")
          ? "https://www.yemeksepeti.com/"
          : url);
    try {
      const upstream = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: wantJson
            ? "application/json, text/plain, */*"
            : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "tr-TR,tr;q=0.9",
          Referer: referer,
          ...(wantJson && url.includes("fd-api.com")
            ? {
                Origin: "https://www.yemeksepeti.com",
                "x-country-code": "tr",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site",
              }
            : {}),
        },
      });
      const html = await upstream.text();
      return new Response(JSON.stringify({ status: upstream.status, html, body: html }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: "Fetch başarısız", detail }), {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  const raw = String(process.env.RAILWAY_API_ORIGIN ?? "").trim();
  const base = raw.replace(/\/+$/, "");
  if (!base || !/^https?:\/\//i.test(base)) {
    if (isSitemapApiProxyPath(pathname)) {
      return sitemapFallbackForApiPath(request, incoming, pathname);
    }
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "Vercel ortamında RAILWAY_API_ORIGIN tanımlı değil. Production env'e Railway public URL (https://…up.railway.app, path olmadan) ekleyin ve yeniden deploy edin.",
      }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  const targetUrl = `${base}${pathname}${incoming.search}`;

  const headers = new Headers(request.headers);
  for (const key of ["host", "connection", "content-length", "transfer-encoding"]) {
    headers.delete(key);
  }
  headers.set("x-forwarded-host", incoming.hostname);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

  /** @type {RequestInit} */
  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if ((request.method === "GET" || request.method === "HEAD") && isOptionalPublicGetPath(pathname)) {
    const p = String(pathname || "").split("?")[0];
    const timeoutMs = p.startsWith("/api/video/youtube-stream")
      ? 90000
      : p.startsWith("/api/video/youtube-engagement")
        ? 35000
        : p === "/api/video/live"
          ? 20000
          : p.startsWith("/api/video/videos") || p.startsWith("/api/video/shorts")
            ? 45000
            : 6500;
    const signal = shortAbortSignal(timeoutMs);
    if (signal) init.signal = signal;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (isExternalMenuImportPath(pathname)) {
      const augmented = await augmentMenuImportRequestBody(request, pathname);
      init.body = JSON.stringify(augmented ?? {});
      headers.set("content-type", "application/json; charset=utf-8");
    } else {
      init.body = await request.arrayBuffer();
    }
  }

  try {
    const upstream = await fetch(targetUrl, init);
    if (isSitemapApiProxyPath(pathname)) {
      if (!upstreamLooksLikeXml(upstream)) {
        return sitemapFallbackForApiPath(request, incoming, pathname);
      }
      return finalizeSitemapXmlResponse(request, upstream);
    }
    if (shouldUsePublicGetFallback(upstream, pathname, request.method)) {
      const fallbackBody = await resolvePublicGetFallbackBody(pathname, request.method, incoming.search);
      if (fallbackBody) return buildDegradedApiResponse(request, pathname, fallbackBody);
    }
    const outHeaders = new Headers(upstream.headers);
    outHeaders.delete("content-encoding");
    // Vercel Edge bazen Set-Cookie birleştirmesinde sorun çıkarır; panel oturumu için açıkça ilet.
    const fallbackSetCookie = upstream.headers.get("set-cookie");
    const setCookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : fallbackSetCookie
          ? [fallbackSetCookie]
          : [];
    if (setCookies.length > 0) {
      outHeaders.delete("set-cookie");
      for (const c of setCookies) outHeaders.append("set-cookie", c);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    if (isSitemapApiProxyPath(pathname)) {
      return sitemapFallbackForApiPath(request, incoming, pathname);
    }
    const fallbackBody = await resolvePublicGetFallbackBody(pathname, request.method, incoming.search);
    if (fallbackBody) return buildDegradedApiResponse(request, pathname, fallbackBody);
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "API vekiline bağlanılamadı",
        detail,
      }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}
