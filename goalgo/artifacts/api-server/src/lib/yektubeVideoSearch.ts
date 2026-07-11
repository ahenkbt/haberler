import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videoSourcesTable,
  videosTable,
} from "@workspace/db";
import { serializeVideo } from "./serializers.js";
import { embeddableVideoCondition } from "./videoEmbeddable.js";
import { fetchYoutubeEmbedAllowedMap } from "./youtubeEmbedCheck.js";
import {
  isUsableYoutubeCover,
  normalizeYoutubeCoverUrl,
  youtubeVideoCoverUrl,
} from "./youtubeCoverImages.js";
import { searchYoutubeVideos, type YoutubeSearchHit } from "./youtubeVideoSearch.js";
import {
  classifyAsYekcek,
  isPlaceholderShortTitle,
  sanitizeDisplayTitle,
} from "./yektubeVideoClassify.js";
import { fetchYoutubeOembedTitle, fetchYoutubeVideoSnippetMap } from "./youtubeVideoMeta.js";

const db = getYektubeDbForRead();

export type YektubeSearchOptions = {
  limit?: number;
  excludeStories?: boolean;
  importFromYoutube?: boolean;
  /** YouTube tarama sorgusu (yerel YekTube araması `query` ile; içe aktarımda bu kullanılır). */
  youtubeQuery?: string;
};

export type YektubeSearchResult = {
  items: ReturnType<typeof serializeVideo>[];
  localCount: number;
  importedCount: number;
  total: number;
};

/**
 * Devre kesici: YouTube erişimi (Render IP engeli vb.) art arda başarısız olursa
 * liste uçlarında zenginleştirmeyi bir süre tamamen atla — istek anında dönsün.
 */
let enrichConsecutiveFailures = 0;
let enrichCircuitOpenUntil = 0;
const ENRICH_CIRCUIT_FAILURE_THRESHOLD = 3;
const ENRICH_CIRCUIT_OPEN_MS = 5 * 60_000;

function isEnrichCircuitOpen(): boolean {
  return Date.now() < enrichCircuitOpenUntil;
}

function noteEnrichOutcome(anyResolved: boolean, attempted: number): void {
  if (attempted === 0) return;
  if (anyResolved) {
    enrichConsecutiveFailures = 0;
    return;
  }
  enrichConsecutiveFailures += 1;
  if (enrichConsecutiveFailures >= ENRICH_CIRCUIT_FAILURE_THRESHOLD) {
    enrichCircuitOpenUntil = Date.now() + ENRICH_CIRCUIT_OPEN_MS;
    enrichConsecutiveFailures = 0;
    console.warn(
      "[yektube] Başlık zenginleştirme devre kesici açıldı (YouTube erişilemiyor olabilir); " +
        `${Math.round(ENRICH_CIRCUIT_OPEN_MS / 60000)} dk boyunca atlanacak.`,
    );
  }
}

async function patchPlaceholderTitles(
  items: ReturnType<typeof serializeVideo>[],
  persist = true,
): Promise<ReturnType<typeof serializeVideo>[]> {
  const placeholders = items.filter((i) => isPlaceholderShortTitle(i.title));
  if (placeholders.length === 0) return items;
  if (isEnrichCircuitOpen()) return items;

  const metaMap = await fetchYoutubeVideoSnippetMap(placeholders.map((p) => p.videoId));

  /* oEmbed geridönüşleri paralel — eskiden sıralıydı ve engelli ağda dakikalar sürüyordu. */
  const oembedNeeded = placeholders.filter((p) => !metaMap.get(p.videoId)?.title?.trim());
  const oembedTitles = new Map<string, string>();
  if (oembedNeeded.length > 0) {
    const settled = await Promise.allSettled(
      oembedNeeded.slice(0, 24).map(async (p) => ({
        videoId: p.videoId,
        title: (await fetchYoutubeOembedTitle(p.videoId)) || "",
      })),
    );
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value.title) {
        oembedTitles.set(result.value.videoId, result.value.title);
      }
    }
  }

  let resolvedCount = 0;
  const out: ReturnType<typeof serializeVideo>[] = [];
  for (const item of items) {
    if (!isPlaceholderShortTitle(item.title)) {
      out.push(item);
      continue;
    }
    const meta = metaMap.get(item.videoId);
    const resolvedTitle = meta?.title?.trim() || oembedTitles.get(item.videoId) || "";
    if (!resolvedTitle) {
      out.push(item);
      continue;
    }
    resolvedCount += 1;
    const title = sanitizeDisplayTitle(resolvedTitle) || resolvedTitle.slice(0, 500);
    const isStory = classifyAsYekcek({ title, duration: meta?.duration ?? item.duration });
    if (persist && item.id > 0) {
      await dualWriteYektubeUpdate(
        videosTable,
        {
          title,
          ...(meta?.description ? { description: meta.description.slice(0, 8000) } : {}),
          ...(meta?.duration ? { duration: meta.duration } : {}),
          isStory,
        },
        eq(videosTable.id, item.id),
      );
    }
    out.push({ ...item, title, duration: meta?.duration ?? item.duration, isStory });
  }
  noteEnrichOutcome(resolvedCount > 0, placeholders.length);
  return out;
}

