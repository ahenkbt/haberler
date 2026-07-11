import { apiUrl } from "@/lib/apiBase";
import { queueNewsmapBusinessScrape, newsmapScrapeRadiusMeters } from "@/lib/haberHaritasiNewsmapScrape";
import { newsmapGeoFilterFromUserLocation } from "@/lib/haberHaritasiGeoFilter";
import {
  HABER_HARITASI_GLOBAL_LOCATIONS,
  isTurkishProvinceName,
  matchHaberHaritasiGlobalLocation,
  type HaberHaritasiLocation,
} from "@/lib/haberHaritasiLocations";
import { resolveIlCenterFromSearchQuery } from "@/lib/newsmapSidebarHeadlines";

export const MAPS_PLACES_PREVIEW_LIMIT = 15;
export const MAPS_FETCH_TIMEOUT_MS = 5000;

/** Harici/DB istekleri — sonsuz spinner önleme. */
export async function fetchJsonWithTimeout<T>(
  url: string,
  opts?: { timeoutMs?: number; init?: RequestInit },
): Promise<{ ok: boolean; data: T | null; status: number }> {
  const timeoutMs = opts?.timeoutMs ?? MAPS_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts?.init,
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await res.json().catch(() => null) as T | null;
    return { ok: res.ok, data, status: res.status };
  } catch {
    return { ok: false, data: null, status: 0 };
  } finally {
    window.clearTimeout(timer);
  }
}

type PlacePreviewRow = {
  id: string;
  googlePlaceId?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  userRatingsTotal?: number;
  website?: string;
  phone?: string;
  googlePlacesExtras?: Record<string, unknown> | null;
  distance?: number;
};

export function mergeBusinessesWithPlacesPreview<T extends PlacePreviewRow>(
  dbRows: T[],
  previewRows: T[],
): T[] {
  const existingPlaceIds = new Set(dbRows.map((b) => b.googlePlaceId).filter(Boolean));
  const existingNames = new Set(
    dbRows.map((b) => `${b.name}|${b.address || ""}`.toLocaleLowerCase("tr-TR"),
  ));
  const previews = previewRows.filter((p) => {
    const placeId = p.googlePlaceId;
    if (placeId && existingPlaceIds.has(placeId)) return false;
    return !existingNames.has(`${p.name}|${p.address || ""}`.toLocaleLowerCase("tr-TR"));
  });
  return [...dbRows, ...previews];
}

/** Google Places text search — konum adına göre (TR: işletmeler, global: restaurants). */
export function buildPlacesPreviewQuery(locationLabel: string | null | undefined): string {
  const label = String(locationLabel ?? "").trim().split(",")[0]?.trim() || "";
  if (!label) return "restaurants";
  if (isTurkishProvinceName(label)) return `${label} işletmeler`;
  const globalLoc = matchHaberHaritasiGlobalLocation(label);
  const preferEnglish =
    !globalLoc &&
    !/[çğıöşüÇĞİÖŞÜ]/.test(label) &&
    /^[a-z0-9 .'-]+$/i.test(label);
  return preferEnglish ? `${label} restaurants` : `${label} işletmeler`;
}

function inferPlacesRegionCodeFromCoords(lat: number, lng: number): string | undefined {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat >= 35.5 && lat <= 42.5 && lng >= 25.5 && lng <= 45.0) return "TR";
  if (lat >= 34.9 && lat <= 35.85 && lng >= 32.5 && lng <= 34.95) return "CY";
  if (lat >= 38.3 && lat <= 42.0 && lng >= 44.5 && lng <= 51.0) return "AZ";
  if (lat >= 38.5 && lat <= 41.5 && lng >= 43.5 && lng <= 46.5) return "AM";
  if (lat >= 41.0 && lng >= 41.0 && lng <= 46.5) return "GE";
  if (lat >= 35.0 && lat <= 42.0 && lng >= 26.0 && lng <= 45.0) return undefined;
  return undefined;
}

export function resolvePlacesSearchRegionCode(
  lat: number,
  lng: number,
  countryCode?: string | null,
): string | undefined {
  const explicit = String(countryCode ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(explicit) && explicit !== "EU") return explicit;
  return inferPlacesRegionCodeFromCoords(lat, lng);
}

export type NewsmapBusinessLocationScope = {
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  countryCode?: string;
  isTrProvince: boolean;
};

