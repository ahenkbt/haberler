import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db as mainDb, dualWriteUpdate, getNewsDbForRead, newsTable, portalRssItemsTable } from "@workspace/db";
import { fetchArticlePageImageUrl } from "./articlePageImage.js";
import { listHmNewsSitesCompat } from "./hm-site-compat.js";
import { isMissingNewsCoverImage } from "./hm-tepe-manset-select.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";
import { extractRssCoverImage } from "./rssItemMedia.js";

export type RssMissingImageRow = {
  id: number;
  siteId?: number | null;
  title?: string | null;
  slug?: string | null;
  imageUrl?: string | null;
  rssSourceUrl?: string | null;
  isEditorManual?: boolean | null;
  tags?: string[] | null;
};

export function shouldBackfillMissingRssNewsImage(item: {
  imageUrl?: string | null;
  rssSourceUrl?: string | null;
  isEditorManual?: boolean | null;
  tags?: string[] | null;
}): boolean {
  if (item.isEditorManual === true) return false;
  if (!isMissingNewsCoverImage(item.imageUrl)) return false;
  const ref = String(item.rssSourceUrl ?? "").trim();
  if (ref.startsWith("yekpare-hm-sync:")) return false;
  if (ref.startsWith("yekpare-hm-pool:")) return true;
  if (/^https?:\/\//i.test(ref)) return true;
  const tags = item.tags ?? [];
  return tags.includes("rss-auto") || tags.includes("rss-hybrid");
}

export function articleUrlForRssImageBackfill(rssSourceUrl?: string | null): string | null {
  const ref = String(rssSourceUrl ?? "").trim();
  if (!/^https?:\/\//i.test(ref)) return null;
  return normalizeRssSourceUrl(ref) ?? ref;
}

export function pickRssBackfillImageUrl(opts: {
  pageUrl: string;
  cachedImageUrl?: string | null;
  rawFeedItem?: string | null;
  descriptionHtml?: string | null;
  scrapedImageUrl?: string | null;
}): string | null {
  const cached = String(opts.cachedImageUrl ?? "").trim();
  if (cached && !isMissingNewsCoverImage(cached)) return cached;
  const scraped = String(opts.scrapedImageUrl ?? "").trim();
  if (scraped && !isMissingNewsCoverImage(scraped)) return scraped;
  const fromFeed = extractRssCoverImage(
    String(opts.rawFeedItem ?? ""),
    String(opts.descriptionHtml ?? ""),
    opts.pageUrl,
  );
  if (fromFeed && !isMissingNewsCoverImage(fromFeed)) return fromFeed;
  return null;
}

export async function persistNewsImageUrl(newsId: number, imageUrl: string): Promise<void> {
  const next = String(imageUrl ?? "").trim();
  if (!newsId || !next || isMissingNewsCoverImage(next)) return;
  await dualWriteUpdate(
    newsTable,
    { imageUrl: next, updatedAt: new Date() },
    eq(newsTable.id, newsId),
  );
}

export type HmRssImageBackfillResult = {
  ok: boolean;
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
  detail: string;
};

function rssImageLookupKeys(urls: readonly string[]): string[] {
  const unique = [
    ...new Set(
      urls
        .map((url) => normalizeRssSourceUrl(url) ?? String(url || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 40);
  const keys = new Set<string>();
  for (const url of unique) {
    keys.add(`link:${url.toLowerCase()}`);
  }
  return [...keys];
}

async function loadCachedRssImages(urls: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const keys = rssImageLookupKeys(urls);
  if (!keys.length) return out;
  try {
    const rows = await mainDb
      .select({
        link: portalRssItemsTable.link,
        imageUrl: portalRssItemsTable.imageUrl,
        dedupeKey: portalRssItemsTable.dedupeKey,
      })
      .from(portalRssItemsTable)
      .where(inArray(portalRssItemsTable.dedupeKey, keys))
      .limit(500);
    for (const row of rows) {
      const img = String(row.imageUrl ?? "").trim();
      if (!img || isMissingNewsCoverImage(img)) continue;
      const linkKey =
        normalizeRssSourceUrl(String(row.link ?? "")) ?? String(row.link ?? "").trim().toLowerCase();
      if (linkKey) out.set(linkKey, img);
      const dedupe = String(row.dedupeKey ?? "").replace(/^link:/i, "").trim().toLowerCase();
      if (dedupe) out.set(dedupe, img);
    }
  } catch {
    return out;
  }
  return out;
}

export async function backfillHmRssMissingImages(opts?: {
  siteId?: number | null;
  limit?: number;
  dryRun?: boolean;
  scrape?: boolean;
}): Promise<HmRssImageBackfillResult> {
  const limit = Math.min(Math.max(opts?.limit ?? 80, 1), 400);
  const dryRun = opts?.dryRun === true;
  const scrape = opts?.scrape !== false;
  const readDb = getNewsDbForRead();

  const siteIds: number[] = [];
  if (opts?.siteId && opts.siteId > 0) {
    siteIds.push(opts.siteId);
  } else {
    const sites = await listHmNewsSitesCompat();
    for (const site of sites) {
      if (Number.isFinite(site.id) && site.id > 0) siteIds.push(site.id);
    }
  }

  const rows: RssMissingImageRow[] = [];
  for (const siteId of siteIds) {
    const found = await readDb
      .select({
        id: newsTable.id,
        siteId: newsTable.siteId,
        title: newsTable.title,
        slug: newsTable.slug,
        imageUrl: newsTable.imageUrl,
        rssSourceUrl: newsTable.rssSourceUrl,
        isEditorManual: newsTable.isEditorManual,
        tags: newsTable.tags,
      })
      .from(newsTable)
      .where(
        and(
          eq(newsTable.siteId, siteId),
          eq(newsTable.status, "published"),
          eq(newsTable.isEditorManual, false),
          isNotNull(newsTable.rssSourceUrl),
          or(
            sql`NULLIF(BTRIM(COALESCE(${newsTable.imageUrl}, '')), '') IS NULL`,
            sql`${newsTable.imageUrl} LIKE 'data:%'`,
            sql`${newsTable.imageUrl} LIKE '%haber-gorsel-hazirlaniyor%'`,
          )!,
        ),
      )
      .orderBy(desc(newsTable.createdAt))
      .limit(limit);
    for (const row of found) {
      if (shouldBackfillMissingRssNewsImage(row)) rows.push(row);
      if (rows.length >= limit) break;
    }
    if (rows.length >= limit) break;
  }

  // Anasayfa featured çoğu merkez havuz (site_id NULL) — site-yerel tarama bunları kaçırır.
  if (rows.length < limit) {
    const found = await readDb
      .select({
        id: newsTable.id,
        siteId: newsTable.siteId,
        title: newsTable.title,
        slug: newsTable.slug,
        imageUrl: newsTable.imageUrl,
        rssSourceUrl: newsTable.rssSourceUrl,
        isEditorManual: newsTable.isEditorManual,
        tags: newsTable.tags,
      })
      .from(newsTable)
      .where(
        and(
          isNull(newsTable.siteId),
          eq(newsTable.status, "published"),
          eq(newsTable.isEditorManual, false),
          isNotNull(newsTable.rssSourceUrl),
          or(
            sql`NULLIF(BTRIM(COALESCE(${newsTable.imageUrl}, '')), '') IS NULL`,
            sql`${newsTable.imageUrl} LIKE 'data:%'`,
            sql`${newsTable.imageUrl} LIKE '%haber-gorsel-hazirlaniyor%'`,
          )!,
        ),
      )
      .orderBy(desc(newsTable.createdAt))
      .limit(limit - rows.length);
    for (const row of found) {
      if (shouldBackfillMissingRssNewsImage(row)) rows.push(row);
    }
  }

  const articleUrls = rows
    .map((row) => articleUrlForRssImageBackfill(row.rssSourceUrl))
    .filter((url): url is string => Boolean(url));
  const cached = await loadCachedRssImages(articleUrls);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    const pageUrl = articleUrlForRssImageBackfill(row.rssSourceUrl);
    if (!pageUrl) {
      skipped += 1;
      continue;
    }
    const cacheKey = (normalizeRssSourceUrl(pageUrl) ?? pageUrl).toLowerCase();
    let scraped: string | null = null;
    if (scrape && !cached.get(cacheKey)) {
      scraped = await fetchArticlePageImageUrl(pageUrl, 5_000);
    }
    const next = pickRssBackfillImageUrl({
      pageUrl,
      cachedImageUrl: cached.get(cacheKey) ?? null,
      scrapedImageUrl: scraped,
    });
    if (!next) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      updated += 1;
      continue;
    }
    try {
      await persistNewsImageUrl(row.id, next);
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    ok: failed === 0,
    scanned: rows.length,
    updated,
    skipped,
    failed,
    detail: `${rows.length} resimsiz RSS tarandı, ${updated} güncellendi${dryRun ? " (dry-run)" : ""}`,
  };
}
