import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import { sanitizeApiDisplayJson } from "@/lib/sanitizeApiDisplayJson";

/** index.html erken bootstrap ile aynı anahtar — değiştirince inline script'i de güncelleyin. */
export const HM_HOME_HYBRID_STORAGE_PREFIX = "hm-home-hybrid-v1:";
export const HM_HOME_HYBRID_SESSION_TTL_MS = 10 * 60 * 1000;
/** Yedek kopya üst sınırı — RSS saatte 1; anında boyama için yeterli, çok eski liste tutulmaz. */
export const HM_HOME_HYBRID_LOCAL_TTL_MS = 3 * 60 * 60 * 1000;

type CachedPayload = {
  savedAt: number;
  items: HomeHybridNewsItem[];
};

export type HmHomeHybridEarlyBootstrap = {
  siteId: number;
  savedAt: number;
  items: HomeHybridNewsItem[];
};

function storageKey(siteId: number): string {
  return `${HM_HOME_HYBRID_STORAGE_PREFIX}${siteId}`;
}

function readSession(siteId: number): CachedPayload | null {
  if (typeof window === "undefined" || !Number.isFinite(siteId) || siteId <= 0) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!Array.isArray(parsed?.items) || !Number.isFinite(parsed.savedAt)) return null;
    if (Date.now() - parsed.savedAt > HM_HOME_HYBRID_SESSION_TTL_MS) {
      sessionStorage.removeItem(storageKey(siteId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readLocal(siteId: number): CachedPayload | null {
  if (typeof window === "undefined" || !Number.isFinite(siteId) || siteId <= 0) return null;
  try {
    const raw = localStorage.getItem(storageKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!Array.isArray(parsed?.items) || !Number.isFinite(parsed.savedAt)) return null;
    if (Date.now() - parsed.savedAt > HM_HOME_HYBRID_LOCAL_TTL_MS) {
      localStorage.removeItem(storageKey(siteId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeHybridItems(items: HomeHybridNewsItem[]): HomeHybridNewsItem[] {
  return sanitizeApiDisplayJson(items);
}

/** index.html inline script'in yazdığı erken bootstrap (React bundle'dan önce). */
export function readHmHomeHybridEarlyBootstrap(siteId: number): HmHomeHybridEarlyBootstrap | undefined {
  if (typeof window === "undefined" || !Number.isFinite(siteId) || siteId <= 0) return undefined;
  const early = window.__YEKPARE_HM_HOME_HYBRID__;
  if (early?.siteId === siteId && Array.isArray(early.items) && early.items.length > 0) {
    return { ...early, items: sanitizeHybridItems(early.items) };
  }
  return undefined;
}

/** Anasayfa hibrit havuzu — localStorage (3 sa) + sessionStorage (10 dk), stale-while-revalidate. */
export function readHmHomeHybridNewsCache(siteId: number): HomeHybridNewsItem[] | undefined {
  const early = readHmHomeHybridEarlyBootstrap(siteId);
  if (early?.items.length) return early.items;
  const payload = readSession(siteId) ?? readLocal(siteId);
  if (!payload?.items.length) return undefined;
  return sanitizeHybridItems(payload.items);
}

export function readHmHomeHybridNewsCacheMeta(
  siteId: number,
): { items: HomeHybridNewsItem[]; savedAt: number } | undefined {
  const early = readHmHomeHybridEarlyBootstrap(siteId);
  if (early?.items.length) {
    return { items: early.items, savedAt: early.savedAt };
  }
  const payload = readSession(siteId) ?? readLocal(siteId);
  if (!payload?.items.length) return undefined;
  return { items: sanitizeHybridItems(payload.items), savedAt: payload.savedAt };
}

export function writeHmHomeHybridNewsCache(siteId: number, items: HomeHybridNewsItem[]): void {
  if (typeof window === "undefined" || !Number.isFinite(siteId) || siteId <= 0 || items.length === 0) return;
  const sanitized = sanitizeHybridItems(items.slice(0, 120));
  const payload: CachedPayload = { savedAt: Date.now(), items: sanitized };
  try {
    sessionStorage.setItem(storageKey(siteId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
  try {
    localStorage.setItem(storageKey(siteId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
  try {
    window.__YEKPARE_HM_HOME_HYBRID__ = { siteId, savedAt: payload.savedAt, items: payload.items };
  } catch {
    /* noop */
  }
}

/** RSS detay — anasayfa havuzundan önizleme (API beklemeden başlık/görsel). */
export function readHmRssPreviewFromHomeCache(
  siteId: number,
  itemId: string,
): Pick<HomeHybridNewsItem, "id" | "title" | "spot" | "imageUrl" | "href" | "publishedAt" | "categoryName" | "feedLabel"> | null {
  const items = readHmHomeHybridNewsCache(siteId);
  if (!items?.length) return null;
  const needle = String(itemId ?? "").trim();
  if (!needle) return null;
  const found = items.find((row) => {
    const rawId = String(row.id ?? "").trim();
    if (rawId === needle || rawId === `rss:${needle}`) return true;
    return rawId.replace(/^rss:/, "") === needle;
  });
  if (!found?.title?.trim()) return null;
  return found;
}
