import {
  allHaberHaritasiMatchLocations,
  type HaberHaritasiLocation,
} from "@/lib/haberHaritasiLocations";
import { findLocationInText } from "@/lib/hmMapCityNews";

export type HaberHaritasiVideoItem = {
  id: number;
  sourceId: number;
  videoId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  publishedAt?: string | null;
  channelName?: string | null;
};

type VideoApiRow = {
  id?: number;
  sourceId?: number | null;
  videoId?: string;
  title?: string;
  description?: string | null;
  thumbnail?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  channelName?: string | null;
};

function normalizeVideoRow(row: VideoApiRow): HaberHaritasiVideoItem | null {
  const id = Number(row.id);
  const sourceId = Number(row.sourceId);
  const videoId = String(row.videoId ?? "").trim();
  const title = String(row.title ?? "").trim();
  if (!Number.isFinite(id) || id <= 0) return null;
  if (!Number.isFinite(sourceId) || sourceId <= 0) return null;
  if (!videoId || !title) return null;
  return {
    id,
    sourceId,
    videoId,
    title,
    description: row.description ?? null,
    thumbnail: row.thumbnail ?? null,
    /** publishedAt bazı içe aktarımlarda boş — createdAt tazelik filtresi için yedek. */
    publishedAt: row.publishedAt ?? row.createdAt ?? null,
    channelName: row.channelName ?? null,
  };
}

import { apiUrl } from "@/lib/apiBase";

const HABER_HARITASI_VIDEO_TIMEOUT_MS = 45_000;

/** Yekpare / Yektube / HM Video TV — haber odaklı video havuzu. */
export async function fetchHaberHaritasiVideos(signal?: AbortSignal): Promise<HaberHaritasiVideoItem[]> {
  const params = new URLSearchParams({
    limit: "500",
    newsOnly: "true",
    mixChannels: "true",
    excludeStories: "false",
  });
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), HABER_HARITASI_VIDEO_TIMEOUT_MS);
  const mergedSignal = signal
    ? (() => {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal.addEventListener("abort", onAbort, { once: true });
        timeoutController.signal.addEventListener("abort", onAbort, { once: true });
        return controller.signal;
      })()
    : timeoutController.signal;
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/video/videos?${params}`), { signal: mergedSignal });
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    /* Render soğuk başlangıç / ağır sorgu — bir kez daha dene. */
    try {
      res = await fetch(apiUrl(`/api/video/videos?${params}`), {
        signal: AbortSignal.timeout(Math.min(HABER_HARITASI_VIDEO_TIMEOUT_MS, 20_000)),
      });
    } catch {
      return [];
    }
    if (!res.ok) return [];
  }
  const data = (await res.json()) as { items?: VideoApiRow[] };
  const items: HaberHaritasiVideoItem[] = [];
  for (const row of data.items ?? []) {
    const normalized = normalizeVideoRow(row);
    if (normalized) items.push(normalized);
  }
  return items;
}

export function getVideoSearchableBody(item: HaberHaritasiVideoItem): string {
  const parts: string[] = [];
  if (item.description?.trim()) parts.push(item.description.trim());
  if (item.channelName?.trim()) parts.push(item.channelName.trim());
  return parts.join(" ");
}

export function findLocationForVideoItem(
  item: HaberHaritasiVideoItem,
  locations: HaberHaritasiLocation[],
): HaberHaritasiLocation | null {
  return (
    findLocationInText(item.title, locations) ??
    findLocationInText(getVideoSearchableBody(item), locations)
  );
}

/** Konum anahtarı → en güncel video. */
export function buildHaberHaritasiVideoIndex(
  items: HaberHaritasiVideoItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): Map<string, HaberHaritasiVideoItem> {
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const index = new Map<string, HaberHaritasiVideoItem>();
  for (const item of items) {
    const location = findLocationForVideoItem(item, locations);
    if (!location) continue;
    if (!index.has(location.key)) index.set(location.key, item);
  }
  return index;
}

export function parseHaberHaritasiPublishedAt(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

/** Haber haritası — varsayılan görünüm: son 24 saat (yalnızca haber metni). */
export const NEWSMAP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Bölge/konum seçildiğinde — performans için en fazla 7 gün. */
export const NEWSMAP_REGION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isNewsmapPublishedWithinAge(
  value?: string | null,
  maxAgeMs = NEWSMAP_MAX_AGE_MS,
  nowMs = Date.now(),
): boolean {
  const ts = parseHaberHaritasiPublishedAt(value);
  if (!ts) return false;
  return nowMs - ts <= maxAgeMs;
}

export function isNewsmapFreshPublishedAt(value?: string | null, nowMs = Date.now()): boolean {
  return isNewsmapPublishedWithinAge(value, NEWSMAP_MAX_AGE_MS, nowMs);
}

export function isNewsmapRegionPublishedAt(value?: string | null, nowMs = Date.now()): boolean {
  return isNewsmapPublishedWithinAge(value, NEWSMAP_REGION_MAX_AGE_MS, nowMs);
}
