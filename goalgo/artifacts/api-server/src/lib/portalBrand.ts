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

export const PORTAL_ALIAS_HOSTS = [
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
] as const;

export const PORTAL_SITE_NAME = "Türk Ekosistemi";
export const PORTAL_BRAND_SHORT = "Türk Ekosistemi";
export const PWA_STORE_NAME = "Türk Ekosistemi";
export const PWA_ICON_PATH = "/icon-192.svg";

/** Virgülle: getirsepeti.com.tr,goalgo.org,www.goalgo.org */
export function parsePortalExtraHosts(): string[] {
  return String(process.env.PORTAL_EXTRA_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
}

export function normalizePortalHostKey(host: string | null | undefined): string {
  return String(host ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0]
    ?.trim() ?? "";
}

export function isPortalHostname(host: string | null | undefined): boolean {
  const h = normalizePortalHostKey(host);
  if (!h || h === "localhost" || h === "127.0.0.1") return true;
  if (h === PORTAL_HOST || h === PORTAL_WWW_HOST) return true;
  if ((LEGACY_PORTAL_HOSTS as readonly string[]).includes(h)) return true;
  if ((PORTAL_ALIAS_HOSTS as readonly string[]).includes(h)) return true;
  if (h.endsWith(".vercel.app")) return true;
  if (parsePortalExtraHosts().includes(h)) return true;
  return false;
}

/** HM özel alanında Railway portal sitemap yanıtında yanlışlıkla görünen kök alanlar. */
export const PORTAL_SITEMAP_LEAK_HOSTS = [PORTAL_HOST, "turk.eco", "turknet.app"] as const;

/** Bilinen portal kökleri (admin SEO sekmesi ipuçları). */
export function listKnownPortalHostKeys(): string[] {
  const set = new Set<string>([
    normalizePortalHostKey(PORTAL_HOST),
    normalizePortalHostKey(PORTAL_WWW_HOST),
    ...LEGACY_PORTAL_HOSTS.map(normalizePortalHostKey),
    ...PORTAL_ALIAS_HOSTS.map(normalizePortalHostKey),
    ...parsePortalExtraHosts(),
  ]);
  return Array.from(set).filter(Boolean);
}
