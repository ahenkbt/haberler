/**
 * CollectAPI proxy helpers — API key yalnızca sunucu env'den okunur (COLLECTAPI_KEY).
 * Nöbetçi eczane: health/dutyPharmacy
 * Uçak fiyatları: travel/getAirway (CollectAPI seyahat paketi; yanıt alanları esnek parse edilir)
 * Otobüs fiyatları: travel/getBusway (CollectAPI seyahat paketi; yanıt alanları esnek parse edilir)
 */
import axios from "axios";

const BASE_URL = "https://api.collectapi.com";
const CACHE_TTL_MS = 10 * 60_000;

type CacheEntry<T> = { value: T; at: number };
const cache = new Map<string, CacheEntry<unknown>>();

function readCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  return null;
}

function writeCache<T>(key: string, value: T): void {
  cache.set(key, { value, at: Date.now() });
}

export function getCollectApiKey(): string {
  return (process.env.COLLECTAPI_KEY || "").trim();
}

export function isCollectApiConfigured(): boolean {
  return Boolean(getCollectApiKey());
}

function authHeaders(): Record<string, string> {
  return {
    authorization: `apikey ${getCollectApiKey()}`,
    "content-type": "application/json",
  };
}

async function collectGet(path: string, params: Record<string, string>): Promise<unknown | null> {
  const key = getCollectApiKey();
  if (!key) return null;
  try {
    const { data, status } = await axios.get(`${BASE_URL}/${path}`, {
      params,
      headers: authHeaders(),
      validateStatus: () => true,
      timeout: 15_000,
    });
    if (status !== 200 || data == null) return null;
    return data;
  } catch {
    return null;
  }
}

