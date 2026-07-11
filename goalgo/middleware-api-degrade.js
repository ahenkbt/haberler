/**
 * Vercel Edge /api vekili: Railway geçici 502/503/504 verdiğinde vitrin sayfalarının
 * boş JSON ile devam etmesi; prefetch isteklerinde gereksiz upstream çağrılarının azaltılması.
 */

import {
  isOptionalPublicGetPath,
  optionalPublicGetFallbackBody,
} from "./shared/public-vitrin-paths.mjs";

/** @param {Request} request */
export function isNavigationPrefetch(request) {
  const purpose = String(request.headers.get("purpose") ?? request.headers.get("Purpose") ?? "").toLowerCase();
  const secPurpose = String(request.headers.get("sec-purpose") ?? request.headers.get("Sec-Purpose") ?? "").toLowerCase();
  if (purpose.includes("prefetch") || secPurpose.includes("prefetch")) return true;
  if (request.headers.get("x-middleware-prefetch")) return true;
  if (String(request.headers.get("next-router-prefetch") ?? "") === "1") return true;
  return false;
}

export { isOptionalPublicGetPath, optionalPublicGetFallbackBody };

/** @param {Request} request @param {string} pathname @param {string} body */
export function buildDegradedApiResponse(request, pathname, body) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    "x-yekpare-api-degraded": "1",
  });
  if (body) headers.set("content-length", String(new TextEncoder().encode(body).byteLength));
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

/** @param {number} status */
export function isUpstreamUnavailable(status) {
  return status === 502 || status === 503 || status === 504;
}