/** Konum paneli / İşletmeler — TR il + küresel konum merkezi. */
export function resolveNewsmapBusinessLocationScope(input: {
  selectedNewsmapCity?: string | null;
  selectedLocation?: { name?: string | null; nameTr?: string | null; latitude: number; longitude: number; zoomLevel?: number } | null;
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>;
  globalLocations?: HaberHaritasiLocation[];
}): NewsmapBusinessLocationScope | null {
  const cityLabel = String(input.selectedNewsmapCity ?? "").trim().split(",")[0]?.trim() || "";
  const locLabel = String(input.selectedLocation?.nameTr ?? input.selectedLocation?.name ?? "").trim().split(",")[0]?.trim() || "";
  const label = cityLabel || locLabel;

  if (input.selectedLocation) {
    const lat = Number(input.selectedLocation.latitude);
    const lng = Number(input.selectedLocation.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const primaryLabel = label || locLabel || "Konum";
      const il = resolveIlCenterFromSearchQuery(primaryLabel, input.ilCenters);
      if (il) {
        return {
          label: il.adi,
          lat: il.lat,
          lng: il.lng,
          zoom: Math.max(il.zoom ?? 10, 10),
          countryCode: "TR",
          isTrProvince: true,
        };
      }
      const globalLoc = matchHaberHaritasiGlobalLocation(primaryLabel, input.globalLocations);
      if (globalLoc) {
        return {
          label: globalLoc.label,
          lat: globalLoc.lat,
          lng: globalLoc.lng,
          zoom: globalLoc.zoom ?? (globalLoc.kind === "country" ? 8 : 10),
          countryCode: globalLoc.countryCode,
          isTrProvince: false,
        };
      }
      return {
        label: primaryLabel,
        lat,
        lng,
        zoom: input.selectedLocation.zoomLevel ?? 10,
        isTrProvince: isTurkishProvinceName(primaryLabel),
      };
    }
  }

  if (!label) {
    return null;
  }

  const il = resolveIlCenterFromSearchQuery(label, input.ilCenters);
  if (il) {
    return {
      label: il.adi,
      lat: il.lat,
      lng: il.lng,
      zoom: Math.max(il.zoom ?? 10, 10),
      countryCode: "TR",
      isTrProvince: true,
    };
  }

  const globalLoc = matchHaberHaritasiGlobalLocation(label, input.globalLocations);
  if (globalLoc) {
    return {
      label: globalLoc.label,
      lat: globalLoc.lat,
      lng: globalLoc.lng,
      zoom: globalLoc.zoom ?? (globalLoc.kind === "country" ? 8 : 10),
      countryCode: globalLoc.countryCode,
      isTrProvince: false,
    };
  }

  if (input.selectedLocation) {
    return {
      label,
      lat: input.selectedLocation.latitude,
      lng: input.selectedLocation.longitude,
      zoom: input.selectedLocation.zoomLevel ?? 10,
      isTrProvince: isTurkishProvinceName(label),
    };
  }

  return null;
}

export async function fetchPlacesPreviewForLocation(input: {
  lat: number;
  lng: number;
  q?: string;
  radius?: number;
  limit?: number;
  regionCode?: string;
}): Promise<PlacePreviewRow[]> {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const q = String(input.q || "işletmeler").trim();
  const limit = Math.min(MAPS_PLACES_PREVIEW_LIMIT, Math.max(1, input.limit ?? MAPS_PLACES_PREVIEW_LIMIT));
  try {
    const params = new URLSearchParams({ q, limit: String(limit) });
    params.set("lat", String(lat));
    params.set("lng", String(lng));
    params.set("radius", String(input.radius ?? 25000));
    const regionCode = resolvePlacesSearchRegionCode(lat, lng, input.regionCode);
    if (regionCode) params.set("regionCode", regionCode);
    const r = await fetch(apiUrl(`/api/map/places/search?${params}`), { cache: "no-store" });
    const d = await r.json().catch(() => ({})) as {
      success?: boolean;
      configured?: boolean;
      data?: Array<{
        googlePlaceId?: string | null;
        name?: string | null;
        address?: string | null;
        latitude?: number | string | null;
        longitude?: number | string | null;
        rating?: number | string | null;
        userRatingsTotal?: number | string | null;
        website?: string | null;
        phone?: string | null;
        googlePlaceType?: string | null;
      }>;
    };
    if (!r.ok || d.success === false || d.configured === false) return [];
    return (d.data ?? [])
      .map((p) => ({
        id: `google-preview-${p.googlePlaceId || `${p.latitude}-${p.longitude}-${p.name}`}`,
        googlePlaceId: p.googlePlaceId ?? undefined,
        name: String(p.name ?? "").trim(),
        address: String(p.address ?? "").trim(),
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        rating: Number(p.rating),
        userRatingsTotal: Number(p.userRatingsTotal),
        website: p.website ?? undefined,
        phone: p.phone ?? undefined,
        googlePlacesExtras: { previewOnly: true, googlePlaceType: p.googlePlaceType },
      }))
      .filter((p) => p.name && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
  } catch {
    return [];
  }
}

/** Fire-and-forget Sarı Sayfalar scrape queue — no UI feedback. */
export function triggerSilentRegionBusinessScrape(input: {
  lat: number;
  lng: number;
  label: string;
  radiusMeters?: number;
}): void {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const filter = newsmapGeoFilterFromUserLocation(lat, lng);
  const radiusMeters = input.radiusMeters ?? newsmapScrapeRadiusMeters(filter);
  void queueNewsmapBusinessScrape({
    lat,
    lng,
    label: String(input.label || "Map location").trim().slice(0, 48) || "Map location",
    radiusMeters,
  });
}
