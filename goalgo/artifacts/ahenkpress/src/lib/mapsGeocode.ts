/**
 * Konum: Google Maps JS Geocoder (site ayarında anahtar + açık) → başarısızsa Nominatim (OSM).
 * Anahtar Google Cloud’da HTTP referrer ile kısıtlanmalıdır.
 */

export type MapsGeocodeSettings = {
  mapsGoogleEnabled?: boolean | null;
  mapsGoogleBrowserKey?: string | null;
};

/** Vite derlemesinde: DB’de tarayıcı anahtarı boşken Railway/Vercel’deki yedek anahtar (referrer kısıtlı). */
function readViteGoogleMapsBrowserKey(): string {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_BROWSER_KEY;
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Admin’de “Google açık” ama `mapsGoogleBrowserKey` kaydedilmemişse canlı anahtarın Vite env’den gelmesi.
 * DB’de dolu anahtar her zaman önceliklidir.
 */
export function effectiveMapsGeocodeSettings(
  settings: MapsGeocodeSettings | null | undefined,
): MapsGeocodeSettings {
  const enabled = settings?.mapsGoogleEnabled === true;
  const dbKey = (settings?.mapsGoogleBrowserKey ?? "").trim();
  const viteKey = readViteGoogleMapsBrowserKey();
  const key = dbKey || (enabled && viteKey ? viteKey : "");
  return {
    mapsGoogleEnabled: enabled && key.length > 0,
    mapsGoogleBrowserKey: key.length > 0 ? key : null,
  };
}

const NOMINATIM_UA = "Yekpare/1.0";

export type GoogleMapsScriptLoadResult =
  | { ok: true }
  | { ok: false; reason: "empty_key" | "script_network" | "sdk_timeout" | "sdk_incomplete" };

let mapsLoadKey: string | null = null;
let mapsLoadPromise: Promise<GoogleMapsScriptLoadResult> | null = null;

/** Google, anahtar reddedildiğinde bu global’i çağırır — yüklemeden önce tanımlanmalı. */
let gmAuthFailureHookInstalled = false;
function ensureGmAuthFailureBroadcast(): void {
  if (typeof window === "undefined" || gmAuthFailureHookInstalled) return;
  gmAuthFailureHookInstalled = true;
  const w = window as unknown as { gm_authFailure?: () => void };
  const prev = w.gm_authFailure;
  w.gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent("yekpare-google-maps-auth-failure"));
    try {
      prev?.();
    } catch {
      /* ignore */
    }
  };
}

export function describeGoogleMapsLoadFailure(
  reason: "empty_key" | "script_network" | "sdk_timeout" | "sdk_incomplete",
): string {
  switch (reason) {
    case "empty_key":
      return "Tarayıcı API anahtarı yok.";
    case "script_network":
      return "maps.googleapis.com yüklenemedi (ağ / engelleyici).";
    case "sdk_timeout":
      return "Maps SDK zaman aşımı — anahtar geçersiz, referrer veya API listesi hatalı olabilir.";
    case "sdk_incomplete":
      return "Maps SDK eksik (Geocoder / Places). Cloud Console’da API kısıtlarını kontrol edin.";
    default:
      return "Bilinmeyen yükleme hatası.";
  }
}

type GoogleMapsNs = {
  Geocoder: new () => GoogleGeocoder;
  places?: { AutocompleteService?: new () => unknown };
};

function getGoogleMaps(): { maps?: GoogleMapsNs } | undefined {
  return (typeof window !== "undefined" ? (window as unknown as { google?: { maps?: GoogleMapsNs } }) : undefined)?.google;
}

/** Geocoder + Places (Autocomplete) — yalnız Geocoder yetince konum önerileri boş kalabiliyor. */
function googleMapsSdkReady(): boolean {
  const m = getGoogleMaps()?.maps;
  return Boolean(m?.Geocoder && m?.places?.AutocompleteService);
}

type GoogleGeocoder = {
  geocode(
    request: {
      location?: { lat: number; lng: number };
      address?: string;
      region?: string;
      placeId?: string;
    },
    callback: (results: GoogleGeocodeResult[] | null, status: string) => void,
  ): void;
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  address_components?: { long_name: string; short_name: string; types: string[] }[];
  geometry?: { location: { lat(): number; lng(): number } | { lat: number; lng: number } };
};

/** Ters geocoding: filtreler (city/district) + formda gösterilecek tam satır */
export type ReverseGeocodeResult = {
  city: string;
  district: string;
  label: string;
};

/** Null Island (0,0) ve geçersiz sayılar harita hedefi olarak kullanılmaz. */
export function isUsableMapCoordinate(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return false;
  return true;
}

export type NominatimLocationSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  zoom: number;
};