async function resolveSourceForHit(hit: YoutubeSearchHit) {
  const channelId = hit.channelId.trim();
  if (channelId) {
    const [byChannel] = await db
      .select()
      .from(videoSourcesTable)
      .where(and(eq(videoSourcesTable.platform, "youtube"), eq(videoSourcesTable.channelId, channelId)))
      .orderBy(desc(videoSourcesTable.id))
      .limit(1);
    if (byChannel) return byChannel;
  }

  const name = hit.channelTitle.trim() || channelId || "Yektube Keşif";
  const [created] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: name.slice(0, 200),
    platform: "youtube",
    sourceType: "channel",
    channelId: channelId || `search-${hit.videoId}`,
    url: channelId ? `https://www.youtube.com/channel/${channelId}` : null,
    logoUrl: null,
    categorySlug: "eglence",
    active: true,
    isLive: false,
    useYoutubeApi: true,
  });
  return created;
}

async function upsertSearchHit(hit: YoutubeSearchHit): Promise<ReturnType<typeof serializeVideo> | null> {
  const videoId = hit.videoId.trim();
  if (!videoId) return null;

  const [existing] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.videoId, videoId))
    .orderBy(desc(videosTable.id))
    .limit(1);

  const title = sanitizeDisplayTitle(hit.title) || hit.title.trim().slice(0, 500);
  const thumbRaw = hit.thumbnail?.trim() || "";
  const thumb = isUsableYoutubeCover(thumbRaw)
    ? normalizeYoutubeCoverUrl(thumbRaw)
    : youtubeVideoCoverUrl(videoId);
  const isStory = classifyAsYekcek({ title, duration: hit.duration ?? null });
  const embedMap = await fetchYoutubeEmbedAllowedMap([videoId]);
  const embedAllowed = embedMap.get(videoId) !== false;

  if (existing) {
    const [updated] = await dualWriteYektubeUpdate(
      videosTable,
      {
        title,
        thumbnail: thumb,
        channelName: hit.channelTitle.trim() || existing.channelName,
        channelId: hit.channelId.trim() || existing.channelId,
        publishedAt: hit.publishedAt || existing.publishedAt,
        duration: hit.duration ?? existing.duration,
        description: hit.description?.slice(0, 8000) ?? existing.description,
        active: true,
        embedAllowed,
        isStory,
      },
      eq(videosTable.id, existing.id),
    );
    return serializeVideo(updated ?? { ...existing, title, thumbnail: thumb, isStory, embedAllowed });
  }

  const source = await resolveSourceForHit(hit);
  const [inserted] = await dualWriteYektubeInsert(videosTable, {
    sourceId: source.id,
    platform: "youtube",
    videoId,
    title,
    description: hit.description?.slice(0, 8000) ?? null,
    thumbnail: thumb,
    channelName: hit.channelTitle.trim() || source.name,
    channelId: hit.channelId.trim() || source.channelId,
    publishedAt: hit.publishedAt ?? null,
    duration: hit.duration ?? null,
    categorySlug: source.categorySlug,
    active: true,
    embedAllowed,
    isStory,
  });
  return serializeVideo(inserted);
}

/** Haber haritası konumu — YouTube arama sayfası gibi kazı + YekTube'a içe aktar. */
export async function scrapeAndImportLocationYoutubeVideos(
  searchQuery: string,
  opts: { limit?: number; categorySlug?: string } = {},
): Promise<ReturnType<typeof serializeVideo>[]> {
  const q = searchQuery.trim();
  if (!q) return [];
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
  const categorySlug =
    opts.categorySlug?.trim() ||
    q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "haberler";

  let hits: YoutubeSearchHit[];
  try {
    hits = await searchYoutubeVideos(q, limit);
  } catch {
    return [];
  }

  const out: ReturnType<typeof serializeVideo>[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (out.length >= limit) break;
    const videoId = hit.videoId.trim();
    if (!videoId || seen.has(videoId)) continue;
    let row = await upsertSearchHit(hit);
    if (!row || row.embedAllowed === false) continue;
    if (categorySlug && row.categorySlug !== categorySlug && row.id > 0) {
      const [updated] = await dualWriteYektubeUpdate(
        videosTable,
        { categorySlug },
        eq(videosTable.id, row.id),
      );
      row = serializeVideo(updated ?? { ...row, categorySlug });
    }
    out.push(row);
    seen.add(videoId);
  }
  return patchPlaceholderTitles(out);
}

