import { and, desc, eq, gte, isNull, isNotNull, or } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import {
  pickRotatedFreeSiteIndex,
  rssStoryTitlesMatchAny,
  uniqueNonEmptyTitles,
} from "./rssStorySiteAssign.js";

export {
  normalizeRssSourceUrl,
  rssTitleJaccardSimilarity,
  rssTitleKeyWords,
  rssTitleMatchesAny,
  rssTitlesAreNearDuplicate,
  RSS_TITLE_NEAR_DUPLICATE_THRESHOLD,
} from "./rssImportDedupeCore.js";

export {
  pickRotatedFreeSiteIndex,
  rssStoryTitleMatchesAny,
  rssStoryTitlesMatchAny,
  uniqueNonEmptyTitles,
} from "./rssStorySiteAssign.js";

const RECENT_RSS_TITLE_WINDOW_MS = 48 * 60 * 60 * 1000;
const RECENT_RSS_TITLE_LIMIT = 250;
const RECENT_RSS_TITLE_CACHE_MS = 20_000;

const recentRssTitleCacheByKey = new Map<string, { at: number; titles: string[] }>();

function siteCacheKey(siteId: number | null): string {
  return siteId == null ? "null" : String(siteId);
}

/** Site-yerel + (HM site ise) merkez havuz başlıkları — vitrinde görünen kopyalar dahil. */
export async function loadRecentRssImportTitles(opts?: {
  sinceMs?: number;
  limit?: number;
  siteId?: number | null;
}): Promise<string[]> {
  const since = new Date(Date.now() - (opts?.sinceMs ?? RECENT_RSS_TITLE_WINDOW_MS));
  const limit = Math.min(500, Math.max(1, opts?.limit ?? RECENT_RSS_TITLE_LIMIT));
  const siteId = opts?.siteId;
  const siteScope =
    siteId === undefined
      ? isNotNull(newsTable.rssSourceUrl)
      : siteId == null
        ? and(isNull(newsTable.siteId), isNotNull(newsTable.rssSourceUrl))
        : and(
            or(eq(newsTable.siteId, siteId), isNull(newsTable.siteId)),
            or(isNotNull(newsTable.rssSourceUrl), eq(newsTable.isAiGenerated, true)),
          );

  const rows = await db
    .select({ title: newsTable.title })
    .from(newsTable)
    .where(and(siteScope, gte(newsTable.createdAt, since)))
    .orderBy(desc(newsTable.createdAt))
    .limit(limit);
  return rows.map((row) => String(row.title ?? "").trim()).filter(Boolean);
}

export async function loadRecentRssImportTitlesCached(siteId?: number | null): Promise<string[]> {
  const key = siteId === undefined ? "all" : siteCacheKey(siteId);
  const hit = recentRssTitleCacheByKey.get(key);
  if (hit && Date.now() - hit.at < RECENT_RSS_TITLE_CACHE_MS) {
    return hit.titles;
  }
  const titles = await loadRecentRssImportTitles(
    siteId === undefined ? undefined : { siteId },
  );
  recentRssTitleCacheByKey.set(key, { at: Date.now(), titles });
  return titles;
}

/** Test / koşu sonrası önbellek temizliği. */
export function clearRecentRssImportTitleCache(): void {
  recentRssTitleCacheByKey.clear();
}

export async function rssArticleAlreadyImported(
  siteId: number | null,
  sourceUrl: string | null,
  title: string,
  opts?: { extraTitles?: Iterable<string>; alsoTitles?: readonly string[] },
): Promise<boolean> {
  const titles = uniqueNonEmptyTitles(title, ...(opts?.alsoTitles ?? []));
  if (sourceUrl) {
    const cond =
      siteId == null
        ? and(isNull(newsTable.siteId), eq(newsTable.rssSourceUrl, sourceUrl))
        : and(eq(newsTable.siteId, siteId), eq(newsTable.rssSourceUrl, sourceUrl));
    const [hit] = await db.select({ id: newsTable.id }).from(newsTable).where(cond).limit(1);
    if (hit) return true;
    if (await rssArticleSourceUrlExistsAnywhere(sourceUrl)) return true;
  }

  const since = new Date(Date.now() - RECENT_RSS_TITLE_WINDOW_MS);
  for (const t of titles) {
    const cond =
      siteId == null
        ? and(isNull(newsTable.siteId), eq(newsTable.title, t), gte(newsTable.createdAt, since))
        : and(
            or(eq(newsTable.siteId, siteId), isNull(newsTable.siteId)),
            eq(newsTable.title, t),
            gte(newsTable.createdAt, since),
          );
    const [hit] = await db.select({ id: newsTable.id }).from(newsTable).where(cond).limit(1);
    if (hit) return true;
  }

  // Site-kapsamlı benzerlik (küresel Jaccard kaldırıldı — diğer sitelere dağıtımı engelliyordu).
  const recent = await loadRecentRssImportTitlesCached(siteId);
  if (rssStoryTitlesMatchAny(titles, recent)) return true;
  if (opts?.extraTitles && rssStoryTitlesMatchAny(titles, opts.extraTitles)) return true;
  return false;
}

/** Aynı RSS kaynak URL’si herhangi bir sitede (veya ana havuzda) varsa tekrar içe aktarma. */
export async function rssArticleSourceUrlExistsAnywhere(sourceUrl: string | null): Promise<boolean> {
  if (!sourceUrl) return false;
  const [hit] = await db
    .select({ id: newsTable.id })
    .from(newsTable)
    .where(and(isNotNull(newsTable.rssSourceUrl), eq(newsTable.rssSourceUrl, sourceUrl)))
    .limit(1);
  return !!hit;
}

/**
 * Aynı olayı tek siteye yaz: dolu siteleri atla, round-robin ile boş site seç.
 * Tüm adaylarda kopya varsa null döner.
 */
export async function pickHmSiteWithoutRssStory(opts: {
  siteTargets: readonly (number | null)[];
  startIndex: number;
  sourceUrl: string | null;
  titles: readonly string[];
  extraTitlesBySite?: ReadonlyMap<string, readonly string[]>;
}): Promise<{ siteId: number | null; nextIndex: number } | null> {
  const targets = opts.siteTargets;
  if (!targets.length) return null;
  const titles = uniqueNonEmptyTitles(...opts.titles);
  const primary = titles[0] ?? "";

  const takenFlags: boolean[] = [];
  for (let i = 0; i < targets.length; i += 1) {
    const siteId = targets[i] ?? null;
    const bagKey = siteCacheKey(siteId);
    const extra = opts.extraTitlesBySite?.get(bagKey);
    takenFlags[i] = await rssArticleAlreadyImported(siteId, opts.sourceUrl, primary, {
      alsoTitles: titles.slice(1),
      extraTitles: extra,
    });
  }

  const picked = pickRotatedFreeSiteIndex(targets.length, opts.startIndex, (index) =>
    Boolean(takenFlags[index]),
  );
  if (!picked) return null;
  return { siteId: targets[picked.index] ?? null, nextIndex: picked.nextStart };
}
