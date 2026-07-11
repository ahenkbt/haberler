import type { Source, VideoItem } from "@/pages/public/CanliTv";
import { enhanceYoutubeIframeSrc } from "@/lib/youtubeEmbed";

/** YouTube video ID (11 karakter, UC kanal ID değil) */
export function isYoutubeVideoId(id: string): boolean {
  const t = id.trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(t) && !t.startsWith("UC");
}

/** Canlı yayın için oynatılacak video ID — çoğu haber kanalı video ID ile kayıtlı */
export function resolveLiveVideoId(source: Source, videos: VideoItem[] = []): string | null {
  const fromDb = videos.find((v) => v.sourceId === source.id && v.videoId?.trim())?.videoId?.trim();
  if (fromDb) return fromDb;

  const cid = source.channelId.trim();
  const fromChannel = extractYoutubeVideoIdFromText(cid);
  if (fromChannel) return fromChannel;

  const fromUrl = extractYoutubeVideoIdFromText(source.url ?? "");
  if (fromUrl) return fromUrl;

  if (source.sourceType === "video" || isYoutubeVideoId(cid)) return cid;
  return null;
}

function extractYoutubeVideoIdFromText(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (isYoutubeVideoId(t)) return t;
  try {
    const url = /^https?:\/\//i.test(t) ? new URL(t) : new URL(`https://www.youtube.com/${t.replace(/^\//, "")}`);
    const v = url.searchParams.get("v");
    if (v && isYoutubeVideoId(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0] ?? "") && parts[1] && isYoutubeVideoId(parts[1])) {
      return parts[1];
    }
    if (url.hostname.includes("youtu.be") && parts[0] && isYoutubeVideoId(parts[0])) return parts[0];
  } catch {
    /* fall through */
  }
  const m = t.match(/(?:v=|\/vi\/|youtu\.be\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] && isYoutubeVideoId(m[1]) ? m[1] : null;
}

export function isUcYoutubeChannelId(id: string | null | undefined): boolean {
  const t = (id ?? "").trim();
  return t.startsWith("UC") && t.length >= 22;
}

export function resolveLiveEmbedSrc(
  source: Source,
  videos: VideoItem[] = [],
  autoplay = true,
): string {
  const videoId = resolveLiveVideoId(source, videos);
  if (videoId) {
    const q = autoplay ? "?autoplay=1" : "";
    return enhanceYoutubeIframeSrc(`https://www.youtube-nocookie.com/embed/${videoId}${q}`);
  }

  const cid = source.channelId.trim();
  const ap = autoplay ? "&autoplay=1" : "";
  if (cid.startsWith("UC")) {
    return enhanceYoutubeIframeSrc(
      `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(cid)}${ap || ""}`,
    );
  }

  return enhanceYoutubeIframeSrc(
    `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(cid)}${ap || ""}`,
  );
}
