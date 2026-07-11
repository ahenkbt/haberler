/**
 * Google Places (Legacy Web Service) — toplu işletme içe aktarma için yardımcılar.
 * Text Search + Place Details; imports keep only basic business facts and photos.
 */
import axios from "axios";

export function slugifyMapBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PLACE_DETAIL_FIELDS = [
  "place_id",
  "name",
  "formatted_address",
  "address_components",
  "geometry",
  "formatted_phone_number",
  "international_phone_number",
  "website",
  "opening_hours",
  "utc_offset",
  "types",
  "business_status",
  "url",
  "photos",
  "current_opening_hours",
  "wheelchair_accessible_entrance",
  "price_level",
  "rating",
  "user_ratings_total",
  "reviews",
  "adr_address",
  "vicinity",
].join(",");

export type PlaceReviewRaw = {
  author_name?: string;
  rating?: number;
  text?: string;
  time?: number;
  relative_time_description?: string;
  profile_photo_url?: string;
  language?: string;
};

export type PlacePhotoRaw = { photo_reference?: string; height?: number; width?: number };

export type SanitizedPlaceReview = {
  authorName: string;
  profilePhoto?: string;
  rating: number;
  relativeTime: string;
  text: string;
  time?: number;
  source: "google";
};

function photoUrl(apiKey: string, ref: string, maxW = 1200): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxW}&photoreference=${encodeURIComponent(ref)}&key=${apiKey}`;
}

/** Google Details yanıtındaki yorumlar: en fazla 5 adet döner (Places API sınırı). Olumlu + en yeni önce. */
export function pickPositiveReviews(reviews: PlaceReviewRaw[] | undefined, max = 5): PlaceReviewRaw[] {
  if (!Array.isArray(reviews) || !reviews.length) return [];
  const sorted = [...reviews]
    .filter((r) => typeof r.rating === "number" && r.rating >= 4)
    .sort((a, b) => (Number(b.time) || 0) - (Number(a.time) || 0));
  return sorted.slice(0, max);
}

export function sanitizePlaceReviews(reviews: PlaceReviewRaw[] | undefined, max = 5): SanitizedPlaceReview[] {
  const out: SanitizedPlaceReview[] = [];
  for (const r of pickPositiveReviews(reviews, max)) {
    const rating = Number(r.rating);
    const text = String(r.text ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
    const authorName = String(r.author_name ?? "").trim().slice(0, 80) || "Misafir";
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !text) continue;
    const profilePhoto = String(r.profile_photo_url ?? "").trim();
    out.push({
      authorName,
      profilePhoto: profilePhoto || undefined,
      rating,
      relativeTime: String(r.relative_time_description ?? "").trim().slice(0, 80),
      text,
      time: typeof r.time === "number" ? r.time : undefined,
      source: "google",
    });
  }
  return out;
}

export function buildPhotoUrls(apiKey: string, photos: PlacePhotoRaw[] | undefined, max = 5): string[] {
  if (!Array.isArray(photos) || !photos.length) return [];
  const out: string[] = [];
  for (const p of photos) {
    if (!p?.photo_reference) continue;
    out.push(photoUrl(apiKey, p.photo_reference, 1200));
    if (out.length >= max) break;
  }
  return out;
}

export function buildRichDescription(result: Record<string, unknown>): string {
  const parts: string[] = [];
  const editorial = (result.editorial_summary as { overview?: string } | undefined)?.overview;
  if (editorial) parts.push(editorial);
  const status = result.business_status as string | undefined;
  if (status && status !== "OPERATIONAL") parts.push(`İşletme durumu (Google): ${status}`);
  return parts.join("\n\n").trim() || (result.name as string) || "";
}

export function openingHoursJson(result: Record<string, unknown>): Record<string, unknown> | null {
  const oh = result.opening_hours as { weekday_text?: string[]; periods?: unknown[] } | undefined;
  const cur = result.current_opening_hours as { weekday_text?: string[]; periods?: unknown[] } | undefined;
  const pick = cur?.weekday_text?.length ? cur : oh;
  if (!pick?.weekday_text?.length && !pick?.periods?.length) return null;
  return {
    weekdayText: pick.weekday_text ?? [],
    periods: pick.periods ?? [],
    utcOffset: result.utc_offset as number | undefined,
  };
}

export function googlePlacesExtras(result: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    "business_status",
    "types",
    "utc_offset",
    "wheelchair_accessible_entrance",
    "price_level",
    "adr_address",
    "url",
  ] as const;
  const o: Record<string, unknown> = {};
  for (const k of keys) {
    if (result[k] !== undefined && result[k] !== null) o[k] = result[k] as unknown;
  }
  return o;
}

export function inferServiceFlags(types: string[]): {
  hasDelivery: boolean;
  hasReservation: boolean;
  hasOnlineOrder: boolean;
} {
  const t = new Set(types.map((x) => x.toLowerCase()));
  return {
    hasDelivery: t.has("meal_delivery"),
    hasReservation: t.has("restaurant") || t.has("lodging") || t.has("spa"),
    hasOnlineOrder: t.has("meal_takeaway") || t.has("meal_delivery") || t.has("convenience_store") || t.has("store"),
  };
}

export function tagsForImport(businessStatus: string | undefined, markOpening: boolean): string[] {
  const tags = ["google_places_api"];
  const st = (businessStatus || "").toUpperCase();
  if (markOpening || (st && st !== "OPERATIONAL")) tags.push("acilis_asamasinda");
  return tags;
}

export async function fetchPlaceDetails(apiKey: string, placeId: string): Promise<Record<string, unknown>> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${PLACE_DETAIL_FIELDS}&language=tr&key=${apiKey}`;
  const { data } = await axios.get<{
    status: string;
    result?: Record<string, unknown>;
    error_message?: string;
  }>(url);
  if (data.status !== "OK" || !data.result) {
    throw new Error(data.error_message || data.status || "Place Details başarısız");
  }
  return data.result;
}

