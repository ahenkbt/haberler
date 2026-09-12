import { and, desc, eq, gte, isNull, isNotNull } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import {
  rssTitleMatchesAny,
} from "./rssImportDedupeCore.js";

export {
  normalizeRssSourceUrl,
  rssTitleJaccardSimilarity,
  rssTitleKeyWords,
  rssTitleMatchesAny,
  rssTitlesAreNearDuplicate,
  RSS_TITLE_NEAR_DUPLICATE_THRESHOLD,
} from "./rssImportDedupeCore.js";

const RECENT_RSS_TITLE_WINDOW_MS = 48 * 60 * 60 * 1000;
const RECENT_RSS_TITLE_LIMIT = 250;
const RECENT_RSS_TITLE_CACHE_MS = 20_000;

let recentRssTitleCache: { at: number; titles: string[] } | null = null;

export async function loadRecentRssImportTitles(opts?: {
  sinceMs?: number;
  limit?: number;
}): Promise<string[]> {
  const since = new Date(Date.now() - (opts?.sinceMs ?? RECENT_RSS_TITLE_WINDOW_MS));
  const limit = Math.min(500, Math.max(1, opts?.limit ?? RECENT_RSS_TITLE_LIMIT));
  const rows = await db
    .select({ title: newsTable.title })
    .from(newsTable)
    .where(and(isNotNull(newsTable.rssSourceUrl), gte(newsTable.createdAt, since)))
    .orderBy(desc(newsTable.createdAt))
    .limit(limit);
  return rows.map((row) => String(row.title ?? "").trim()).filter(Boolean);
}

export async function loadRecentRssImportTitlesCached(): Promise<string[]> {
  if (recentRssTitleCache && Date.now() - recentRssTitleCache.at < RECENT_RSS_TITLE_CACHE_MS) {
    return recentRssTitleCache.titles;
  }
  const titles = await loadRecentRssImportTitles();
  recentRssTitleCache = { at: Date.now(), titles };
  return titles;
}

export async function rssArticleAlreadyImported(
  siteId: number | null,
  sourceUrl: string | null,
  title: string,
  opts?: { extraTitles?: Iterable<string> },
): Promise<boolean> {
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
  const cond =
    siteId == null
      ? and(isNull(newsTable.siteId), eq(newsTable.title, title), gte(newsTable.createdAt, since))
      : and(eq(newsTable.siteId, siteId), eq(newsTable.title, title), gte(newsTable.createdAt, since));
  const [hit] = await db.select({ id: newsTable.id }).from(newsTable).where(cond).limit(1);
  if (hit) return true;

  const recent = await loadRecentRssImportTitlesCached();
  if (rssTitleMatchesAny(title, recent)) return true;
  return Boolean(opts?.extraTitles && rssTitleMatchesAny(title, opts.extraTitles));
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
