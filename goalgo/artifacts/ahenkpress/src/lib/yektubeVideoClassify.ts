import type { VideoItem } from "@/pages/public/CanliTv";

export function isPlaceholderShortTitle(title: string): boolean {
  return /^Short\s+[A-Za-z0-9_-]+$/i.test(title.trim());
}

export function displayVideoTitle(title: string, channelName?: string | null): string {
  const t = title.trim();
  if (t && !isPlaceholderShortTitle(t)) return t;
  const ch = channelName?.trim();
  if (ch) return ch;
  return "Yekçek";
}

/** Öneri / arama kartları — placeholder yerine gerçek veya kanal adı */
export function recommendationVideoTitle(title: string, channelName?: string | null): string {
  const t = title.trim();
  if (t && !isPlaceholderShortTitle(t)) return t;
  const ch = channelName?.trim();
  return ch || "Video";
}

/** 5 dakikaya kadar olan videolar Yekçek akışına dahil */
export const YEKCEK_MAX_DURATION_SECONDS = 180;

export function parseDurationSeconds(duration: string | null | undefined): number | null {
  const raw = (duration ?? "").trim();
  if (!raw) return null;
  if (/^PT/i.test(raw)) {
    const h = raw.match(/(\d+)H/i)?.[1];
    const m = raw.match(/(\d+)M/i)?.[1];
    const s = raw.match(/(\d+)S/i)?.[1];
    return (h ? parseInt(h, 10) * 3600 : 0) + (m ? parseInt(m, 10) * 60 : 0) + (s ? parseInt(s, 10) : 0);
  }
  const parts = raw.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

export function isYekcekVideo(v: Pick<VideoItem, "isStory" | "title" | "duration">): boolean {
  if (v.isStory) return true;
  const title = (v.title ?? "").trim();
  if (!title) return false;
  if (isPlaceholderShortTitle(title)) return true;
  const norm = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (
    /\bshorts?\b/.test(norm) ||
    /\bfragman\b/.test(norm) ||
    /\bkisa\b/.test(norm) ||
    /\bteaser\b/.test(norm) ||
    /\bclip\b/.test(norm) ||
    /\bvertical\b/.test(norm)
  ) {
    return true;
  }
  const sec = parseDurationSeconds(v.duration);
  if (sec != null && sec > 0 && sec <= YEKCEK_MAX_DURATION_SECONDS) return true;
  return false;
}

export function isLongFormVideo(v: Pick<VideoItem, "isStory" | "title" | "duration">): boolean {
  return !isYekcekVideo(v);
}

export function splitYekcekVideos(videos: VideoItem[]): { regular: VideoItem[]; yekcek: VideoItem[] } {
  const yekcek: VideoItem[] = [];
  const regular: VideoItem[] = [];
  for (const v of videos) {
    if (isYekcekVideo(v)) yekcek.push(v);
    else regular.push(v);
  }
  return { regular, yekcek };
}
