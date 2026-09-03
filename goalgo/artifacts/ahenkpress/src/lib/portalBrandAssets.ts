import { resolveClientMediaSrc } from "@/lib/apiBase";
import {
  AHENK_FAVICON_PATH,
  AHENK_LOGO_PATH,
  PORTAL_DEFAULT_FAVICON_PATH,
  PORTAL_DEFAULT_LOGO_PATH,
  isAhenkPortalHost,
  isLegacyPortalBrandAssetUrl,
} from "@/lib/portalBrand";

function resolveStoredAssetUrl(stored: string | null | undefined, fallbackPath: string): string {
  const t = typeof stored === "string" ? stored.trim() : "";
  if (t && !isLegacyPortalBrandAssetUrl(t)) return resolveClientMediaSrc(t) || t;
  return fallbackPath;
}

export function resolvePortalLogoSrc(logoUrl?: string | null, host?: string | null): string {
  if (isAhenkPortalHost(host)) return AHENK_LOGO_PATH;
  return resolveStoredAssetUrl(logoUrl, PORTAL_DEFAULT_LOGO_PATH);
}

export function resolvePortalFaviconSrc(
  faviconUrl?: string | null,
  logoUrl?: string | null,
  host?: string | null,
): string {
  if (isAhenkPortalHost(host)) return AHENK_FAVICON_PATH;
  const fav = typeof faviconUrl === "string" ? faviconUrl.trim() : "";
  if (fav && !isLegacyPortalBrandAssetUrl(fav)) return resolveClientMediaSrc(fav) || fav;
  const logo = typeof logoUrl === "string" ? logoUrl.trim() : "";
  if (logo && !isLegacyPortalBrandAssetUrl(logo)) return resolveClientMediaSrc(logo) || logo;
  return PORTAL_DEFAULT_FAVICON_PATH;
}
