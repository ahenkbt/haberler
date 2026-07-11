/**
 * Travelpayouts tek sağlayıcı katmanı.
 * Tüm seyahat dikeyleri (otel, uçak, araç, tur, etkinlik, otobüs) AYNI token + marker'ı paylaşır.
 * Token + marker DB site_settings'ten okunur; env fallback: TRAVELPAYOUTS_API_TOKEN / TRAVELPAYOUTS_MARKER.
 *
 * Davranış: fiyat/detay SİTEDE gösterilir, satın alma/rezervasyon adımında marker'lı affiliate
 * link'e yeni sekmede yönlendirilir. Token KOD'A GÖMÜLMEZ — admin panelden girilir.
 *
 * GERÇEKTEN desteklenen dikeyler (fiyat API + affiliate):
 *   - hotel  → Hotellook (engine.hotellook.com cache API) + search.hotellook.com deep-link
 *   - flight → Aviasales (api.travelpayouts.com prices_for_dates v3) + aviasales.com deep-link
 * Yalnızca affiliate yönlendirme (fiyat API yok, sahte fiyat üretilmez):
 *   - car      → Localrent / Discover Cars
 *   - tour     → WeGoTrip / Tours & Activities
 *   - activity → WeGoTrip / Tiqets (biletli etkinlik & aktivite)
 *   - bus      → Travelpayouts'ta özel otobüs programı yok; fiyat CollectAPI travel/getBusway, yönlendirme Omio
 * Travelpayouts kapsamında olmayan (mevcut gating korunur):
 *   - boat → yat/tekne: dahili doğrulanmış işletme rezervasyonu / işletme paneli yönlendirmesi
 */
import axios from "axios";
import { db, siteSettingsTable } from "@workspace/db";

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

export interface TravelpayoutsConfig {
  token: string;
  marker: string;
  /** token + marker birlikte varsa true */
  configured: boolean;
}

export interface VerticalSupport {
  vertical: TravelVertical;
  label: string;
  /** Travelpayouts affiliate yönlendirmesi mevcut mu */
  affiliate: boolean;
  /** Site içinde gerçek fiyat çekilebiliyor mu */
  priceApi: boolean;
  /** Travelpayouts program adı / not */
  program: string | null;
}

export const TRAVEL_VERTICALS: Record<TravelVertical, VerticalSupport> = {
  hotel: { vertical: "hotel", label: "Otel", affiliate: true, priceApi: true, program: "Hotellook / EkkaBooking / Yatra" },
  flight: { vertical: "flight", label: "Uçak Bileti", affiliate: true, priceApi: true, program: "Aviasales / Kiwi.com" },
  car: {
    vertical: "car",
    label: "Araç Kiralama",
    affiliate: true,
    priceApi: false,
    program: "Localrent / GetRentacar / EconomyBookings / AutoEurope",
  },
  transfer: {
    vertical: "transfer",
    label: "Havaalanı Transfer",
    affiliate: true,
    priceApi: false,
    program: "Kiwitaxi / GetTransfer",
  },
  tour: {
    vertical: "tour",
    label: "Tur",
    affiliate: true,
    priceApi: false,
    program: "WeGoTrip / KKday",
  },
  activity: {
    vertical: "activity",
    label: "Etkinlik & Aktivite",
    affiliate: true,
    priceApi: false,
    program: "WeGoTrip / KKday / TicketNetwork",
  },
  bus: {
    vertical: "bus",
    label: "Otobüs Bileti",
    affiliate: true,
    priceApi: false,
    program: "CollectAPI Seyahat (fiyat) + Omio (satın alma yönlendirme)",
  },
  boat: {
    vertical: "boat",
    label: "Yat & Tekne",
    affiliate: true,
    priceApi: false,
    program: "SEARADAR",
  },
  insurance: {
    vertical: "insurance",
    label: "Seyahat Sigortası",
    affiliate: true,
    priceApi: false,
    program: "EKTA",
  },
};

export function isTravelVertical(value: string): value is TravelVertical {
  return Object.prototype.hasOwnProperty.call(TRAVEL_VERTICALS, value);
}

/* — Config (DB + env fallback) ─────────────────────────── */

