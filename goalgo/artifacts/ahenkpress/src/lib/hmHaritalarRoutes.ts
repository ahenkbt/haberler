import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

function normalizePath(pathname: string): string {
  return String(pathname ?? "").split("?")[0]?.replace(/\/+$/, "") || "/";
}

const HM_HARITALAR_PUBLIC_PATH_RE = new RegExp(
  `^(/${HM_SITE_PUBLIC_PREFIX}/[^/]+/haritalar)(?:/.*)?$`,
  "i",
);

const HM_NEWSMAP_PUBLIC_PATH_RE = new RegExp(
  `^(/${HM_SITE_PUBLIC_PREFIX}/[^/]+/newsmap)(?:/.*)?$`,
  "i",
);

export const YEKPARE_NEWSMAP_PATH = "/newsmap";

/** HM vitrin: `/tr/{siteSlug}/haritalar` (legacy). */
export function isHmHaritalarPublicPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/[^/]+/haritalar(?:/|$)`, "i").test(path);
}

/** HM haber haritası: `/tr/{siteSlug}/newsmap`. */
export function isHmNewsmapPublicPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/[^/]+/newsmap(?:/|$)`, "i").test(path);
}

/** HM haber haritası tabanı — `/tr/{siteSlug}/haritalar` veya eşleşme yoksa null. */
export function matchHmHaritalarPublicBasePath(pathname: string): string | null {
  const path = normalizePath(pathname);
  const match = path.match(HM_HARITALAR_PUBLIC_PATH_RE);
  return match?.[1] ?? null;
}

/** HM newsmap tabanı — `/tr/{siteSlug}/newsmap` veya null. */
export function matchHmNewsmapPublicBasePath(pathname: string): string | null {
  const path = normalizePath(pathname);
  const match = path.match(HM_NEWSMAP_PUBLIC_PATH_RE);
  return match?.[1] ?? null;
}

/** Kanonik newsmap tabanı — Yekpare `/newsmap` veya HM `/tr/:slug/newsmap`. */
export function matchNewsmapPublicBasePath(pathname: string): string | null {
  const hm = matchHmNewsmapPublicBasePath(pathname);
  if (hm) return hm;
  if (isYekpareNewsmapPath(pathname)) return YEKPARE_NEWSMAP_PATH;
  return null;
}

/** Yekpare haber haritası — yalnızca `/haritalar` ( `/map` ve `/maps` hariç ). */
export function isYekpareHaberHaritasiPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/haritalar" || path.startsWith("/haritalar/");
}

/** Yekpare newsmap — `/newsmap`. */
export function isYekpareNewsmapPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === YEKPARE_NEWSMAP_PATH || path.startsWith(`${YEKPARE_NEWSMAP_PATH}/`);
}

/** Yekpare tam ekran harita — `/map` ve `/maps`. */
export function isYekpareFullscreenMapPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/map" || path === "/maps";
}

/** Yekpare `/maps` — konum bazlı haber/video/işletme hibrit deneyimi. */
export function isYekpareMapsHybridContentPath(pathname: string): boolean {
  return isYekpareFullscreenMapPath(pathname);
}

/** Ziyaretçi ülkesine göre varsayılan viewport: `/map`, `/maps`, `/newsmap`, `/haritalar`, HM eşdeğerleri. */
export function isVisitorCountryDefaultMapPath(pathname: string): boolean {
  return isYekpareFullscreenMapPath(pathname)
    || isYekpareHaberHaritasiPath(pathname)
    || isNewsmapPublicPath(pathname)
    || isHmHaritalarPublicPath(pathname)
    || isHmNewsmapPublicPath(pathname);
}

/** Kanonik newsmap rotası — Yekpare `/newsmap` veya HM `/tr/:slug/newsmap`. */
export function isNewsmapPublicPath(pathname: string): boolean {
  return isYekpareNewsmapPath(pathname) || isHmNewsmapPublicPath(pathname);
}

/** Haber haritası RSS katmanı: legacy `/haritalar`, `/newsmap`, HM eşdeğerleri. */
export function isHaberHaritasiNewsMapPath(pathname: string): boolean {
  return isYekpareHaberHaritasiPath(pathname)
    || isHmHaritalarPublicPath(pathname)
    || isNewsmapPublicPath(pathname);
}

export function hmHaritalarPublicPath(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "/haritalar";
  return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(s)}/haritalar`;
}

export function hmNewsmapPublicPath(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return YEKPARE_NEWSMAP_PATH;
  return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(s)}/newsmap`;
}
