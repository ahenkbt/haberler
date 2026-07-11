import { normalizeHmMapCityKey, type HmMapCityHeadline } from "@/lib/hmMapCityNews";
import type { HaberHaritasiLocation } from "@/lib/haberHaritasiLocations";
import { isTurkishProvinceName, matchHaberHaritasiGlobalLocation } from "@/lib/haberHaritasiLocations";
import {
  resolveIlCenterFromSearchQuery,
  resolveNewsmapLocationQueryLabel,
} from "@/lib/haberHaritasiLocationContext";

export type NewsmapSidebarMode = "all" | "news" | "video";

export type BuildNewsmapSidebarHeadlinesArgs = {
  selectedCity: string | null;
  kindFilter: "all" | "news" | "video" | "businesses" | "info";
  layerHeadlines: HmMapCityHeadline[];
  layerFiltered: HmMapCityHeadline[];
  locationNewsHeadlines: HmMapCityHeadline[];
  locationVideoHeadlines: HmMapCityHeadline[];
  filterByKind: (rows: HmMapCityHeadline[]) => HmMapCityHeadline[];
};

function resolveSidebarCityKeys(selectedCity: string | null): {
  cityKey: string | null;
  provinceKey: string | null;
  queryLabel: string;
} {
  if (!selectedCity) return { cityKey: null, provinceKey: null, queryLabel: "" };
  const resolved = resolveNewsmapLocationQueryLabel(selectedCity);
  const primary = selectedCity.split(",")[0]?.trim() || selectedCity;
  const provincePart = selectedCity.split(",")[1]?.trim() || "";
  const provinceKey =
    provincePart && isTurkishProvinceName(provincePart)
      ? normalizeHmMapCityKey(provincePart)
      : normalizeHmMapCityKey(resolved.queryLabel) !== normalizeHmMapCityKey(primary)
        ? normalizeHmMapCityKey(resolved.queryLabel)
        : null;
  return {
    cityKey: normalizeHmMapCityKey(primary),
    provinceKey,
    queryLabel: resolved.queryLabel,
  };
}

function cityKeyMatches(
  row: HmMapCityHeadline,
  cityKey: string | null,
  provinceKey: string | null,
): boolean {
  if (!cityKey && !provinceKey) return true;
  const rowCity = normalizeHmMapCityKey(row.city);
  const rowTitle = normalizeHmMapCityKey(row.title);
  if (provinceKey && (rowCity === provinceKey || rowCity.includes(provinceKey) || rowTitle.includes(provinceKey))) {
    return true;
  }
  if (cityKey && (rowCity === cityKey || rowTitle.includes(cityKey) || cityKey.includes(rowCity))) {
    return true;
  }
  return false;
}

function headlinesForCity(
  rows: HmMapCityHeadline[],
  cityKey: string | null,
  provinceKey: string | null,
  opts?: { trustLocationFetch?: boolean },
): HmMapCityHeadline[] {
  if (!cityKey && !provinceKey) return rows;
  if (opts?.trustLocationFetch) return rows;
  return rows.filter((row) => cityKeyMatches(row, cityKey, provinceKey));
}

function mergeUniqueHeadlines(...groups: HmMapCityHeadline[][]): HmMapCityHeadline[] {
  const merged = new Map<string, HmMapCityHeadline>();
  for (const group of groups) {
    for (const row of group) {
      merged.set(`${row.kind}:${row.href}`, row);
    }
  }
  return [...merged.values()].sort(
    (a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
  );
}

/** Konum seçiliyken yan panel — Phase-1 (DB) anında + Phase-2 (RSS/YouTube) birleşik; küresel karma yok. */
export function buildNewsmapSidebarHeadlines({
  selectedCity,
  kindFilter,
  layerHeadlines,
  layerFiltered,
  locationNewsHeadlines,
  locationVideoHeadlines,
  filterByKind,
}: BuildNewsmapSidebarHeadlinesArgs): HmMapCityHeadline[] {
  const { cityKey, provinceKey } = resolveSidebarCityKeys(selectedCity);
  const selectedIsTrProvince = selectedCity
    ? isTurkishProvinceName(selectedCity.split(",")[0]?.trim() || selectedCity)
      || Boolean(provinceKey)
    : false;

  if (!cityKey && !provinceKey) {
    if (layerHeadlines.length > 0) return layerHeadlines;
    if (layerFiltered.length > 0) return layerFiltered.slice(0, 48);
    return [];
  }

  const phase1 = selectedIsTrProvince
    ? mergeUniqueHeadlines(
        headlinesForCity(layerHeadlines, cityKey, provinceKey),
        headlinesForCity(layerFiltered, cityKey, provinceKey),
      )
    : [];
  const phase2News = headlinesForCity(locationNewsHeadlines, cityKey, provinceKey, { trustLocationFetch: true });
  const phase2Video = headlinesForCity(locationVideoHeadlines, cityKey, provinceKey, { trustLocationFetch: true });

  if (kindFilter === "video") {
    return mergeUniqueHeadlines(
      phase2Video,
      filterByKind(phase1).filter((row) => row.kind === "video"),
    ).slice(0, 64);
  }

  if (kindFilter === "news") {
    return mergeUniqueHeadlines(
      phase2News,
      filterByKind(phase1).filter((row) => row.kind === "news"),
    ).slice(0, 64);
  }

  return mergeUniqueHeadlines(phase2News, phase2Video, phase1).slice(0, 64);
}

/** Haber/konum tıklaması — il merkezi öncelikli (RSS geo yanlış koordinat vermesin). */
export function resolveNewsmapLocationCoords(
  cityLabel: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>,
  globalLocations: HaberHaritasiLocation[] = [],
  headline?: Pick<HmMapCityHeadline, "geoLat" | "geoLng"> | null,
  explicitCoords?: { lat: number; lng: number; zoom?: number } | null,
): { lat: number; lng: number; zoom?: number } | null {
  if (
    explicitCoords &&
    Number.isFinite(explicitCoords.lat) &&
    Number.isFinite(explicitCoords.lng)
  ) {
    return {
      lat: explicitCoords.lat,
      lng: explicitCoords.lng,
      zoom: explicitCoords.zoom ?? 10,
    };
  }
  const primaryLabel = cityLabel.split(",")[0]?.trim() || cityLabel;
  const il = resolveIlCenterFromSearchQuery(primaryLabel, ilCenters);
  if (il) {
    return { lat: il.lat, lng: il.lng, zoom: Math.max(il.zoom ?? 10, 10) };
  }
  const globalLoc = matchHaberHaritasiGlobalLocation(primaryLabel, globalLocations);
  if (globalLoc) {
    return { lat: globalLoc.lat, lng: globalLoc.lng, zoom: globalLoc.zoom ?? 10 };
  }
  const geoLat = headline?.geoLat;
  const geoLng = headline?.geoLng;
  if (Number.isFinite(geoLat) && Number.isFinite(geoLng)) {
    return { lat: geoLat as number, lng: geoLng as number, zoom: 10 };
  }
  return null;
}

export { resolveIlCenterFromSearchQuery } from "@/lib/haberHaritasiLocationContext";