let cachedConfig: { value: TravelpayoutsConfig; at: number } | null = null;
const CONFIG_TTL_MS = 60_000;

export function clearTravelpayoutsConfigCache(): void {
  cachedConfig = null;
}

export async function getTravelpayoutsConfig(): Promise<TravelpayoutsConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.at < CONFIG_TTL_MS) return cachedConfig.value;

  let token = (process.env.TRAVELPAYOUTS_API_TOKEN || "").trim();
  let marker = (process.env.TRAVELPAYOUTS_MARKER || "").trim();

  if (!token || !marker) {
    try {
      const rows = await db
        .select({
          token: siteSettingsTable.travelpayoutsApiToken,
          marker: siteSettingsTable.travelpayoutsMarker,
        })
        .from(siteSettingsTable)
        .limit(1);
      if (!token) token = (rows[0]?.token ?? "").trim();
      if (!marker) marker = (rows[0]?.marker ?? "").trim();
    } catch {
      /* settings tablosu henüz yoksa env değerleriyle devam */
    }
  }

  const value: TravelpayoutsConfig = { token, marker, configured: Boolean(token && marker) };
  cachedConfig = { value, at: now };
  return value;
}

/* — Affiliate deep-link builders (marker'lı) ───────────── */

function appendMarker(url: URL, marker: string): string {
  if (marker) url.searchParams.set("marker", marker);
  return url.toString();
}

export interface AffiliateLinkParams {
  /** otel/araç/etkinlik konumu veya şehir */
  location?: string;
  /** uçuş / otobüs kalkış (IATA ya da şehir) */
  origin?: string;
  /** uçuş / otobüs varış */
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  departDate?: string;
  returnDate?: string;
  adults?: number;
  query?: string;
  /** Konaklama tipi ipucu (villa/apart sayfası için Hotellook deep-link'ine eklenir). */
  propertyType?: string;
}

/**
 * Verilen dikey için marker eklenmiş Travelpayouts affiliate URL'si üretir.
 * Marker yoksa yine de geçerli marka URL'si döner (tracking olmadan).
 */
export function buildAffiliateUrl(
  vertical: TravelVertical,
  marker: string,
  params: AffiliateLinkParams = {},
): string | null {
  const support = TRAVEL_VERTICALS[vertical];
  if (!support || !support.affiliate) return null;

  switch (vertical) {
    case "hotel": {
      const u = new URL("https://search.hotellook.com/");
      if (params.location) u.searchParams.set("destination", params.location);
      if (params.checkIn) u.searchParams.set("checkIn", params.checkIn);
      if (params.checkOut) u.searchParams.set("checkOut", params.checkOut);
      u.searchParams.set("adults", String(params.adults ?? 2));
      // Villa/apart sayfasında konaklama tipini ipucu olarak ilet (Hotellook apart/villa filtresi).
      if (params.propertyType) u.searchParams.set("propertyType", params.propertyType);
      return appendMarker(u, marker);
    }
    case "flight": {
      const u = new URL("https://www.aviasales.com/");
      if (params.origin) u.searchParams.set("origin_iata", params.origin);
      if (params.destination) u.searchParams.set("destination_iata", params.destination);
      if (params.departDate) u.searchParams.set("depart_date", params.departDate);
      if (params.returnDate) u.searchParams.set("return_date", params.returnDate);
      u.searchParams.set("adults", String(params.adults ?? 1));
      return appendMarker(u, marker);
    }
    case "car": {
      // Localrent (TP araç programı) — şehir bazlı arama destekler.
      const u = new URL("https://localrent.com/");
      if (params.location) u.searchParams.set("city", params.location);
      return appendMarker(u, marker);
    }
    case "transfer": {
      // Kiwitaxi (TP havaalanı transfer programı).
      const u = new URL("https://kiwitaxi.com/");
      const q = params.query || params.location;
      if (q) u.searchParams.set("q", q);
      return appendMarker(u, marker);
    }
    case "tour":
    case "activity": {
      // WeGoTrip (TP tur & aktivite programı).
      const u = new URL("https://wegotrip.com/");
      const q = params.query || params.location;
      if (q) u.searchParams.set("q", q);
      return appendMarker(u, marker);
    }
    case "boat": {
      // SEARADAR (TP yat/tekne kiralama programı).
      const u = new URL("https://searadar.com/");
      const q = params.query || params.location;
      if (q) u.searchParams.set("q", q);
      return appendMarker(u, marker);
    }
    case "insurance": {
      // EKTA (TP seyahat sigortası programı).
      const u = new URL("https://ektatraveling.com/");
      return appendMarker(u, marker);
    }
    case "bus": {
      // Travelpayouts'ta özel otobüs programı yok → genel arama yönlendirmesi (Omio).
      const u = new URL("https://omio.com/");
      const q = [params.origin, params.destination].filter(Boolean).join(" → ") || params.query;
      if (q) u.searchParams.set("q", q);
      return appendMarker(u, marker);
    }
    default:
      return null;
  }
}