export async function searchYektubeVideos(
  query: string,
  opts: YektubeSearchOptions = {},
): Promise<YektubeSearchResult> {
  const q = query.trim();
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
  const excludeStories = opts.excludeStories !== false;
  const importFromYoutube = opts.importFromYoutube !== false;

  if (!q) {
    return { items: [], localCount: 0, importedCount: 0, total: 0 };
  }

  const conds = [eq(videosTable.active, true), embeddableVideoCondition];
  if (excludeStories) conds.push(eq(videosTable.isStory, false));

  const searchOr = or(
    ilike(videosTable.title, `%${q}%`),
    ilike(videosTable.description, `%${q}%`),
    ilike(videosTable.channelName, `%${q}%`),
    ilike(videosTable.videoId, `%${q}%`),
  );
  if (searchOr) conds.push(searchOr);

  const matchingSources = await db
    .select({ id: videoSourcesTable.id })
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.active, true),
        or(
          ilike(videoSourcesTable.name, `%${q}%`),
          ilike(videoSourcesTable.channelId, `%${q}%`),
        ),
      ),
    )
    .limit(24);
  const sourceIds = matchingSources.map((s) => s.id).filter((id) => id > 0);

  let localRows = await db
    .select()
    .from(videosTable)
    .where(and(...conds))
    .orderBy(desc(videosTable.isFeatured), desc(videosTable.publishedAt), desc(videosTable.id))
    .limit(limit);

  if (localRows.length < limit && sourceIds.length > 0) {
    const seen = new Set(localRows.map((r) => r.videoId));
    const fromSources = await db
      .select()
      .from(videosTable)
      .where(
        and(eq(videosTable.active, true), embeddableVideoCondition, inArray(videosTable.sourceId, sourceIds)),
      )
      .orderBy(desc(videosTable.id))
      .limit(limit);
    for (const row of fromSources) {
      if (localRows.length >= limit) break;
      if (seen.has(row.videoId)) continue;
      if (excludeStories && row.isStory) continue;
      localRows.push(row);
      seen.add(row.videoId);
    }
  }

  let items = localRows.map((row) => serializeVideo(row));
  const localCount = items.length;
  let importedCount = 0;

  if (importFromYoutube && items.length < limit) {
    const existingIds = new Set(items.map((i) => i.videoId));
    const youtubeQuery = opts.youtubeQuery?.trim() || q;
    const ytHits = await searchYoutubeVideos(youtubeQuery, limit - items.length + 5);
    for (const hit of ytHits) {
      if (items.length >= limit) break;
      if (existingIds.has(hit.videoId)) continue;
      if (excludeStories && classifyAsYekcek({ title: hit.title, duration: hit.duration ?? null })) {
        continue;
      }
      const row = await upsertSearchHit(hit);
      if (!row || row.embedAllowed === false) continue;
      if (excludeStories && row.isStory) continue;
      items.push(row);
      existingIds.add(hit.videoId);
      importedCount++;
    }
  }

  items = await patchPlaceholderTitles(items);
  items = items.filter((i) => !excludeStories || !classifyAsYekcek({ isStory: i.isStory, title: i.title, duration: i.duration }));

  return {
    items: items.slice(0, limit),
    localCount,
    importedCount,
    total: items.length,
  };
}

/** Haber haritası — tek video oynatımında YekTube'a kaydet. */
export async function importYoutubeVideoById(
  videoId: string,
  opts?: { categorySlug?: string },
): Promise<ReturnType<typeof serializeVideo> | null> {
  const vid = String(videoId ?? "").trim();
  if (!vid) return null;

  const [existing] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.videoId, vid))
    .orderBy(desc(videosTable.id))
    .limit(1);
  if (existing?.active) {
    if (opts?.categorySlug && existing.categorySlug !== opts.categorySlug) {
      const [updated] = await dualWriteYektubeUpdate(
        videosTable,
        { categorySlug: opts.categorySlug },
        eq(videosTable.id, existing.id),
      );
      return serializeVideo(updated ?? existing);
    }
    return serializeVideo(existing);
  }

  const metaMap = await fetchYoutubeVideoSnippetMap([vid]);
  const meta = metaMap.get(vid);
  if (!meta?.title) return null;

  const hit: YoutubeSearchHit = {
    videoId: vid,
    title: meta.title,
    description: meta.description,
    channelId: meta.channelId ?? "",
    channelTitle: meta.channelTitle ?? "",
    publishedAt: undefined,
    thumbnail: meta.thumbnail,
    duration: meta.duration,
  };
  const row = await upsertSearchHit(hit);
  if (row && opts?.categorySlug && row.categorySlug !== opts.categorySlug && row.id > 0) {
    const [updated] = await dualWriteYektubeUpdate(
      videosTable,
      { categorySlug: opts.categorySlug },
      eq(videosTable.id, row.id),
    );
    return serializeVideo(updated ?? row);
  }
  return row;
}

/** Benzer video önerileri için placeholder başlıkları YouTube'dan doldurur (isteğe bağlı DB kaydı) */
export async function enrichSerializedVideoTitles(
  items: ReturnType<typeof serializeVideo>[],
  persist = true,
): Promise<ReturnType<typeof serializeVideo>[]> {
  return patchPlaceholderTitles(items, persist);
}
