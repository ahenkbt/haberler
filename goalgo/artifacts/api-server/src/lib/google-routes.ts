/**
 * Google Routes API v2 — ComputeRoutes (sunucu anahtarı).
 * Kota / izin hatalarında üst katman OSRM vb. yedek kullanır.
 */

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

/** Google encoded polyline → [lat, lng][] */
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const coordinates: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
  }
  return coordinates;
}

function parseGoogleDurationSeconds(d: string | undefined): number {
  if (!d || typeof d !== "string") return 0;
  const m = /^(\d+)s$/.exec(d.trim());
  return m ? Number(m[1]) : 0;
}

export type GoogleTravelModeApi = "DRIVE" | "WALK" | "TRANSIT";

export type GoogleRouteOk = {
  ok: true;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: Array<{ lat: number; lng: number }>;
  instructions: Array<{
    text: string;
    distanceMeters: number;
    durationSeconds: number;
    lat: number;
    lng: number;
  }>;
};

export type GoogleRouteFail = {
  ok: false;
  fallback: true;
  reason: "no_key" | "quota" | "permission" | "invalid" | "no_route" | "network" | "unknown";
  message?: string;
};

export type GoogleRouteResult = GoogleRouteOk | GoogleRouteFail;

type ComputeRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline?: string };
    legs?: Array<{
      steps?: Array<{
        distanceMeters?: number;
        staticDuration?: string;
        navigationInstruction?: { instructions?: string };
        startLocation?: { latLng?: { latitude?: number; longitude?: number } };
      }>;
    }>;
  }>;
  error?: { code?: number; message?: string; status?: string };
};

const FIELD_MASK =
  "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.startLocation,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration";

function isQuotaOrRateLimit(status: number, body: string): boolean {
  if (status === 429) return true;
  return /RESOURCE_EXHAUSTED|QUOTA|rateLimit|quota exceeded|429/i.test(body);
}

export async function computeGoogleRoute(
  apiKey: string,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelMode: GoogleTravelModeApi,
): Promise<GoogleRouteResult> {
  const body: Record<string, unknown> = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode,
    languageCode: "tr",
    regionCode: "TR",
  };
  if (travelMode === "DRIVE") {
    body.routingPreference = "TRAFFIC_AWARE";
  }
  if (travelMode === "TRANSIT") {
    body.departureTime = new Date().toISOString();
  }

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 22_000);
  let res: Response;
  try {
    res = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, fallback: true, reason: "network", message: msg };
  } finally {
    clearTimeout(to);
  }

  const rawText = await res.text();
  let data: ComputeRoutesResponse = {};
  try {
    data = JSON.parse(rawText) as ComputeRoutesResponse;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    if (isQuotaOrRateLimit(res.status, rawText)) {
      return { ok: false, fallback: true, reason: "quota", message: `HTTP ${res.status}` };
    }
    if (res.status === 403) {
      return { ok: false, fallback: true, reason: "permission", message: data.error?.message || rawText.slice(0, 200) };
    }
    if (res.status === 400) {
      return { ok: false, fallback: true, reason: "invalid", message: data.error?.message || rawText.slice(0, 200) };
    }
    return { ok: false, fallback: true, reason: "unknown", message: `HTTP ${res.status}` };
  }

  const route = data.routes?.[0];
  if (!route) {
    return { ok: false, fallback: true, reason: "no_route", message: "Google rota döndürmedi" };
  }

  const encoded = route.polyline?.encodedPolyline;
  if (!encoded) {
    return { ok: false, fallback: true, reason: "no_route", message: "Polyline yok" };
  }

  const coordinates = decodePolyline(encoded);
  if (coordinates.length < 2) {
    return { ok: false, fallback: true, reason: "no_route", message: "Geçersiz rota çizgisi" };
  }

  const instructions: GoogleRouteOk["instructions"] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const text = (step.navigationInstruction?.instructions ?? "").trim() || "İlerleyin";
      const lat = Number(step.startLocation?.latLng?.latitude ?? coordinates[0]?.lat);
      const lng = Number(step.startLocation?.latLng?.longitude ?? coordinates[0]?.lng);
      instructions.push({
        text,
        distanceMeters: Math.max(0, Number(step.distanceMeters ?? 0)),
        durationSeconds: parseGoogleDurationSeconds(step.staticDuration),
        lat: Number.isFinite(lat) ? lat : coordinates[0].lat,
        lng: Number.isFinite(lng) ? lng : coordinates[0].lng,
      });
    }
  }

  if (instructions.length === 0) {
    instructions.push({
      text: "Hedefe doğru ilerleyin",
      distanceMeters: Math.max(0, Number(route.distanceMeters ?? 0)),
      durationSeconds: parseGoogleDurationSeconds(route.duration),
      lat: coordinates[0].lat,
      lng: coordinates[0].lng,
    });
  }

  const distanceMeters = Math.max(0, Number(route.distanceMeters ?? 0));
  const durationSeconds = parseGoogleDurationSeconds(route.duration);

  return {
    ok: true,
    distanceMeters,
    durationSeconds,
    coordinates,
    instructions,
  };
}
