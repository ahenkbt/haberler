import type { YektubeVideo } from "@workspace/yektube-core";

function normalizeYoutubeId(raw: string | null | undefined): string {
  const v = raw?.trim() ?? "";
  if (!v) return "";
  const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
  return (m?.[1] ?? v).toLowerCase();
}

/** İstemci tarafı yedek — API dedupe kaçırsa tekrarları gizler */
export function dedupeFeedVideos(videos: YektubeVideo[]): YektubeVideo[] {
  const seenVid = new Set<string>();
  const seenTitle = new Set<string>();
  const out: YektubeVideo[] = [];
  for (const v of videos) {
    const vid = normalizeYoutubeId(v.videoId);
    if (vid) {
      if (seenVid.has(vid)) continue;
      seenVid.add(vid);
    }
    const title = (v.title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (title) {
      const ch = (v.channelName ?? "").trim().toLowerCase();
      const key = `${title}|${ch}`;
      if (seenTitle.has(key)) continue;
      seenTitle.add(key);
    }
    out.push(v);
  }
  return out;
}

export function feedVideoKey(v: YektubeVideo): string {
  const vid = normalizeYoutubeId(v.videoId);
  return vid || `id-${v.id}`;
}
