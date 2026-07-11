import { and, desc, eq, or } from "drizzle-orm";
import { Innertube } from "youtubei.js";
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
import { resolveYoutubeApiKey } from "./resolve-youtube-api-key.js";
import { searchYoutubeVideos, type YoutubeSearchHit } from "./youtubeVideoSearch.js";
import { classifyAsYekcek, sanitizeDisplayTitle } from "./yektubeVideoClassify.js";
import { fetchYoutubeVideoSnippetMap } from "./youtubeVideoMeta.js";
import { syncVideoSourceToDb } from "./youtubeVideoSync.js";
import { logger } from "./logger.js";

const db = getYektubeDbForRead();
const MUSIC_CATEGORY = "muzik";
const UA = "YekpareMusicImport/1.0 (+https://yekpare.net)";

let innertubePromise: Promise<Innertube> | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertubePromise) {
    innertubePromise = Innertube.create({ lang: "tr", location: "TR" });
  }
  return innertubePromise;
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String((value as { toString(): string }).toString()).trim();
  }
  return String(value).trim();
}

function thumbFromItem(item: Record<string, unknown>): string | undefined {
  const thumb = item.thumbnail as { contents?: Array<{ url?: string }> } | undefined;
  const url = thumb?.contents?.[0]?.url?.trim();
  return url || undefined;
}

function artistsFromItem(item: Record<string, unknown>): string | undefined {
  const artists = item.artists as Array<{ name?: unknown }> | undefined;
  if (Array.isArray(artists) && artists.length > 0) {
    return artists.map((a) => textOf(a.name)).filter(Boolean).join(", ");
  }
  const authors = item.authors as Array<{ name?: unknown }> | undefined;
  if (Array.isArray(authors) && authors.length > 0) {
    return authors.map((a) => textOf(a.name)).filter(Boolean).join(", ");
  }
  return textOf(item.subtitle) || undefined;
}

function classifyMusicItem(item: Record<string, unknown>): MusicBrowseItem["kind"] {
  const type = textOf(item.type);
  const id = textOf(item.id);
  if (type === "MusicResponsiveListItem" || /^[\w-]{11}$/.test(id)) return "song";
  if (id.startsWith("VL") || id.startsWith("RD")) return "playlist";
  if (id.startsWith("MPRE")) return "album";
  if (id.startsWith("UC") || type.toLowerCase().includes("artist")) return "artist";
  return "other";
}

function videoIdFromMusicItem(item: Record<string, unknown>): string | null {
  const id = textOf(item.id);
  if (/^[\w-]{11}$/.test(id)) return id;
  const endpoint = item.endpoint as { payload?: { videoId?: string } } | undefined;
  const fromEndpoint = endpoint?.payload?.videoId?.trim();
  if (fromEndpoint && /^[\w-]{11}$/.test(fromEndpoint)) return fromEndpoint;
  return null;
}

export type MusicBrowseItem = {
  kind: "song" | "playlist" | "album" | "artist" | "other";
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  videoId?: string;
  artists?: string;
};

export type MusicBrowseSection = {
  title: string;
  items: MusicBrowseItem[];
};

export type MusicImportResult = {
  imported: number;
  skipped: number;
  channels: number;
  errors: string[];
};

export type YoutubeChannelHit = {
  channelId: string;
  title: string;
  description?: string;
  thumbnail?: string;
};

function mapBrowseItem(raw: unknown): MusicBrowseItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = textOf(item.id);
  if (!id) return null;
  const kind = classifyMusicItem(item);
  const videoId = videoIdFromMusicItem(item);
  return {
    kind,
    id,
    title: textOf(item.title) || id,
    subtitle: textOf(item.subtitle) || artistsFromItem(item),
    thumbnail: thumbFromItem(item),
    videoId: videoId ?? undefined,
    artists: artistsFromItem(item),
  };
}

type MusicHomeCarousel = {
  header?: { title?: unknown };
  contents?: unknown[];
};

function asMusicCarousel(section: unknown): MusicHomeCarousel | null {
  if (!section || typeof section !== "object" || !("contents" in section)) return null;
  return section as MusicHomeCarousel;
}

