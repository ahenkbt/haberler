import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

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

/** Haber merkezi / kurumsal vitrin: tarayıcı konum izni istenmez. */
export function shouldSkipSiteGeolocationWarmup(pathNoQuery: string, host: string): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  if (!isDefaultPortalHost(h)) return true;
  const p = pathNoQuery.trim();
  if (isHmSitePublicChromePath(p)) return true;
  if (isHmShortSiteHaberPath(p)) return true;
  return HM_NEWS_PORTAL_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix));
}
