import {
  normalizeHmMapCityKey,
  type HmMapCityContentMatch,
  type HmMapCityHeadline,
} from "@/lib/hmMapCityNews";
import { headlineFromContentMatch } from "@/lib/haberHaritasiDeepLink";
import {
  headlineExtrasFromCoordMeta,
  type HaberHaritasiCoordMeta,
} from "@/lib/haberHaritasiGeoFilter";

export const NEWSMAP_CLUSTER_MAX_ZOOM = 8;
export const NEWSMAP_WIDE_CALLOUT_MAX = 96;
export const NEWSMAP_CALLOUT_MAX_VISIBLE = 96;

export function newsmapCalloutLimitFromZoom(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : TURKEY_DEFAULT_NEWSMAP_ZOOM;
  return z <= NEWSMAP_CLUSTER_MAX_ZOOM ? NEWSMAP_WIDE_CALLOUT_MAX : NEWSMAP_CALLOUT_MAX_VISIBLE;
}

export const TURKEY_DEFAULT_NEWSMAP_ZOOM = 7;

export function resolveNewsmapCityCount(
  counts: Map<string, number>,
  locKey: string,
  label?: string,
): number | undefined {
  const direct = counts.get(locKey);
  if (direct != null && direct > 0) return direct;
  if (label) {
    const byLabel = counts.get(normalizeHmMapCityKey(label));
    if (byLabel != null && byLabel > 0) return byLabel;
  }
  return undefined;
}

export type NewsmapCalloutPlacement = {
  headline: HmMapCityHeadline;
  lat: number;
  lng: number;
};

export function offsetNewsmapCalloutCoord(lat: number, lng: number, index: number): [number, number] {
  if (index <= 0) return [lat, lng];
  const angle = (index * 137.5 * Math.PI) / 180;
  const dist = 0.014 * Math.min(index, 4);
  return [lat + dist * Math.sin(angle), lng + dist * Math.cos(angle)];
}

export function buildNewsmapCalloutPlacements(
  headlines: HmMapCityHeadline[],
  coordIndex: Map<string, HaberHaritasiCoordMeta>,
  maxVisible = NEWSMAP_CALLOUT_MAX_VISIBLE,
): NewsmapCalloutPlacement[] {
  const cityCounts = new Map<string, number>();
  const placements: NewsmapCalloutPlacement[] = [];
  for (const headline of headlines) {
    if (placements.length >= maxVisible) break;
    const key = normalizeHmMapCityKey(headline.city);
    const coord =
      coordIndex.get(key) ??
      (Number.isFinite(headline.geoLat) && Number.isFinite(headline.geoLng)
        ? { lat: headline.geoLat!, lng: headline.geoLng!, label: headline.city }
        : undefined);
    if (!coord) continue;
    const idx = cityCounts.get(key) ?? 0;
    cityCounts.set(key, idx + 1);
    const [lat, lng] = offsetNewsmapCalloutCoord(coord.lat, coord.lng, idx);
    placements.push({ headline, lat, lng });
  }
  return placements;
}

export function buildNewsmapCalloutPlacementsFromContentIndex(
  contentIndex: Map<string, HmMapCityContentMatch>,
  coordIndex: Map<string, HaberHaritasiCoordMeta>,
  maxVisible = NEWSMAP_CALLOUT_MAX_VISIBLE,
): NewsmapCalloutPlacement[] {
  const rows = [...contentIndex.entries()]
    .map(([key, match]) => {
      const coord = coordIndex.get(key) ?? coordIndex.get(normalizeHmMapCityKey(key));
      if (!coord) return null;
      return { coord, match, ts: Date.parse(match.publishedAt ?? "") || 0 };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, maxVisible);

  return rows.map(({ coord, match }) => ({
    headline: headlineFromContentMatch(coord.label, match, headlineExtrasFromCoordMeta(coord)),
    lat: coord.lat,
    lng: coord.lng,
  }));
}
