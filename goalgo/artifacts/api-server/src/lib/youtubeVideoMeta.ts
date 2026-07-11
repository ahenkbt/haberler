import { and, eq, sql } from "drizzle-orm";
import { dualWriteYektubeUpdate, getYektubeDbForRead, videosTable } from "@workspace/db";
import { logger } from "./logger.js";
import { resolveYoutubeApiKey } from "./resolve-youtube-api-key.js";
import {
  classifyAsYekcek,
  formatDurationSeconds,
  formatYoutubeIsoDuration,
  isPlaceholderShortTitle,
  sanitizeDisplayTitle,
} from "./yektubeVideoClassify.js";

const db = getYektubeDbForRead();
const UA = "YekpareVideoMeta/1.0 (+https://yekpare.net)";

/**
 * Render gibi YouTube'un engellediği barındırıcılarda zaman aşımı olmadan
 * yapılan istekler liste uçlarını 15sn+ blokluyordu — tüm meta istekleri sınırlı.
 */
const OEMBED_TIMEOUT_MS = 2_500;
const SNIPPET_TIMEOUT_MS = 5_000;
const WATCH_PAGE_TIMEOUT_MS = 6_000;

/** YouTube Data API yoksa veya kota doluysa oEmbed ile başlık */
export async function fetchYoutubeOembedTitle(videoId: string): Promise<string | null> {
  const id = videoId.trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    const title = json.title?.trim();
    return title ? title.slice(0, 500) : null;
  } catch {
    return null;
  }
}

/** API anahtarı referer kısıtlı / kota dolu — watch sayfasından süre */
async function fetchYoutubeWatchPageDuration(videoId: string): Promise<string | null> {
  const id = videoId.trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, {
      headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9" },
      signal: AbortSignal.timeout(WATCH_PAGE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const secMatch =
      html.match(/"lengthSeconds":"(\d+)"/) ??
      html.match(/"lengthSeconds":(\d+)/) ??
      html.match(/"approxDurationMs":"(\d+)"/);
    if (!secMatch?.[1]) return null;
    const raw = parseInt(secMatch[1], 10);
    const sec = secMatch[0].includes("approxDurationMs") ? Math.floor(raw / 1000) : raw;
    if (!Number.isFinite(sec) || sec <= 0) return null;
    return formatDurationSeconds(sec);
  } catch {
    return null;
  }
}

export type YoutubeVideoSnippet = {
  videoId: string;
  title: string;
  description: string;
  duration: string | null;
  thumbnail?: string;
  channelId?: string;
  channelTitle?: string;
  liveBroadcastContent?: "live" | "upcoming" | "none";
  isLive?: boolean;
};

type VideosListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      liveBroadcastContent?: "live" | "upcoming" | "none";
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: { duration?: string };
  }>;
};

export async function fetchYoutubeVideoSnippetMap(videoIds: string[]): Promise<Map<string, YoutubeVideoSnippet>> {
  const out = new Map<string, YoutubeVideoSnippet>();
  const ids = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return out;

  const key = await resolveYoutubeApiKey();
  if (!key) return out;

  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", key);

    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(SNIPPET_TIMEOUT_MS) });
    } catch {
      continue;
    }
    const json = (await res.json().catch(() => ({}))) as VideosListResponse;
    if (!res.ok) continue;

    for (const item of json.items ?? []) {
      const id = item.id?.trim();
      if (!id) continue;
      const title = item.snippet?.title?.trim() || "";
      const description = item.snippet?.description?.trim() || "";
      const iso = item.contentDetails?.duration;
      const lbc = item.snippet?.liveBroadcastContent;
      out.set(id, {
        videoId: id,
        title: title.slice(0, 500),
        description: description.slice(0, 8000),
        duration: formatYoutubeIsoDuration(iso) ?? (iso ? iso : null),
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
        channelId: item.snippet?.channelId,
        channelTitle: item.snippet?.channelTitle,
        liveBroadcastContent: lbc,
        isLive: lbc === "live" || lbc === "upcoming",
      });
    }
  }

  return out;
}

/** Placeholder başlıklı / açıklamasız videoları YouTube API ile günceller; Yekçek sınıflandırması yapar */
export async function enrichAndClassifySourceVideos(sourceId: number, videoIds?: string[]): Promise<number> {
  let rows = await db
    .select()
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, sourceId), eq(videosTable.active, true)));

  if (videoIds?.length) {
    const set = new Set(videoIds);
    rows = rows.filter((r) => set.has(r.videoId));
  }

  const needsMeta = rows.filter((r) => !r.duration?.trim() || isPlaceholderShortTitle(r.title) || !r.description?.trim());
  if (needsMeta.length === 0) return 0;

  const metaMap = await fetchYoutubeVideoSnippetMap(needsMeta.map((r) => r.videoId));
  let updated = 0;

  for (const row of needsMeta) {
    const meta = metaMap.get(row.videoId);
    const title = meta?.title?.trim() || row.title;
    const description = meta?.description?.trim() || row.description || null;
    const duration = meta?.duration || row.duration || null;
    const displayTitle = meta?.title?.trim()
      ? sanitizeDisplayTitle(meta.title) || meta.title.trim().slice(0, 500)
      : sanitizeDisplayTitle(row.title) || row.title;
    const isStory = classifyAsYekcek({
      title: displayTitle,
      duration,
    });

    const patch: Record<string, unknown> = {};
    if (displayTitle !== row.title) patch.title = displayTitle;
    if (description && description !== row.description) patch.description = description;
    if (duration && duration !== row.duration) patch.duration = duration;
    if (isStory !== row.isStory) patch.isStory = isStory;

    if (Object.keys(patch).length === 0) continue;
    await dualWriteYektubeUpdate(videosTable, patch, eq(videosTable.id, row.id));
    updated++;
  }

  if (updated > 0) {
    logger.info({ sourceId, updated }, "[youtubeVideoMeta] kanal videoları zenginleştirildi");
  }
  return updated;
}

