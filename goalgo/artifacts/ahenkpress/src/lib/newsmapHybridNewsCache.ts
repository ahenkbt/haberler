import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";

const STORAGE_KEY = "newsmap-hybrid-news-v2";
const TTL_MS = 5 * 60 * 1000;

type CachedPayload = {
  savedAt: number;
  items: HomeHybridNewsItem[];
};

function readRaw(): CachedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!Array.isArray(parsed?.items) || !Number.isFinite(parsed.savedAt)) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Stale-while-revalidate: show cached headlines (DB + RSS) immediately on newsmap entry. */
export function readNewsmapHybridNewsCache(): HomeHybridNewsItem[] | undefined {
  const payload = readRaw();
  if (!payload?.items.length) return undefined;
  return payload.items;
}

/**
 * SWR için önbellek + gerçek yaş bilgisi. `savedAt` React Query `initialDataUpdatedAt`
 * olarak verilince; taze havuz staleTime içindeyse arka planda yeniden doğrulanır,
 * bayat/küçük bir önbellek görünüme sabitlenmez.
 */
export function readNewsmapHybridNewsCacheMeta(): { items: HomeHybridNewsItem[]; savedAt: number } | undefined {
  const payload = readRaw();
  if (!payload?.items.length) return undefined;
  return { items: payload.items, savedAt: payload.savedAt };
}

export function writeNewsmapHybridNewsCache(items: HomeHybridNewsItem[]): void {
  if (typeof window === "undefined" || items.length === 0) return;
  try {
    const payload: CachedPayload = { savedAt: Date.now(), items: items.slice(0, 500) };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function hasNewsmapHybridNewsCache(): boolean {
  return (readRaw()?.items.length ?? 0) > 0;
}
