const STORAGE_PREFIX = "hm-article-bundle-v1:";
const TTL_MS = 15 * 60 * 1000;

type CachedArticleBundle = {
  savedAt: number;
  bundle: unknown;
};

function storageKey(siteId: number | null, slug: string): string {
  return `${STORAGE_PREFIX}${siteId ?? "portal"}:${slug.trim().toLowerCase()}`;
}

export function readHmNewsArticleBundleCache(siteId: number | null, slug: string): unknown | undefined {
  if (typeof window === "undefined" || !slug.trim()) return undefined;
  try {
    const raw = sessionStorage.getItem(storageKey(siteId, slug));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedArticleBundle;
    if (!parsed?.bundle || !Number.isFinite(parsed.savedAt)) return undefined;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(storageKey(siteId, slug));
      return undefined;
    }
    return parsed.bundle;
  } catch {
    return undefined;
  }
}

export function writeHmNewsArticleBundleCache(siteId: number | null, slug: string, bundle: unknown): void {
  if (typeof window === "undefined" || !slug.trim() || bundle == null) return;
  try {
    const payload: CachedArticleBundle = { savedAt: Date.now(), bundle };
    sessionStorage.setItem(storageKey(siteId, slug), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function clearHmNewsArticleBundleCache(siteId: number | null, slug?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (slug?.trim()) {
      sessionStorage.removeItem(storageKey(siteId, slug));
      return;
    }
    const prefix = `${STORAGE_PREFIX}${siteId ?? "portal"}:`;
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
