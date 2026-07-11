import type { VideoTvPreset } from "../data/videoTvPresets.js";
import {
  CATEGORY_CHANNEL_SEARCH_QUERIES,
  CATEGORY_PODCAST_SEARCH_QUERIES,
  CATEGORY_SHORTS_SEARCH_QUERIES,
  VIDEO_TV_CATEGORY_SLUGS,
} from "../data/videoTvCategoryQueries.js";
import {
  VIDEO_TV_TOP_CHANNEL_SUPPLEMENT,
  VIDEO_TV_TOP_PODCAST_CHANNEL_SUPPLEMENT,
  mergeVideoTvChannelPresets,
} from "../data/videoTvTopChannels.js";
import { VIDEO_TV_PRESETS } from "../data/videoTvPresets.js";
import { logger } from "./logger.js";
import { resolveYoutubeApiKey, youtubeMissingApiKeyWarning } from "./resolve-youtube-api-key.js";

const UA = "YekpareVideoTvDiscovery/1.0 (+https://yekpare.net)";

type SearchResponse = {
  items?: Array<{ id?: { channelId?: string }; snippet?: { channelId?: string } }>;
  nextPageToken?: string;
};

type ChannelsResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }>;
};

export type DiscoveredChannel = {
  channelId: string;
  name: string;
  category: string;
  subscriberCount: number;
  logoUrl?: string;
};

function bestThumb(thumbnails: Record<string, { url?: string }> | undefined): string | undefined {
  for (const key of ["high", "medium", "default"]) {
    const u = thumbnails?.[key]?.url?.trim();
    if (u) return u;
  }
  return undefined;
}

async function youtubeGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = await resolveYoutubeApiKey();
  if (!key) throw new Error(youtubeMissingApiKeyWarning());
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `YouTube API HTTP ${res.status}`);
  return json as T;
}

async function searchChannelIds(query: string, maxResults = 25): Promise<string[]> {
  const data = await youtubeGet<SearchResponse>("search", {
    part: "snippet",
    type: "channel",
    q: query,
    regionCode: "TR",
    relevanceLanguage: "tr",
    maxResults: String(Math.min(maxResults, 50)),
  });
  const out: string[] = [];
  for (const item of data.items ?? []) {
    const id = item.id?.channelId || item.snippet?.channelId;
    if (id?.startsWith("UC")) out.push(id);
  }
  return out;
}

async function fetchChannelDetails(ids: string[]): Promise<DiscoveredChannel[]> {
  if (ids.length === 0) return [];
  const data = await youtubeGet<ChannelsResponse>("channels", {
    part: "snippet,statistics",
    id: ids.slice(0, 50).join(","),
    maxResults: "50",
  });
  const out: DiscoveredChannel[] = [];
  for (const item of data.items ?? []) {
    const id = item.id?.trim();
    if (!id) continue;
    const hidden = item.statistics?.hiddenSubscriberCount;
    const subs = hidden ? 0 : parseInt(item.statistics?.subscriberCount ?? "0", 10) || 0;
    const title = item.snippet?.title?.trim() || id;
    out.push({
      channelId: id,
      name: title.slice(0, 200),
      category: "",
      subscriberCount: subs,
      logoUrl: bestThumb(item.snippet?.thumbnails),
    });
  }
  return out;
}

async function discoverByQueries(category: string, queries: string[], limit: number): Promise<DiscoveredChannel[]> {
  const idSet = new Set<string>();
  for (const q of queries.slice(0, 4)) {
    try {
      const ids = await searchChannelIds(q, 20);
      for (const id of ids) idSet.add(id);
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      logger.warn({ err, category, q }, "[youtubeCategoryTopChannels] arama hatası");
    }
  }

  const detailed: DiscoveredChannel[] = [];
  const allIds = [...idSet];
  for (let i = 0; i < allIds.length; i += 50) {
    try {
      const rows = await fetchChannelDetails(allIds.slice(i, i + 50));
      detailed.push(...rows.map((r) => ({ ...r, category })));
    } catch (err) {
      logger.warn({ err, category }, "[youtubeCategoryTopChannels] kanal detay hatası");
    }
  }

  detailed.sort((a, b) => b.subscriberCount - a.subscriberCount);
  const seen = new Set<string>();
  const unique: DiscoveredChannel[] = [];
  for (const row of detailed) {
    const key = row.channelId.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
    if (unique.length >= limit) break;
  }
  return unique;
}

