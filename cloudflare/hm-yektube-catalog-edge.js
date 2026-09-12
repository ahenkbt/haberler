/**
 * HM /video — Yektube katalog kenar yedegi.
 * Eski container Express 404 HTML donerse SPA kabuguna dusmesin;
 * ayni sozlesmeyi JSON olarak koru (haber tablosuna yazmaz).
 */

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
    return { items: [], persistedToNews: false, source: "degraded" };
  }
  return { items: [], total: 0, source: "degraded", persistedToNews: false };
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
