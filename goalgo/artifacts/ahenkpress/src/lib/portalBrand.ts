/** Ana portal markası — ahenk.net.tr (eski turk.eco / Türk Ekosistemi iptal). */

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

export const PORTAL_SITE_NAME = "Ahenk Bilgi Teknolojileri";
export const PORTAL_SITE_TITLE_SUFFIX = " | ahenk.net.tr";
export const PORTAL_SITE_FULL_TITLE = `${PORTAL_SITE_NAME}${PORTAL_SITE_TITLE_SUFFIX}`;
export const PORTAL_BRAND_SHORT = "Ahenk Bilgi Teknolojileri";
export const PORTAL_SEARCH_TAGLINE = "web yazılımı ve ajans";

export const PWA_STORE_NAME = "Ahenk Bilgi Teknolojileri";
export const PWA_STORE_TAGLINE = "Web yazılımı, haber sitesi ve ajans";
export const PWA_APP_NAME = "Ahenk Bilgi Teknolojileri";

export const PORTAL_DEFAULT_LOGO_TEXT_1 = "Ahenk";
export const PORTAL_DEFAULT_LOGO_TEXT_2 = "BT";
export const PORTAL_DEFAULT_TAGLINE = "Web yazılımı, haber sitesi ve ajans — Ahenk Bilgi Teknolojileri.";
export const PORTAL_DEFAULT_FOOTER_TEXT =
  "Ahenk Bilgi Teknolojileri (ahenk.net.tr); web yazılımı, haber sitesi yazılımı, ajans ve çağrı merkezi çözümleri.";
export const PORTAL_DEFAULT_COPYRIGHT_TEXT = "© Ahenk Bilgi Teknolojileri. Tüm hakları saklıdır.";

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

const LEGACY_BRAND_RE =
  /türk\s*ekosistemi|turk\s*ekosistemi|yekpare(?:\.net)?|türknet|turknet|turk\.eco|goalgo/gi;

export function isLegacyPortalSiteName(name: string | null | undefined): boolean {
  const t = String(name ?? "").trim();
  if (!t) return true;
  LEGACY_BRAND_RE.lastIndex = 0;
  return LEGACY_BRAND_RE.test(t);
}

/** Eski DB / seed metinlerini kullanıcıya Ahenk Bilgi Teknolojileri olarak gösterir. */
export function normalizePortalDisplayName(name: string | null | undefined): string {
  const t = String(name ?? "").trim();
  if (!t || isLegacyPortalSiteName(t)) return PORTAL_BRAND_SHORT;
  return t.replace(/\s{2,}/g, " ").trim() || PORTAL_BRAND_SHORT;
}

export function normalizePortalLogoParts(
  part1: string | null | undefined,
  part2: string | null | undefined,
): { logoText1: string; logoText2: string } {
  const a = String(part1 ?? "").trim();
  const b = String(part2 ?? "").trim();
  const joined = `${a} ${b}`.trim().toLowerCase();
  if (
    !a ||
    joined === "yek pare" ||
    joined === "yekpare" ||
    a.toLowerCase() === "yek" ||
    /türk|turk|yekpare|goalgo/i.test(a)
  ) {
    return { logoText1: PORTAL_DEFAULT_LOGO_TEXT_1, logoText2: PORTAL_DEFAULT_LOGO_TEXT_2 };
  }
  return { logoText1: a, logoText2: b };
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
