import type { YektubeVideo } from "@workspace/yektube-core";

const SUBS_KEY = "yektube-v2:guest:subs";
const HISTORY_KEY = "yektube-v2:guest:history";
const PREFS_KEY = "yektube-v2:guest:prefs";

export type GuestPrefs = {
  notifyNewVideos: boolean;
  notifyShorts: boolean;
  notifyLive: boolean;
  saveHistory: boolean;
};

const DEFAULT_PREFS: GuestPrefs = {
  notifyNewVideos: true,
  notifyShorts: true,
  notifyLive: false,
  saveHistory: true,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadGuestSubscriptions(): number[] {
  return readJson<number[]>(SUBS_KEY, []);
}

export function saveGuestSubscriptions(ids: number[]): void {
  writeJson(SUBS_KEY, ids);
}

export function toggleGuestSubscription(sourceId: number): boolean {
  const set = new Set(loadGuestSubscriptions());
  if (set.has(sourceId)) {
    set.delete(sourceId);
    saveGuestSubscriptions([...set]);
    return false;
  }
  set.add(sourceId);
  saveGuestSubscriptions([...set]);
  return true;
}

export function isGuestSubscribed(sourceId: number): boolean {
  return loadGuestSubscriptions().includes(sourceId);
}

export type GuestHistoryEntry = {
  videoId: number;
  sourceId?: number;
  youtubeVideoId: string;
  title?: string;
  thumbnail?: string | null;
  watchedAt: string;
};

export function loadGuestHistory(): GuestHistoryEntry[] {
  return readJson<GuestHistoryEntry[]>(HISTORY_KEY, []);
}

export function pushGuestHistory(video: YektubeVideo, sourceId?: number): void {
  const prefs = loadGuestPrefs();
  if (!prefs.saveHistory) return;
  const rows = loadGuestHistory().filter((h) => h.videoId !== video.id);
  rows.unshift({
    videoId: video.id,
    sourceId: sourceId ?? video.sourceId ?? undefined,
    youtubeVideoId: video.videoId,
    title: video.title,
    thumbnail: video.thumbnail,
    watchedAt: new Date().toISOString(),
  });
  writeJson(HISTORY_KEY, rows.slice(0, 100));
}

export function clearGuestHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function loadGuestPrefs(): GuestPrefs {
  return { ...DEFAULT_PREFS, ...readJson<Partial<GuestPrefs>>(PREFS_KEY, {}) };
}

export function saveGuestPrefs(prefs: GuestPrefs): void {
  writeJson(PREFS_KEY, prefs);
}

export function exportGuestSyncPayload(): {
  subscriptions: number[];
  history: { videoId: number; sourceId?: number; youtubeVideoId: string }[];
} {
  return {
    subscriptions: loadGuestSubscriptions(),
    history: loadGuestHistory().map((h) => ({
      videoId: h.videoId,
      sourceId: h.sourceId,
      youtubeVideoId: h.youtubeVideoId,
    })),
  };
}

export function clearGuestDataAfterSync(): void {
  localStorage.removeItem(SUBS_KEY);
  localStorage.removeItem(HISTORY_KEY);
}
