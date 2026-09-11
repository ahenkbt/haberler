/**
 * HM haber siteleri — Workers Cache API.
 * Container `cf.cacheTtl` yok sayar (stub.fetch); kenar önbelleği burada.
 * Taze hit <60sn; bayat yanıt 6 saat SWR; origin hata verirse son iyi kopya.
 */

export const HM_EDGE_FRESH_MS = 60_000;
export const HM_EDGE_STALE_MS = 6 * 60 * 60_000;
export const HM_EDGE_MAX_BODY_BYTES = 1_500_000;
export const HM_EDGE_CACHED_AT_HEADER = "x-yekpare-edge-cached-at";
export const HM_EDGE_STATUS_HEADER = "x-yekpare-edge-cache";

const CACHEABLE_EXACT = new Set([
  "/api/hm/home-bundle",
  "/api/news",
  "/api/news/hybrid",
  "/api/news/featured",
  "/api/news/breaking",
  "/api/authors",
]);

const NEWS_ARTICLE_RESERVED = new Set([
  "hybrid",
  "featured",
  "breaking",
  "popular",
  "by-category",
  "hm-nearest-slug",
  "deleted-redirect",
  "page-bundle",
  "tepe-featured",
  "authors",
]);

export function isHmNewsArticleCachePath(pathname) {
  const p = String(pathname || "").split("?")[0] || "";
  if (/^\/api\/news\/page-bundle\/[^/]+$/.test(p)) return true;
  const m = /^\/api\/news\/([^/]+)$/.exec(p);
  if (!m) return false;
  const seg = decodeURIComponent(m[1] || "");
  if (!seg || NEWS_ARTICLE_RESERVED.has(seg) || seg.startsWith("hm-")) return false;
  return true;
}

export function getHmEdgeCache() {
  try {
    if (typeof caches !== "undefined" && caches.default) return caches.default;
  } catch {
    /* tests / runtime without Cache API */
  }
  return null;
}

export function isHmEdgeCacheablePath(pathname, search = "") {
  const p = String(pathname || "").split("?")[0] || "";
  const qs = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  if (qs.get("fresh") === "1" || qs.get("fresh") === "true") return false;
  if (qs.get("includePageContent") === "1") return false;
  if (CACHEABLE_EXACT.has(p)) return true;
  if (p.startsWith("/api/hm/meta/")) return true;
  if (isHmNewsArticleCachePath(p)) return true;
  return false;
}

