/**
 * HM Video TV — Yektube katalog okuma (canlı).
 *
 * Haberler / Neon news tablolarına YAZMAZ. Video satırlarını HM site
 * medya kütüphanesine veya news insert job'larına aktarmaz.
 * Yektube `videos` okuması (getYektubeDbForRead) + kısa TTL bellek önbelleği.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { getYektubeDbForRead, videosTable } from "@workspace/db";
import { mixVideosForNewsSiteFeed, mixVideosNewsOnly } from "./videoMix.js";
import { slugifyVideoCategory } from "./yektubeCategoryCatalog.js";
import { logger } from "./logger.js";

/** yektube-core YEKTUBE_ORIGIN ile aynı — api-server o pakete bağımlı değil. */
const YEKTUBE_ORIGIN = "https://yektube.com";

export const HM_YEKTUBE_CATALOG_TTL_MS = 45_000;
export const HM_YEKTUBE_CATALOG_CACHE_CONTROL =
  "public, max-age=30, s-maxage=60, stale-while-revalidate=180";
export const HM_YEKTUBE_CATALOG_MAX_LIMIT = 48;
export const HM_YEKTUBE_HOP_HEADER = "x-yekpare-hm-yektube-hop";

const CATEGORY_ALIASES: Record<string, readonly string[]> = {
  haberler: ["haberler", "haber", "gundem", "politika"],
  sinema: ["sinema", "film", "filmler", "film-dizi", "film-ve-animasyon", "sinema-filmleri"],
  dizi: ["dizi", "diziler"],
  muzik: ["muzik", "music", "muzik-videolari"],
  oyun: ["oyun", "oyunlar", "gaming"],
  spor: ["spor", "sports"],
  eglence: ["eglence", "entertainment", "eglence-videolari"],
  komedi: ["komedi", "comedy"],
  bilim: ["bilim", "science"],
  teknoloji: ["teknoloji", "technology", "bilim-ve-teknoloji"],
  egitim: ["egitim", "education"],
  seyahat: ["seyahat", "travel"],
  otomobil: ["otomobil", "otomobiller", "cars", "auto"],
  "evcil-hayvan": ["evcil-hayvan", "evcil-hayvanlar", "pets"],
  doga: ["doga", "nature"],
  "nasil-yapilir": ["nasil-yapilir", "howto"],
  vlog: ["vlog", "blog"],
  tarih: ["tarih", "history"],
  saglik: ["saglik", "health"],
  cocuk: ["cocuk", "kids", "cocuk-videolari"],
};

export const HM_YEKTUBE_NAV_SLUGS = [
  "haberler",
  "sinema",
  "dizi",
  "muzik",
  "oyun",
  "spor",
  "eglence",
  "komedi",
  "bilim",
  "teknoloji",
  "egitim",
  "seyahat",
  "otomobil",
  "evcil-hayvan",
  "doga",
  "nasil-yapilir",
  "vlog",
  "tarih",
  "saglik",
  "cocuk",
] as const;

export const HM_YEKTUBE_NAV_LABELS: Record<string, string> = {
  haberler: "Haberler",
  sinema: "Film",
  dizi: "Dizi",
  muzik: "Müzik",
  oyun: "Oyun",
  spor: "Spor",
  eglence: "Eğlence",
  komedi: "Komedi",
  bilim: "Bilim",
  teknoloji: "Bilim",
  egitim: "Eğitim",
  seyahat: "Seyahat",
  otomobil: "Otomobiller",
  "evcil-hayvan": "Evcil Hayvanlar",
  doga: "Doğa",
  "nasil-yapilir": "Nasıl Yapılır",
  vlog: "Vlog",
  tarih: "Tarih",
  saglik: "Sağlık",
  cocuk: "Çocuk",
};

const catalogSelect = {
  id: videosTable.id,
  sourceId: videosTable.sourceId,
  videoId: videosTable.videoId,
  title: videosTable.title,
  thumbnail: videosTable.thumbnail,
  channelName: videosTable.channelName,
  duration: videosTable.duration,
  categorySlug: videosTable.categorySlug,
  isStory: videosTable.isStory,
  platform: videosTable.platform,
};

export type HmYektubeCatalogRow = {
  id: number;
  sourceId: number | null;
  videoId: string;
  title: string;
  thumbnail: string | null;
  channelName: string | null;
  duration: string | null;
  categorySlug: string;
  isStory: boolean;
  platform: string;
};

