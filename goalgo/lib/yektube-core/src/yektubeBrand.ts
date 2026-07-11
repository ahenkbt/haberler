import { mapPathToYektubeV2 } from "./migratePaths";

/** Yektube özel alan adı — yekpare.net/yektube-v2 yerine yektube.com/yp */
export const YEKTUBE_HOST = "yektube.com";
export const YEKTUBE_WWW_HOST = "www.yektube.com";
export const YEKTUBE_ORIGIN = "https://yektube.com";
/** yektube.com erişilemezse yedek kök */
export const YEKTUBE_PORTAL_MIRROR_ORIGIN = "https://yekpare.net";
/** yektube.com ana akış kökü (eski /tr yönlendirilir) */
export const YEKTUBE_DEDICATED_PUBLIC_PATH = "/yp";
export const YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH = "/tr";
/** yektube.com müzik bölümü */
export const YEKTUBE_DEDICATED_MUSIC_PATH = "/muzik";
/** yektube.com çocuk bölümü */
export const YEKTUBE_DEDICATED_KIDS_PATH = "/cocuk";
/** yektube.com canlı yayın izleme */
export const YEKTUBE_DEDICATED_LIVE_PATH = "/canli";
/** yektube.com içerik oluşturma — Yek Gönder */
export const YEKTUBE_DEDICATED_YEKLIVE_PATH = "/yek-gonder";
export const YEKTUBE_DEDICATED_YEKLIVE_LEGACY_PATH = "/yeklive";
/** yektube.com kullanıcı paneli */
export const YEKTUBE_USER_PANEL_PATH = "/hesabim";
/** yektube.com kullanıcı stüdyosu */
export const YEKTUBE_USER_STUDIO_PATH = "/studio";

export function normalizeYektubeHostKey(host: string | null | undefined): string {
  return (
    String(host ?? "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, "")
      .split(":")[0]
      ?.trim() ?? ""
  );
}

function readDedicatedHostsEnv(): string {
  try {
    const vite = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_YEKTUBE_DEDICATED_HOSTS;
    if (vite?.trim()) return vite.trim();
  } catch {
    /* Node / SSR */
  }
  if (typeof process !== "undefined" && process.env?.VITE_YEKTUBE_DEDICATED_HOSTS?.trim()) {
    return process.env.VITE_YEKTUBE_DEDICATED_HOSTS.trim();
  }
  if (typeof process !== "undefined" && process.env?.YEKTUBE_DEDICATED_HOSTS?.trim()) {
    return process.env.YEKTUBE_DEDICATED_HOSTS.trim();
  }
  return "";
}

/** VITE_YEKTUBE_DEDICATED_HOSTS ile genişletilebilir; varsayılan yektube.com */
export function listYektubeDedicatedHostKeys(): string[] {
  const set = new Set<string>([normalizeYektubeHostKey(YEKTUBE_HOST)]);
  for (const part of readDedicatedHostsEnv().split(",")) {
    const h = normalizeYektubeHostKey(part);
    if (h) set.add(h);
  }
  return Array.from(set);
}

export function isYektubeDedicatedHost(host: string | null | undefined): boolean {
  const h = normalizeYektubeHostKey(host);
  if (!h) return false;
  return listYektubeDedicatedHostKeys().includes(h);
}

function readPortalSurfaceHostsEnv(): string[] {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_YEKTUBE_PORTAL_SURFACE_HOSTS) ||
    (typeof process !== "undefined" ? process.env.VITE_YEKTUBE_PORTAL_SURFACE_HOSTS : "") ||
    "yekpare.net";
  const set = new Set<string>();
  for (const part of String(raw).split(",")) {
    const h = normalizeYektubeHostKey(part);
    if (h) set.add(h);
  }
  return Array.from(set);
}

