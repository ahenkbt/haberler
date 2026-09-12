/**
 * Haber detay page-bundle 5xx olunca /api/news/:slug ile 200 paket üret.
 * HTML first-paint: kenar cache miss olsa da origin'den kısa bütçeyle çek.
 */
import { matchHmEdgeCache, putHmEdgeCache } from "./hm-edge-cache.js";

/** Article HTML boot — cache miss'te origin'e bu kadar izin ver (boş koyu ekran yerine gövde). */
export const HM_ARTICLE_PAINT_BUDGET_MS = 1_500;

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
  // Manset/list headlines rarely carry full body — never invent content from spot
  // (UI would show özet as gövde after edge recover + cache).
  const rawContent = String(item.content || "").trim();
  const content = rawContent && rawContent !== spot ? rawContent : "";
  return {
    ...item,
    slug: String(item.slug || slug || "").trim(),
    spot: spot || null,
    content,
  };
}

export function jsonArticleResponse(body, recoverTag) {
  return {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "x-yekpare-page-bundle-recover": recoverTag,
    },
    body: JSON.stringify(body),
  };
}

/** /api/news/:slug veya page-bundle JSON → HaberDetay / first-paint paketi. */
export function articleBundleFromJson(json) {
  if (!json || typeof json !== "object") return null;
  if (json.article && String(json.article.title || "").trim()) {
    return {
      article: json.article,
      related: Array.isArray(json.related) ? json.related : [],
      kose: json.kose ?? null,
      sidebar:
        json.sidebar && typeof json.sidebar === "object"
          ? json.sidebar
          : { authors: [], popular: [] },
    };
  }
  if (String(json.title || "").trim()) return wrapArticleAsPageBundle(json);
  return null;
}

function articleCacheCandidateUrls(origin, slug, siteId) {
  const enc = encodeURIComponent(slug);
  const urls = [];
  if (Number.isFinite(siteId) && siteId > 0) {
    urls.push(`${origin}/api/news/page-bundle/${enc}?siteId=${siteId}`);
    urls.push(`${origin}/api/news/${enc}?siteId=${siteId}`);
  }
  // SHA / merkez havuz satırları siteId NULL — portalsız URL önce cache'de olabilir.
  urls.push(`${origin}/api/news/page-bundle/${enc}`);
  urls.push(`${origin}/api/news/${enc}`);
  return urls;
}

export async function readHmArticleBundleFromEdgeCache(edgeCache, origin, slug, siteId) {
  if (!edgeCache || !origin || !slug) return null;
  for (const url of articleCacheCandidateUrls(origin, slug, siteId)) {
    const hit = await matchHmEdgeCache(edgeCache, url);
    if (!hit?.ok) continue;
    const json = await hit.clone().json().catch(() => null);
    const bundle = articleBundleFromJson(json);
    if (bundle) return bundle;
  }
  return null;
}

export async function fetchHmArticleBundleFromOrigin(opts) {
  const { fetchApi, env, origin, slug, siteId, incoming } = opts || {};
  if (typeof fetchApi !== "function" || !origin || !slug) return null;
  const host = String(incoming?.host || incoming?.hostname || "").toLowerCase();
  const headers = {
    accept: "application/json",
    "x-forwarded-host": host,
    "x-forwarded-proto": "https",
  };
  const enc = encodeURIComponent(slug);
  // Merkez havuz (siteId NULL) ASG/AHG vitrininde sık — portalsız dene, sonra siteId.
  const urls = [`${origin}/api/news/${enc}`];
  if (Number.isFinite(siteId) && siteId > 0) {
    urls.push(`${origin}/api/news/${enc}?siteId=${siteId}`);
    urls.push(`${origin}/api/news/page-bundle/${enc}?siteId=${siteId}`);
  }
  urls.push(`${origin}/api/news/page-bundle/${enc}`);

  for (const url of urls) {
    try {
      const res = await fetchApi(env, url, { headers, method: "GET" });
      if (!res?.ok) continue;
      const json = await res.json().catch(() => null);
      const bundle = articleBundleFromJson(json);
      if (bundle) return bundle;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

/** Kenar cache, yoksa origin — article HTML first-paint için. */
export async function resolveHmArticleBundleForPaint(opts) {
  const { edgeCache, publicOrigin, origin, slug, siteId, fetchApi, env, incoming, waitUntil } =
    opts || {};
  const cached = await readHmArticleBundleFromEdgeCache(edgeCache, publicOrigin || origin, slug, siteId);
  if (cached) return { bundle: cached, fromCache: true };
  const fresh = await fetchHmArticleBundleFromOrigin({
    fetchApi,
    env,
    origin,
    slug,
    siteId,
    incoming,
  });
  if (fresh && edgeCache && publicOrigin) {
    const cacheUrl = `${publicOrigin}/api/news/${encodeURIComponent(slug)}`;
    const store = putHmEdgeCache(
      edgeCache,
      cacheUrl,
      new Response(JSON.stringify(fresh.article), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
    );
    if (typeof waitUntil === "function") waitUntil(store);
  }
  return { bundle: fresh, fromCache: false };
}
