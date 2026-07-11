import { loadGuestHistory } from "@/lib/guestStorage";

const SESSION_KEY = "yektube-recent-yt-ids";
const MAX_IDS = 50;

function isYoutubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/** Oturum boyunca izlenen YouTube video ID'leri — Yekçek hariç tutma için */
export function trackRecentYoutubeWatch(youtubeVideoId: string): void {
  if (!isYoutubeId(youtubeVideoId)) return;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const prev = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [youtubeVideoId, ...prev.filter((id) => id !== youtubeVideoId && isYoutubeId(id))].slice(
      0,
      MAX_IDS,
    );
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readRecentYoutubeWatchIds(max = 40): string[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const ids = (JSON.parse(raw) as string[]).filter(isYoutubeId).slice(0, max);
      if (ids.length > 0) return ids;
    }
  } catch {
    /* ignore */
  }
  return loadGuestHistory()
    .map((h) => h.youtubeVideoId)
    .filter(isYoutubeId)
    .slice(0, max);
}