export async function searchNominatimLocationSuggestions(
  query: string,
  limit = 5,
): Promise<NominatimLocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${q}, Türkiye`)}&format=json&limit=${limit}&addressdetails=1&countrycodes=tr`,
      { headers: { "Accept-Language": "tr", "User-Agent": NOMINATIM_UA } },
    );
    const data = (await r.json()) as Array<{
      place_id?: number;
      lat: string;
      lon: string;
      display_name?: string;
      address?: Record<string, string>;
    }>;
    if (!Array.isArray(data)) return [];
    return data
      .map((row, index) => {
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lon);
        if (!isUsableMapCoordinate(lat, lng)) return null;
        const addr = row.address || {};
        const zoom = addr.city || addr.town || addr.state ? 11 : 13;
        return {
          id: `nominatim-${row.place_id ?? index}`,
          label: String(row.display_name || q).slice(0, 180),
          lat,
          lng,
          zoom,
        };
      })
      .filter((row): row is NominatimLocationSuggestion => row != null);
  } catch {
    return [];
  }
}

function parseGoogleAddressComponents(
  components: { long_name: string; types: string[] }[],
): { city: string; district: string; streetLine: string } {
  const pick = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? "";
  const province = pick("administrative_area_level_1");
  const locality = pick("locality");
  const district =
    pick("administrative_area_level_3") ||
    pick("sublocality_level_1") ||
    pick("sublocality") ||
    pick("neighborhood") ||
    pick("administrative_area_level_2");
  const city = (province || locality).replace(" Province", "").replace(" İli", "");
  const dist = (district || locality).replace(" Province", "").replace(" İli", "");
  const route = pick("route");
  const nr = pick("street_number");
  const streetLine = [route, nr].filter(Boolean).join(" ").trim();
  return { city, district: dist, streetLine };
}

/** Sokak + mahalle + ilçe + şehir (tekrarsız) */
function buildNominatimLabel(a: Record<string, string>): string {
  const road =
    [a.road, a.pedestrian, a.residential, a.path, a.footway, a.living_street].find((x) => x && String(x).trim()) ?? "";
  const hn = (a.house_number ?? "").trim();
  const line1 = [road, hn].filter(Boolean).join(" ").trim();
  const mahalle = a.neighbourhood || a.quarter || "";
  const ilce = a.city_district || a.suburb || a.town || a.county || "";
  const sehir = a.city || a.municipality || a.state || "";
  const parts = [line1, mahalle, ilce, sehir].map((p) => p.replace(" Province", "").replace(" İli", "").trim()).filter(Boolean);
  const uniq: string[] = [];
  for (const p of parts) {
    if (!uniq.length || uniq[uniq.length - 1].toLowerCase() !== p.toLowerCase()) uniq.push(p);
  }
  return uniq.join(", ");
}