export type TextSearchHit = { place_id?: string; name?: string; geometry?: { location?: { lat?: number; lng?: number } } };

export async function fetchTextSearchPage(
  apiKey: string,
  query: string,
  pageToken?: string,
): Promise<{ results: TextSearchHit[]; next_page_token?: string }> {
  const params = new URLSearchParams({ query: query.trim(), key: apiKey, language: "tr" });
  if (pageToken) params.set("pagetoken", pageToken);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
  const { data } = await axios.get<{
    status: string;
    results?: TextSearchHit[];
    next_page_token?: string;
    error_message?: string;
  }>(url);
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(data.error_message || data.status || "Text Search başarısız");
  }
  return { results: data.results ?? [], next_page_token: data.next_page_token };
}

const PLACES_V1 = "https://places.googleapis.com/v1";

function normalizeGooglePlaceType(raw?: string): string | null {
  const t = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return t || null;
}

function shouldFallbackPlacesSearchToV1(message: string): boolean {
  return /INVALID_REQUEST|legacy\s+api|not\s+enabled|Unknown\s+error|SearchTextRequest|SearchNearbyRequest/i.test(message);
}

async function collectPlaceIdsFromTextQueryLegacy(
  apiKey: string,
  query: string,
  maxTotal: number,
): Promise<string[]> {
  const ids: string[] = [];
  let token: string | undefined;
  let pages = 0;
  while (ids.length < maxTotal && pages < 3) {
    const { results, next_page_token } = await fetchTextSearchPage(apiKey, query, token);
    pages++;
    for (const r of results) {
      if (r.place_id && !ids.includes(r.place_id)) ids.push(r.place_id);
      if (ids.length >= maxTotal) break;
    }
    if (!next_page_token || !results.length) break;
    token = next_page_token;
    await new Promise((r) => setTimeout(r, 2100));
  }
  return ids;
}

async function collectPlaceIdsFromTextQueryV1(
  apiKey: string,
  query: string,
  maxTotal: number,
  locationBias?: { lat: number; lng: number; radius: number },
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  while (ids.length < maxTotal && pages < 3) {
    const body: Record<string, unknown> = {
      textQuery: query.trim(),
      languageCode: "tr",
      regionCode: "TR",
      maxResultCount: Math.min(20, Math.max(1, maxTotal - ids.length)),
    };
    if (locationBias && Number.isFinite(locationBias.lat) && Number.isFinite(locationBias.lng)) {
      body.locationBias = {
        circle: {
          center: { latitude: locationBias.lat, longitude: locationBias.lng },
          radius: Math.min(50_000, Math.max(500, Math.round(locationBias.radius || 5000))),
        },
      };
    }
    if (pageToken) body.pageToken = pageToken;
    const { data, status } = await axios.post<{
      places?: Array<{ id?: string }>;
      nextPageToken?: string;
      error?: { message?: string; status?: string };
    }>(`${PLACES_V1}/places:searchText`, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,nextPageToken",
      },
      validateStatus: () => true,
      timeout: 22_000,
    });
    if (status !== 200) {
      throw new Error(data?.error?.message || data?.error?.status || `Places API (New) Text Search HTTP ${status}`);
    }
    pages++;
    for (const place of data.places ?? []) {
      const id = String(place.id ?? "").replace(/^places\//, "").trim();
      if (id && !ids.includes(id)) ids.push(id);
      if (ids.length >= maxTotal) break;
    }
    pageToken = data.nextPageToken;
    if (!pageToken || !(data.places?.length)) break;
    await new Promise((r) => setTimeout(r, 2100));
  }
  return ids;
}