export async function browseYoutubeMusicHome(): Promise<MusicBrowseSection[]> {
  const yt = await getInnertube();
  const home = await yt.music.getHomeFeed();
  const sections: MusicBrowseSection[] = [];
  for (const raw of home.sections ?? []) {
    const section = asMusicCarousel(raw);
    if (!section?.contents?.length) continue;
    const header = section.header;
    const title = textOf(header?.title) || "Öneriler";
    const items = section.contents
      .map((item) => mapBrowseItem(item))
      .filter((item): item is MusicBrowseItem => item != null);
    if (items.length > 0) sections.push({ title, items });
  }
  return sections;
}

export async function searchYoutubeMusic(
  query: string,
  type: "song" | "album" | "playlist" | "video" | "artist" = "song",
  limit = 20,
): Promise<MusicBrowseItem[]> {
  const q = query.trim();
  if (!q) return [];
  const yt = await getInnertube();
  const result = await yt.music.search(q, { type });
  const tab = result.contents?.[0];
  const rawItems = tab?.contents ?? [];
  return rawItems
    .map((item) => mapBrowseItem(item))
    .filter((item): item is MusicBrowseItem => item != null)
    .slice(0, Math.min(Math.max(limit, 1), 50));
}

export async function searchYoutubeMusicChannels(query: string, maxResults = 12): Promise<YoutubeChannelHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const key = await resolveYoutubeApiKey();
  if (!key) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("type", "channel");
  url.searchParams.set("maxResults", String(Math.min(Math.max(maxResults, 1), 25)));
  url.searchParams.set("key", key);
  url.searchParams.set("relevanceLanguage", "tr");
  url.searchParams.set("regionCode", "TR");

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = (await res.json().catch(() => ({}))) as {
    items?: Array<{
      id?: { channelId?: string };
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
    }>;
  };
  if (!res.ok) return [];

  const hits: YoutubeChannelHit[] = [];
  for (const item of json.items ?? []) {
    const channelId = item.id?.channelId?.trim();
    if (!channelId) continue;
    const sn = item.snippet;
    hits.push({
      channelId,
      title: sn?.title?.trim() || channelId,
      description: sn?.description?.trim(),
      thumbnail: sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url,
    });
  }
  return hits;
}

async function resolveMusicSource(hit: Pick<YoutubeSearchHit, "channelId" | "channelTitle" | "videoId">) {
  const channelId = hit.channelId.trim();
  if (channelId) {
    const [byChannel] = await db
      .select()
      .from(videoSourcesTable)
      .where(and(eq(videoSourcesTable.platform, "youtube"), eq(videoSourcesTable.channelId, channelId)))
      .orderBy(desc(videoSourcesTable.id))
      .limit(1);
    if (byChannel) {
      if (byChannel.categorySlug !== MUSIC_CATEGORY) {
        await dualWriteYektubeUpdate(
          videoSourcesTable,
          { categorySlug: MUSIC_CATEGORY },
          eq(videoSourcesTable.id, byChannel.id),
        );
      }
      return { ...byChannel, categorySlug: MUSIC_CATEGORY };
    }
  }

  const name = hit.channelTitle.trim() || channelId || "Müzik";
  const [created] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: name.slice(0, 200),
    platform: "youtube",
    sourceType: "channel",
    channelId: channelId || `music-${hit.videoId}`,
    url: channelId ? `https://www.youtube.com/channel/${channelId}` : null,
    logoUrl: null,
    categorySlug: MUSIC_CATEGORY,
    active: true,
    isLive: false,
    useYoutubeApi: true,
  });
  return created;
}

export async function upsertMusicVideoHit(hit: YoutubeSearchHit): Promise<ReturnType<typeof serializeVideo> | null> {
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
        categorySlug: MUSIC_CATEGORY,
        active: true,
        embedAllowed,
        isStory,
      },
      eq(videosTable.id, existing.id),
    );
    return serializeVideo(updated ?? { ...existing, title, thumbnail: thumb, categorySlug: MUSIC_CATEGORY, isStory, embedAllowed });
  }

  const source = await resolveMusicSource(hit);
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
    categorySlug: MUSIC_CATEGORY,
    active: true,
    embedAllowed,
    isStory,
  });
  return serializeVideo(inserted);
}

async function hitFromBrowseItem(item: MusicBrowseItem): Promise<YoutubeSearchHit | null> {
  const videoId = item.videoId ?? (item.kind === "song" ? item.id : null);
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;
  return {
    videoId,
    title: item.title,
    channelId: "",
    channelTitle: item.artists ?? item.subtitle ?? "Müzik",
    thumbnail: item.thumbnail,
  };
}

