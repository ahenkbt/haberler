/**
 * Etkinlik.io V2 API proxy helpers — token yalnızca sunucu env'den (ETKINLIK_IO_API_KEY).
 * https://etkinlik.io/api-bilgi · https://api-docs.etkinlik.io/
 */
import axios from "axios";
import {
  ETKINLIK_IO_CATEGORIES_FALLBACK,
  ETKINLIK_IO_FORMATS_FALLBACK,
  YEKPARE_ETKINLIK_EXTRAS,
} from "../data/etkinlik-io-taxonomy-fallback.js";
import { normalizeEnvValue } from "./mediaStorageConfig.js";

const BASE_URL = "https://etkinlik.io/api/v2";

/** Railway panelinde sık görülen alternatif env adları — birincil: ETKINLIK_IO_API_KEY */
const ETKINLIK_TOKEN_KEYS = [
  "ETKINLIK_IO_API_KEY",
  "ETKINLIK_IO_TOKEN",
  "ETKINLIK_IO_KEY",
  "ETKINLIK_API_KEY",
  "ETKINLIK_TOKEN",
  "X_ETKINLIK_TOKEN",
] as const;

function readFirstEtkinlikEnv(): { key: string; value: string } | null {
  for (const key of ETKINLIK_TOKEN_KEYS) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) return { key, value };
  }
  return null;
}

export type EtkinlikIoEnvHealthDetails = {
  configured: boolean;
  tokenLength: number;
  tokenSource: string | null;
  /** process.env'de var ama trim sonrası boş kalan anahtarlar */
  emptyKeys: string[];
  /** Hiçbir alias anahtarı process.env'de yok */
  noKeysPresent: boolean;
  expectedKey: string;
  redeployHint: string | null;
};

/** healthz / status: token sızdırmadan Railway env teşhisi */
export function etkinlikIoEnvHealthDetails(): EtkinlikIoEnvHealthDetails {
  const hit = readFirstEtkinlikEnv();
  const emptyKeys: string[] = [];
  for (const key of ETKINLIK_TOKEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      const v = normalizeEnvValue(process.env[key]);
      if (!v) emptyKeys.push(key);
    }
  }
  const noKeysPresent = !ETKINLIK_TOKEN_KEYS.some((k) =>
    Object.prototype.hasOwnProperty.call(process.env, k),
  );
  let redeployHint: string | null = null;
  if (!hit) {
    if (emptyKeys.length > 0) {
      redeployHint =
        `${emptyKeys.join(", ")} tanımlı ama boş — Railway api-server servisinde değeri kontrol edip yeniden deploy edin.`;
    } else if (noKeysPresent) {
      redeployHint =
        "Railway api-server servisine ETKINLIK_IO_API_KEY ekleyin (Vercel değil) ve redeploy yapın.";
    }
  }
  return {
    configured: Boolean(hit),
    tokenLength: hit?.value.length ?? 0,
    tokenSource: hit?.key ?? null,
    emptyKeys,
    noKeysPresent,
    expectedKey: "ETKINLIK_IO_API_KEY",
    redeployHint,
  };
}

export function etkinlikIoConfigHint(): string | null {
  const d = etkinlikIoEnvHealthDetails();
  if (d.configured) return null;
  return d.redeployHint ?? "ETKINLIK_IO_API_KEY tanımlı değil";
}

/** Açılış logu — token değeri yok, yalnızca kaynak anahtarı */
export function logEtkinlikIoStartupHint(): void {
  const d = etkinlikIoEnvHealthDetails();
  if (d.configured) {
    console.info(`[goalgo] Etkinlik.io token ok (${d.tokenSource}, uzunluk ${d.tokenLength})`);
    return;
  }
  if (d.emptyKeys.length) {
    console.warn(`[goalgo] Etkinlik.io env boş: ${d.emptyKeys.join(", ")}`);
    return;
  }
  console.warn("[goalgo] Etkinlik.io token yok — /turizm/etkinlik yalnızca fallback taksonomi gösterir");
}
const CACHE_TTL_MS = 30 * 60_000;

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

