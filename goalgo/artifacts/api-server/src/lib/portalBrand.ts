/** Ana portal markası — yekpare.net (geçiş döneminde turknet.app de portal sayılır). */

export const PORTAL_ORIGIN = "https://yekpare.net";
export const PORTAL_HOST = "yekpare.net";
export const PORTAL_WWW_HOST = "www.yekpare.net";

export const LEGACY_PORTAL_HOSTS = ["turknet.app", "www.turknet.app"] as const;

export const PORTAL_ALIAS_HOSTS = [
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
  "ahenk.net.tr",
] as const;

export const PORTAL_SITE_NAME = "Yekpare";
export const PORTAL_BRAND_SHORT = "Yekpare";

export const PWA_STORE_NAME = "Yekpare";
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
export const PORTAL_SITEMAP_LEAK_HOSTS = [PORTAL_HOST, "turknet.app"] as const;

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
