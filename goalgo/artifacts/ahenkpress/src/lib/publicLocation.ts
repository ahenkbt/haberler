import { reverseGeocodeHybrid, type MapsGeocodeSettings } from "@/lib/mapsGeocode";

export const PUBLIC_LOCATION_STORAGE_KEY = "yekpare_public_location_v2";
export const PUBLIC_LOCATION_UPDATED_EVENT = "yekpare:public-location-updated";

export type PublicLocationState = {
  lat: number;
  lng: number;
  label: string;
  city: string;
  district: string;
  updatedAt: number;
};

function normalizeLocation(input: unknown): PublicLocationState | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Partial<PublicLocationState>;
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    label: String(row.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`),
    city: String(row.city || ""),
    district: String(row.district || ""),
    updatedAt: Number(row.updatedAt || Date.now()),
  };
}

export function readPublicLocation(): PublicLocationState | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeLocation(JSON.parse(localStorage.getItem(PUBLIC_LOCATION_STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
}

export function formatPublicLocationLabel(
  location: PublicLocationState | null,
  fallback = "Adres / konum seç",
): string {
  if (!location) return fallback;
  const parts = [location.district, location.city].filter(Boolean);
  return location.label?.trim() || parts.join(", ") || fallback;
}

export function savePublicLocation(location: PublicLocationState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PUBLIC_LOCATION_STORAGE_KEY, JSON.stringify(location));
    window.dispatchEvent(new CustomEvent(PUBLIC_LOCATION_UPDATED_EVENT, { detail: location }));
  } catch {
    /* ignore */
  }
}

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
      ...options,
    });
  });
}

export async function requestPublicLocation(
  mapsSettings: MapsGeocodeSettings | null | undefined,
  options?: PositionOptions,
): Promise<PublicLocationState> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    throw new Error("Tarayıcı konum iznini desteklemiyor.");
  }
  const pos = await getCurrentPosition(options);
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  let city = "";
  let district = "";
  try {
    const addr = await reverseGeocodeHybrid(mapsSettings, lat, lng);
    label = addr.label || label;
    city = addr.city || "";
    district = addr.district || "";
  } catch {
    /* Coordinates are still useful if address lookup is unavailable. */
  }
  const next = { lat, lng, label, city, district, updatedAt: Date.now() };
  savePublicLocation(next);
  return next;
}
