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

export function newsArticleSlugFromApiPath(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  const fromBundle = newsPageBundleSlug(p);
  if (fromBundle) return fromBundle;
  const m = /^\/api\/news\/([^/]+)$/.exec(p);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1] || "");
  } catch {
    return m[1] || "";
  }
}

export function newsItemsFromPayload(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json.news)) return json.news;
  if (Array.isArray(json.featured)) return json.featured;
  return [];
}

export function findNewsItemBySlug(payload, slug) {
  const want = String(slug || "")
    .trim()
    .toLowerCase();
  if (!want) return null;
  for (const item of newsItemsFromPayload(payload)) {
    if (!item || typeof item !== "object") continue;
    if (!String(item.title || "").trim()) continue;
    const s = String(item.slug || "")
      .trim()
      .toLowerCase();
    if (s === want) return item;
    const href = String(item.href || "")
      .trim()
      .toLowerCase();
    if (!href) continue;
    if (href === `/haber/${want}` || href.endsWith(`/haber/${want}`)) return item;
  }
  return null;
}

export function headlineToArticle(item, slug) {
  if (!item || !String(item.title || "").trim()) return null;
  const spot = String(item.spot || item.summary || item.description || "").trim();
  const content = String(item.content || spot || "").trim();
  return {
    ...item,
    slug: String(item.slug || slug || "").trim(),
    spot: spot || null,
    content: content || spot || String(item.title),
  };
}

export function jsonArticleResponse(body, recoverTag) {
  return {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=90, stale-while-revalidate=300",
      "x-yekpare-page-bundle-recover": recoverTag,
    },
    body: JSON.stringify(body),
  };
}