async function hitsFromPlaylist(playlistId: string, limit: number): Promise<YoutubeSearchHit[]> {
  const yt = await getInnertube();
  const playlist = await yt.music.getPlaylist(playlistId);
  const hits: YoutubeSearchHit[] = [];
  for (const raw of playlist.items ?? []) {
    if (hits.length >= limit) break;
    const item = mapBrowseItem(raw);
    if (!item) continue;
    const videoId = item.videoId ?? (item.kind === "song" ? item.id : null);
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) continue;
    hits.push({
      videoId,
      title: item.title,
      channelId: "",
      channelTitle: item.artists ?? item.subtitle ?? "Müzik",
      thumbnail: item.thumbnail,
    });
  }
  if (hits.length === 0) return hits;
  const metaMap = await fetchYoutubeVideoSnippetMap(hits.map((h) => h.videoId));
  for (const h of hits) {
    const meta = metaMap.get(h.videoId);
    if (!meta) continue;
    if (meta.title) h.title = meta.title;
    if (meta.duration) h.duration = meta.duration;
    if (meta.description) h.description = meta.description;
    if (meta.thumbnail) h.thumbnail = meta.thumbnail;
  }
  return hits;
}

export async function importMusicChannel(channel: YoutubeChannelHit): Promise<{ sourceId: number; created: boolean }> {
  const channelId = channel.channelId.trim();
  const [existing] = await db
    .select()
    .from(videoSourcesTable)
    .where(and(eq(videoSourcesTable.platform, "youtube"), eq(videoSourcesTable.channelId, channelId)))
    .orderBy(desc(videoSourcesTable.id))
    .limit(1);

  if (existing) {
    await dualWriteYektubeUpdate(
      videoSourcesTable,
      {
        categorySlug: MUSIC_CATEGORY,
        active: true,
        ...(channel.title ? { name: channel.title.slice(0, 200) } : {}),
        ...(channel.thumbnail ? { logoUrl: channel.thumbnail } : {}),
      },
      eq(videoSourcesTable.id, existing.id),
    );
    return { sourceId: existing.id, created: false };
  }

  const [created] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: channel.title.slice(0, 200) || channelId,
    platform: "youtube",
    sourceType: "channel",
    channelId,
    url: `https://www.youtube.com/channel/${channelId}`,
    logoUrl: channel.thumbnail ?? null,
    categorySlug: MUSIC_CATEGORY,
    active: true,
    isLive: false,
    useYoutubeApi: true,
  });
  return { sourceId: created.id, created: true };
}

