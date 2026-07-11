import type { HmExtraPage } from "@/lib/newsSiteLayout";

const PREFIX = "hm-editor-pages-draft:v2:";
const LEGACY_PREFIX = "hm-editor-pages-draft:v1:";

type HmEditorPagesDraft = {
  extra: HmExtraPage[];
  savedAt: number;
};

function storageKey(siteId: number): string {
  return `${PREFIX}${siteId}`;
}

function legacyStorageKey(siteId: number): string {
  return `${LEGACY_PREFIX}${siteId}`;
}

export function readHmEditorPagesDraft(siteId: number): HmExtraPage[] | null {
  if (typeof window === "undefined" || siteId <= 0) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(siteId));
    if (raw) {
      const parsed = JSON.parse(raw) as HmEditorPagesDraft;
      if (parsed && typeof parsed.savedAt === "number" && Array.isArray(parsed.extra)) {
        return parsed.extra;
      }
    }
    const legacyRaw = window.localStorage.getItem(legacyStorageKey(siteId));
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as { extra?: HmExtraPage[] };
      if (Array.isArray(legacy.extra) && legacy.extra.length > 0) {
        return legacy.extra;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeHmEditorPagesDraft(siteId: number, extra: HmExtraPage[]): void {
  if (typeof window === "undefined" || siteId <= 0) return;
  try {
    const payload: HmEditorPagesDraft = { extra, savedAt: Date.now() };
    window.localStorage.setItem(storageKey(siteId), JSON.stringify(payload));
    window.localStorage.removeItem(legacyStorageKey(siteId));
  } catch {
    /* quota / private mode */
  }
}

export function clearHmEditorPagesDraft(siteId: number): void {
  if (typeof window === "undefined" || siteId <= 0) return;
  try {
    window.localStorage.removeItem(storageKey(siteId));
    window.localStorage.removeItem(legacyStorageKey(siteId));
  } catch {
    /* ignore */
  }
}