/** Kanaldaki tüm videoları yeniden sınıflandır (fragman, süre, başlık) */
export async function reclassifyYekcekForSource(sourceId: number): Promise<number> {
  const rows = await db
    .select()
    .from(videosTable)
    .where(and(eq(videosTable.sourceId, sourceId), eq(videosTable.active, true)));

  let updated = 0;
  for (const row of rows) {
    const isStory = classifyAsYekcek({
      title: row.title,
      duration: row.duration,
    });
    if (isStory === row.isStory) continue;
    await dualWriteYektubeUpdate(videosTable, { isStory }, eq(videosTable.id, row.id));
    updated++;
  }
  return updated;
}

/** Placeholder başlıklı videoları toplu zenginleştir (admin / arka plan) */
export async function enrichPlaceholderTitles(limit = 200): Promise<number> {
  const rows = await db
    .select({ id: videosTable.id, videoId: videosTable.videoId, title: videosTable.title })
    .from(videosTable)
    .where(and(eq(videosTable.active, true), sql`${videosTable.title} ILIKE 'Short %'`))
    .limit(limit);

  if (rows.length === 0) return 0;
  const metaMap = await fetchYoutubeVideoSnippetMap(rows.map((r) => r.videoId));
  let updated = 0;
  for (const row of rows) {
    const meta = metaMap.get(row.videoId);
    let resolvedTitle = meta?.title?.trim() || "";
    if (!resolvedTitle) {
      resolvedTitle = (await fetchYoutubeOembedTitle(row.videoId)) || "";
    }
    if (!resolvedTitle) continue;
    const displayTitle = sanitizeDisplayTitle(resolvedTitle) || resolvedTitle.slice(0, 500);
    if (displayTitle === row.title && !meta?.description) continue;
    await dualWriteYektubeUpdate(
      videosTable,
      {
        title: displayTitle,
        ...(meta?.description ? { description: meta.description.slice(0, 8000) } : {}),
        ...(meta?.duration ? { duration: meta.duration } : {}),
        isStory: classifyAsYekcek({ title: displayTitle, duration: meta?.duration }),
      },
      eq(videosTable.id, row.id),
    );
    updated++;
  }
  return updated;
}

type VideoClassifyRow = {
  id: number;
  videoId: string;
  title: string;
  duration?: string | null;
  isStory?: boolean | null;
};

/** Süresi eksik videoları YouTube API ile doldurur ve isStory (Yekçek) bayrağını günceller */
export async function hydrateVideoDurationsAndClassify(
  rows: VideoClassifyRow[],
  maxFetch = 80,
): Promise<number> {
  const need = rows.filter((r) => !r.duration?.trim());
  if (need.length === 0) return 0;

  const metaMap = await fetchYoutubeVideoSnippetMap(need.slice(0, maxFetch).map((r) => r.videoId));
  let updated = 0;

  for (const row of need.slice(0, maxFetch)) {
    const meta = metaMap.get(row.videoId);
    let duration = meta?.duration?.trim() || "";
    if (!duration) {
      duration = (await fetchYoutubeWatchPageDuration(row.videoId)) || "";
    }
    if (!duration) continue;
    const displayTitle = sanitizeDisplayTitle(meta?.title?.trim() || row.title) || row.title;
    const isStory = classifyAsYekcek({
      title: row.title,
      duration,
      isStory: row.isStory ?? undefined,
    });
    const patch: Record<string, unknown> = { duration, isStory };
    if (displayTitle !== row.title) patch.title = displayTitle;
    await dualWriteYektubeUpdate(videosTable, patch, eq(videosTable.id, row.id));
    row.duration = duration;
    row.isStory = isStory;
    updated++;
  }

  return updated;
}

/** Son videolarda süre + Yekçek sınıflandırmasını toplu güncelle (arka plan / shorts açılışı) */
export async function reclassifyRecentYekcekPool(limit = 250): Promise<number> {
  const rows = await db
    .select({
      id: videosTable.id,
      videoId: videosTable.videoId,
      title: videosTable.title,
      duration: videosTable.duration,
      isStory: videosTable.isStory,
    })
    .from(videosTable)
    .where(eq(videosTable.active, true))
    .orderBy(sql`${videosTable.id} DESC`)
    .limit(limit);

  const hydrated = await hydrateVideoDurationsAndClassify(rows, 80);
  let reclassified = 0;
  for (const row of rows) {
    const isStory = classifyAsYekcek({
      title: row.title,
      duration: row.duration,
    });
    if (isStory === row.isStory) continue;
    await dualWriteYektubeUpdate(videosTable, { isStory }, eq(videosTable.id, row.id));
    row.isStory = isStory;
    reclassified++;
  }
  return hydrated + reclassified;
}
