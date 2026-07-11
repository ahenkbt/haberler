/** `/tr/:slug` meta önbelleği — layout kaydından sonra eski menü/sayfa listesini göstermemek için. */
import { HM_META_LS_PREFIX, normalizeHmSlugSegment } from "@/lib/hmNestedMetaStorage";

export function clearHmNestedMetaCache(pathSlugRaw: string): void {
  if (typeof window === "undefined") return;
  const pathSlug = normalizeHmSlugSegment(pathSlugRaw);
  if (!pathSlug) return;
  try {
    window.localStorage.removeItem(`${HM_META_LS_PREFIX}${pathSlug}`);
  } catch {
    /* quota / private mode */
  }
}
