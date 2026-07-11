import {
  allHaberHaritasiMatchLocations,
  isTurkishProvinceName,
  type HaberHaritasiLocation,
} from "@/lib/haberHaritasiLocations";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import { headlineFromContentMatch } from "@/lib/haberHaritasiDeepLink";
import {
  normalizeHmMapCityKey,
  type HmMapCityContentMatch,
  type HmMapCityHeadline,
} from "@/lib/hmMapCityNews";

export type NewsmapGeoFilter = {
  lat: number;
  lng: number;
  radiusKm: number;
  /** viewport = harita merkezi + zoom; user = «Beni bul» 30 km */
  source: "viewport" | "user";
};

export const NEWSMAP_USER_LOCATE_RADIUS_KM = 30;

const EARTH_RADIUS_KM = 6371;

/** Haversine — iki nokta arası km. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Yakın zoom = dar yarıçap; uzak zoom = geniş haber alanı. */
export function newsmapRadiusKmFromZoom(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : 7;
  if (z >= 12) return 15;
  if (z >= 11) return 25;
  if (z >= 10) return 30;
  if (z >= 9) return 50;
  if (z >= 8) return 100;
  if (z >= 7) return 200;
  if (z >= 6) return 450;
  if (z >= 5) return 900;
  return 2500;
}

export type HaberHaritasiCoordMeta = {
  lat: number;
  lng: number;
  label: string;
  countryCode: string;
  isTurkish: boolean;
};

export function buildHaberHaritasiCoordIndex(
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>,
): Map<string, HaberHaritasiCoordMeta> {
  const index = new Map<string, HaberHaritasiCoordMeta>();
  const put = (key: string, meta: HaberHaritasiCoordMeta) => {
    index.set(key, meta);
    index.set(normalizeHmMapCityKey(meta.label), meta);
  };
  for (const loc of allHaberHaritasiMatchLocations(ilCenters)) {
    const meta: HaberHaritasiCoordMeta = {
      lat: loc.lat,
      lng: loc.lng,
      label: loc.label,
      countryCode: loc.countryCode,
      isTurkish: loc.kind === "tr-province" || isTurkishProvinceName(loc.label),
    };
    put(loc.key, meta);
  }
  for (const il of ilCenters) {
    put(normalizeHmMapCityKey(il.adi), {
      lat: il.lat,
      lng: il.lng,
      label: il.adi,
      countryCode: "TR",
      isTurkish: true,
    });
  }
  return index;
}

export function headlineExtrasFromCoordMeta(meta: HaberHaritasiCoordMeta): {
  countryCode: string;
  flagEmoji: string;
  isTurkish: boolean;
  geoLat: number;
  geoLng: number;
} {
  return {
    countryCode: meta.countryCode,
    flagEmoji: countryCodeToFlagEmoji(meta.countryCode),
    isTurkish: meta.isTurkish,
    geoLat: meta.lat,
    geoLng: meta.lng,
  };
}

export function isWithinNewsmapRadius(
  lat: number,
  lng: number,
  center: Pick<NewsmapGeoFilter, "lat" | "lng" | "radiusKm">,
): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return true;
  if (center.radiusKm >= 2500) return true;
  return haversineDistanceKm(center.lat, center.lng, lat, lng) <= center.radiusKm;
}

/** Ülke/küme zoom — içerik indeksinden anında alt bant / ticker satırları. */
export function buildNewsmapCountryClusterHeadlines(
  contentIndex: Map<string, HmMapCityContentMatch>,
  coordIndex: Map<string, HaberHaritasiCoordMeta>,
  opts?: { kindFilter?: "all" | "news" | "video" },
): HmMapCityHeadline[] {
  const rows: HmMapCityHeadline[] = [];
  for (const [key, match] of contentIndex) {
    if (opts?.kindFilter === "news" && match.kind !== "news") continue;
    if (opts?.kindFilter === "video" && match.kind !== "video") continue;
    const coord = coordIndex.get(key);
    const label = coord?.label ?? key;
    const extras = coord
      ? headlineExtrasFromCoordMeta(coord)
      : { countryCode: "TR", flagEmoji: "🇹🇷", isTurkish: true as const, geoLat: undefined, geoLng: undefined };
    rows.push(headlineFromContentMatch(label, match, extras));
  }
  rows.sort(
    (a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
  );
  return rows;
}

export function filterHaberHaritasiHeadlines(
  headlines: HmMapCityHeadline[],
  coordIndex: Map<string, { lat: number; lng: number; label: string }>,
  filter: NewsmapGeoFilter | null,
  limit = 48,
): HmMapCityHeadline[] {
  if (!filter) return headlines.slice(0, limit);
  const rows = headlines.filter((row) => {
    const key = normalizeHmMapCityKey(row.city);
    const coord = coordIndex.get(key);
    if (!coord) return filter.radiusKm >= 900;
    return isWithinNewsmapRadius(coord.lat, coord.lng, filter);
  });
  return rows.slice(0, limit);
}

export function filterHaberHaritasiContentIndex(
  index: Map<string, HmMapCityContentMatch>,
  coordIndex: Map<string, { lat: number; lng: number; label: string }>,
  filter: NewsmapGeoFilter | null,
): Map<string, HmMapCityContentMatch> {
  if (!filter) return index;
  const out = new Map<string, HmMapCityContentMatch>();
  for (const [key, match] of index) {
    const coord = coordIndex.get(key);
    if (!coord) continue;
    if (isWithinNewsmapRadius(coord.lat, coord.lng, filter)) {
      out.set(key, match);
    }
  }
  return out;
}

export function filterHaberHaritasiLocations<T extends Pick<HaberHaritasiLocation, "lat" | "lng">>(
  locations: T[],
  filter: NewsmapGeoFilter | null,
): T[] {
  if (!filter) return locations;
  return locations.filter((loc) => isWithinNewsmapRadius(loc.lat, loc.lng, filter));
}

export function newsmapGeoFilterFromMapView(
  center: { lat: number; lng: number },
  zoom: number,
): NewsmapGeoFilter {
  return {
    lat: center.lat,
    lng: center.lng,
    radiusKm: newsmapRadiusKmFromZoom(zoom),
    source: "viewport",
  };
}

export function newsmapGeoFilterFromUserLocation(lat: number, lng: number): NewsmapGeoFilter {
  return {
    lat,
    lng,
    radiusKm: NEWSMAP_USER_LOCATE_RADIUS_KM,
    source: "user",
  };
}