export function getEtkinlikIoToken(): string {
  return readFirstEtkinlikEnv()?.value ?? "";
}

export function isEtkinlikIoConfigured(): boolean {
  return Boolean(getEtkinlikIoToken());
}

type EtkinlikGetResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; data: null; status: number; message: string | null };

async function etkinlikGet<T>(path: string, params?: Record<string, string | number>): Promise<EtkinlikGetResult<T>> {
  const token = getEtkinlikIoToken();
  if (!token) {
    return { ok: false, data: null, status: 0, message: "ETKINLIK_IO_API_KEY tanımlı değil" };
  }
  try {
    const { data, status } = await axios.get(`${BASE_URL}${path}`, {
      params,
      headers: { "X-Etkinlik-Token": token },
      validateStatus: () => true,
      timeout: 15_000,
    });
    if (status !== 200 || data == null) {
      const body = asRecord(data);
      const message =
        body?.message != null
          ? String(body.message)
          : status === 401
            ? "X-Etkinlik-Token geçersiz veya süresi dolmuş"
            : `Etkinlik.io HTTP ${status}`;
      return { ok: false, data: null, status, message };
    }
    const body = asRecord(data);
    if (body && body.success === false) {
      return { ok: false, data: null, status, message: body.message ? String(body.message) : "Etkinlik.io isteği başarısız" };
    }
    return { ok: true, data: data as T, status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Etkinlik.io bağlantı hatası";
    return { ok: false, data: null, status: 0, message };
  }
}

export interface EtkinlikCity {
  id: number;
  name: string;
  slug: string;
}

export interface EtkinlikCategory {
  id: number;
  name: string;
  slug: string;
}

export interface EtkinlikFormat {
  id: number;
  name: string;
  slug: string;
}

export interface EtkinlikTaxonomy {
  categories: EtkinlikCategory[];
  formats: EtkinlikFormat[];
  extras: EtkinlikCategory[];
  source: "live" | "fallback";
}

export interface EtkinlikEventItem {
  id: number;
  name: string;
  slug: string;
  url: string;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  isFree: boolean;
  posterUrl: string | null;
  ticketUrl: string | null;
  category: { id: number; name: string; slug: string } | null;
  format: { id: number; name: string; slug: string } | null;
  venueName: string | null;
  venueCity: string | null;
}

export interface EtkinlikEventDetail extends EtkinlikEventItem {
  description: string | null;
  descriptionHtml: string | null;
  imageUrls: string[];
  tags: string[];
  venueAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  /** etkinlik.io venue_data.id */
  etkinlikVenueId: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string;
}

function normalizeTr(s: string): string {
  return s
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function pickVenue(raw: Record<string, unknown>): { name: string | null; city: string | null } {
  const legacy = asRecord(raw.venue);
  if (legacy?.name) {
    const cityObj = asRecord(legacy.city);
    return { name: String(legacy.name), city: cityObj?.name ? String(cityObj.name) : null };
  }
  const venueType = String(raw.venue_type ?? "").toUpperCase();
  const venueData = asRecord(raw.venue_data);
  if (venueType === "MANUAL" && venueData?.name) {
    return { name: String(venueData.name), city: venueData.city ? String(venueData.city) : null };
  }
  if (venueType === "VENUE" && venueData?.name) {
    const cityObj = asRecord(venueData.city);
    return { name: String(venueData.name), city: cityObj?.name ? String(cityObj.name) : null };
  }
  if (venueType === "ONLINE") return { name: "Online etkinlik", city: null };
  return { name: null, city: null };
}

function normalizeTaxonomyRow(raw: Record<string, unknown>): { id: number; name: string; slug: string } | null {
  const id = Number(raw.id);
  const name = String(raw.name ?? "").trim();
  if (!Number.isFinite(id) || !name) return null;
  return { id, name, slug: String(raw.slug ?? "") };
}

function normalizeEvent(raw: Record<string, unknown>): EtkinlikEventItem | null {
  const id = Number(raw.id);
  const name = String(raw.name ?? "").trim();
  if (!Number.isFinite(id) || !name) return null;
  const cat = asRecord(raw.category);
  const fmt = asRecord(raw.format);
  const venue = pickVenue(raw);
  return {
    id,
    name,
    slug: String(raw.slug ?? ""),
    url: String(raw.url ?? raw.ticket_url ?? `https://etkinlik.io/e/${raw.slug ?? id}`),
    startAt: raw.start_r001 ? String(raw.start_r001) : raw.start ? String(raw.start) : null,
    endAt: raw.end_r001 ? String(raw.end_r001) : raw.end ? String(raw.end) : null,
    timezone: String(raw.timezone ?? "Europe/Istanbul"),
    isFree: Boolean(raw.is_free),
    posterUrl: raw.poster_url ? String(raw.poster_url) : null,
    ticketUrl: raw.ticket_url ? String(raw.ticket_url) : raw.url ? String(raw.url) : null,
    category: cat?.id
      ? { id: Number(cat.id), name: String(cat.name ?? ""), slug: String(cat.slug ?? "") }
      : null,
    format: fmt?.id
      ? { id: Number(fmt.id), name: String(fmt.name ?? ""), slug: String(fmt.slug ?? "") }
      : null,
    venueName: venue.name,
    venueCity: venue.city,
  };
}

function extractItems<T>(raw: unknown, key = "items"): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const body = asRecord(raw);
  if (!body) return [];
  const items = body[key];
  if (Array.isArray(items)) return items as T[];
  if (Array.isArray(body.data)) return body.data as T[];
  return [];
}

function parseTaxonomyList(raw: unknown): Array<{ id: number; name: string; slug: string }> {
  return extractItems<Record<string, unknown>>(raw)
    .map(normalizeTaxonomyRow)
    .filter((r): r is { id: number; name: string; slug: string } => r != null)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function fetchEtkinlikCities(): Promise<EtkinlikCity[]> {
  const cached = readCache<EtkinlikCity[]>("cities");
  if (cached) return cached;
  const res = await etkinlikGet<unknown>("/cities");
  if (!res.ok) return [];
  const cities = parseTaxonomyList(res.data) as EtkinlikCity[];
  if (cities.length) writeCache("cities", cities);
  return cities;
}

export async function fetchEtkinlikCategories(): Promise<EtkinlikCategory[]> {
  const cached = readCache<EtkinlikCategory[]>("categories");
  if (cached) return cached;
  const res = await etkinlikGet<unknown>("/categories");
  if (!res.ok) return ETKINLIK_IO_CATEGORIES_FALLBACK;
  const categories = parseTaxonomyList(res.data) as EtkinlikCategory[];
  if (categories.length) {
    writeCache("categories", categories);
    return categories;
  }
  return ETKINLIK_IO_CATEGORIES_FALLBACK;
}

export async function fetchEtkinlikFormats(): Promise<EtkinlikFormat[]> {
  const cached = readCache<EtkinlikFormat[]>("formats");
  if (cached) return cached;
  const res = await etkinlikGet<unknown>("/formats");
  if (!res.ok) return ETKINLIK_IO_FORMATS_FALLBACK;
  const formats = parseTaxonomyList(res.data) as EtkinlikFormat[];
  if (formats.length) {
    writeCache("formats", formats);
    return formats;
  }
  return ETKINLIK_IO_FORMATS_FALLBACK;
}

export async function fetchEtkinlikTaxonomy(): Promise<EtkinlikTaxonomy & { configured: boolean; error: string | null }> {
  const configured = isEtkinlikIoConfigured();
  if (!configured) {
    return {
      configured: false,
      error: etkinlikIoConfigHint(),
      categories: ETKINLIK_IO_CATEGORIES_FALLBACK,
      formats: ETKINLIK_IO_FORMATS_FALLBACK,
      extras: YEKPARE_ETKINLIK_EXTRAS,
      source: "fallback",
    };
  }

  const [catRes, fmtRes] = await Promise.all([
    etkinlikGet<unknown>("/categories"),
    etkinlikGet<unknown>("/formats"),
  ]);

  const categories = catRes.ok ? parseTaxonomyList(catRes.data) as EtkinlikCategory[] : [];
  const formats = fmtRes.ok ? parseTaxonomyList(fmtRes.data) as EtkinlikFormat[] : [];
  const live = categories.length > 0 || formats.length > 0;
  const catErr = catRes.ok ? null : catRes.message;
  const fmtErr = fmtRes.ok ? null : fmtRes.message;
  const error = live ? null : catErr ?? fmtErr ?? "Etkinlik.io taksonomisi alınamadı";

  if (categories.length) writeCache("categories", categories);
  if (formats.length) writeCache("formats", formats);

  return {
    configured: true,
    error,
    categories: categories.length ? categories : ETKINLIK_IO_CATEGORIES_FALLBACK,
    formats: formats.length ? formats : ETKINLIK_IO_FORMATS_FALLBACK,
    extras: YEKPARE_ETKINLIK_EXTRAS,
    source: live ? "live" : "fallback",
  };
}

export async function resolveEtkinlikCityId(cityName: string): Promise<number | null> {
  const q = cityName.trim();
  if (!q) return null;
  const cities = await fetchEtkinlikCities();
  const norm = normalizeTr(q.split(",")[0] ?? q);
  const exact = cities.find((c) => normalizeTr(c.name) === norm || normalizeTr(c.slug) === norm);
  if (exact) return exact.id;
  const partial = cities.find((c) => normalizeTr(c.name).includes(norm) || norm.includes(normalizeTr(c.name)));
  return partial?.id ?? null;
}

export async function resolveCategoryIdBySlug(slug: string): Promise<number | null> {
  const q = slug.trim().toLowerCase();
  if (!q || q === "all") return null;
  const categories = await fetchEtkinlikCategories();
  const hit = categories.find((c) => c.slug.toLowerCase() === q || String(c.id) === q);
  return hit?.id ?? null;
}

export async function resolveFormatIdBySlug(slug: string): Promise<number | null> {
  const q = slug.trim().toLowerCase();
  if (!q) return null;
  const formats = await fetchEtkinlikFormats();
  const hit = formats.find((f) => f.slug.toLowerCase() === q || String(f.id) === q);
  return hit?.id ?? null;
}

/** Geriye dönük preset → kategori id eşlemesi (konser/spor/muze). */
const CATEGORY_PRESET_PATTERNS: Record<string, RegExp[]> = {
  konser: [/konser/i, /muzik/i, /müzik/i, /sahne/i, /festival/i, /alternatif/i],
  spor: [/spor/i, /mac/i, /maç/i, /futbol/i, /basketbol/i],
  muze: [/muze/i, /müze/i, /sergi/i, /galeri/i, /sanat/i],
};

export async function resolveCategoryIdsForPreset(preset: string): Promise<number[]> {
  const patterns = CATEGORY_PRESET_PATTERNS[preset.toLowerCase()];
  if (!patterns?.length) return [];
  const categories = await fetchEtkinlikCategories();
  return categories
    .filter((c) => patterns.some((re) => re.test(c.name) || re.test(c.slug)))
    .map((c) => c.id);
}

const ETKINLIK_PAGE_SIZE = 50;
const ETKINLIK_FETCH_ALL_MAX_PAGES = 30;

async function searchEtkinlikEventsPage(
  resolved: {
    cityIds: number[];
    categoryIds: number[];
    formatIds: number[];
    startGte?: string;
    endLte?: string;
    freeOnly?: boolean;
    paidOnly?: boolean;
  },
  skip: number,
  take: number,
): Promise<{
  events: EtkinlikEventItem[];
  total: number;
  error: string | null;
}> {
  const params: Record<string, string | number> = {
    sort_by: "upcoming",
    skip,
    take: Math.min(ETKINLIK_PAGE_SIZE, Math.max(1, take)),
  };
  if (resolved.cityIds.length) params.city_ids = resolved.cityIds.join(",");
  if (resolved.categoryIds.length) params.category_ids = resolved.categoryIds.join(",");
  if (resolved.formatIds.length) params.format_ids = resolved.formatIds.join(",");
  if (resolved.startGte) params.start_gte = `${resolved.startGte} 00:00:00`;
  // end_lte: bitişi olmayan etkinlikleri dışlayabilir — yalnızca istemci açıkça gönderirse uygula
  if (resolved.endLte) params.end_lte = `${resolved.endLte} 23:59:59`;

  const res = await etkinlikGet<Record<string, unknown>>("/events", params);
  if (!res.ok) {
    return { events: [], total: 0, error: res.message };
  }

  const raw = res.data;
  let events = extractItems<Record<string, unknown>>(raw)
    .map(normalizeEvent)
    .filter((e): e is EtkinlikEventItem => e != null);

  if (resolved.freeOnly) events = events.filter((e) => e.isFree);
  if (resolved.paidOnly) events = events.filter((e) => !e.isFree);

  const meta = asRecord(raw.meta);
  const total = Number(meta?.total_count ?? meta?.total ?? meta?.count ?? events.length);

  return {
    events,
    total: Number.isFinite(total) ? total : events.length,
    error: null,
  };
}

export async function searchEtkinlikEvents(opts: {
  city?: string;
  cityId?: number;
  categoryIds?: number[];
  categorySlug?: string;
  categoryPreset?: string;
  formatIds?: number[];
  formatSlug?: string;
  startGte?: string;
  endLte?: string;
  freeOnly?: boolean;
  paidOnly?: boolean;
  skip?: number;
  take?: number;
  fetchAll?: boolean;
}): Promise<{
  configured: boolean;
  events: EtkinlikEventItem[];
  total: number;
  error: string | null;
}> {
  const configured = isEtkinlikIoConfigured();
  if (!configured) return { configured: false, events: [], total: 0, error: etkinlikIoConfigHint() };

  let cityIds: number[] = [];
  if (opts.cityId) {
    cityIds = [opts.cityId];
  } else if (opts.city?.trim()) {
    const id = await resolveEtkinlikCityId(opts.city);
    if (id) cityIds = [id];
  }

  let categoryIds = opts.categoryIds ?? [];
  if (!categoryIds.length && opts.categorySlug) {
    const id = await resolveCategoryIdBySlug(opts.categorySlug);
    if (id) categoryIds = [id];
  }
  if (!categoryIds.length && opts.categoryPreset) {
    categoryIds = await resolveCategoryIdsForPreset(opts.categoryPreset);
  }

  let formatIds = opts.formatIds ?? [];
  if (!formatIds.length && opts.formatSlug) {
    const id = await resolveFormatIdBySlug(opts.formatSlug);
    if (id) formatIds = [id];
  }

  const resolved = {
    cityIds,
    categoryIds,
    formatIds,
    startGte: opts.startGte,
    endLte: opts.endLte,
    freeOnly: opts.freeOnly,
    paidOnly: opts.paidOnly,
  };

  const pageSize = Math.min(ETKINLIK_PAGE_SIZE, Math.max(1, opts.take ?? ETKINLIK_PAGE_SIZE));

  if (opts.fetchAll) {
    let skip = 0;
    let allEvents: EtkinlikEventItem[] = [];
    let total = 0;
    let error: string | null = null;

    for (let page = 0; page < ETKINLIK_FETCH_ALL_MAX_PAGES; page++) {
      const batch = await searchEtkinlikEventsPage(resolved, skip, pageSize);
      if (batch.error) {
        error = batch.error;
        break;
      }
      if (page === 0) total = batch.total;
      allEvents = allEvents.concat(batch.events);
      if (batch.events.length < pageSize || allEvents.length >= total) break;
      skip += pageSize;
    }

    if (error && !allEvents.length) {
      return { configured: true, events: [], total: 0, error };
    }

    return {
      configured: true,
      events: allEvents,
      total: total || allEvents.length,
      error: null,
    };
  }

  const batch = await searchEtkinlikEventsPage(resolved, opts.skip ?? 0, pageSize);
  if (batch.error) {
    return { configured: true, events: [], total: 0, error: batch.error };
  }

  return {
    configured: true,
    events: batch.events,
    total: batch.total,
    error: null,
  };
}

function pickTags(raw: Record<string, unknown>): string[] {
  const tagsRaw = raw.tags;
  if (!Array.isArray(tagsRaw)) return [];
  return tagsRaw
    .map((t) => {
      const rec = asRecord(t);
      if (rec?.name) return String(rec.name);
      if (typeof t === "string") return t;
      return null;
    })
    .filter((t): t is string => Boolean(t?.trim()));
}

function pickPrice(raw: Record<string, unknown>): { min: number | null; max: number | null; currency: string } {
  const min = Number(raw.min_price ?? raw.price_min ?? raw.lowest_price);
  const max = Number(raw.max_price ?? raw.price_max ?? raw.highest_price);
  const currency = raw.currency ? String(raw.currency) : "TRY";
  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    currency,
  };
}

function normalizeEventDetail(raw: Record<string, unknown>): EtkinlikEventDetail | null {
  const base = normalizeEvent(raw);
  if (!base) return null;
  const venue = pickVenue(raw);
  const prices = pickPrice(raw);
  const descRaw = raw.description ?? raw.about ?? raw.content ?? raw.summary;
  const descHtmlRaw = raw.description_html ?? raw.content_html;
  const imagesRaw = raw.images ?? raw.gallery;
  const imageUrls: string[] = [];
  if (base.posterUrl) imageUrls.push(base.posterUrl);
  if (Array.isArray(imagesRaw)) {
    for (const img of imagesRaw) {
      if (typeof img === "string") imageUrls.push(img);
      else if (asRecord(img)?.url) imageUrls.push(String(asRecord(img)!.url));
    }
  }
  const venueData = asRecord(raw.venue_data);
  let venueAddress: string | null = null;
  let venueLat: number | null = null;
  let venueLng: number | null = null;
  let etkinlikVenueId: number | null = null;
  if (venueData?.address) venueAddress = String(venueData.address);
  else if (venueData?.full_address) venueAddress = String(venueData.full_address);
  const lat = Number(venueData?.latitude ?? venueData?.lat);
  const lng = Number(venueData?.longitude ?? venueData?.lng);
  if (Number.isFinite(lat)) venueLat = lat;
  if (Number.isFinite(lng)) venueLng = lng;
  const venueIdRaw = Number(venueData?.id);
  if (Number.isFinite(venueIdRaw) && venueIdRaw > 0) etkinlikVenueId = venueIdRaw;

  return {
    ...base,
    description: descRaw ? String(descRaw) : null,
    descriptionHtml: descHtmlRaw ? String(descHtmlRaw) : null,
    imageUrls: [...new Set(imageUrls)],
    tags: pickTags(raw),
    venueName: base.venueName ?? venue.name,
    venueCity: base.venueCity ?? venue.city,
    venueAddress,
    venueLat,
    venueLng,
    etkinlikVenueId,
    minPrice: prices.min,
    maxPrice: prices.max,
    currency: prices.currency,
  };
}

export async function fetchEtkinlikEventDetail(id: number): Promise<{
  configured: boolean;
  event: EtkinlikEventDetail | null;
  error: string | null;
}> {
  const configured = isEtkinlikIoConfigured();
  if (!configured) {
    return { configured: false, event: null, error: etkinlikIoConfigHint() };
  }
  const cacheKey = `event:${id}`;
  const cached = readCache<EtkinlikEventDetail>(cacheKey);
  if (cached) return { configured: true, event: cached, error: null };

  const res = await etkinlikGet<Record<string, unknown>>(`/events/${id}`);
  if (!res.ok) {
    return { configured: true, event: null, error: res.message };
  }
  const body = asRecord(res.data);
  const raw = body?.data && asRecord(body.data) ? (body.data as Record<string, unknown>) : body;
  if (!raw) return { configured: true, event: null, error: "Etkinlik bulunamadı" };
  const event = normalizeEventDetail(raw);
  if (!event) return { configured: true, event: null, error: "Etkinlik bulunamadı" };
  writeCache(cacheKey, event);
  return { configured: true, event, error: null };
}
