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

export const PORTAL_SITE_NAME = "Ahenk Bilgi Teknolojileri";
export const PORTAL_BRAND_SHORT = "Ahenk Bilgi Teknolojileri";
export const PWA_STORE_NAME = "Ahenk Bilgi Teknolojileri";
export const PWA_ICON_PATH = "/icon-192.svg";
export const PORTAL_DEFAULT_LOGO_TEXT_1 = "Ahenk";
export const PORTAL_DEFAULT_LOGO_TEXT_2 = "BT";
export const PORTAL_DEFAULT_TAGLINE = "Web yazılımı, haber sitesi ve ajans — Ahenk Bilgi Teknolojileri.";
export const PORTAL_DEFAULT_COPYRIGHT_TEXT = "© Ahenk Bilgi Teknolojileri. Tüm hakları saklıdır.";

const LEGACY_BRAND_RE =
  /türk\s*ekosistemi|turk\s*ekosistemi|yekpare(?:\.net)?|türknet|turknet|turk\.eco|goalgo/gi;

export function isLegacyPortalSiteName(name: string | null | undefined): boolean {
  const t = String(name ?? "").trim();
  if (!t) return true;
  LEGACY_BRAND_RE.lastIndex = 0;
  return LEGACY_BRAND_RE.test(t);
}

export function normalizePortalDisplayName(name: string | null | undefined): string {
  const t = String(name ?? "").trim();
  if (!t || isLegacyPortalSiteName(t)) return PORTAL_BRAND_SHORT;
  return t.replace(/\s{2,}/g, " ").trim() || PORTAL_BRAND_SHORT;
}

export function isLegacyPortalLogoPair(part1: string | null | undefined, part2: string | null | undefined): boolean {
  const a = String(part1 ?? "").trim();
  const b = String(part2 ?? "").trim();
  if (!a) return true;
  const joined = `${a} ${b}`.trim().toLowerCase();
  return joined === "yek pare" || joined === "yekpare" || a.toLowerCase() === "yek" || /türk|turk|yekpare|goalgo/i.test(a);
}

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