export type HmYektubeCatalogItem = HmYektubeCatalogRow & {
  watchUrl: string;
  provider: string | null;
};

export type HmYektubeCatalogQuery = {
  categorySlug: string | null;
  limit: number;
  seed: number | null;
};

export type HmYektubeCatalogResponse = {
  items: HmYektubeCatalogItem[];
  total: number;
  source: "yektube-db" | "yektube-upstream" | "degraded";
  persistedToNews: false;
};

type CacheEntry = { expiresAt: number; body: HmYektubeCatalogResponse };

const memoryCache = new Map<string, CacheEntry>();

export function parseHmYektubeCatalogQuery(input: {
  categorySlug?: string | null;
  limit?: string | number | null;
  seed?: string | number | null;
}): HmYektubeCatalogQuery {
  const rawSlug = typeof input.categorySlug === "string" ? input.categorySlug.trim() : "";
  const slug = rawSlug && rawSlug !== "all" && rawSlug !== "tumu" ? slugifyVideoCategory(rawSlug) : "";
  const limitNum = Number(input.limit ?? 36);
  const seedNum = Number(input.seed ?? 0);
  return {
    categorySlug: slug || null,
    limit: Math.min(Math.max(Number.isFinite(limitNum) ? Math.trunc(limitNum) : 36, 1), HM_YEKTUBE_CATALOG_MAX_LIMIT),
    seed: Number.isFinite(seedNum) && seedNum > 0 ? Math.trunc(seedNum) : null,
  };
}

export function hmYektubeCategorySlugs(canonical: string | null | undefined): string[] {
  const slug = slugifyVideoCategory(canonical ?? "");
  if (!slug) return [];
  const aliases = CATEGORY_ALIASES[slug];
  if (aliases) return [...new Set(aliases.map((s) => slugifyVideoCategory(s)).filter(Boolean))];
  return [slug];
}

export function hmYektubeWatchUrl(sourceId: number | null | undefined, videoId: string): string {
  const id = String(videoId ?? "").trim();
  const sid = Number(sourceId);
  if (Number.isFinite(sid) && sid > 0 && id) {
    return `${YEKTUBE_ORIGIN}/yp/kanal/${sid}/${encodeURIComponent(id)}`;
  }
  if (id) return `${YEKTUBE_ORIGIN}/yp/?v=${encodeURIComponent(id)}`;
  return `${YEKTUBE_ORIGIN}/yp/`;
}

export function youtubeThumbFallback(videoId: string): string | null {
  const id = String(videoId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function mapYektubeRowToHmCatalogItem(row: HmYektubeCatalogRow): HmYektubeCatalogItem | null {
  const videoId = String(row.videoId ?? "").trim();
  const title = String(row.title ?? "").trim();
  if (!videoId || !title) return null;
  const thumbnail = String(row.thumbnail ?? "").trim() || youtubeThumbFallback(videoId);
  return {
    id: row.id,
    sourceId: row.sourceId ?? null,
    videoId,
    title,
    thumbnail,
    channelName: row.channelName ?? null,
    duration: row.duration ?? null,
    categorySlug: row.categorySlug || "haberler",
    isStory: Boolean(row.isStory),
    platform: row.platform || "youtube",
    watchUrl: hmYektubeWatchUrl(row.sourceId, videoId),
    provider: row.channelName ?? null,
  };
}

export function mixHmYektubeCatalog(
  rows: HmYektubeCatalogRow[],
  query: HmYektubeCatalogQuery,
): HmYektubeCatalogItem[] {
  const mapped = rows
    .map(mapYektubeRowToHmCatalogItem)
    .filter((row): row is HmYektubeCatalogItem => row != null && !row.isStory);
  if (mapped.length === 0) return [];
  if (query.categorySlug) return mapped.slice(0, query.limit);
  const newsOnly = mixVideosNewsOnly(mapped, query.limit, query.seed ?? undefined);
  if (newsOnly.length >= Math.min(8, query.limit)) return newsOnly;
  return mixVideosForNewsSiteFeed(mapped, query.limit, query.seed ?? undefined);
}

export function hmYektubeCategoriesFallback(): { slug: string; label: string }[] {
  return HM_YEKTUBE_NAV_SLUGS.map((slug) => ({
    slug,
    label: HM_YEKTUBE_NAV_LABELS[slug] ?? slug,
  }));
}

export function catalogCacheKey(query: HmYektubeCatalogQuery): string {
  return `${query.categorySlug ?? "all"}:${query.limit}:${query.seed ?? 0}`;
}

function readCache(key: string): HmYektubeCatalogResponse | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.body;
}

function writeCache(key: string, body: HmYektubeCatalogResponse): void {
  if (memoryCache.size >= 80) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { expiresAt: Date.now() + HM_YEKTUBE_CATALOG_TTL_MS, body });
}

