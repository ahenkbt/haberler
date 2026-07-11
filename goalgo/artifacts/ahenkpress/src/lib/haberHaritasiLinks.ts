import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";
import { isTurkishProvinceName } from "@/lib/haberHaritasiLocations";

export type HaberHaritasiLinkMode = "yekpare" | "hm-editor";

export function buildHaberHaritasiSondakikaQuery(locationLabel: string): string {
  return locationLabel
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function resolveHaberHaritasiBilgiAgaciHref(
  locationLabel: string,
  mode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
): string | null {
  if (!isTurkishProvinceName(locationLabel)) return null;
  const path = `/bilgiagaci/${wikiTitleToUrlSlug(locationLabel)}`;
  return mode === "hm-editor" ? hmPublicHref(path) : path;
}

export function resolveHaberHaritasiSondakikaHref(
  locationLabel: string,
  mode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
): string {
  const q = buildHaberHaritasiSondakikaQuery(locationLabel);
  const path = `/sondakika?q=${encodeURIComponent(q)}`;
  return mode === "hm-editor" ? hmPublicHref(path) : path;
}

export function resolveHaberHaritasiAllNewsHref(
  mode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
): string {
  return mode === "hm-editor" ? hmPublicHref("/sondakika") : "/sondakika";
}

/** Yekpare: `/yektube/kanal/...` — HM: `/tr/:slug/video-tv/kanal/...` */
export function resolveHaberHaritasiVideoHome(
  mode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
): string {
  return mode === "hm-editor" ? hmPublicHref("/video-tv") : "/yektube";
}

export function resolveHaberHaritasiAllVideosHref(
  mode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
): string {
  return resolveHaberHaritasiVideoHome(mode, hmPublicHref);
}