/* — Lokasyon/ülke autocomplete (Travelpayouts places2) — */

export interface TravelPlace {
  type: "city" | "country" | "airport";
  /** Şehir/havalimanı için IATA, ülke için ülke kodu */
  code: string | null;
  name: string;
  cityName: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number | null;
  lng: number | null;
}

const placesCache = new Map<string, CacheEntry<TravelPlace[]>>();
const PLACES_TTL_MS = 30 * 60_000;

/**
 * Travelpayouts places2 autocomplete (token gerektirmez) — şehir + ülke önerileri.
 * Şehir sonuçları IATA kodu + koordinat içerir (uçuş/otel sorguları için).
 */
export async function fetchPlacesAutocomplete(term: string, locale = "tr"): Promise<TravelPlace[]> {
  const q = (term || "").trim();
  if (q.length < 2) return [];
  const cacheKey = `${locale}:${q.toLowerCase()}`;
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < PLACES_TTL_MS) return cached.value;

  const url =
    `https://autocomplete.travelpayouts.com/places2?locale=${encodeURIComponent(locale)}` +
    `&types[]=city&types[]=country&term=${encodeURIComponent(q)}`;
  try {
    const { data, status } = await axios.get<unknown>(url, {
      validateStatus: () => true,
      timeout: 10_000,
    });
    if (status !== 200 || !Array.isArray(data)) return [];
    const places: TravelPlace[] = (data as Record<string, unknown>[])
      .map((r) => {
        const coords = (r.coordinates ?? null) as { lat?: number; lon?: number } | null;
        const rawType = String(r.type ?? "");
        const type: TravelPlace["type"] =
          rawType === "country" ? "country" : rawType === "airport" ? "airport" : "city";
        return {
          type,
          code: r.code != null ? String(r.code) : null,
          name: String(r.name ?? r.city_name ?? r.country_name ?? ""),
          cityName: r.city_name != null ? String(r.city_name) : null,
          countryCode: r.country_code != null ? String(r.country_code) : null,
          countryName: r.country_name != null ? String(r.country_name) : null,
          lat: coords?.lat != null ? Number(coords.lat) : null,
          lng: coords?.lon != null ? Number(coords.lon) : null,
        };
      })
      .filter((p) => p.name);
    placesCache.set(cacheKey, { value: places, at: Date.now() });
    return places;
  } catch {
    return [];
  }
}

/* — Fiyat API'leri (cache'li) ──────────────────────────── */

type CacheEntry<T> = { value: T; at: number };
const priceCache = new Map<string, CacheEntry<unknown>>();
const PRICE_TTL_MS = 10 * 60_000;

function readCache<T>(key: string): T | null {
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < PRICE_TTL_MS) return hit.value as T;
  return null;
}
function writeCache<T>(key: string, value: T): void {
  priceCache.set(key, { value, at: Date.now() });
}

export interface HotelPrice {
  hotelName: string;
  stars: number | null;
  priceFrom: number | null;
  priceAvg: number | null;
  currency: string;
  location: string;
  /** Hotellook otel kimliği (varsa) */
  hotelId?: number | null;
}

/** Konaklama araması için varsayılan tarihler: bugün giriş, yarın çıkış (1 gece). */
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

