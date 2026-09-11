/**
 * Haber detay page-bundle 5xx olunca /api/news/:slug ile 200 paket üret.
 */

export function wrapArticleAsPageBundle(article) {
  return {
    article: article || null,
    related: [],
    kose: null,
    sidebar: { authors: [], popular: [] },
  };
}

export function isNewsPageBundlePath(pathname) {
  return /^\/api\/news\/page-bundle\/[^/]+$/.test(String(pathname || "").split("?")[0] || "");
}

export function newsPageBundleSlug(pathname) {
  const m = /^\/api\/news\/page-bundle\/([^/]+)\/?$/.exec(String(pathname || "").split("?")[0] || "");
  return m ? decodeURIComponent(m[1]) : "";
}
