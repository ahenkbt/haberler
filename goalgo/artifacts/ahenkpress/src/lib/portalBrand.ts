/** Ana portal markası — yekpare.net (geçiş döneminde turknet.app de portal sayılır). */

export const PORTAL_ORIGIN = "https://yekpare.net";
export const PORTAL_HOST = "yekpare.net";
export const PORTAL_WWW_HOST = "www.yekpare.net";

export const LEGACY_PORTAL_HOSTS = ["turknet.app", "www.turknet.app"] as const;

/** Ek portal alias alanları (VITE_PORTAL_HOSTS / PORTAL_EXTRA_HOSTS ile de genişletilebilir). */
export const PORTAL_ALIAS_HOSTS = [
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
  "ahenk.net.tr",
  "turk.eco",
  "www.turk.eco",
] as const;

export const PORTAL_SITE_NAME = "Yekpare";
export const PORTAL_SITE_TITLE_SUFFIX = " — Türkiye'nin Yerli Arama Motoru";
export const PORTAL_SITE_FULL_TITLE = `${PORTAL_SITE_NAME}${PORTAL_SITE_TITLE_SUFFIX}`;
export const PORTAL_BRAND_SHORT = "Yekpare";
export const PORTAL_SEARCH_TAGLINE =
  "Türkiye'nin yerli arama motoru. Haber, video, harita, sipariş, alışveriş ve hizmetleri tek aramada keşfedin.";

export const PWA_STORE_NAME = "Yekpare";
export const PWA_STORE_TAGLINE = "Haber, harita, sipariş ve alışveriş";
export const PWA_APP_NAME = "Yekpare";
export const PWA_ICON_PATH = "/icon-192.svg";

/** Eski DB / seed / geçiş dönemi metinlerini kullanıcıya Yekpare olarak gösterir. */
export function normalizePortalDisplayName(name: string | null | undefined): string {
  const t = String(name ?? "").trim();
  if (!t) return PORTAL_BRAND_SHORT;
  return (
    t
      .replace(/türknet\s*yekpare\s*süper\s*app/gi, "Yekpare")
      .replace(/turknet\s*yekpare/gi, "Yekpare")
      .replace(/türknet/gi, "Yekpare")
      .replace(/turknet/gi, "Yekpare")
      .replace(/goalgo/gi, "Yekpare")
      .replace(/süper\s*app/gi, "")
      .replace(/super\s*app/gi, "")
      .replace(/süper\s*uygulama/gi, "arama motoru")
      .replace(/süper\s*uygulaması/gi, "arama motoru")
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
