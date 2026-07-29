/** Ana portal markası — turk.eco (yekpare.net ayrı proje / worker). */

export const PORTAL_ORIGIN = "https://turk.eco";
export const PORTAL_HOST = "turk.eco";
export const PORTAL_WWW_HOST = "www.turk.eco";

export const LEGACY_PORTAL_HOSTS = [
  "turknet.app",
  "www.turknet.app",
] as const;

/** Ek portal alias alanları (VITE_PORTAL_HOSTS / PORTAL_EXTRA_HOSTS ile de genişletilebilir). */
export const PORTAL_ALIAS_HOSTS = [
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
  "ahenk.net.tr",
] as const;

export const PORTAL_SITE_NAME = "Türk Ekosistemi";
export const PORTAL_SITE_TITLE_SUFFIX = " — Haber, Video ve Newsmap";
export const PORTAL_SITE_FULL_TITLE = `${PORTAL_SITE_NAME}${PORTAL_SITE_TITLE_SUFFIX}`;
export const PORTAL_BRAND_SHORT = "Türk Ekosistemi";
export const PORTAL_SEARCH_TAGLINE =
  "Haberler, Yektube, Haber Merkezi ve Newsmap — tek platformda.";

export const PWA_STORE_NAME = "Türk Ekosistemi";
export const PWA_STORE_TAGLINE = "Haber, video ve Newsmap";
export const PWA_APP_NAME = "Türk Ekosistemi";
export const PWA_ICON_PATH = "/icon-192.svg";

/** Eski DB / seed / geçiş dönemi metinlerini kullanıcıya Türk Ekosistemi olarak gösterir. */
export function normalizePortalDisplayName(name: string | null | undefined): string {
  const t = String(name ?? "").trim();
  if (!t) return PORTAL_BRAND_SHORT;
  return (
    t
      .replace(/türknet\s*yekpare\s*süper\s*app/gi, PORTAL_BRAND_SHORT)
      .replace(/turknet\s*yekpare/gi, PORTAL_BRAND_SHORT)
      .replace(/\byekpare\b/gi, PORTAL_BRAND_SHORT)
      .replace(/türknet/gi, PORTAL_BRAND_SHORT)
      .replace(/turknet/gi, PORTAL_BRAND_SHORT)
      .replace(/goalgo/gi, PORTAL_BRAND_SHORT)
      .replace(/süper\s*app/gi, "")
      .replace(/super\s*app/gi, "")
      .replace(/süper\s*uygulama/gi, "")
      .replace(/süper\s*uygulaması/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim() || PORTAL_BRAND_SHORT
  );
}

/** Ana portal mutlak URL (haber sitesi ansiklopedi yan paneli vb.). */
export function portalAbsoluteHref(path: string): string {
  const base = PORTAL_ORIGIN.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function isPrimaryPortalHostname(host: string): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  return h === PORTAL_HOST || h === PORTAL_WWW_HOST;
}