/** Yurtdışı destinasyon: ülke kodu TR değilse Hotellook ana liste kaynağı kullanılır. */
export function isInternationalHotelDestination(countryCode?: string | null): boolean {
  const cc = (countryCode ?? "TR").trim().toUpperCase();
  return cc.length === 2 && cc !== "TR";
}

/** Hotellook cache API location parametresi — IATA öncelikli (LON, FCO, JFK). */
export function resolveHotellookLocation(opts: {
  city?: string;
  iata?: string;
  name?: string;
}): string {
  const iata = (opts.iata ?? "").trim().toUpperCase();
  if (iata.length >= 3) return iata;
  return (opts.city ?? opts.name ?? "").trim();
}

function slugifyHotelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Hotellook (Travelpayouts) cache API'sinden bir şehir/konum için fiyatları çeker.
 * Token yoksa boş döner — sahte fiyat üretilmez.
 */
export async function fetchHotellookPrices(opts: {
  location: string;
  checkIn?: string;
  checkOut?: string;
  currency?: string;
  limit?: number;
  /** İstemci tarafında filtre/etiket için ipucu; cache anahtarını ayırır. */
  propertyType?: string;
}): Promise<HotelPrice[]> {
  const cfg = await getTravelpayoutsConfig();
  if (!cfg.token || !opts.location) return [];
  const currency = (opts.currency || "try").toLowerCase();
  const checkIn = opts.checkIn || defaultHotelCheckIn();
  const checkOut = opts.checkOut || defaultHotelCheckOut(checkIn);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const cacheKey = `hl:${opts.location}:${checkIn}:${checkOut}:${currency}:${limit}:${opts.propertyType ?? ""}`;
  const cached = readCache<HotelPrice[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, status } = await axios.get<unknown>("https://engine.hotellook.com/api/v2/cache.json", {
      params: {
        location: opts.location,
        currency,
        checkIn,
        checkOut,
        limit,
        token: cfg.token,
      },
      validateStatus: () => true,
      timeout: 15_000,
    });
    if (status !== 200 || !Array.isArray(data)) return [];
    const rows: HotelPrice[] = (data as Record<string, unknown>[]).map((r) => ({
      hotelName: String(r.hotelName ?? r.fullName ?? ""),
      stars: r.stars != null ? Number(r.stars) : null,
      priceFrom: r.priceFrom != null ? Number(r.priceFrom) : null,
      priceAvg: r.priceAvg != null ? Number(r.priceAvg) : null,
      currency: currency.toUpperCase(),
      location: opts.location,
      hotelId: r.hotelId != null ? Number(r.hotelId) : r.id != null ? Number(r.id) : null,
    })).filter((r) => r.hotelName);
    writeCache(cacheKey, rows);
    return rows;
  } catch {
    return [];
  }
}

export interface FlightPrice {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  airline: string | null;
  departureAt: string | null;
  returnAt: string | null;
  transfers: number | null;
  /** aviasales göreli link (marker eklenerek kullanılır) */
  link: string | null;
}

/**
 * Aviasales (Travelpayouts) prices_for_dates v3 API'sinden uçuş fiyatlarını çeker.
 * Token yoksa boş döner — sahte fiyat üretilmez.
 */
export async function fetchAviasalesPrices(opts: {
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  currency?: string;
  limit?: number;
}): Promise<FlightPrice[]> {
  const cfg = await getTravelpayoutsConfig();
  if (!cfg.token || !opts.origin || !opts.destination) return [];
  const currency = (opts.currency || "try").toLowerCase();
  const limit = Math.min(30, Math.max(1, opts.limit ?? 20));
  const cacheKey = `av:${opts.origin}:${opts.destination}:${opts.departDate ?? ""}:${opts.returnDate ?? ""}:${currency}:${limit}`;
  const cached = readCache<FlightPrice[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, status } = await axios.get<{ success?: boolean; data?: Record<string, unknown>[] }>(
      "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
      {
        params: {
          origin: opts.origin,
          destination: opts.destination,
          departure_at: opts.departDate || undefined,
          return_at: opts.returnDate || undefined,
          currency,
          sorting: "price",
          limit,
          token: cfg.token,
        },
        validateStatus: () => true,
        timeout: 15_000,
      },
    );
    if (status !== 200 || !data?.data || !Array.isArray(data.data)) return [];
    const rows: FlightPrice[] = data.data
      .map((r) => ({
        origin: String(r.origin ?? opts.origin),
        destination: String(r.destination ?? opts.destination),
        price: Number(r.price ?? 0),
        currency: currency.toUpperCase(),
        airline: r.airline != null ? String(r.airline) : null,
        departureAt: r.departure_at != null ? String(r.departure_at) : null,
        returnAt: r.return_at != null ? String(r.return_at) : null,
        transfers: r.transfers != null ? Number(r.transfers) : null,
        link: r.link != null ? String(r.link) : null,
      }))
      .filter((r) => r.price > 0);
    writeCache(cacheKey, rows);
    return rows;
  } catch {
    return [];
  }
}

