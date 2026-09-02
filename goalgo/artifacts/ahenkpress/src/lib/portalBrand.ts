/** Ana portal markası — ahenk.net.tr (eski turk.eco iptal). */

export const PORTAL_ORIGIN = "https://ahenk.net.tr";
export const PORTAL_HOST = "ahenk.net.tr";
export const PORTAL_WWW_HOST = "www.ahenk.net.tr";

export const LEGACY_PORTAL_HOSTS = [
  "turk.eco",
  "www.turk.eco",
  "turknet.app",
  "www.turknet.app",
] as const;

/** Ek portal alias alanları (VITE_PORTAL_HOSTS / PORTAL_EXTRA_HOSTS ile de genişletilebilir). */
export const PORTAL_ALIAS_HOSTS = [
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
] as const;

export const PORTAL_SITE_NAME = "Türk Ekosistemi";
export const PORTAL_SITE_TITLE_SUFFIX = " — Haber, Video ve Newsmap";
export const PORTAL_SITE_FULL_TITLE = `${PORTAL_SITE_NAME}${PORTAL_SITE_TITLE_SUFFIX}`;
export const PORTAL_BRAND_SHORT = "Türk Ekosistemi";
export const PORTAL_SEARCH_TAGLINE = "haber video portalı";

export const PWA_STORE_NAME = "Türk Ekosistemi";
export const PWA_STORE_TAGLINE = "Haber, video ve Newsmap";
export const PWA_APP_NAME = "Türk Ekosistemi";

/** Varsayılan portal logosu ve sekme ikonu (public/portal-brand). */
export const PORTAL_DEFAULT_LOGO_PATH = "/portal-brand/logo1.png?v=3";
export const PORTAL_DEFAULT_FAVICON_PATH = "/portal-brand/icon.png?v=3";

/** Eski YEKPARE / TURKNET görselleri — site_settings’te kalsa bile yeni markaya düş. */
export function isLegacyPortalBrandAssetUrl(url: string | null | undefined): boolean {
  const t = String(url ?? "").trim().toLowerCase();
  if (!t) return false;
  return (
    t.includes("yekpare-super-app") ||
    t.includes("yekpare_super_app") ||
    t.includes("turknet.app") ||
    t.includes("/yekpare-logo") ||
    t.includes("icon-512.png") ||
    t.includes("apple-touch-icon") ||
    t.includes("/opengraph.jpg") ||
    (t.includes("yekpare") && t.includes("logo") && !t.includes("portal-brand")) ||
    (t.includes("goalgo") && (t.includes("logo") || t.includes("brand"))) ||
    (t.includes("turknet") && t.includes("logo"))
  );
}
export const PWA_ICON_PATH = PORTAL_DEFAULT_FAVICON_PATH;

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