export function isHmEdgeCacheableRequest(request, pathname, search) {
  const method = String(request?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  if (request?.headers?.get?.("authorization")) return false;
  return isHmEdgeCacheablePath(pathname, search);
}

export function hmEdgeCacheKeyUrl(url) {
  const u = new URL(String(url));
  u.searchParams.delete("fresh");
  const pairs = [...u.searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  u.search = "";
  for (const [k, v] of pairs) u.searchParams.append(k, v);
  return u.toString();
}

export function hmEdgeCacheRequest(url) {
  return new Request(hmEdgeCacheKeyUrl(url), { method: "GET" });
}

export function hmEdgeCacheAgeMs(response, now = Date.now()) {
  if (!response) return Number.POSITIVE_INFINITY;
  const raw = response.headers?.get?.(HM_EDGE_CACHED_AT_HEADER);
  const at = Number(raw);
  if (!Number.isFinite(at) || at <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, now - at);
}

export function hmEdgeCacheFreshness(response, now = Date.now()) {
  const age = hmEdgeCacheAgeMs(response, now);
  if (age < HM_EDGE_FRESH_MS) return "fresh";
  if (age < HM_EDGE_STALE_MS) return "stale";
  return "expired";
}

function cloneResponseWithHeaders(response, mutate) {
  const headers = new Headers(response.headers);
  mutate(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function tagHmEdgeCacheResponse(response, status) {
  if (!response) return response;
  return cloneResponseWithHeaders(response, (headers) => {
    headers.set(HM_EDGE_STATUS_HEADER, status);
  });
}

export async function matchHmEdgeCache(cache, url) {
  if (!cache || typeof cache.match !== "function") return null;
  try {
    const hit = await cache.match(hmEdgeCacheRequest(url));
    return hit || null;
  } catch {
    return null;
  }
}

export async function putHmEdgeCache(cache, url, response) {
  const stored = await putHmEdgeCacheOnce(cache, url, response);
  if (stored) {
    await aliasHmHomeBundleCache(cache, url, response);
  }
  return stored;
}

async function putHmEdgeCacheOnce(cache, url, response) {
  if (!cache || typeof cache.put !== "function" || !response) return false;
  if (!response.ok) return false;
  try {
    const buf = await response.clone().arrayBuffer();
    if (!buf || buf.byteLength === 0 || buf.byteLength > HM_EDGE_MAX_BODY_BYTES) return false;
    const headers = new Headers(response.headers);
    headers.delete("set-cookie");
    headers.set("Cache-Control", "public, max-age=21600");
    headers.set("CDN-Cache-Control", "public, max-age=21600");
    headers.set(HM_EDGE_CACHED_AT_HEADER, String(Date.now()));
    headers.set(HM_EDGE_STATUS_HEADER, "stored");
    await cache.put(
      hmEdgeCacheRequest(url),
      new Response(buf, { status: response.status, statusText: response.statusText, headers }),
    );
    return true;
  } catch {
    return false;
  }
}

/** HTML boot slug=... ile ısınır; React siteId=... ister — aynı gövdeyi iki anahtara yaz. */
async function aliasHmHomeBundleCache(cache, url, response) {
  try {
    const u = new URL(hmEdgeCacheKeyUrl(url));
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/api/hm/home-bundle") return;
    if (u.searchParams.get("siteId")) return;
    const body = await response.clone().json();
    const siteId = Number(body?.siteId);
    if (!Number.isFinite(siteId) || siteId <= 0) return;
    const slider = u.searchParams.get("sliderLimit") || "15";
    const alias = `${u.origin}/api/hm/home-bundle?siteId=${siteId}&sliderLimit=${encodeURIComponent(slider)}`;
    await putHmEdgeCacheOnce(
      cache,
      alias,
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }),
    );
  } catch {
    /* alias best-effort */
  }
}

/**
 * Taze → hemen; bayat → hemen + arka plan yenileme; yok/süresi dolmuş → null (origin).
 * Origin hatasında çağıran bayat kopyayı `expired` olarak da kullanabilir.
 */
export async function resolveHmEdgeCache(cache, url, { waitUntil, revalidate } = {}) {
  const cached = await matchHmEdgeCache(cache, url);
  if (!cached) return { cached: null, response: null, freshness: "miss" };
  const freshness = hmEdgeCacheFreshness(cached);
  if (freshness === "fresh") {
    return { cached, response: tagHmEdgeCacheResponse(cached, "hit"), freshness };
  }
  if (freshness === "stale") {
    if (typeof waitUntil === "function" && typeof revalidate === "function") {
      waitUntil(
        Promise.resolve()
          .then(revalidate)
          .catch((err) => {
            console.error("[hm-edge-cache/revalidate]", String(err?.message || err).slice(0, 180));
          }),
      );
    }
    return { cached, response: tagHmEdgeCacheResponse(cached, "stale"), freshness };
  }
  return { cached, response: null, freshness: "expired" };
}

export function hmBootCacheUrls(origin, slug, domain) {
  const o = String(origin || "").replace(/\/+$/, "");
  const s = String(slug || "").trim();
  const host = String(domain || "").trim().toLowerCase();
  if (!o || !s) return { metaUrl: "", bundleUrl: "" };
  const metaUrl = `${o}/api/hm/meta/by-slug/${encodeURIComponent(s)}${
    host ? `?domain=${encodeURIComponent(host)}` : ""
  }`;
  const bundleUrl = `${o}/api/hm/home-bundle?slug=${encodeURIComponent(s)}&sliderLimit=15`;
  return { metaUrl, bundleUrl };
}

function jsonOk(res) {
  return Boolean(res && res.ok);
}

export async function readHmHtmlBootFromCache(cache, origin, slug, domain) {
  const { metaUrl, bundleUrl } = hmBootCacheUrls(origin, slug, domain);
  if (!metaUrl || !bundleUrl) return null;
  const [metaRes, bundleRes] = await Promise.all([
    matchHmEdgeCache(cache, metaUrl),
    matchHmEdgeCache(cache, bundleUrl),
  ]);
  const meta = jsonOk(metaRes) ? await metaRes.json().catch(() => null) : null;
  const bundle = jsonOk(bundleRes) ? await bundleRes.json().catch(() => null) : null;
  const siteId = Number(meta?.id || bundle?.siteId);
  if (!Number.isFinite(siteId) || siteId <= 0) {
    if (meta?.id) {
      return {
        siteId: Number(meta.id),
        slug,
        host: domain,
        savedAt: Date.now(),
        meta,
        bundle: null,
        fromCache: true,
      };
    }
    return null;
  }
  return {
    siteId,
    slug,
    host: domain,
    savedAt: Date.now(),
    meta: meta && typeof meta === "object" ? meta : null,
    bundle: bundle && typeof bundle === "object" ? bundle : null,
    fromCache: true,
  };
}

export async function storeHmHtmlBootInCache(cache, origin, slug, domain, boot) {
  if (!cache || !boot) return;
  const { metaUrl, bundleUrl } = hmBootCacheUrls(origin, slug, domain);
  const jobs = [];
  if (boot.meta && metaUrl) {
    jobs.push(
      putHmEdgeCache(
        cache,
        metaUrl,
        new Response(JSON.stringify(boot.meta), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }),
      ),
    );
  }
  if (boot.bundle && bundleUrl) {
    jobs.push(
      putHmEdgeCache(
        cache,
        bundleUrl,
        new Response(JSON.stringify(boot.bundle), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }),
      ),
    );
  }
  await Promise.all(jobs);
}

