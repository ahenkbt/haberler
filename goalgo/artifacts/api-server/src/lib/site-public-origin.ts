/** Yönlendirme ve ödeme callback tam URL’si için ortak kök (PayTR ok/fail, iyzico callback). */
import type { Request } from "express";
import { isPortalHostname, normalizePortalHostKey, PORTAL_ORIGIN } from "./portalBrand";

const INTERNAL_SITEMAP_HOST =
  /^(?:goalgo-production\.up\.railway\.app|goalgo-y7ze\.onrender\.com|localhost|127\.0\.0\.1)$/i;

/** Railway/Render kökünü sitemap `<loc>` için yekpare.net'e çevirir. */
export function canonicalSitemapOrigin(raw: string | null | undefined): string {
  const fallback = PORTAL_ORIGIN.replace(/\/+$/, "");
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return fallback;
  try {
    const host = normalizePortalHostKey(new URL(trimmed).hostname);
    if (INTERNAL_SITEMAP_HOST.test(host) || !isPortalHostname(host)) {
      const envOrigin = sitePublicOrigin().replace(/\/+$/, "");
      if (envOrigin && !INTERNAL_SITEMAP_HOST.test(normalizePortalHostKey(new URL(envOrigin).hostname))) {
        return envOrigin;
      }
      return fallback;
    }
    return trimmed;
  } catch {
    return fallback;
  }
}

export function sitePublicOrigin(): string {
  const raw =
    String(process.env["SITE_PUBLIC_ORIGIN"] || "").trim() ||
    (process.env["REPLIT_DOMAINS"]?.split(",")[0]
      ? `https://${process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim()}`
      : "");
  const o = raw.replace(/\/+$/, "");
  return o || PORTAL_ORIGIN;
}

/** Yekpare portal canonical article URL. */
export function buildYekparePortalArticleUrl(slug: string): string {
  const base = sitePublicOrigin().replace(/\/+$/, "");
  const s = encodeURIComponent(String(slug ?? "").trim());
  return `${base}/haber/${s}`;
}

/** Sitemap / robots: istek hostu varsa o domain kökeni, aksi halde kanonik portal. */
export function resolvePortalRequestOrigin(req: Request): string {
  const fwd = String(req.get("x-forwarded-host") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  const rawHost = fwd || String(req.get("host") ?? "");
  const host = normalizePortalHostKey(rawHost);
  if (host && isPortalHostname(host)) {
    const proto = String(req.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
    return canonicalSitemapOrigin(`${proto}://${host}`);
  }
  return canonicalSitemapOrigin(sitePublicOrigin());
}
