import { resolveYoutubeApiKey } from "./resolve-youtube-api-key.js";

type YoutubeVideosStatusResponse = {
  items?: Array<{ id: string; status?: { embeddable?: boolean } }>;
  error?: { message?: string };
};

const UA = "YekpareVideoSync/1.0 (+https://yekpare.net)";

/**
 * YouTube Data API ile video embed izni (status.embeddable).
 * API anahtarı yoksa tüm ID'ler için `true` döner (istemci oynatmayı dener).
 */
export async function fetchYoutubeEmbedAllowedMap(videoIds: string[]): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  const ids = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return map;

  const key = await resolveYoutubeApiKey();
  if (!key) {
    for (const id of ids) map.set(id, true);
    return map;
  }

  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "status");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", key);

    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const json = (await res.json().catch(() => ({}))) as YoutubeVideosStatusResponse;
    if (!res.ok) {
      for (const id of chunk) map.set(id, true);
      continue;
    }

    for (const item of json.items ?? []) {
      map.set(item.id, item.status?.embeddable !== false);
    }
    for (const id of chunk) {
      if (!map.has(id)) map.set(id, true);
    }
  }

  return map;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId.trim())}`;
}