/** yekpare.net gibi portal — yalnızca /yp, /muzik … yollarında Yektube düzeni */
export function isYektubePortalSurfaceHost(host: string | null | undefined): boolean {
  const h = normalizeYektubeHostKey(host);
  if (!h) return false;
  return readPortalSurfaceHostsEnv().includes(h);
}

export function isYektubeSurfacePathname(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  return yektubeDedicatedTopLevelPaths().some((p) => path === p || path.startsWith(`${p}/`));
}

/** yektube.com veya yekpare.net/yp — /yp önekli rota düzeni */
export function usesYektubePublicPathLayout(
  host: string | null | undefined,
  pathname: string,
): boolean {
  if (isYektubeDedicatedHost(host)) return true;
  if (isYektubeSurfacePathname(pathname)) return true;
  if (isYektubePortalSurfaceHost(host) && isYektubeSurfacePathname(pathname)) return true;
  return false;
}

function readDedicatedPathEnv(): string {
  try {
    const vite = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_YEKTUBE_DEDICATED_PATH;
    if (vite?.trim()) return vite.trim().replace(/\/+$/, "") || YEKTUBE_DEDICATED_PUBLIC_PATH;
  } catch {
    /* Node */
  }
  if (typeof process !== "undefined" && process.env?.VITE_YEKTUBE_DEDICATED_PATH?.trim()) {
    return process.env.VITE_YEKTUBE_DEDICATED_PATH.trim().replace(/\/+$/, "");
  }
  return YEKTUBE_DEDICATED_PUBLIC_PATH;
}

/** yektube.com public path — varsayılan /yp */
export function yektubeDedicatedPublicPath(): string {
  return readDedicatedPathEnv();
}

/** yektube.com üst düzey SPA yolları (müzik / çocuk ana akıştan ayrı) */
export function yektubeDedicatedTopLevelPaths(): string[] {
  return [
    yektubeDedicatedPublicPath(),
    YEKTUBE_DEDICATED_MUSIC_PATH,
    YEKTUBE_DEDICATED_KIDS_PATH,
    YEKTUBE_DEDICATED_LIVE_PATH,
    YEKTUBE_DEDICATED_YEKLIVE_PATH,
    YEKTUBE_USER_PANEL_PATH,
    YEKTUBE_USER_STUDIO_PATH,
    "/admin",
  ];
}

/** Özel alanda wouter tabanı boş; yollar /yp, /muzik, /cocuk */
export function yektubeRouterBaseForHost(host: string | null | undefined, pathname = ""): string {
  if (usesYektubePublicPathLayout(host, pathname)) return "";
  return "/yektube-v2";
}

export function mapPathToYektubePortal(pathname: string, search = ""): string {
  const v2 = mapPathToYektubeV2(pathname, search);
  const main = yektubeDedicatedPublicPath();
  if (v2 === "/yektube-v2" || v2.startsWith("/yektube-v2/")) {
    return v2.replace(/^\/yektube-v2(?=\/|$)/, main) || main;
  }
  return v2;
}

export function yektubeDedicatedCorsOrigins(): string[] {
  return listYektubeDedicatedHostKeys().flatMap((h) => [
    `https://${h}`,
    `https://www.${h}`,
  ]);
}