export async function importMusicFromYoutubeSearch(opts: {
  query?: string;
  limit?: number;
  importVideos?: boolean;
  importChannels?: boolean;
}): Promise<MusicImportResult> {
  const query = (opts.query ?? "müzik").trim();
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
  const importVideos = opts.importVideos !== false;
  const importChannels = opts.importChannels !== false;
  const result: MusicImportResult = { imported: 0, skipped: 0, channels: 0, errors: [] };

  if (importChannels) {
    const channels = await searchYoutubeMusicChannels(query, Math.min(limit, 12));
    for (const ch of channels) {
      try {
        const { created } = await importMusicChannel(ch);
        if (created) result.channels++;
        await syncVideoSourceToDb(
          (
            await db
              .select()
              .from(videoSourcesTable)
              .where(eq(videoSourcesTable.channelId, ch.channelId))
              .limit(1)
          )[0]!.id,
        ).catch((err) => logger.warn({ err, channelId: ch.channelId }, "[music] channel sync failed"));
      } catch (err) {
        result.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  if (importVideos) {
    const hits = await searchYoutubeVideos(query, limit);
    for (const hit of hits) {
      try {
        if (classifyAsYekcek({ title: hit.title, duration: hit.duration ?? null })) {
          result.skipped++;
          continue;
        }
        const row = await upsertMusicVideoHit(hit);
        if (!row || row.embedAllowed === false || row.isStory) {
          result.skipped++;
          continue;
        }
        result.imported++;
      } catch (err) {
        result.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return result;
}

export async function importMusicFromYtm(opts: {
  sectionIndex?: number;
  playlistId?: string;
  videoIds?: string[];
  limit?: number;
}): Promise<MusicImportResult> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
  const result: MusicImportResult = { imported: 0, skipped: 0, channels: 0, errors: [] };
  let hits: YoutubeSearchHit[] = [];

  if (opts.playlistId?.trim()) {
    hits = await hitsFromPlaylist(opts.playlistId.trim(), limit);
  } else if (opts.videoIds?.length) {
    hits = opts.videoIds
      .map((id) => id.trim())
      .filter((id) => /^[\w-]{11}$/.test(id))
      .slice(0, limit)
      .map((videoId) => ({ videoId, title: videoId, channelId: "", channelTitle: "Müzik" }));
    const metaMap = await fetchYoutubeVideoSnippetMap(hits.map((h) => h.videoId));
    for (const h of hits) {
      const meta = metaMap.get(h.videoId);
      if (!meta) continue;
      if (meta.title) h.title = meta.title;
      if (meta.duration) h.duration = meta.duration;
      if (meta.channelId) h.channelId = meta.channelId;
      if (meta.channelTitle) h.channelTitle = meta.channelTitle;
      if (meta.thumbnail) h.thumbnail = meta.thumbnail;
    }
  } else if (opts.sectionIndex != null && opts.sectionIndex >= 0) {
    const sections = await browseYoutubeMusicHome();
    const section = sections[opts.sectionIndex];
    if (!section) {
      result.errors.push("Bölüm bulunamadı");
      return result;
    }
    for (const item of section.items.slice(0, limit)) {
      if (item.kind === "playlist" && item.id.startsWith("VL")) {
        const plHits = await hitsFromPlaylist(item.id, Math.min(8, limit - hits.length));
        hits.push(...plHits);
        if (hits.length >= limit) break;
        continue;
      }
      const hit = await hitFromBrowseItem(item);
      if (hit) hits.push(hit);
      if (hits.length >= limit) break;
    }
  } else {
    const sections = await browseYoutubeMusicHome();
    for (const section of sections.slice(0, 3)) {
      for (const item of section.items) {
        if (hits.length >= limit) break;
        if (item.kind === "playlist" && item.id.startsWith("VL")) {
          const plHits = await hitsFromPlaylist(item.id, 4);
          hits.push(...plHits.slice(0, limit - hits.length));
          continue;
        }
        const hit = await hitFromBrowseItem(item);
        if (hit) hits.push(hit);
      }
      if (hits.length >= limit) break;
    }
  }

  const seen = new Set<string>();
  for (const hit of hits) {
    if (seen.has(hit.videoId)) continue;
    seen.add(hit.videoId);
    try {
      if (classifyAsYekcek({ title: hit.title, duration: hit.duration ?? null })) {
        result.skipped++;
        continue;
      }
      const row = await upsertMusicVideoHit(hit);
      if (!row || row.embedAllowed === false || row.isStory) {
        result.skipped++;
        continue;
      }
      result.imported++;
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return result;
}

export async function syncMusicSources(): Promise<{ synced: number; failed: number }> {
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.active, true),
        or(
          eq(videoSourcesTable.categorySlug, MUSIC_CATEGORY),
          eq(videoSourcesTable.categorySlug, "müzik"),
          eq(videoSourcesTable.categorySlug, "music"),
        ),
      ),
    );
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    if (row.isLive || row.sourceType === "live") continue;
    const res = await syncVideoSourceToDb(row.id);
    if (res.ok) synced++;
    else failed++;
  }
  return { synced, failed };
}

export async function getMusicAdminStats(): Promise<{ sources: number; videos: number }> {
  const sources = await db
    .select({ id: videoSourcesTable.id })
    .from(videoSourcesTable)
    .where(
      and(
        eq(videoSourcesTable.active, true),
        or(
          eq(videoSourcesTable.categorySlug, MUSIC_CATEGORY),
          eq(videoSourcesTable.categorySlug, "müzik"),
          eq(videoSourcesTable.categorySlug, "music"),
        ),
      ),
    );
  const videos = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .where(
      and(
        eq(videosTable.active, true),
        embeddableVideoCondition,
        eq(videosTable.isStory, false),
        or(
          eq(videosTable.categorySlug, MUSIC_CATEGORY),
          eq(videosTable.categorySlug, "müzik"),
          eq(videosTable.categorySlug, "music"),
        ),
      ),
    );
  return { sources: sources.length, videos: videos.length };
}
