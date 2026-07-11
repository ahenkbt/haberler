import { normalizeHmMapCityKey } from "@/lib/hmMapCityNews";
import {
  newsmapScrapeRadiusMeters,
  queueNewsmapBusinessScrape,
} from "@/lib/haberHaritasiNewsmapScrape";
import { newsmapGeoFilterFromUserLocation } from "@/lib/haberHaritasiGeoFilter";

const BACKFILL_SESSION_KEY = "newsmap-il-backfill-v1";
export const NEWSMAP_AUTO_BACKFILL_CITY_LIMIT = 12;

/** İl/bölge RSS feed geo — API hybrid yanıtından gelir; metin eşleşmesi yoksa feed merkezi kullanılır. */
export type NewsmapFeedGeoMeta = {
  geoLat: number;
  geoLng: number;
  regionKey?: string | null;
  regionLabel?: string | null;
  countryCode?: string | null;
};

export function resolveNewsmapFeedGeoCityLabel(meta: NewsmapFeedGeoMeta): string | null {
  const label = String(meta.regionLabel ?? "").trim();
  return label || null;
}

export function newsmapFeedGeoToCoord(
  meta: NewsmapFeedGeoMeta,
): { lat: number; lng: number; label: string; key: string } | null {
  const label = resolveNewsmapFeedGeoCityLabel(meta);
  if (!label || !Number.isFinite(meta.geoLat) || !Number.isFinite(meta.geoLng)) return null;
  return {
    lat: meta.geoLat,
    lng: meta.geoLng,
    label,
    key: normalizeHmMapCityKey(label),
  };
}

/** İlk harita yüklemesinde veri eksik iller için sessiz işletme kazıması kuyruğu. */
export function queueNewsmapMissingProvinceBackfill(
  ilCenters: Array<{ adi: string; lat: number; lng: number }>,
  coveredCityKeys: Set<string>,
  limit = NEWSMAP_AUTO_BACKFILL_CITY_LIMIT,
): number {
  if (typeof window === "undefined" || ilCenters.length === 0) return 0;
  try {
    if (sessionStorage.getItem(BACKFILL_SESSION_KEY) === "1") return 0;
    sessionStorage.setItem(BACKFILL_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }

  const missing = ilCenters
    .filter((il) => !coveredCityKeys.has(normalizeHmMapCityKey(il.adi)))
    .slice(0, Math.max(1, limit));

  for (const il of missing) {
    const filter = newsmapGeoFilterFromUserLocation(il.lat, il.lng);
    void queueNewsmapBusinessScrape({
      lat: il.lat,
      lng: il.lng,
      label: il.adi,
      radiusMeters: newsmapScrapeRadiusMeters(filter),
    });
  }
  return missing.length;
}
