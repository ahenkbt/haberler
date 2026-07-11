/**
 * Travelpayouts istemci yardımcıları — affiliate URL + (varsa) site içi fiyat çekimi.
 * Token istemciye asla gönderilmez; affiliate URL'ler sunucuda marker ile üretilir.
 */

export type TravelVertical =
  | "hotel"
  | "flight"
  | "car"
  | "transfer"
  | "tour"
  | "activity"
  | "bus"
  | "boat"
  | "insurance";

/** Detay sayfası listing.type → Travelpayouts dikeyi eşlemesi. */
export const LISTING_TYPE_TO_VERTICAL: Record<string, TravelVertical> = {
  hotel: "hotel",
  villa: "hotel",
  car: "car",
  tour: "tour",
  activity: "activity",
  boat: "boat",
};

export interface VerticalSupport {
  vertical: TravelVertical;
  label: string;
  affiliate: boolean;
  priceApi: boolean;
  program: string | null;
}

export interface AffiliateResponse {
  vertical: TravelVertical;
  label: string;
  program: string | null;
  affiliate: boolean;
  priceApi: boolean;
  configured: boolean;
  hasMarker: boolean;
  affiliateUrl: string | null;
}

export interface FlightResult {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  airline: string | null;
  departureAt: string | null;
  returnAt: string | null;
  transfers: number | null;
  affiliateUrl: string;
}

export interface FlightSearchResponse {
  configured: boolean;
  hasToken: boolean;
  hasCollectApi?: boolean;
  configHint?: string | null;
  source?: "travelpayouts" | "collectapi" | "mixed" | null;
  sources?: Array<"travelpayouts" | "collectapi">;
  affiliateUrl: string | null;
  flights: FlightResult[];
}

export interface BusResult {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  company: string | null;
  busType: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  duration: string | null;
  affiliateUrl: string | null;
}

export interface BusSearchResponse {
  configured: boolean;
  hasCollectApi?: boolean;
  hasMarker?: boolean;
  configHint?: string | null;
  source?: "collectapi" | null;
  affiliateUrl: string | null;
  buses: BusResult[];
}

export interface HotelPriceResult {
  hotelName: string;
  stars: number | null;
  priceFrom: number | null;
  priceAvg: number | null;
  currency: string;
  location: string;
}

export interface HotelPriceResponse {
  configured: boolean;
  hasToken: boolean;
  currency: string;
  affiliateUrl: string | null;
  hotels: HotelPriceResult[];
}

export interface TravelPlace {
  type: "city" | "country" | "airport";
  code: string | null;
  name: string;
  cityName: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number | null;
  lng: number | null;
}

export function defaultHotelCheckIn(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function defaultHotelCheckOut(checkIn?: string): string {
  const d = checkIn ? new Date(`${checkIn}T12:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    return fallback.toISOString().slice(0, 10);
  }
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Hotellook location: IATA öncelikli (LON, FCO, JFK). */
export function resolveHotellookLocationFromPlace(loc: TravelPlace | null, cityFallback?: string): string {
  if (!loc) return (cityFallback ?? "").trim();
  const iata = (loc.code ?? "").trim().toUpperCase();
  if (iata.length >= 3) return iata;
  return (loc.cityName || loc.name || cityFallback || "").trim();
}

export function isInternationalPlace(loc: TravelPlace | null): boolean {
  const cc = (loc?.countryCode ?? "TR").trim().toUpperCase();
  return cc.length === 2 && cc !== "TR";
}

export async function fetchTravelPlaces(term: string): Promise<TravelPlace[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(`/api/travel/places?term=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { places?: TravelPlace[] };
    return Array.isArray(data.places) ? data.places : [];
  } catch {
    return [];
  }
}

/** Seçili lokasyonu URL paramlarına yazar (paylaşılabilir/yenilenebilir). */
export function travelLocationToParams(loc: TravelPlace | null, base: URLSearchParams): URLSearchParams {
  base.delete("loc");
  base.delete("locType");
  base.delete("iata");
  base.delete("cc");
  base.delete("lat");
  base.delete("lng");
  if (!loc) return base;
  base.set("loc", loc.name);
  base.set("locType", loc.type);
  if (loc.code) base.set("iata", loc.code);
  if (loc.countryCode) base.set("cc", loc.countryCode);
  if (loc.lat != null) base.set("lat", String(loc.lat));
  if (loc.lng != null) base.set("lng", String(loc.lng));
  return base;
}

/** URL paramlarından seçili lokasyonu okur. */
export function travelLocationFromParams(qs: URLSearchParams): TravelPlace | null {
  const name = qs.get("loc");
  if (!name) return null;
  const rawType = qs.get("locType");
  const type: TravelPlace["type"] = rawType === "country" ? "country" : rawType === "airport" ? "airport" : "city";
  const lat = qs.get("lat");
  const lng = qs.get("lng");
  return {
    type,
    code: qs.get("iata"),
    name,
    cityName: type === "city" ? name : null,
    countryCode: qs.get("cc"),
    countryName: type === "country" ? name : null,
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
  };
}

export async function fetchTravelConfig(): Promise<{
  configured: boolean;
  hasMarker: boolean;
  verticals: VerticalSupport[];
} | null> {
  try {
    const res = await fetch("/api/travel/config");
    if (!res.ok) return null;
    return (await res.json()) as { configured: boolean; hasMarker: boolean; verticals: VerticalSupport[] };
  } catch {
    return null;
  }
}

export async function fetchAffiliateLink(
  vertical: TravelVertical,
  params: Record<string, string | number | undefined> = {},
): Promise<AffiliateResponse | null> {
  try {
    const q = new URLSearchParams({ vertical });
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") q.set(k, String(v));
    }
    const res = await fetch(`/api/travel/affiliate?${q.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as AffiliateResponse;
  } catch {
    return null;
  }
}

export async function fetchFlightResults(params: {
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  adults?: number | string;
}): Promise<FlightSearchResponse | null> {
  try {
    const q = new URLSearchParams({ origin: params.origin, destination: params.destination });
    if (params.departDate) q.set("departDate", params.departDate);
    if (params.returnDate) q.set("returnDate", params.returnDate);
    if (params.adults != null && params.adults !== "") q.set("adults", String(params.adults));
    const res = await fetch(`/api/travel/flights/search?${q.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as FlightSearchResponse;
  } catch {
    return null;
  }
}

export async function fetchBusResults(params: {
  origin: string;
  destination: string;
  departDate?: string;
  adults?: number | string;
}): Promise<BusSearchResponse | null> {
  try {
    const q = new URLSearchParams({ origin: params.origin, destination: params.destination });
    if (params.departDate) q.set("departDate", params.departDate);
    if (params.adults != null && params.adults !== "") q.set("adults", String(params.adults));
    const res = await fetch(`/api/travel/buses/search?${q.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as BusSearchResponse;
  } catch {
    return null;
  }
}

export async function fetchHotelPrices(params: {
  location: string;
  checkIn?: string;
  checkOut?: string;
  propertyType?: string;
}): Promise<HotelPriceResponse | null> {
  try {
    const q = new URLSearchParams({ location: params.location });
    if (params.checkIn) q.set("checkIn", params.checkIn);
    if (params.checkOut) q.set("checkOut", params.checkOut);
    if (params.propertyType) q.set("propertyType", params.propertyType);
    const res = await fetch(`/api/travel/hotels/prices?${q.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as HotelPriceResponse;
  } catch {
    return null;
  }
}