export async function collectPlaceIdsFromTextQuery(
  apiKey: string,
  query: string,
  maxTotal: number,
  locationBias?: { lat: number; lng: number; radius: number },
): Promise<string[]> {
  try {
    return await collectPlaceIdsFromTextQueryLegacy(apiKey, query, maxTotal);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!shouldFallbackPlacesSearchToV1(msg)) throw err;
    return collectPlaceIdsFromTextQueryV1(apiKey, query, maxTotal, locationBias);
  }
}

async function collectPlaceIdsFromNearbyLegacy(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  maxTotal: number,
  type?: string,
  keyword?: string,
): Promise<string[]> {
  const ids: string[] = [];
  let token: string | undefined;
  let pages = 0;
  while (ids.length < maxTotal && pages < 3) {
    const p = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radius || 5000),
      key: apiKey,
      language: "tr",
    });
    const normalizedType = normalizeGooglePlaceType(type);
    if (normalizedType) p.set("type", normalizedType);
    if (keyword) p.set("keyword", keyword);
    if (token) p.set("pagetoken", token);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${p.toString()}`;
    const { data } = await axios.get<{
      status: string;
      results?: Array<{ place_id?: string }>;
      next_page_token?: string;
      error_message?: string;
    }>(url);
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(data.error_message || data.status || "Nearby Search başarısız");
    }
    pages++;
    for (const r of data.results ?? []) {
      if (r.place_id && !ids.includes(r.place_id)) ids.push(r.place_id);
      if (ids.length >= maxTotal) break;
    }
    if (!data.next_page_token || !(data.results?.length)) break;
    token = data.next_page_token;
    await new Promise((r) => setTimeout(r, 2100));
  }
  return ids;
}

async function collectPlaceIdsFromNearbyV1(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  maxTotal: number,
  type?: string,
  keyword?: string,
): Promise<string[]> {
  if (keyword?.trim()) {
    const textQuery = [keyword.trim(), normalizeGooglePlaceType(type)].filter(Boolean).join(" ");
    return collectPlaceIdsFromTextQueryV1(apiKey, textQuery, maxTotal, { lat, lng, radius });
  }
  const normalizedType = normalizeGooglePlaceType(type);
  const ids: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  while (ids.length < maxTotal && pages < 3) {
    const body: Record<string, unknown> = {
      maxResultCount: Math.min(20, Math.max(1, maxTotal - ids.length)),
      languageCode: "tr",
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(50_000, Math.max(500, Math.round(radius || 5000))),
        },
      },
    };
    if (normalizedType) body.includedTypes = [normalizedType];
    if (pageToken) body.pageToken = pageToken;
    const { data, status } = await axios.post<{
      places?: Array<{ id?: string }>;
      nextPageToken?: string;
      error?: { message?: string; status?: string };
    }>(`${PLACES_V1}/places:searchNearby`, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,nextPageToken",
      },
      validateStatus: () => true,
      timeout: 22_000,
    });
    if (status !== 200) {
      throw new Error(data?.error?.message || data?.error?.status || `Places API (New) Nearby Search HTTP ${status}`);
    }
    pages++;
    for (const place of data.places ?? []) {
      const id = String(place.id ?? "").replace(/^places\//, "").trim();
      if (id && !ids.includes(id)) ids.push(id);
      if (ids.length >= maxTotal) break;
    }
    pageToken = data.nextPageToken;
    if (!pageToken || !(data.places?.length)) break;
    await new Promise((r) => setTimeout(r, 2100));
  }
  return ids;
}

export async function collectPlaceIdsFromNearby(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  maxTotal: number,
  type?: string,
  keyword?: string,
): Promise<string[]> {
  try {
    return await collectPlaceIdsFromNearbyLegacy(apiKey, lat, lng, radius, maxTotal, type, keyword);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!shouldFallbackPlacesSearchToV1(msg)) throw err;
    return collectPlaceIdsFromNearbyV1(apiKey, lat, lng, radius, maxTotal, type, keyword);
  }
}