/** yekpare.net/yektube-v2/... → https://yektube.com/yp/... */
export function mapToYektubeDedicatedUrl(pathname: string, search = "", hash = ""): string {
  const main = yektubeDedicatedPublicPath();
  let path = pathname.trim() || "/";
  const v2Base = "/yektube-v2";
  if (path === v2Base || path.startsWith(`${v2Base}/`)) {
    path = path === v2Base ? "/" : path.slice(v2Base.length) || "/";
  }
  if (path === "/yektube" || path.startsWith("/yektube/")) {
    path = path === "/yektube" ? "/" : path.slice("/yektube".length) || "/";
  }
  if (path === YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH || path.startsWith(`${YEKTUBE_DEDICATED_LEGACY_PUBLIC_PATH}/`)) {
    path = path.replace(/^\/tr(?=\/|$)/, main) || main;
  }
  if (path === YEKTUBE_DEDICATED_YEKLIVE_LEGACY_PATH || path.startsWith(`${YEKTUBE_DEDICATED_YEKLIVE_LEGACY_PATH}/`)) {
    path = path.replace(/^\/yeklive(?=\/|$)/, YEKTUBE_DEDICATED_YEKLIVE_PATH);
  }
  if (path === "/" || path === "") {
    return `${YEKTUBE_ORIGIN}${main}/${search}${hash}`.replace(/\/\?/, "?");
  }
  if (path === main || path.startsWith(`${main}/`)) {
    return `${YEKTUBE_ORIGIN}${path}${search}${hash}`;
  }
  const top = yektubeDedicatedTopLevelPaths();
  const onTop = top.some((p) => path === p || path.startsWith(`${p}/`));
  if (onTop) return `${YEKTUBE_ORIGIN}${path}${search}${hash}`;
  return `${YEKTUBE_ORIGIN}${main}${path.startsWith("/") ? path : `/${path}`}${search}${hash}`;
}

function readCanonicalRedirectEnv(): boolean {
  try {
    const vite = (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_YEKTUBE_REDIRECT_TO_CANONICAL;
    if (vite != null && vite !== "") {
      const v = vite.trim().toLowerCase();
      return v === "1" || v === "true" || v === "yes";
    }
  } catch {
    /* Node / SSR */
  }
  if (typeof process !== "undefined" && process.env?.VITE_YEKTUBE_REDIRECT_TO_CANONICAL?.trim()) {
    const v = process.env.VITE_YEKTUBE_REDIRECT_TO_CANONICAL.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  return false;
}

/** yektube.com DNS/SSL sorunlu iken yekpare.net üzerinde kal (varsayılan: kapalı redirect) */
export function isYektubeCanonicalRedirectEnabled(): boolean {
  return readCanonicalRedirectEnv();
}

/**
 * Gezinme / iframe için URL: varsayılan olarak mevcut origin + /yektube-v2.
 * VITE_YEKTUBE_REDIRECT_TO_CANONICAL=1 ile eski davranış (her zaman yektube.com).
 */
export function mapToYektubePublicUrl(pathname: string, search = "", hash = ""): string {
  if (isYektubeCanonicalRedirectEnabled()) {
    return mapToYektubeDedicatedUrl(pathname, search, hash);
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (!isYektubeDedicatedHost(host)) {
      return `${window.location.origin}${mapPathToYektubePortal(pathname, search)}${hash}`;
    }
  }
  return mapToYektubeDedicatedUrl(pathname, search, hash);
}

/** HM haber sitesi Video TV — yektube.com/yp iframe (canlı ve hızlı API; yedek yekpare.net). */
export function mapToHmYektubeEmbedUrl(pathname: string, search = "", hash = ""): string {
  const portalPath = mapPathToYektubePortal(pathname, search);
  const origin =
    (typeof process !== "undefined" && process.env.YEKTUBE_HM_EMBED_ORIGIN?.trim()) ||
    (typeof import.meta !== "undefined" &&
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_YEKTUBE_HM_EMBED_ORIGIN?.trim()) ||
    YEKTUBE_ORIGIN;
  return `${origin.replace(/\/+$/, "")}${portalPath}${hash}`;
}

/** yektube.com yolunu yekpare.net yedeğine taşır (/yp/... korunur) */
export function yektubePortalMirrorUrl(pathname?: string, search = "", hash = ""): string {
  const path =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : yektubeDedicatedPublicPath());
  const s = search || (typeof window !== "undefined" ? window.location.search : "");
  const h = hash || (typeof window !== "undefined" ? window.location.hash : "");
  return `${YEKTUBE_PORTAL_MIRROR_ORIGIN}${path}${s}${h}`;
}
