import { apiUrl } from "@/lib/apiBase";
import { NEWSMAP_USER_LOCATE_RADIUS_KM, type NewsmapGeoFilter } from "@/lib/haberHaritasiGeoFilter";
const SCRAPE_DEDUPE_STORAGE_PREFIX = "newsmap-scrape:";

/** Aynı bölge için tekrar kuyruk almayı engelle (30 dk). */
export const NEWSMAP_SCRAPE_DEDUPE_TTL_MS = 30 * 60 * 1000;

/** Ülke görünümünde anlamsız kazımayı atla; il/ilçe seviyesinde başlat. */
export const NEWSMAP_SCRAPE_MIN_ZOOM = 9;

export type NewsmapScrapeQueueResult = {
  success?: boolean;
  provider?: string;
  queued?: number;
  skippedFresh?: number;
  jobIds?: string[];
  region?: string;
};

export function newsmapScrapeRadiusMeters(filter: NewsmapGeoFilter | null | undefined): number {
  if (!filter) return NEWSMAP_USER_LOCATE_RADIUS_KM * 1000;
  return Math.max(10_000, Math.min(50_000, Math.round(filter.radiusKm * 1000)));
}

/** Konum + yarıçap bazlı dedupe anahtarı (kaynak bağımsız). */
export function newsmapScrapeRegionKey(lat: number, lng: number, radiusMeters: number): string {
  const latGrid = Math.round(lat * 20) / 20;
  const lngGrid = Math.round(lng * 20) / 20;
  return `${latGrid.toFixed(2)}:${lngGrid.toFixed(2)}:${Math.round(radiusMeters / 1000)}km`;
}

export function newsmapScrapeDedupeKey(
  lat: number,
  lng: number,
  radiusMeters: number,
  source: string,
): string {
  return `${newsmapScrapeRegionKey(lat, lng, radiusMeters)}:${source}`;
}

export function shouldSkipNewsmapScrape(regionKey: string, ttlMs = NEWSMAP_SCRAPE_DEDUPE_TTL_MS): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(`${SCRAPE_DEDUPE_STORAGE_PREFIX}${regionKey}`);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < ttlMs;
  } catch {
    return false;
  }
}

export function markNewsmapScrapeQueued(regionKey: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${SCRAPE_DEDUPE_STORAGE_PREFIX}${regionKey}`, String(Date.now()));
  } catch {
    /* quota / private mode */
  }
}

/** Haber haritası konumunda Sarı Sayfalar kategorileri için Google Maps kazıma botu kuyruğu. */
export async function queueNewsmapBusinessScrape(input: {
  lat: number;
  lng: number;
  label: string;
  radiusMeters?: number;
  targetPerCategory?: number;
}): Promise<NewsmapScrapeQueueResult> {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false };
  try {
    const r = await fetch(apiUrl("/api/map/newsmap-scraper/queue"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lng,
        label: String(input.label || "Map location").trim().slice(0, 48) || "Map location",
        radiusMeters: input.radiusMeters,
        targetPerCategory: input.targetPerCategory,
      }),
    });
    return (await r.json().catch(() => ({}))) as NewsmapScrapeQueueResult;
  } catch {
    return { success: false };
  }
}
