import { isHmReservedRouteSegment } from "@/lib/hmExtraPageLookup";
import { isDefaultPortalHost, isKnownHmCustomHost } from "@/lib/hmPortalHosts";
import { isTurkataHaberHost } from "@/lib/turkataHaber";

/** Haber merkezi vitrin kök URL segmenti: `/tr/{siteSlug}/...` (eski `/hm/...` yönlendirilir). */
export const HM_SITE_PUBLIC_PREFIX = "tr" as const;

const LEGACY_HM_PUBLIC_PREFIX = "/hm/";

/** Eski `/hm/...` vitrin yolunu `/tr/...` yapar; sorgu dizgisini korur. */
export function hmLegacyPublicPathToTr(pathWithQuery: string): string {
  const raw = String(pathWithQuery ?? "").trim();
  if (!raw.startsWith(LEGACY_HM_PUBLIC_PREFIX)) return raw;
  return `/${HM_SITE_PUBLIC_PREFIX}/${raw.slice(LEGACY_HM_PUBLIC_PREFIX.length)}`;
}

export function isHmSitePublicChromePath(pathNoQuery: string): boolean {
  const p = pathNoQuery.trim();
  return p.startsWith(`/${HM_SITE_PUBLIC_PREFIX}/`) || p.startsWith(LEGACY_HM_PUBLIC_PREFIX);
}

const HM_NEWS_PORTAL_PATH_PREFIXES = ["/haberler", "/haber/", "/tum-haberler", "/sondakika", "/kisa-kisa", "/kategori/"] as const;

/** `/{siteSlug}/haber/...` kısa yolu (VKD vb.). */
export function isHmShortSiteHaberPath(pathNoQuery: string): boolean {
  const parts = pathNoQuery.trim().split("/").filter(Boolean);
  return parts.length >= 3 && parts[1] === "haber";
}

/**
 * `/{site}/haber/:id` kısa yolu.
 * `haberler` bir haber sitesi slug'ı değildir; portal makalesine döner.
 */
export function hmShortHaberRedirectPath(slug: string, id: string): string | null {
  const site = slug.trim();
  const article = id.trim();
  if (!article) return null;
  if (site.toLowerCase() === "haberler") return `/haber/${encodeURIComponent(article)}`;
  if (!site || isHmReservedRouteSegment(site)) return null;
  return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site)}/haber/${encodeURIComponent(article)}`;
}

/** Haber sitelerinde ve portal hostlarında konum modalı / warmup kapalı. */
export function shouldSkipSiteGeolocationWarmup(pathNoQuery: string, host: string): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  if (isTurkataHaberHost(h)) return true;
  if (isDefaultPortalHost(h)) return true;
  if (isKnownHmCustomHost(h)) return true;
  const p = pathNoQuery.trim();
  if (isHmSitePublicChromePath(p)) return true;
  if (isHmShortSiteHaberPath(p)) return true;
  return HM_NEWS_PORTAL_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix));
}