export async function reverseGeocodeNominatim(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr&zoom=19&addressdetails=1`;
  const r = await fetch(url, {
    headers: { "Accept-Language": "tr", "User-Agent": NOMINATIM_UA },
  });
  const d = (await r.json()) as { address?: Record<string, string>; display_name?: string };
  const a = d?.address ?? {};
  const display = typeof d.display_name === "string" ? d.display_name.trim() : "";
  const built = buildNominatimLabel(a);
  /** display_name genelde en okunaklı; çok uzunsa derlenmiş satırı tercih et */
  const label =
    display && display.length <= 240 ? display : built || display.slice(0, 240);
  const cityRaw = a.city || a.town || a.municipality || a.county || a.province || a.state || "";
  const districtRaw = a.city_district || a.suburb || a.neighbourhood || a.quarter || a.county || "";
  const city = cityRaw.replace(" Province", "").replace(" İli", "");
  const district = districtRaw.replace(" Province", "").replace(" İli", "");
  const finalLabel = (label || built || [district, city].filter(Boolean).join(", ")).trim() || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return { city, district, label: finalLabel };
}

function clearGoogleMapsScriptState(): void {
  document.getElementById("google-maps-js-sdk")?.remove();
  mapsLoadPromise = null;
  mapsLoadKey = null;
  try {
    delete (window as unknown as { google?: unknown }).google;
  } catch {
    /* ignore */
  }
}

/** `loading=async` ile script bazen `onload` anında `Geocoder` hazır olmuyor; kısa aralıklarla bekler. */
function waitForGoogleMapsReady(maxMs: number): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (googleMapsSdkReady()) {
        resolve(true);
        return;
      }
      if (Date.now() - start >= maxMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

export async function loadGoogleMapsScript(apiKey: string): Promise<GoogleMapsScriptLoadResult> {
  if (typeof window === "undefined") return { ok: false, reason: "script_network" };
  const k = apiKey.trim();
  if (!k) return { ok: false, reason: "empty_key" };
  ensureGmAuthFailureBroadcast();
  if (googleMapsSdkReady()) return { ok: true };
  if (mapsLoadKey === k && mapsLoadPromise) return mapsLoadPromise;
  if (mapsLoadKey !== k) {
    clearGoogleMapsScriptState();
  }
  mapsLoadKey = k;
  mapsLoadPromise = (async (): Promise<GoogleMapsScriptLoadResult> => {
    const s = document.createElement("script");
    s.id = "google-maps-js-sdk";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(k)}&loading=async&libraries=places`;

    type LoadPhase = "network_error" | "sdk_failed" | "sdk_ok";
    const phase = await new Promise<LoadPhase>((resolveScript) => {
      s.onerror = () => resolveScript("network_error");
      s.onload = () => {
        void waitForGoogleMapsReady(12_000).then((ready) => resolveScript(ready ? "sdk_ok" : "sdk_failed"));
      };
      document.head.appendChild(s);
    });

    if (phase === "network_error") {
      clearGoogleMapsScriptState();
      return { ok: false, reason: "script_network" };
    }
    if (phase === "sdk_failed") {
      clearGoogleMapsScriptState();
      return { ok: false, reason: "sdk_timeout" };
    }
    if (!googleMapsSdkReady()) {
      clearGoogleMapsScriptState();
      return { ok: false, reason: "sdk_incomplete" };
    }
    return { ok: true };
  })();

  return mapsLoadPromise;
}

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const Geocoder = getGoogleMaps()?.maps?.Geocoder;
  if (!Geocoder) return null;
  const geocoder = new Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results?.[0]) {
        resolve(null);
        return;
      }
      const r0 = results[0] as GoogleGeocodeResult;
      const formatted = (r0.formatted_address ?? "").trim();
      if (!r0.address_components) {
        if (formatted) resolve({ city: "", district: "", label: formatted });
        else resolve(null);
        return;
      }
      const parsed = parseGoogleAddressComponents(r0.address_components);
      const label =
        formatted ||
        [parsed.streetLine, parsed.district, parsed.city].filter(Boolean).join(", ").trim() ||
        [parsed.district, parsed.city].filter(Boolean).join(", ");
      resolve({ city: parsed.city, district: parsed.district, label: label || formatted });
    });
  });
}

export async function reverseGeocodeHybrid(
  settings: MapsGeocodeSettings | null | undefined,
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult> {
  const eff = effectiveMapsGeocodeSettings(settings);
  const key = (eff.mapsGoogleBrowserKey ?? "").trim();
  const enabled = eff.mapsGoogleEnabled === true;
  if (enabled && key) {
    try {
      const loaded = await loadGoogleMapsScript(key);
      if (loaded.ok) {
        const g = await reverseGeocodeGoogle(lat, lon);
        if (g && (g.label || g.city || g.district)) return g;
      }
    } catch {
      /* Google kota / ağ hatası → OSM */
    }
  }
  return reverseGeocodeNominatim(lat, lon);
}

async function forwardGeocodeNominatimAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=tr`,
    { headers: { "Accept-Language": "tr", "User-Agent": NOMINATIM_UA } },
  );
  const data = (await r.json()) as { lat: string; lon: string }[];
  if (!data[0]) return null;
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (!isUsableMapCoordinate(lat, lng)) return null;
  return { lat, lng };
}

async function forwardGeocodeGoogleAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const Geocoder = getGoogleMaps()?.maps?.Geocoder;
  if (!Geocoder) return null;
  const geocoder = new Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ address, region: "tr" }, (results, status) => {
      if (status !== "OK" || !results?.[0]?.geometry?.location) {
        resolve(null);
        return;
      }
      const loc = results[0].geometry!.location;
      const lat = typeof loc.lat === "function" ? loc.lat() : (loc as { lat: number }).lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : (loc as { lng: number }).lng;
      resolve({ lat, lng });
    });
  });
}

/** Adres araması: Google (ayar açıksa) → yoksa Nominatim */
export async function forwardGeocodeAddressHybrid(
  settings: MapsGeocodeSettings | null | undefined,
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = address.trim();
  if (!q) return null;
  const eff = effectiveMapsGeocodeSettings(settings);
  const key = (eff.mapsGoogleBrowserKey ?? "").trim();
  const enabled = eff.mapsGoogleEnabled === true;
  if (enabled && key) {
    try {
      const loaded = await loadGoogleMapsScript(key);
      if (loaded.ok) {
        const g = await forwardGeocodeGoogleAddress(q);
        if (g) return g;
      }
    } catch {
      /* fallthrough */
    }
  }
  return forwardGeocodeNominatimAddress(q);
}
