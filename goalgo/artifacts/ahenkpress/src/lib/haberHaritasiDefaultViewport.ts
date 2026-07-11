import { HABER_HARITASI_GLOBAL_LOCATIONS, type HaberHaritasiLocation } from "@/lib/haberHaritasiLocations";

export const TURKEY_DEFAULT_MAP_CENTER = { lat: 39.0, lng: 35.0 } as const;
export const TURKEY_DEFAULT_MAP_ZOOM = 6;
export const TURKEY_DEFAULT_MIN_ZOOM = 5;
export const TURKEY_DEFAULT_MAP_BOUNDS: [[number, number], [number, number]] = [[35.65, 25.65], [42.5, 45.5]];
export const TURKEY_DEFAULT_PAN_BOUNDS: [[number, number], [number, number]] = [[35.2, 25.0], [42.9, 46.0]];
export const TURKEY_DEFAULT_FIT_PADDING: [number, number] = [12, 12];

export type NewsmapDefaultViewPlan = {
  countryCode: string;
  label: string;
  center: { lat: number; lng: number };
  zoom: number;
  minZoom: number;
  bounds: [[number, number], [number, number]] | null;
  panBounds: [[number, number], [number, number]] | null;
  padding: [number, number];
};

/** Newsmap açılış — dünya geneli haber yoğunluğu (Türkiye-only değil). */
export function getNewsmapWorldViewPlan(): NewsmapDefaultViewPlan {
  return {
    countryCode: "WORLD",
    label: "Dünya",
    center: { lat: 28, lng: 18 },
    zoom: 3,
    minZoom: 2,
    bounds: [[-58, -175], [72, 175]],
    panBounds: [[-85, -180], [85, 180]],
    padding: [20, 20],
  };
}

/** Türkiye varsayılan görünüm — mevcut haber haritası davranışı. */
export function getNoTargetTurkeyViewPlan(): NewsmapDefaultViewPlan {
  return {
    countryCode: "TR",
    label: "Türkiye",
    center: { ...TURKEY_DEFAULT_MAP_CENTER },
    zoom: TURKEY_DEFAULT_MAP_ZOOM,
    minZoom: TURKEY_DEFAULT_MIN_ZOOM,
    bounds: TURKEY_DEFAULT_MAP_BOUNDS,
    panBounds: TURKEY_DEFAULT_PAN_BOUNDS,
    padding: TURKEY_DEFAULT_FIT_PADDING,
  };
}

function countryLocationForCode(countryCode: string): HaberHaritasiLocation | null {
  const code = countryCode.toUpperCase();
  const countryRow = HABER_HARITASI_GLOBAL_LOCATIONS.find(
    (loc) => loc.countryCode === code && loc.kind === "country",
  );
  if (countryRow) return countryRow;
  return HABER_HARITASI_GLOBAL_LOCATIONS.find((loc) => loc.countryCode === code) ?? null;
}

function approximateCountryBounds(lat: number, lng: number, zoom: number): [[number, number], [number, number]] {
  const span = zoom >= 8 ? 4 : zoom >= 6 ? 8 : zoom >= 5 ? 14 : 22;
  const lngSpan = span / Math.max(0.35, Math.abs(Math.cos((lat * Math.PI) / 180)));
  return [
    [lat - span, lng - lngSpan],
    [lat + span, lng + lngSpan],
  ];
}

/** Ziyaretçi ülkesine göre varsayılan harita görünümü; bilinmiyorsa Türkiye. */
export function getNewsmapDefaultViewPlan(countryCode: string | null | undefined): NewsmapDefaultViewPlan {
  const code = String(countryCode ?? "TR").trim().toUpperCase();
  if (!code || code === "TR" || code === "TUR" || code === "XX") {
    return getNoTargetTurkeyViewPlan();
  }

  const loc = countryLocationForCode(code);
  if (!loc) return getNoTargetTurkeyViewPlan();

  const zoom = loc.kind === "country" ? Math.max(5, loc.zoom) : Math.max(7, loc.zoom);
  const bounds = approximateCountryBounds(loc.lat, loc.lng, zoom);
  return {
    countryCode: code,
    label: loc.label,
    center: { lat: loc.lat, lng: loc.lng },
    zoom,
    minZoom: Math.max(4, zoom - 2),
    bounds,
    panBounds: bounds,
    padding: [18, 18],
  };
}

export function isInsideTurkeyDefaultBounds(lat: number, lng: number): boolean {
  const [[south, west], [north, east]] = TURKEY_DEFAULT_MAP_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function isInsideViewPlanBounds(
  lat: number,
  lng: number,
  plan: Pick<NewsmapDefaultViewPlan, "bounds">,
): boolean {
  if (!plan.bounds) return true;
  const [[south, west], [north, east]] = plan.bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}
