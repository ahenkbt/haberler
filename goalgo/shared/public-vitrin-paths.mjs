/**
 * Kamuya açık vitrin GET uçları — rate-limit muafiyeti (httpSecurity) ve
 * Vercel edge degrade fallback (middleware-api-degrade) ile senkron tutulmalı.
 * API kökü `/api` önekli (edge vekili); Railway'de önek yok.
 */

/** Railway / Express — rateLimitRelativePath çıktısı (başında /api yok). */
export const PUBLIC_VITRIN_GET_PREFIXES = [
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
];

/** Yönetim / yazma yüzeyi — vitrin muafiyetine dahil edilmez. */
export const ADMIN_PATH_PREFIXES = [
  "/tourism/admin",
  "/hm/editor",
  "/hm/admin",
  "/hm/author",
  "/delivery/admin",
  "/map/admin",
  "/providers/admin",
];

/** Pahalı /video alt yolları — vitrin muafiyeti dışında (httpSecurity ile senkron). */
export const EXPENSIVE_VIDEO_SUBPATHS = ["/video/search", "/video/youtube-stream"];

/**
 * @param {string} path — `/api` öneksiz (Railway) veya önekli (edge); normalize edilir.
 * @param {Record<string, unknown> | undefined} query
 */
export function isPublicVitrinGetPath(path, query) {
  let p = String(path || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (p.startsWith("/api/")) p = p.slice(4);
  if (!p.startsWith("/")) p = `/${p}`;

  if (ADMIN_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))) return false;

  if (EXPENSIVE_VIDEO_SUBPATHS.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) {
    return false;
  }

  if (p === "/map/businesses") {
    const backfill = String(query?.backfill ?? "").toLowerCase();
    if (["1", "true", "yes"].includes(backfill)) return false;
  }

  return PUBLIC_VITRIN_GET_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix));
}

/** Edge vekili — `/api/...` tam yol. */
export const OPTIONAL_PUBLIC_GET = PUBLIC_VITRIN_GET_PREFIXES.map(
  (prefix) => new RegExp(`^/api${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
);

/** @param {string} pathname — `/api/...` */
export function isOptionalPublicGetPath(pathname) {
  const p = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return OPTIONAL_PUBLIC_GET.some((re) => re.test(p));
}

/** @param {string} pathname @param {string} method */
export function optionalPublicGetFallbackBody(pathname, method) {
  if (method !== "GET" && method !== "HEAD") return null;
  if (!isOptionalPublicGetPath(pathname)) return null;
  const p = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";

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
  if (p.startsWith("/api/video")) {
    return JSON.stringify([]);
  }
  return "[]";
}
