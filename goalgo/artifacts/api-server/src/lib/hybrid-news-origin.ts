import { and, eq, inArray } from "drizzle-orm";
import { getNewsDbForRead, hmMakalelerTable, hmNewsSitesTable, newsTable, type HmNewsSiteRow } from "@workspace/db";
import { parseHmSyncDedupeKey, parseHmPoolRef, isInternalHybridRssRef } from "./hm-sync-source.js";
import { buildHmSiteArticleUrl, buildHmSitePublicOrigin } from "./hm-yekpare-news-sync.js";
import { sitePublicOrigin, buildYekparePortalArticleUrl } from "./site-public-origin.js";
import type { HybridNewsItem } from "./hybrid-news-merge.js";

export type HybridNewsOriginFields = {
  /** Canonical public article URL on the origin site (absolute https). */
  originUrl: string | null;
  /** Origin site public base URL (absolute https). */
  sourceSiteUrl: string | null;
  /** HM site id where the article was originally published; null = Yekpare portal. */
  publishedOnSiteId: number | null;
  sourceSiteSlug: string | null;
};

function siteOriginUrl(site: Pick<HmNewsSiteRow, "domain" | "slug">): string {
  return buildHmSitePublicOrigin(site).replace(/\/+$/, "");
}

type ArticleSlugRow = { id: number; slug: string | null; siteId: number | null };

/** Batch-resolve canonical origin URLs for hybrid DB rows (pool copies, HM sync, portal). */
export async function enrichHybridNewsItemsWithOrigins(
  items: HybridNewsItem[],
): Promise<HybridNewsItem[]> {
  if (items.length === 0) return items;

  const poolRefs = new Map<string, { siteId: number; id: number }>();
  const syncRefs = new Map<string, ReturnType<typeof parseHmSyncDedupeKey>>();
  const directNewsIds = new Set<number>();
  const directMakaleIds = new Set<number>();
  const siteIds = new Set<number>();

  for (const item of items) {
    if (item.source === "rss") continue;

    const pool = parseHmPoolRef(item.rssSourceUrl);
    if (pool) {
      poolRefs.set(String(item.id), pool);
      directNewsIds.add(pool.id);
      siteIds.add(pool.siteId);
      continue;
    }

    const sync = parseHmSyncDedupeKey(item.rssSourceUrl);
    if (sync) {
      syncRefs.set(String(item.id), sync);
      siteIds.add(sync.siteId);
      if (sync.kind === "news") directNewsIds.add(sync.sourceId);
      else directMakaleIds.add(sync.sourceId);
      continue;
    }

    const publishedOnSiteId = item.publishedOnSiteId ?? null;
    if (publishedOnSiteId != null && publishedOnSiteId > 0) siteIds.add(publishedOnSiteId);
  }

  const db = getNewsDbForRead();

  const newsById = new Map<number, ArticleSlugRow>();
  if (directNewsIds.size > 0) {
    const rows = await db
      .select({ id: newsTable.id, slug: newsTable.slug, siteId: newsTable.siteId })
      .from(newsTable)
      .where(inArray(newsTable.id, [...directNewsIds]));
    for (const row of rows) newsById.set(row.id, row);
  }

  const makaleById = new Map<number, { id: number; slug: string | null; siteId: number | null }>();
  if (directMakaleIds.size > 0) {
    const rows = await db
      .select({ id: hmMakalelerTable.id, slug: hmMakalelerTable.slug, siteId: hmMakalelerTable.siteId })
      .from(hmMakalelerTable)
      .where(inArray(hmMakalelerTable.id, [...directMakaleIds]));
    for (const row of rows) makaleById.set(row.id, row);
  }

  const siteById = new Map<number, HmNewsSiteRow>();
  if (siteIds.size > 0) {
    const rows = await db
      .select()
      .from(hmNewsSitesTable)
      .where(and(eq(hmNewsSitesTable.active, true), inArray(hmNewsSitesTable.id, [...siteIds])));
    for (const row of rows) siteById.set(row.id, row);
  }

  return items.map((item) => {
    if (item.source === "rss") {
      const external = String(item.rssSourceUrl ?? "").trim();
      return {
        ...item,
        originUrl: external && /^https?:\/\//i.test(external) ? external : null,
        sourceSiteUrl: null,
        publishedOnSiteId: null,
        sourceSiteSlug: null,
      };
    }

    const pool = poolRefs.get(String(item.id));
    if (pool) {
      const srcNews = newsById.get(pool.id);
      const site = siteById.get(pool.siteId);
      const slug = String(srcNews?.slug ?? item.slug ?? "").trim();
      const originUrl =
        site && slug ? buildHmSiteArticleUrl(site, slug) : null;
      return {
        ...item,
        originUrl,
        sourceSiteUrl: site ? siteOriginUrl(site) : null,
        publishedOnSiteId: pool.siteId,
        sourceSiteSlug: site?.slug ?? null,
        rssSourceUrl: isInternalHybridRssRef(item.rssSourceUrl) ? null : item.rssSourceUrl,
      };
    }

    const sync = syncRefs.get(String(item.id));
    if (sync) {
      const site = siteById.get(sync.siteId);
      const src =
        sync.kind === "news"
          ? newsById.get(sync.sourceId)
          : makaleById.get(sync.sourceId);
      const slug = String(src?.slug ?? item.slug ?? "").trim();
      const originUrl = site && slug ? buildHmSiteArticleUrl(site, slug) : null;
      return {
        ...item,
        originUrl,
        sourceSiteUrl: site ? siteOriginUrl(site) : null,
        publishedOnSiteId: sync.siteId,
        sourceSiteSlug: site?.slug ?? null,
        rssSourceUrl: isInternalHybridRssRef(item.rssSourceUrl) ? null : item.rssSourceUrl,
      };
    }

    const publishedOnSiteId = item.publishedOnSiteId ?? null;
    const slug = String(item.slug ?? "").trim();
    if (publishedOnSiteId != null && publishedOnSiteId > 0) {
      const site = siteById.get(publishedOnSiteId);
      const originUrl = site && slug ? buildHmSiteArticleUrl(site, slug) : null;
      return {
        ...item,
        originUrl,
        sourceSiteUrl: site ? siteOriginUrl(site) : null,
        publishedOnSiteId,
        sourceSiteSlug: site?.slug ?? null,
        rssSourceUrl: isInternalHybridRssRef(item.rssSourceUrl) ? null : item.rssSourceUrl,
      };
    }

    const originUrl = slug ? buildYekparePortalArticleUrl(slug) : null;
    const portalOrigin = sitePublicOrigin().replace(/\/+$/, "");
    return {
      ...item,
      originUrl,
      sourceSiteUrl: portalOrigin,
      publishedOnSiteId: null,
      sourceSiteSlug: null,
      rssSourceUrl: isInternalHybridRssRef(item.rssSourceUrl) ? null : item.rssSourceUrl,
    };
  });
}