/**
 * Container'ı uyanık tut + bilinen HM sitelerinin home-bundle/meta kenarını doldur.
 */
export async function warmKnownHmNewsSites(env, { fetchApi, cache, sites }) {
  const list = Array.isArray(sites) ? sites : [];
  const results = [];
  for (const site of list) {
    const host = String(site?.host || "").toLowerCase().replace(/^www\./, "");
    const slug = String(site?.slug || "").trim();
    if (!host || !slug) continue;
    const origin = `https://${host}`;
    const { metaUrl, bundleUrl } = hmBootCacheUrls(origin, slug, host);
    const headers = {
      accept: "application/json",
      "x-forwarded-host": host,
      "x-forwarded-proto": "https",
    };
    try {
      let warmTimer;
      try {
        await Promise.race([
          (async () => {
          const [metaRes, bundleRes] = await Promise.all([
            fetchApi(env, metaUrl, { headers }),
            fetchApi(env, bundleUrl, { headers }),
          ]);
          if (cache) {
            if (jsonOk(metaRes)) await putHmEdgeCache(cache, metaUrl, metaRes);
            if (jsonOk(bundleRes)) await putHmEdgeCache(cache, bundleUrl, bundleRes);
          }
          let siteId = 0;
          if (jsonOk(metaRes)) {
            const meta = await metaRes.clone().json().catch(() => null);
            siteId = Number(meta?.id || 0);
          }
          if ((!Number.isFinite(siteId) || siteId <= 0) && jsonOk(bundleRes)) {
            const bundle = await bundleRes.clone().json().catch(() => null);
            siteId = Number(bundle?.siteId || 0);
          }
          if (cache && Number.isFinite(siteId) && siteId > 0) {
            const hybridUrl = `${origin}/api/news/hybrid?siteId=${siteId}&limit=24&offset=0&rssScope=all&dbFirst=1`;
            const newsUrl = `${origin}/api/news?siteId=${siteId}&status=published&limit=40`;
            try {
              const [hybridRes, newsRes] = await Promise.all([
                fetchApi(env, hybridUrl, { headers }),
                fetchApi(env, newsUrl, { headers }),
              ]);
              if (jsonOk(hybridRes)) await putHmEdgeCache(cache, hybridUrl, hybridRes);
              if (jsonOk(newsRes)) await putHmEdgeCache(cache, newsUrl, newsRes);
            } catch {
              /* hybrid/news warm best-effort */
            }
          }
          results.push({
            host,
            slug,
            meta: jsonOk(metaRes),
            bundle: jsonOk(bundleRes),
            siteId: Number.isFinite(siteId) && siteId > 0 ? siteId : undefined,
          });
        })(),
          new Promise((_, reject) => {
            warmTimer = setTimeout(() => reject(new Error("warm timeout")), 12_000);
          }),
        ]);
      } finally {
        if (warmTimer) clearTimeout(warmTimer);
      }
    } catch (err) {
      results.push({ host, slug, error: String(err?.message || err).slice(0, 120) });
    }
  }
  return results;
}
