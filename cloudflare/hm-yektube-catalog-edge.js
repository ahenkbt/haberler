/**
 * HM /video — Yektube katalog kenar yedegi.
 * Eski container Express 404 HTML donerse SPA kabuguna dusmesin;
 * ayni sozlesmeyi JSON olarak koru (haber tablosuna yazmaz).
 */

import { fetchHmYektubeYoutubeRssCatalog } from "./hm-yektube-youtube-rss.js";

const HM_YEKTUBE_NAV = [
  { slug: "haberler", label: "Haberler" },
  { slug: "sinema", label: "Film" },
  { slug: "dizi", label: "Dizi" },
  { slug: "muzik", label: "Müzik" },
  { slug: "oyun", label: "Oyun" },
  { slug: "spor", label: "Spor" },
  { slug: "eglence", label: "Eğlence" },
  { slug: "komedi", label: "Komedi" },
  { slug: "bilim", label: "Bilim" },
  { slug: "teknoloji", label: "Bilim" },
  { slug: "egitim", label: "Eğitim" },
  { slug: "seyahat", label: "Seyahat" },
  { slug: "otomobil", label: "Otomobiller" },
  { slug: "evcil-hayvan", label: "Evcil Hayvanlar" },
  { slug: "doga", label: "Doğa" },
  { slug: "nasil-yapilir", label: "Nasıl Yapılır" },
  { slug: "vlog", label: "Vlog" },
  { slug: "tarih", label: "Tarih" },
  { slug: "saglik", label: "Sağlık" },
  { slug: "cocuk", label: "Çocuk" },
];

export function isHmYektubeCatalogPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return p === "/api/hm/yektube/videos" || p === "/api/hm/yektube/categories";
}

export function shouldDegradeHmYektubeCatalog(status, contentType) {
  const code = Number(status) || 0;
  if (!code || code === 404 || code >= 500) return true;
  const ct = String(contentType || "").toLowerCase();
  return ct.includes("text/html");
}

export function hmYektubeCatalogDegradeBody(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/api/hm/yektube/categories") {
    return { items: HM_YEKTUBE_NAV, persistedToNews: false, source: "degraded" };
  }
  return { items: [], total: 0, source: "degraded", persistedToNews: false };
}

export function hmYektubeCatalogShouldFillFromRss(pathname, body) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p !== "/api/hm/yektube/videos") return false;
  if (!body || !Array.isArray(body.items)) return true;
  return body.items.length === 0;
}

export async function hmYektubeCatalogRssFillBody(searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(String(searchParams || ""));
  const rawSlug = String(params.get("categorySlug") || "").trim();
  const slug = rawSlug && rawSlug !== "all" && rawSlug !== "tumu" ? rawSlug : "";
  const items = await fetchHmYektubeYoutubeRssCatalog({
    limit: params.get("limit") || 36,
    categorySlug: slug || null,
  });
  if (!items.length) return null;
  return { items, total: items.length, source: "yektube-rss", persistedToNews: false };
}

export function hmYektubeCatalogJsonResponse(body, tag = "rss") {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=180",
      "cdn-cache-control": "public, max-age=120, stale-while-revalidate=300",
      "x-yekpare-frontend": "cloudflare-worker",
      "x-yekpare-hm-yektube": String(tag || "rss").slice(0, 40),
    },
  });
}

export async function hmYektubeCatalogVideosOrRss(pathname, searchParams, reason = "upstream") {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/api/hm/yektube/categories") {
    return hmYektubeCatalogDegradeResponse(pathname, reason);
  }
  try {
    const filled = await hmYektubeCatalogRssFillBody(searchParams);
    if (filled) return hmYektubeCatalogJsonResponse(filled, "rss");
  } catch {
    /* fall through */
  }
  return hmYektubeCatalogDegradeResponse(pathname, reason);
}

export function hmYektubeCatalogDegradeResponse(pathname, reason = "upstream") {
  return new Response(JSON.stringify(hmYektubeCatalogDegradeBody(pathname)), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-worker",
      "x-yekpare-hm-yektube": "degraded",
      "x-yekpare-hm-yektube-reason": String(reason || "upstream").slice(0, 40),
    },
  });
}