/** Tek kategori için API ile en çok abonesi olan kanalları keşfeder */
export async function discoverTopChannelsForCategory(
  category: string,
  limit = 10,
): Promise<DiscoveredChannel[]> {
  const queries = CATEGORY_CHANNEL_SEARCH_QUERIES[category] ?? [category.replace(/-/g, " ")];
  return discoverByQueries(category, queries, limit);
}

export async function discoverPodcastChannelsForCategory(
  category: string,
  limit = 5,
): Promise<DiscoveredChannel[]> {
  const queries = CATEGORY_PODCAST_SEARCH_QUERIES[category] ?? [`podcast ${category.replace(/-/g, " ")} türkiye`];
  return discoverByQueries(category, queries, limit);
}

export async function discoverShortsChannelsForCategory(
  category: string,
  limit = 5,
): Promise<DiscoveredChannel[]> {
  const queries = CATEGORY_SHORTS_SEARCH_QUERIES[category] ?? [`shorts ${category.replace(/-/g, " ")} türkiye`];
  return discoverByQueries(category, queries, limit);
}

function curatedForCategory(category: string, limit: number): VideoTvPreset[] {
  const merged = mergeVideoTvChannelPresets(
    VIDEO_TV_PRESETS,
    VIDEO_TV_TOP_CHANNEL_SUPPLEMENT,
    VIDEO_TV_TOP_PODCAST_CHANNEL_SUPPLEMENT,
  );
  return merged.filter((p) => p.category === category).slice(0, limit);
}

export function discoveredToPreset(row: DiscoveredChannel): VideoTvPreset {
  return {
    name: row.name,
    channelId: row.channelId,
    category: row.category,
    logoUrl: row.logoUrl,
  };
}

/** API + hazır liste ile kategori başına aday kanallar (abone sayısına göre sıralı) */
export async function buildTopChannelCandidatesForCategory(
  category: string,
  perCategory: number,
): Promise<VideoTvPreset[]> {
  let apiRows: DiscoveredChannel[] = [];
  try {
    if (await resolveYoutubeApiKey()) {
      const [main, pods, shorts] = await Promise.all([
        discoverTopChannelsForCategory(category, perCategory + 5),
        discoverPodcastChannelsForCategory(category, 5),
        discoverShortsChannelsForCategory(category, 4),
      ]);
      apiRows = [...main, ...pods, ...shorts];
      apiRows.sort((a, b) => b.subscriberCount - a.subscriberCount);
    }
  } catch (err) {
    logger.warn({ err, category }, "[youtubeCategoryTopChannels] API keşfi atlandı");
  }

  const curated = curatedForCategory(category, perCategory + 10);
  const apiPresets = apiRows.map(discoveredToPreset);

  const merged = mergeVideoTvChannelPresets(apiPresets, curated);
  const categoryMerged = merged.filter((p) => p.category === category);

  // API sırasını koru — önce yüksek aboneliler
  const apiOrder = new Map(apiPresets.map((p, i) => [p.channelId.toLowerCase(), i]));
  categoryMerged.sort((a, b) => {
    const ai = apiOrder.get(a.channelId.toLowerCase());
    const bi = apiOrder.get(b.channelId.toLowerCase());
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return 0;
  });

  return categoryMerged.slice(0, perCategory + 5);
}

export async function buildTopChannelCandidatesAllCategories(options?: {
  categories?: string[];
  perCategory?: number;
}): Promise<Map<string, VideoTvPreset[]>> {
  const cats = options?.categories?.length
    ? options.categories
    : [...VIDEO_TV_CATEGORY_SLUGS];
  const perCategory = options?.perCategory ?? 10;
  const out = new Map<string, VideoTvPreset[]>();

  for (const category of cats) {
    out.set(category, await buildTopChannelCandidatesForCategory(category, perCategory));
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

export { VIDEO_TV_CATEGORY_SLUGS };