async function selectRecentRows(opts: {
  categorySlugs?: string[];
  limit: number;
}): Promise<HmYektubeCatalogRow[]> {
  const db = getYektubeDbForRead();
  const conds = [eq(videosTable.active, true), eq(videosTable.isStory, false)];
  if (opts.categorySlugs && opts.categorySlugs.length > 0) {
    conds.push(inArray(videosTable.categorySlug, opts.categorySlugs));
  }
  const rows = await db
    .select(catalogSelect)
    .from(videosTable)
    .where(and(...conds))
    .orderBy(desc(videosTable.id))
    .limit(opts.limit);
  return rows as HmYektubeCatalogRow[];
}

/** Var olan env adı — yeni secret uydurulmaz. Yoksa upstream denemesi yapılmaz. */
export function hmYektubeUpstreamOrigin(): string {
  const raw = String(process.env.YEKTUBE_API_BASE ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

async function fetchUpstreamCatalog(
  query: HmYektubeCatalogQuery,
  hopSeen: boolean,
): Promise<HmYektubeCatalogResponse | null> {
  if (hopSeen) return null;
  const origin = hmYektubeUpstreamOrigin();
  if (!origin) return null;
  const params = new URLSearchParams({ limit: String(query.limit) });
  if (query.categorySlug) params.set("categorySlug", query.categorySlug);
  if (query.seed) params.set("seed", String(query.seed));
  const url = `${origin}/api/hm/yektube/videos?${params}`;
  try {
    const res = await fetch(url, {
      headers: { [HM_YEKTUBE_HOP_HEADER]: "1", accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<HmYektubeCatalogResponse>;
    if (!Array.isArray(data.items)) return null;
    return {
      items: data.items.slice(0, query.limit),
      total: data.items.length,
      source: "yektube-upstream",
      persistedToNews: false,
    };
  } catch {
    return null;
  }
}

export async function loadHmYektubeCatalog(
  query: HmYektubeCatalogQuery,
  opts: { hopSeen?: boolean } = {},
): Promise<HmYektubeCatalogResponse> {
  const key = catalogCacheKey(query);
  const cached = readCache(key);
  if (cached) return cached;

  const upstream = await fetchUpstreamCatalog(query, Boolean(opts.hopSeen));
  if (upstream && upstream.items.length > 0) {
    writeCache(key, upstream);
    return upstream;
  }

  try {
    const poolLimit = Math.min(query.limit * 8, 160);
    const categorySlugs = hmYektubeCategorySlugs(query.categorySlug);
    let rows: HmYektubeCatalogRow[];
    if (categorySlugs.length > 0) {
      rows = await selectRecentRows({ categorySlugs, limit: poolLimit });
    } else {
      const [newsRows, generalRows] = await Promise.all([
        selectRecentRows({ categorySlugs: hmYektubeCategorySlugs("haberler"), limit: Math.min(80, poolLimit) }),
        selectRecentRows({ limit: poolLimit }),
      ]);
      const seen = new Set<string>();
      rows = [];
      for (const row of [...newsRows, ...generalRows]) {
        const k = `${row.videoId}|${row.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        rows.push(row);
      }
    }
    const items = mixHmYektubeCatalog(rows, query);
    const body: HmYektubeCatalogResponse = {
      items,
      total: items.length,
      source: "yektube-db",
      persistedToNews: false,
    };
    writeCache(key, body);
    return body;
  } catch (err) {
    logger.warn({ err, query }, "[hm-yektube] catalog read failed");
    return { items: [], total: 0, source: "degraded", persistedToNews: false };
  }
}

export function emptyHmYektubeCatalog(): HmYektubeCatalogResponse {
  return { items: [], total: 0, source: "degraded", persistedToNews: false };
}
