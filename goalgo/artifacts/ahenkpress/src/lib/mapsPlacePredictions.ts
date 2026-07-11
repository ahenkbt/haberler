import {
  loadGoogleMapsScript,
  effectiveMapsGeocodeSettings,
  searchNominatimLocationSuggestions,
  type MapsGeocodeSettings,
} from "@/lib/mapsGeocode";
import { apiUrl } from "@/lib/apiBase";

export type PlacePredictionRow = { place_id: string; description: string };

export type PlacePredictionsDetailed = {
  predictions: PlacePredictionRow[];
  /** Ham Google status (örn. OK, ZERO_RESULTS, REQUEST_DENIED). */
  status: string;
  /** Ayarlarda Google açık ve tarayıcı anahtarı var mı? */
  configOk: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function googleMaps(): any {
  return typeof window !== "undefined" ? (window as unknown as { google?: { maps?: unknown } }).google?.maps : undefined;
}

/** Places Autocomplete + ham status (UI’da faturalandırma / kısıt mesajı için). */
export async function fetchGooglePlacePredictionsDetailed(
  settings: MapsGeocodeSettings | null | undefined,
  input: string,
  opts?: { restrictToTurkey?: boolean },
): Promise<PlacePredictionsDetailed> {
  const restrictToTurkey = opts?.restrictToTurkey !== false;
  const eff = effectiveMapsGeocodeSettings(settings);
  const key = (eff.mapsGoogleBrowserKey ?? "").trim();
  if (!key) {
    return { predictions: [], status: "CONFIG_DISABLED", configOk: false };
  }
  const q = input.trim();
  if (q.length < 2) {
    return { predictions: [], status: "SHORT_INPUT", configOk: true };
  }
  const loaded = await loadGoogleMapsScript(key);
  if (!loaded.ok) {
    return { predictions: [], status: "SCRIPT_LOAD_FAILED", configOk: true };
  }
  const AutocompleteService = googleMaps()?.places?.AutocompleteService as
    | (new () => {
        getPlacePredictions(
          request: { input: string; componentRestrictions?: { country: string } },
          callback: (predictions: Array<{ place_id: string; description: string }> | null, status: string) => void,
        ): void;
      })
    | undefined;
  if (!AutocompleteService) {
    return { predictions: [], status: "NO_AUTOCOMPLETE_SERVICE", configOk: true };
  }
  const service = new AutocompleteService();
  return new Promise((resolve) => {
    const request: { input: string; componentRestrictions?: { country: string } } = { input: q };
    if (restrictToTurkey) request.componentRestrictions = { country: "tr" };
    service.getPlacePredictions(request, (predictions, status) => {
      const st = String(status);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const OK = (window as any).google?.maps?.places?.PlacesServiceStatus?.OK ?? "OK";
      if (!predictions || st !== OK) {
        resolve({ predictions: [], status: st, configOk: true });
        return;
      }
      resolve({
        predictions: predictions.slice(0, 8).map((p) => ({ place_id: p.place_id, description: p.description })),
        status: st,
        configOk: true,
      });
    });
  });
}

/** Places Autocomplete predictions (browser key + Places API etkin olmalı). */
export async function fetchGooglePlacePredictions(
  settings: MapsGeocodeSettings | null | undefined,
  input: string,
): Promise<PlacePredictionRow[]> {
  const r = await fetchGooglePlacePredictionsDetailed(settings, input);
  return r.predictions;
}

const mapApiUrl = (path: string) => apiUrl(path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`);

export type HybridLocationSuggestionRow = PlacePredictionRow & {
  lat?: number;
  lng?: number;
  zoom?: number;
  source?: "google" | "nominatim" | "static" | "popular";
};

function normalizeSuggestionLookupKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i");
}

/** 81 il merkezleri + keşif dizini — Google/OSM yokken yer adı önerileri. */
export function searchStaticTurkishLocationSuggestions(
  rawQuery: string,
  ilCenters: Array<{ plaka?: number | null; adi: string; lat: number; lng: number; zoom: number }>,
  discoveryCities: Array<{ slug: string; label: string; lat: number; lng: number; zoom?: number; regionLabel?: string }>,
  popularCityNames: readonly string[] = [],
  limit = 8,
): HybridLocationSuggestionRow[] {
  const q = normalizeSuggestionLookupKey(rawQuery);
  if (q.length < 2) return [];
  const out: HybridLocationSuggestionRow[] = [];
  const seen = new Set<string>();
  const push = (row: HybridLocationSuggestionRow) => {
    const key = normalizeSuggestionLookupKey(row.description);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };

  for (const city of discoveryCities) {
    const labelKey = normalizeSuggestionLookupKey(city.label);
    const slugKey = normalizeSuggestionLookupKey(city.slug.replace(/-/g, " "));
    if (labelKey.includes(q) || slugKey.includes(q) || q.includes(labelKey)) {
      push({
        place_id: `discovery:${city.slug}`,
        description: city.regionLabel ? `${city.label}, ${city.regionLabel}` : city.label,
        lat: city.lat,
        lng: city.lng,
        zoom: city.zoom ?? 12,
        source: "static",
      });
    }
  }

  for (const il of ilCenters) {
    const key = normalizeSuggestionLookupKey(il.adi);
    if (key.includes(q) || q.includes(key)) {
      push({
        place_id: `il:${il.plaka ?? il.adi}`,
        description: il.adi,
        lat: il.lat,
        lng: il.lng,
        zoom: Math.max(10, il.zoom || 11),
        source: "static",
      });
    }
  }

  const rawLower = rawQuery.toLocaleLowerCase("tr-TR");
  for (const il of ilCenters) {
    const ilLower = il.adi.toLocaleLowerCase("tr-TR");
    if (!rawLower.includes(ilLower)) continue;
    const districtPart = rawQuery.split(",")[0]?.trim();
    if (districtPart && districtPart.toLocaleLowerCase("tr-TR") !== ilLower) {
      push({
        place_id: `ilce:${il.plaka ?? il.adi}:${districtPart}`,
        description: `${districtPart}, ${il.adi}`,
        lat: il.lat,
        lng: il.lng,
        zoom: 12,
        source: "static",
      });
    }
  }

  if (out.length < Math.min(3, limit)) {
    for (const name of popularCityNames) {
      const key = normalizeSuggestionLookupKey(name);
      if (!key.includes(q) && q.length > 2) continue;
      const il = ilCenters.find((row) => normalizeSuggestionLookupKey(row.adi) === key);
      if (!il) continue;
      push({
        place_id: `popular:${key}`,
        description: il.adi,
        lat: il.lat,
        lng: il.lng,
        zoom: Math.max(10, il.zoom || 11),
        source: "popular",
      });
    }
  }

  return out.slice(0, limit);
}

/** Google → Nominatim → statik il/ilçe → popüler şehirler. */
export async function fetchHybridLocationSuggestionsDetailed(
  settings: MapsGeocodeSettings | null | undefined,
  input: string,
  opts?: {
    ilCenters?: Array<{ plaka?: number | null; adi: string; lat: number; lng: number; zoom: number }>;
    discoveryCities?: Array<{ slug: string; label: string; lat: number; lng: number; zoom?: number; regionLabel?: string }>;
    popularCityNames?: readonly string[];
    limit?: number;
    /** Haber haritası /maps — dünya geneli Places (varsayılan: true). */
    global?: boolean;
  },
): Promise<HybridLocationSuggestionRow[]> {
  const q = input.trim();
  const limit = opts?.limit ?? 8;
  const globalScope = opts?.global !== false;
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const merged: HybridLocationSuggestionRow[] = [];
  const append = (rows: HybridLocationSuggestionRow[]) => {
    for (const row of rows) {
      const key = normalizeSuggestionLookupKey(row.description);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
      if (merged.length >= limit) break;
    }
  };

  try {
    const globalQs = globalScope ? "&global=1" : "";
    const r = await fetch(mapApiUrl(`/map/places/autocomplete?input=${encodeURIComponent(q)}${globalQs}`));
    const d = await r.json();
    if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
      append(
        d.data
          .map((row: { placeId?: string; label?: string }) => ({
            place_id: String(row.placeId ?? "").trim(),
            description: String(row.label ?? "").trim(),
            source: "google" as const,
          }))
          .filter((row: PlacePredictionRow) => row.place_id && row.description),
      );
    }
  } catch {
    /* fall through */
  }

  if (merged.length < limit) {
    const googleRows = await fetchGooglePlacePredictionsDetailed(settings, q, { restrictToTurkey: !globalScope });
    append(googleRows.predictions.map((row) => ({ ...row, source: "google" as const })));
  }

  if (merged.length < limit) {
    const nominatimRows = await searchNominatimLocationSuggestions(q, limit);
    append(
      nominatimRows.map((row) => ({
        place_id: row.id,
        description: row.label,
        lat: row.lat,
        lng: row.lng,
        zoom: row.zoom,
        source: "nominatim" as const,
      })),
    );
  }

  if (merged.length < limit && opts?.ilCenters?.length) {
    append(
      searchStaticTurkishLocationSuggestions(
        q,
        opts.ilCenters,
        opts.discoveryCities ?? [],
        opts.popularCityNames ?? [],
        limit - merged.length,
      ),
    );
  }

  return merged.slice(0, limit);
}

/** Firma rehberi / Sarı Sayfalar konum araması — dünya geneli Google Places + yedekler. */
export async function fetchGlobalSearchLocationPredictions(
  settings: MapsGeocodeSettings | null | undefined,
  input: string,
): Promise<PlacePredictionRow[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const merged: PlacePredictionRow[] = [];
  const append = (rows: PlacePredictionRow[]) => {
    for (const row of rows) {
      const key = normalizeSuggestionLookupKey(row.description);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
      if (merged.length >= 8) break;
    }
  };

  try {
    const r = await fetch(mapApiUrl(`/map/places/autocomplete?input=${encodeURIComponent(q)}&global=1`));
    const d = await r.json();
    if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
      append(
        d.data
          .map((row: { placeId?: string; label?: string }) => ({
            place_id: String(row.placeId ?? "").trim(),
            description: String(row.label ?? "").trim(),
          }))
          .filter((row: PlacePredictionRow) => row.place_id && row.description),
      );
    }
  } catch {
    /* fall through */
  }

  if (merged.length < 8) {
    const googleRows = await fetchGooglePlacePredictionsDetailed(settings, q, { restrictToTurkey: false });
    append(googleRows.predictions);
  }

  if (merged.length < 8) {
    const nominatimRows = await searchNominatimLocationSuggestions(q, 8);
    append(
      nominatimRows.map((row) => ({
        place_id: row.id,
        description: row.label,
      })),
    );
  }

  return merged.slice(0, 8);
}

export async function geocodePlaceIdHybrid(
  settings: MapsGeocodeSettings | null | undefined,
  placeId: string,
): Promise<{ lat: number; lng: number; formatted_address?: string } | null> {
  const id = placeId.trim();
  if (!id) return null;
  try {
    const r = await fetch(mapApiUrl(`/map/places/details?placeId=${encodeURIComponent(id)}`));
    const d = await r.json();
    const row = d?.data;
    if (d?.success && row) {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng, formatted_address: String(row.formattedAddress ?? "") };
      }
    }
  } catch {
    /* fall through */
  }
  return geocodePlaceIdClient(settings, id);
}

/** Sunucu `/map/places/autocomplete` → tarayıcı Places → Nominatim → statik il/ilçe. */
export async function fetchHybridPlacePredictions(
  settings: MapsGeocodeSettings | null | undefined,
  input: string,
  opts?: {
    ilCenters?: Array<{ plaka?: number | null; adi: string; lat: number; lng: number; zoom: number }>;
    discoveryCities?: Array<{ slug: string; label: string; lat: number; lng: number; zoom?: number; regionLabel?: string }>;
    popularCityNames?: readonly string[];
  },
): Promise<PlacePredictionRow[]> {
  const rows = await fetchHybridLocationSuggestionsDetailed(settings, input, opts);
  return rows.map(({ place_id, description }) => ({ place_id, description }));
}

/** placeId → koordinat (konum seçimi / nokta atışı). */
export async function geocodePlaceIdClient(
  settings: MapsGeocodeSettings | null | undefined,
  placeId: string,
): Promise<{ lat: number; lng: number; formatted_address?: string } | null> {
  const eff = effectiveMapsGeocodeSettings(settings);
  const key = (eff.mapsGoogleBrowserKey ?? "").trim();
  if (!eff.mapsGoogleEnabled || !key || !placeId.trim()) return null;
  const loaded = await loadGoogleMapsScript(key);
  if (!loaded.ok) return null;
  const Geocoder = googleMaps()?.Geocoder;
  if (!Geocoder) return null;
  const geocoder = new Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ placeId: placeId.trim() }, (results: unknown, status: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const OK = (window as any).google?.maps?.GeocoderStatus?.OK ?? "OK";
      const row = Array.isArray(results) ? (results[0] as { geometry?: { location: { lat(): number; lng(): number } | { lat: number; lng: number } }; formatted_address?: string } | undefined) : undefined;
      if (status !== OK || !row?.geometry?.location) {
        resolve(null);
        return;
      }
      const loc = row.geometry.location;
      const lat = typeof loc.lat === "function" ? loc.lat() : (loc as { lat: number }).lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : (loc as { lng: number }).lng;
      resolve({ lat, lng, formatted_address: row.formatted_address });
    });
  });
}
