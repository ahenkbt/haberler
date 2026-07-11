import type { YektubeVideo } from "@workspace/yektube-core";

/** 3 dakikaya kadar olan videolar Yekçek akışına dahil */
export const YEKCEK_MAX_DURATION_SECONDS = 180;

export function isPlaceholderShortTitle(title: string): boolean {
  return /^Short\s+[A-Za-z0-9_-]+$/i.test(title.trim());
}

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

export function isYekcekVideo(v: Pick<YektubeVideo, "isStory" | "title" | "duration">): boolean {
  if (v.isStory) return true;

  const sec = parseDurationSeconds(v.duration);
  if (sec != null && sec > 0) {
    return sec <= YEKCEK_MAX_DURATION_SECONDS;
  }
  const title = (v.title ?? "").trim();
  if (!title) return false;
  if (isPlaceholderShortTitle(title)) return true;
  const t = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (
    /shorts?\b/.test(t) ||
    /\bfragman\b/.test(t) ||
    /\bkisa\b/.test(t) ||
    /\bteaser\b/.test(t) ||
    /\bclip\b/.test(t) ||
    /\bvertical\b/.test(t) ||
    /youtube\s*shorts?\b/.test(t)
  ) {
    return true;
  }
  return false;
}

export function isLongFormVideo(v: Pick<YektubeVideo, "isStory" | "title" | "duration">): boolean {
  return !isYekcekVideo(v);
}

export function splitYekcekVideos<T extends Pick<YektubeVideo, "isStory" | "title" | "duration">>(
  videos: T[],
): { regular: T[]; yekcek: T[] } {
  const regular: T[] = [];
  const yekcek: T[] = [];
  for (const v of videos) {
    if (isYekcekVideo(v)) yekcek.push(v);
    else regular.push(v);
  }
  return { regular, yekcek };
}
