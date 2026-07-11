/** Yekçek (Shorts / kısa video / fragman) sınıflandırması */

/** 3 dakikaya kadar olan videolar Yekçek akışına dahil */
export const YEKCEK_MAX_DURATION_SECONDS = 180;

export function isPlaceholderShortTitle(title: string): boolean {
  return /^Short\s+[A-Za-z0-9_-]+$/i.test(title.trim());
}

/** Uzun video önerileri — Yekçek / shorts hariç */
export function isLongFormVideo(opts: {
  isStory?: boolean;
  title?: string | null;
  duration?: string | null;
}): boolean {
  return !classifyAsYekcek(opts);
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

export function formatDurationSeconds(total: number): string {
  const sec = Math.max(0, Math.floor(total));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatYoutubeIsoDuration(iso: string | undefined): string | null {
  const sec = parseDurationSeconds(iso);
  if (sec == null) return null;
  return formatDurationSeconds(sec);
}

function normalizedTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Shorts, kısa video, fragman, teaser vb. — süre biliniyorsa 3 dk kuralı esastır */
export function classifyAsYekcek(opts: {
  isStory?: boolean;
  title?: string | null;
  duration?: string | null;
}): boolean {
  if (opts.isStory) return true;

  const sec = parseDurationSeconds(opts.duration);
  if (sec != null && sec > 0) {
    return sec <= YEKCEK_MAX_DURATION_SECONDS;
  }
  const title = (opts.title ?? "").trim();
  if (!title) return false;
  if (isPlaceholderShortTitle(title)) return true;
  const t = normalizedTitle(title);
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

export function sanitizeDisplayTitle(title: string): string {
  const t = title.trim();
  if (!t || isPlaceholderShortTitle(t)) return "";
  return t;
}
