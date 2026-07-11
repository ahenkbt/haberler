import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import {
  allHaberHaritasiMatchLocations,
  type HaberHaritasiLocation,
} from "@/lib/haberHaritasiLocations";
import {
  buildLocationYoutubeSearchQueries,
  buildLocationYoutubeTravelQueries,
  isLocationVideoFalsePositive,
  isVideoItemRelevantToLocation,
  resolveNewsmapLocationContext,
  textContainsLocationTerm,
} from "@/lib/haberHaritasiLocationContext";
import { resolveTargetNewsmapLocation } from "@/lib/haberHaritasiLocationNews";
import {
  fetchHaberHaritasiVideos,
  findLocationForVideoItem,
  parseHaberHaritasiPublishedAt,
  type HaberHaritasiVideoItem,
} from "@/lib/haberHaritasiVideos";
import { isTurkishProvinceName, matchHaberHaritasiGlobalLocation } from "@/lib/haberHaritasiLocations";
import {
  normalizeHmMapCityKey,
  type HmMapCityHeadline,
} from "@/lib/hmMapCityNews";
import { yektubeWatchPath } from "@/lib/yektubeUrls";
import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import { resolveHaberHaritasiVideoHome } from "@/lib/haberHaritasiLinks";

type VideoSearchApiRow = {
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

const LOCATION_VIDEO_TIMEOUT_MS = 35_000;
const YOUTUBE_QUERY_PARALLEL = 4;
/** YekTube'da bu kadar konum videosu yoksa YouTube kazıması devreye girer. */
const YOUTUBE_FALLBACK_MAX_YEKTUBE = 0;

export type NewsmapYoutubeQueryMode = "travel" | "news" | "auto" | "bare";

const YOUTUBE_QUERY_QUALIFIER_RE = /\b(haber|news|video|gezi|tanitim|tanıtım|travel|turizm|tourism|promo|tanitim)\b/i;

/** Konum YouTube araması — gezi/tanıtım öncelikli, haber yedek. */
export function buildNewsmapLocationYoutubeQuery(
  locationName: string,
  mode: NewsmapYoutubeQueryMode = "travel",
  countryHint?: string | null,
): string {
  const ctx = resolveNewsmapLocationContext(locationName, countryHint);
  const queries = buildLocationYoutubeSearchQueries(ctx);
  if (queries.length > 0 && mode === "travel") return queries[0]!;
  if (queries.length > 0 && mode === "bare") return queries[0]!;
  const label = ctx.cityLabel;
  if (!label) return "";
  if (YOUTUBE_QUERY_QUALIFIER_RE.test(label)) return label;

  const preferEnglish =
    ctx.isForeign &&
    !/[çğıöşüÇĞİÖŞÜ]/.test(label) &&
    /^[a-z0-9 .'-]+$/i.test(label);

  if (mode === "news") {
    return preferEnglish ? `${label} news` : `${label} haber`;
  }

  return preferEnglish ? `${label} travel` : `${label} gezi tanıtım`;
}

/** YouTube arama satırı — sourceId=0 (henüz YekTube'da değil) geçerlidir. */
export function normalizeNewsmapYoutubeSearchRow(row: VideoSearchApiRow): HaberHaritasiVideoItem | null {
  const videoId = String(row.videoId ?? "").trim();
  const title = String(row.title ?? "").trim();
  if (!videoId || !title) return null;
  const id = Number(row.id);
  const sourceId = Number(row.sourceId);
  const fallbackId = Math.abs(videoId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) || 1;
  return {
    id: Number.isFinite(id) && id > 0 ? id : fallbackId,
    sourceId: Number.isFinite(sourceId) && sourceId > 0 ? sourceId : 0,
    videoId,
    title,
    description: row.description ?? null,
    thumbnail: row.thumbnail ?? null,
    publishedAt: row.publishedAt ?? row.createdAt ?? null,
    channelName: row.channelName ?? null,
  };
}

export function newsmapLocationVideoCategorySlug(cityName: string | null | undefined): string {
  const label = String(cityName ?? "").trim().split(",")[0]?.trim() || "";
  if (!label) return "haberler";
  if (isTurkishProvinceName(label)) return normalizeHmMapCityKey(label);
  return "haberler";
}

/** YekTube /ara ile aynı — konum adıyla DB araması (importFromYoutube kapalı). */
export function buildNewsmapYektubeSearchQueries(
  ctx: ReturnType<typeof resolveNewsmapLocationContext>,
): string[] {
  const queries: string[] = [];
  const city = ctx.cityLabel.trim();
  if (city) queries.push(city);
  const country = ctx.countryLabel?.trim();
  if (country && normalizeHmMapCityKey(country) !== ctx.cityKey) {
    queries.push(country);
  }
  for (const term of ctx.globalLoc?.searchTerms ?? []) {
    const raw = String(term ?? "").trim();
    if (raw) queries.push(raw);
  }
  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
}

/** YekTube arama satırı — sourceId>0 beklenir; yoksa yedek id. */
export function normalizeNewsmapYektubeSearchRow(row: VideoSearchApiRow): HaberHaritasiVideoItem | null {
  return normalizeNewsmapYoutubeSearchRow(row);
}

/** Konum seçildiğinde — önce YekTube DB araması (/api/video/search ile aynı). */
export async function fetchNewsmapYektubeSearchVideos(
  query: string,
  signal?: AbortSignal,
  limit = 32,
): Promise<HaberHaritasiVideoItem[]> {
  const q = String(query ?? "").trim();
  if (!q) return [];
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    importFromYoutube: "false",
    excludeStories: "false",
  });
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), LOCATION_VIDEO_TIMEOUT_MS);
  const mergedSignal = signal
    ? (() => {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal.addEventListener("abort", onAbort, { once: true });
        timeoutController.signal.addEventListener("abort", onAbort, { once: true });
        return controller.signal;
      })()
    : timeoutController.signal;
  try {
    const { ok, data } = await fetchPublicJson<{ items?: VideoSearchApiRow[] }>(
      apiUrl(`/api/map/newsmap/location-yektube?${params}`),
      { signal: mergedSignal, timeoutMs: LOCATION_VIDEO_TIMEOUT_MS, retries: 2 },
    );
    if (!ok || !Array.isArray(data?.items)) return [];
    const out: HaberHaritasiVideoItem[] = [];
    for (const row of data.items) {
      const normalized = normalizeNewsmapYektubeSearchRow(row);
      if (normalized) out.push(normalized);
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Yekpare arama (/ara) yerine — konum bazlı YouTube HTML/API kazıması. */
export async function fetchNewsmapYoutubeSearchVideos(
  query: string,
  signal?: AbortSignal,
  limit = 24,
  lang: "tr" | "en" | "auto" = "auto",
  queryMode: NewsmapYoutubeQueryMode = "travel",
): Promise<HaberHaritasiVideoItem[]> {
  const q = String(query ?? "").trim();
  if (!q) return [];
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    lang,
    queryMode,
  });
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), LOCATION_VIDEO_TIMEOUT_MS);
  const mergedSignal = signal
    ? (() => {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal.addEventListener("abort", onAbort, { once: true });
        timeoutController.signal.addEventListener("abort", onAbort, { once: true });
        return controller.signal;
      })()
    : timeoutController.signal;
  try {
    const { ok, data } = await fetchPublicJson<{ items?: VideoSearchApiRow[] }>(
      apiUrl(`/api/map/newsmap/location-youtube?${params}`),
      { signal: mergedSignal, timeoutMs: LOCATION_VIDEO_TIMEOUT_MS, retries: 2 },
    );
    if (!ok || !Array.isArray(data?.items)) return [];
    const out: HaberHaritasiVideoItem[] = [];
    for (const row of data.items) {
      const normalized = normalizeNewsmapYoutubeSearchRow(row);
      if (normalized) out.push(normalized);
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/** YekTube havuzu + YouTube arama — videoId ile birleştir. */
export function mergeNewsmapVideoItems(
  ...groups: HaberHaritasiVideoItem[][]
): HaberHaritasiVideoItem[] {
  const byId = new Map<string, HaberHaritasiVideoItem>();
  for (const group of groups) {
    for (const item of group) {
      const key = item.videoId.trim();
      if (!key) continue;
      const existing = byId.get(key);
      if (!existing || parseHaberHaritasiPublishedAt(item.publishedAt) >= parseHaberHaritasiPublishedAt(existing.publishedAt)) {
        byId.set(key, item);
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) => parseHaberHaritasiPublishedAt(b.publishedAt) - parseHaberHaritasiPublishedAt(a.publishedAt),
  );
}

function collectNewsmapLocationMatchTerms(
  ctx: ReturnType<typeof resolveNewsmapLocationContext>,
): string[] {
  const terms = new Set<string>();
  const city = ctx.cityLabel.trim();
  const country = ctx.countryLabel?.trim() || "";
  if (city) terms.add(city);
  if (country) terms.add(country);
  for (const term of ctx.globalLoc?.searchTerms ?? []) {
    const raw = String(term ?? "").trim();
    if (raw) terms.add(raw);
  }
  return [...terms];
}

/** Video yalnızca gidilen konumla (şehir/ülke/eşanlamlı) eşleşiyorsa true. */
export function isVideoItemMatchedToLocation(
  item: Pick<HaberHaritasiVideoItem, "title" | "description">,
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  countryHint?: string | null,
): boolean {
  const ctx = resolveNewsmapLocationContext(cityName, countryHint);
  const title = String(item.title ?? "");
  const body = String(item.description ?? "");
  if (isLocationVideoFalsePositive(title, body, ctx)) return false;

  for (const term of collectNewsmapLocationMatchTerms(ctx)) {
    if (textContainsLocationTerm(title, term) || textContainsLocationTerm(body, term)) {
      return true;
    }
  }

  if (ctx.isForeign) {
    return isVideoItemRelevantToLocation(title, body, ctx);
  }

  const { cityKey, targetLoc, locations } = resolveTargetNewsmapLocation(cityName, ilCenters);
  const loc = findLocationForVideoItem(item as HaberHaritasiVideoItem, locations);
  if (targetLoc && loc) return loc.key === targetLoc.key;
  if (loc) return normalizeHmMapCityKey(loc.label) === cityKey;
  return false;
}

export function filterNewsmapVideosForCity(
  items: HaberHaritasiVideoItem[],
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  countryHint?: string | null,
): HaberHaritasiVideoItem[] {
  return items.filter((item) => isVideoItemMatchedToLocation(item, cityName, ilCenters, countryHint));
}

export function filterNewsmapVideoHeadlinesForCity(
  rows: HmMapCityHeadline[],
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  countryHint?: string | null,
): HmMapCityHeadline[] {
  const label = String(cityName ?? "").trim();
  if (!label) return [];
  return rows.filter(
    (row) =>
      row.kind === "video" &&
      isVideoItemMatchedToLocation({ title: row.title, description: null }, label, ilCenters, countryHint),
  );
}

/** Konum için YekTube arama + havuz; YekTube 0 ise YouTube kazıması. */
export async function fetchNewsmapLocationVideos(
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  signal?: AbortSignal,
  countryHint?: string | null,
): Promise<HaberHaritasiVideoItem[]> {
  const label = String(cityName ?? "").trim();
  if (!label) return [];
  const ctx = resolveNewsmapLocationContext(label, countryHint);

  const yektubeQueries = buildNewsmapYektubeSearchQueries(ctx).slice(0, YOUTUBE_QUERY_PARALLEL);
  const yektubeSearchGroups = await Promise.all(
    yektubeQueries.map((query) => fetchNewsmapYektubeSearchVideos(query, signal, 32)),
  );
  const yektubeSearch = mergeNewsmapVideoItems(...yektubeSearchGroups);

  const yektubePool = await fetchHaberHaritasiVideos(signal).catch(() => [] as HaberHaritasiVideoItem[]);
  const cityYektubePool = filterNewsmapVideosForCity(yektubePool, label, ilCenters, countryHint);

  let merged = mergeNewsmapVideoItems(yektubeSearch, cityYektubePool);

  if (merged.length <= YOUTUBE_FALLBACK_MAX_YEKTUBE) {
    const searchQueries = buildLocationYoutubeSearchQueries(ctx).slice(0, YOUTUBE_QUERY_PARALLEL);
    const youtubeJobs = searchQueries.map((query) =>
      fetchNewsmapYoutubeSearchVideos(query, signal, 32, "auto", "bare"),
    );
    const youtubeGroups = await Promise.all(youtubeJobs);
    const youtubeSearch = mergeNewsmapVideoItems(
      ...youtubeGroups.map((rows) => filterNewsmapVideosForCity(rows, label, ilCenters, countryHint)),
    );
    merged = mergeNewsmapVideoItems(merged, youtubeSearch);
  }

  /** YekTube arama sonuçları zaten sorgu-kapsamlı — yabancı konumda tekrar süzmeyelim. */
  if (yektubeSearch.length > 0) {
    const searchIds = new Set(yektubeSearch.map((v) => v.videoId));
    const poolOnly = filterNewsmapVideosForCity(
      merged.filter((v) => !searchIds.has(v.videoId)),
      label,
      ilCenters,
      countryHint,
    );
    merged = mergeNewsmapVideoItems(yektubeSearch, poolOnly);
  } else {
    merged = filterNewsmapVideosForCity(merged, label, ilCenters, countryHint);
  }

  const categorySlug = newsmapLocationVideoCategorySlug(label);
  let registerBudget = 24;
  for (const item of merged) {
    if (item.sourceId <= 0 && registerBudget > 0) {
      registerBudget -= 1;
      void registerNewsmapVideoPlay(item.videoId, categorySlug);
    }
  }
  return merged;
}

/** Türkiye ülke görünümü — geo eşleşmeyen videolar da banda girsin. */
export function buildNewsmapNationalVideoBandHeadlines(
  items: HaberHaritasiVideoItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  linkMode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
  limit = 96,
): HmMapCityHeadline[] {
  if (items.length === 0) return [];
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const byHref = new Map<string, HmMapCityHeadline>();
  for (const item of items) {
    const loc = findLocationForVideoItem(item, locations);
    const cityName = loc?.label ?? "Türkiye";
    for (const row of newsmapVideoItemsToHeadlines(cityName, [item], linkMode, hmPublicHref, ilCenters)) {
      byHref.set(`${row.kind}:${row.href}`, row);
    }
  }
  return [...byHref.values()]
    .sort((a, b) => parseHaberHaritasiPublishedAt(b.publishedAt) - parseHaberHaritasiPublishedAt(a.publishedAt))
    .slice(0, limit);
}

export function newsmapVideoItemsToHeadlines(
  cityName: string,
  items: HaberHaritasiVideoItem[],
  linkMode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  countryHint?: string | null,
): HmMapCityHeadline[] {
  const videoHome = resolveHaberHaritasiVideoHome(linkMode, hmPublicHref);
  const ctx = resolveNewsmapLocationContext(cityName, countryHint);
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const cityKey = normalizeHmMapCityKey(ctx.cityLabel || cityName);
  const globalLoc = ctx.globalLoc ?? matchHaberHaritasiGlobalLocation(ctx.cityLabel);
  const location: HaberHaritasiLocation =
    locations.find((loc) => loc.key === cityKey || normalizeHmMapCityKey(loc.label) === cityKey)
    ?? globalLoc
    ?? {
      key: cityKey,
      label: ctx.cityLabel || cityName,
      lat: 0,
      lng: 0,
      zoom: 10,
      kind: ctx.isTrProvince ? "tr-province" : "global-city",
      countryCode: ctx.isTrProvince ? "TR" : "XX",
      searchTerms: [ctx.cityLabel || cityName],
    };

  return items.map((item) => ({
    city: location.label,
    title: item.title,
    href:
      item.sourceId > 0
        ? yektubeWatchPath(item.sourceId, item.videoId, videoHome)
        : `https://www.youtube.com/watch?v=${encodeURIComponent(item.videoId)}`,
    publishedAt: item.publishedAt ?? null,
    countryCode: location.countryCode,
    flagEmoji: undefined,
    isTurkish: location.kind === "tr-province",
    kind: "video" as const,
    thumbnail: item.thumbnail ?? null,
    videoId: item.videoId,
    sourceId: item.sourceId,
    geoLat: location.lat,
    geoLng: location.lng,
  }));
}

/** Video oynatıldığında YekTube'a kaydet (haber kategorisi). */
export async function registerNewsmapVideoPlay(
  videoId: string,
  categorySlug = "haberler",
): Promise<void> {
  const vid = String(videoId ?? "").trim();
  if (!vid) return;
  try {
    await fetch(apiUrl("/api/video/haber-haritasi/register-play"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: vid, categorySlug }),
    });
  } catch {
    /* non-blocking */
  }
}

export function buildNewsmapLocationVideoHeadlines(
  cityName: string,
  items: HaberHaritasiVideoItem[],
  linkMode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): HmMapCityHeadline[] {
  return newsmapVideoItemsToHeadlines(cityName, items, linkMode, hmPublicHref, ilCenters);
}