export interface DutyPharmacy {
  name: string;
  district: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

function parseLoc(loc: unknown): { lat: number; lng: number } | null {
  if (loc == null) return null;
  if (typeof loc === "string") {
    const parts = loc.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    return null;
  }
  if (typeof loc === "object") {
    const o = loc as Record<string, unknown>;
    const lat = Number(o.lat ?? o.latitude ?? o.enlem);
    const lng = Number(o.lng ?? o.longitude ?? o.lon ?? o.boylam);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function normalizePharmacyRow(row: Record<string, unknown>): DutyPharmacy | null {
  const name = String(row.name ?? row.eczane ?? row.title ?? "").trim();
  if (!name) return null;
  const coords = parseLoc(row.loc ?? row.location ?? row.koordinat);
  if (!coords) return null;
  return {
    name,
    district: String(row.dist ?? row.district ?? row.ilce ?? "").trim(),
    address: String(row.address ?? row.adres ?? "").trim(),
    phone: String(row.phone ?? row.telefon ?? "").trim(),
    lat: coords.lat,
    lng: coords.lng,
  };
}

/** Nöbetçi eczaneler — il zorunlu, ilce isteğe bağlı. */
export async function fetchDutyPharmacies(opts: {
  il: string;
  ilce?: string;
}): Promise<{ configured: boolean; pharmacies: DutyPharmacy[] }> {
  const il = opts.il.trim();
  if (!il) return { configured: isCollectApiConfigured(), pharmacies: [] };
  const ilce = (opts.ilce ?? "").trim();
  const cacheKey = `pharm:${il.toLowerCase()}:${ilce.toLowerCase()}`;
  const cached = readCache<DutyPharmacy[]>(cacheKey);
  if (cached) return { configured: isCollectApiConfigured(), pharmacies: cached };

  const params: Record<string, string> = { il };
  if (ilce) params.ilce = ilce;

  const raw = await collectGet("health/dutyPharmacy", params);
  if (!raw || typeof raw !== "object") return { configured: isCollectApiConfigured(), pharmacies: [] };

  const body = raw as Record<string, unknown>;
  const rows = Array.isArray(body.result) ? body.result : Array.isArray(body.data) ? body.data : [];
  const pharmacies = rows
    .map((r) => (r && typeof r === "object" ? normalizePharmacyRow(r as Record<string, unknown>) : null))
    .filter((p): p is DutyPharmacy => p != null);

  writeCache(cacheKey, pharmacies);
  return { configured: isCollectApiConfigured(), pharmacies };
}

export interface CollectApiFlightPrice {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  airline: string | null;
  departureAt: string | null;
  returnAt: string | null;
  transfers: number | null;
}

function pickStr(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function pickNum(row: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const n = Number(row[k]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Türkçe şehir adlarını CollectAPI'nin beklediği varyantlara çevirir. */
function foldTurkishAscii(value: string): string {
  return value
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c");
}

const TR_CITY_ALIASES: Record<string, string[]> = {
  istanbul: ["Istanbul", "İstanbul", "ISTANBUL"],
  ankara: ["Ankara", "ANKARA"],
  izmir: ["Izmir", "İzmir", "IZMIR"],
  antalya: ["Antalya", "ANTALYA"],
  bursa: ["Bursa", "BURSA"],
  adana: ["Adana", "ADANA"],
  gaziantep: ["Gaziantep", "GAZIANTEP"],
  konya: ["Konya", "KONYA"],
  mersin: ["Mersin", "MERSIN"],
  eskisehir: ["Eskisehir", "Eskişehir", "ESKIŞEHIR"],
  diyarbakir: ["Diyarbakir", "Diyarbakır", "DIYARBAKIR"],
  samsun: ["Samsun", "SAMSUN"],
  denizli: ["Denizli", "DENIZLI"],
  trabzon: ["Trabzon", "TRABZON"],
  kayseri: ["Kayseri", "KAYSERI"],
};

export function collectApiCityVariants(city: string): string[] {
  const raw = city.trim();
  if (!raw) return [];
  const variants = new Set<string>([raw, foldTurkishAscii(raw)]);
  const key = foldTurkishAscii(raw).toLowerCase();
  for (const alias of TR_CITY_ALIASES[key] ?? []) {
    variants.add(alias);
    variants.add(foldTurkishAscii(alias));
  }
  return [...variants].filter(Boolean);
}

function normalizeFlightRow(row: Record<string, unknown>, fallback: { origin: string; destination: string }): CollectApiFlightPrice | null {
  const price = pickNum(row, ["price", "fiyat", "amount", "total", "ucret", "ticketPrice"]);
  if (price == null) return null;
  const currencyRaw = pickStr(row, ["currency", "para", "currencyCode"]) ?? "TRY";
  return {
    origin: (pickStr(row, ["origin", "from", "nereden", "departure", "kalkis"]) ?? fallback.origin).toUpperCase(),
    destination: (pickStr(row, ["destination", "to", "nereye", "arrival", "varis"]) ?? fallback.destination).toUpperCase(),
    price,
    currency: currencyRaw.toUpperCase(),
    airline: pickStr(row, ["airline", "carrier", "havayolu", "company", "firma"]),
    departureAt: pickStr(row, ["departureAt", "departure_at", "departureTime", "kalkisSaati", "departTime", "date"]),
    returnAt: pickStr(row, ["returnAt", "return_at", "returnTime", "donusSaati"]),
    transfers: (() => {
      const t = row.transfers ?? row.aktarma ?? row.stopCount;
      if (t == null) return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    })(),
  };
}

function extractFlightRows(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object") return [];
  const body = raw as Record<string, unknown>;
  if (Array.isArray(body.result)) return body.result.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  if (Array.isArray(body.data)) return body.data.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  if (body.result && typeof body.result === "object") {
    const inner = body.result as Record<string, unknown>;
    if (Array.isArray(inner.flights)) return inner.flights.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    if (Array.isArray(inner.items)) return inner.items.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  }
  return [];
}

/** CollectAPI seyahat (hava yolu) fiyatları — Travelpayouts yedek/fallback. */
export async function fetchCollectApiFlightPrices(opts: {
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  limit?: number;
}): Promise<CollectApiFlightPrice[]> {
  if (!isCollectApiConfigured() || !opts.origin || !opts.destination) return [];
  const limit = Math.min(30, Math.max(1, opts.limit ?? 20));
  const cacheKey = `ca:${opts.origin}:${opts.destination}:${opts.departDate ?? ""}:${opts.returnDate ?? ""}:${limit}`;
  const cached = readCache<CollectApiFlightPrice[]>(cacheKey);
  if (cached) return cached;

  const customPath = (process.env.COLLECTAPI_TRAVEL_FLIGHT_PATH || "").trim();
  const attempts: Array<{ path: string; params: Record<string, string> }> = [];

  if (customPath) {
    attempts.push({
      path: customPath.replace(/^\//, ""),
      params: {
        "data.origin": opts.origin,
        "data.destination": opts.destination,
        ...(opts.departDate ? { "data.date": opts.departDate } : {}),
        ...(opts.returnDate ? { "data.returnDate": opts.returnDate } : {}),
      },
    });
  }

  attempts.push(
    {
      path: "travel/getAirway",
      params: {
        "data.origin": opts.origin,
        "data.destination": opts.destination,
        ...(opts.departDate ? { "data.date": opts.departDate } : {}),
        ...(opts.returnDate ? { "data.returnDate": opts.returnDate } : {}),
      },
    },
    {
      path: "travel/getFlight",
      params: {
        "data.origin": opts.origin,
        "data.destination": opts.destination,
        ...(opts.departDate ? { "data.date": opts.departDate } : {}),
        ...(opts.returnDate ? { "data.returnDate": opts.returnDate } : {}),
      },
    },
    {
      path: "travel/airway",
      params: {
        origin: opts.origin,
        destination: opts.destination,
        ...(opts.departDate ? { date: opts.departDate } : {}),
        ...(opts.returnDate ? { returnDate: opts.returnDate } : {}),
      },
    },
  );

  for (const attempt of attempts) {
    const raw = await collectGet(attempt.path, attempt.params);
    const rows = extractFlightRows(raw);
    if (!rows.length) continue;
    const flights = rows
      .map((r) => normalizeFlightRow(r, { origin: opts.origin, destination: opts.destination }))
      .filter((f): f is CollectApiFlightPrice => f != null)
      .slice(0, limit);
    if (flights.length) {
      writeCache(cacheKey, flights);
      return flights;
    }
  }

  return [];
}

export interface CollectApiBusPrice {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  company: string | null;
  busType: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  duration: string | null;
}

function normalizeBusRow(row: Record<string, unknown>, fallback: { origin: string; destination: string }): CollectApiBusPrice | null {
  const price = pickNum(row, ["price", "fiyat", "amount", "total", "ucret", "ticketPrice", "fare"]);
  if (price == null) return null;
  const currencyRaw = pickStr(row, ["currency", "para", "currencyCode"]) ?? "TRY";
  return {
    origin: pickStr(row, ["origin", "from", "nereden", "departure", "kalkis", "sourceCity", "source"]) ?? fallback.origin,
    destination:
      pickStr(row, ["destination", "to", "nereye", "arrival", "varis", "destinationCity", "target"]) ?? fallback.destination,
    price,
    currency: currencyRaw.toUpperCase(),
    company: pickStr(row, ["company", "operator", "operatorName", "firma", "firm", "brand", "marka"]),
    busType: pickStr(row, ["busType", "vehicle", "aracTipi", "type", "seatType", "class"]),
    departureAt: pickStr(row, ["departureAt", "departure_at", "departureTime", "kalkisSaati", "departTime", "date", "time"]),
    arrivalAt: pickStr(row, ["arrivalAt", "arrival_at", "arrivalTime", "varisSaati", "arriveTime"]),
    duration: pickStr(row, ["duration", "sure", "travelTime", "tripDuration"]),
  };
}

function extractBusRows(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object") return [];
  const body = raw as Record<string, unknown>;
  if (Array.isArray(body.result)) return body.result.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  if (Array.isArray(body.data)) return body.data.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  if (body.result && typeof body.result === "object") {
    const inner = body.result as Record<string, unknown>;
    if (Array.isArray(inner.buses)) return inner.buses.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    if (Array.isArray(inner.items)) return inner.items.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    if (Array.isArray(inner.trips)) return inner.trips.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  }
  return [];
}

/** CollectAPI seyahat (otobüs) fiyatları — Travelpayouts'ta otobüs fiyat API'si olmadığı için birincil kaynak. */
export async function fetchCollectApiBusPrices(opts: {
  origin: string;
  destination: string;
  departDate?: string;
  passengers?: number;
  limit?: number;
}): Promise<CollectApiBusPrice[]> {
  if (!isCollectApiConfigured() || !opts.origin || !opts.destination) return [];
  const limit = Math.min(30, Math.max(1, opts.limit ?? 20));
  const pax = Math.min(10, Math.max(1, opts.passengers ?? 1));
  const originVariants = collectApiCityVariants(opts.origin);
  const destVariants = collectApiCityVariants(opts.destination);

  for (const origin of originVariants) {
    for (const destination of destVariants) {
      const cacheKey = `cb:${origin}:${destination}:${opts.departDate ?? ""}:${pax}:${limit}`;
      const cached = readCache<CollectApiBusPrice[]>(cacheKey);
      if (cached?.length) return cached;

      const customPath = (process.env.COLLECTAPI_TRAVEL_BUS_PATH || "").trim();
      const attempts: Array<{ path: string; params: Record<string, string> }> = [];

      if (customPath) {
        attempts.push({
          path: customPath.replace(/^\//, ""),
          params: {
            "data.origin": origin,
            "data.destination": destination,
            ...(opts.departDate ? { "data.date": opts.departDate } : {}),
            "data.passenger": String(pax),
          },
        });
      }

      attempts.push(
        {
          path: "travel/getBusway",
          params: {
            "data.origin": origin,
            "data.destination": destination,
            ...(opts.departDate ? { "data.date": opts.departDate } : {}),
            "data.passenger": String(pax),
          },
        },
        {
          path: "travel/getBus",
          params: {
            "data.origin": origin,
            "data.destination": destination,
            ...(opts.departDate ? { "data.date": opts.departDate } : {}),
            "data.passenger": String(pax),
          },
        },
        {
          path: "travel/busway",
          params: {
            origin,
            destination,
            ...(opts.departDate ? { date: opts.departDate } : {}),
            passenger: String(pax),
          },
        },
        {
          path: "travel/getBusway",
          params: {
            sourceCity: origin,
            destinationCity: destination,
            ...(opts.departDate ? { date: opts.departDate } : {}),
            passenger: String(pax),
          },
        },
        {
          path: "travel/getBusway",
          params: {
            nereden: origin,
            nereye: destination,
            ...(opts.departDate ? { tarih: opts.departDate, date: opts.departDate } : {}),
            yolcu: String(pax),
            passenger: String(pax),
          },
        },
      );

      for (const attempt of attempts) {
        const raw = await collectGet(attempt.path, attempt.params);
        const rows = extractBusRows(raw);
        if (!rows.length) continue;
        const buses = rows
          .map((r) => normalizeBusRow(r, { origin: opts.origin, destination: opts.destination }))
          .filter((b): b is CollectApiBusPrice => b != null)
          .slice(0, limit);
        if (buses.length) {
          writeCache(cacheKey, buses);
          return buses;
        }
      }
    }
  }

  return [];
}