/** Aviasales göreli link'ini marker eklenmiş tam URL'ye çevirir. */
export function aviasalesFullLink(relativeLink: string | null, marker: string): string {
  const base = "https://www.aviasales.com";
  try {
    const u = new URL(relativeLink && relativeLink.startsWith("/") ? `${base}${relativeLink}` : base);
    if (marker) u.searchParams.set("marker", marker);
    return u.toString();
  } catch {
    return marker ? `${base}/?marker=${encodeURIComponent(marker)}` : base;
  }
}

export type HotellookTourismListingResult = {
  rows: Record<string, unknown>[];
  affiliateUrl: string | null;
  configured: boolean;
  currency: string;
};

/**
 * Hotellook fiyatlarını turizm konaklama kartı formatına dönüştürür.
 * Sahte veri üretilmez — yalnızca API yanıtı kullanılır.
 */
export async function fetchHotellookTourismListings(opts: {
  location: string;
  cityLabel?: string;
  checkIn?: string;
  checkOut?: string;
  currency?: string;
  limit?: number;
  adults?: number;
}): Promise<HotellookTourismListingResult> {
  const cfg = await getTravelpayoutsConfig();
  const currency = (opts.currency || "try").toUpperCase();
  if (!cfg.configured || !opts.location.trim()) {
    return {
      rows: [],
      affiliateUrl: buildAffiliateUrl("hotel", cfg.marker, {
        location: opts.cityLabel || opts.location,
        checkIn: opts.checkIn,
        checkOut: opts.checkOut,
        adults: opts.adults ?? 2,
      }),
      configured: cfg.configured,
      currency,
    };
  }

  const checkIn = opts.checkIn || defaultHotelCheckIn();
  const checkOut = opts.checkOut || defaultHotelCheckOut(checkIn);
  const cityLabel = opts.cityLabel || opts.location;
  const affiliateUrl = buildAffiliateUrl("hotel", cfg.marker, {
    location: cityLabel,
    checkIn,
    checkOut,
    adults: opts.adults ?? 2,
  });

  const hotels = await fetchHotellookPrices({
    location: opts.location,
    checkIn,
    checkOut,
    currency: currency.toLowerCase(),
    limit: opts.limit ?? 48,
  });

  const rows = hotels.map((h, idx) => {
    const slug = slugifyHotelName(h.hotelName) || `otel-${idx + 1}`;
    const nightly = h.priceFrom != null && h.priceFrom > 0 ? h.priceFrom : h.priceAvg;
    const priceNum = nightly != null && nightly > 0 ? Math.round(nightly) : 0;
    return {
      id: -(1_000_000 + idx),
      type: "hotel",
      title: h.hotelName,
      slug: `hl-${slug}`,
      city: cityLabel,
      price: priceNum > 0 ? String(priceNum) : "0",
      sale_price: null,
      price_unit: "gece",
      star_rating: h.stars != null ? Math.min(5, Math.round(h.stars)) : null,
      rating: h.stars != null ? Number(h.stars) : 0,
      review_count: 0,
      image_url: null,
      href: affiliateUrl,
      hotellook_fallback: true,
      external_booking: true,
      has_nightly_price: priceNum > 0,
      price_currency: h.currency || currency,
    };
  });

  return { rows, affiliateUrl, configured: true, currency };
}

function defaultCheckIn(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}
function defaultCheckOut(checkIn: string): string {
  const d = new Date(checkIn);
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}
