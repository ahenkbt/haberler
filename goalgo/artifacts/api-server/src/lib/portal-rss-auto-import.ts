import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { dualWriteInsert, dualWriteUpdate, getNewsDbForRead, newsTable } from "@workspace/db";
import type { PortalHybridRssFeedConfig } from "./portal-hybrid-config.js";
import { decodeHtmlEntities } from "./decodeHtmlEntities.js";
import { stripExternalAnchorsFromHtml } from "./hybrid-news-merge.js";
import { slugify } from "./news-context.js";
import {
  normalizePortalRssCachedContentHtml,
  type PortalRssItem,
} from "./portal-rss-fetch.js";
import { findPortalGlobalCategoryBySlug } from "./portal-category-slug.js";
import { normalizeRssSourceUrl, rssArticleAlreadyImported } from "./rssImportDedupe.js";
import { readPortalRssItemsForFeeds } from "./portal-rss-store.js";
import { enabledPortalHybridRssFeeds, loadPortalHybridRssFeeds } from "./portal-hybrid-config.js";
import { isBoxScopeFeedId } from "./portal-rss-cache.js";
import { enqueuePortalRssMetaRewriteJob } from "./portal-rss-ai-meta.js";
import { mirrorRssImportImageUrl } from "./portal-rss-image-mirror.js";
import { deriveRssImportNewsTags } from "./newsAutoTags.js";
import { scheduleGoogleNewsIndexing } from "./google-news-indexing.js";
import { removeNewsSlugRedirect } from "./news-slug-redirect.js";
import { isMisclassifiedSporItem } from "./rss-spor-category-guard.js";

export { isPortalRssMirrorImagesEnabled } from "./portal-rss-image-mirror.js";

/** RSS → `news` otomatik senkron (varsayılan açık). Kapatmak: PORTAL_RSS_SYNC_TO_NEWS=0 */
export function isPortalRssSyncToNewsEnabled(): boolean {
  return process.env.PORTAL_RSS_SYNC_TO_NEWS?.trim() !== "0";
}

/** Kararlı SEO slug: başlık + kaynak URL hash (yeniden içe aktarmada değişmez). */
export function stablePortalRssNewsSlug(title: string, sourceUrl: string | null): string {
  const base = slugify(decodeHtmlEntities(title)).slice(0, 72).replace(/-+$/, "") || "haber";
  if (!sourceUrl) return `${base}-rss`;
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10);
  return `${base}-${hash}`;
}

async function ensureUniqueNewsSlug(candidate: string): Promise<string> {
  let slug = candidate;
  for (let n = 0; n < 20; n += 1) {
    const [hit] = await getNewsDbForRead()
      .select({ id: newsTable.id })
      .from(newsTable)
      .where(eq(newsTable.slug, slug))
      .limit(1);
    if (!hit) return slug;
    slug = `${candidate}-${n + 1}`;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}

function resolveRssContentHtml(item: PortalRssItem): string {
  const raw =
    normalizePortalRssCachedContentHtml(item.contentHtml) ||
    (item.spot ? `<p>${decodeHtmlEntities(item.spot.replace(/…$/, "").trim())}</p>` : "");
  return raw ? stripExternalAnchorsFromHtml(raw) : "";
}

/** RSS yenilemede mevcut `news` satırının kapak görselini günceller (editör manuel kayıtlara dokunmaz). */
export async function refreshPortalRssNewsImageFromItem(opts: {
  siteId: number | null;
  sourceUrl: string | null;
  imageUrl: string | null | undefined;
  title?: string | null;
}): Promise<boolean> {
  const sourceUrl = normalizeRssSourceUrl(String(opts.sourceUrl ?? ""));
  const title = String(opts.title ?? "").trim() || sourceUrl || "haber";
  const incoming = await mirrorRssImportImageUrl(opts.imageUrl, title);
  if (!sourceUrl || !incoming) return false;

  const cond =
    opts.siteId == null
      ? and(isNull(newsTable.siteId), eq(newsTable.rssSourceUrl, sourceUrl))
      : and(eq(newsTable.siteId, opts.siteId), eq(newsTable.rssSourceUrl, sourceUrl));

  const [row] = await getNewsDbForRead()
    .select({
      id: newsTable.id,
      imageUrl: newsTable.imageUrl,
      isEditorManual: newsTable.isEditorManual,
      tags: newsTable.tags,
    })
    .from(newsTable)
    .where(cond)
    .limit(1);
  if (!row) return false;

  const current = String(row.imageUrl ?? "").trim();
  if (current === incoming) return false;

  const tags = row.tags ?? [];
  const rssTagged = tags.includes("rss-hybrid") || tags.includes("rss-auto");
  if (row.isEditorManual === true && !rssTagged && current) return false;

  await dualWriteUpdate(
    newsTable,
    { imageUrl: incoming, updatedAt: new Date() },
    eq(newsTable.id, row.id),
  );
  return true;
}

export async function findNewsSlugByRssSourceLink(link: string | null | undefined): Promise<string | null> {
  const sourceUrl = normalizeRssSourceUrl(String(link ?? ""));
  if (!sourceUrl) return null;
  const [row] = await getNewsDbForRead()
    .select({ slug: newsTable.slug })
    .from(newsTable)
    .where(and(isNull(newsTable.siteId), eq(newsTable.rssSourceUrl, sourceUrl), eq(newsTable.status, "published")))
    .limit(1);
  return row?.slug?.trim() || null;
}

/**
 * Portal RSS öğelerini merkez `news` havuzuna yazar (site_id NULL).
 * Haber siteleri tek tablodan `/haber/{slug}` ile okur — `portal_rss_items` yalnızca ara önbellek.
 */
export async function syncPortalRssItemsToNewsTable(
  feed: PortalHybridRssFeedConfig,
  items: PortalRssItem[],
): Promise<{ inserted: number; skipped: number }> {
  if (!isPortalRssSyncToNewsEnabled() || isBoxScopeFeedId(feed.id)) {
    return { inserted: 0, skipped: items.length };
  }

  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    const title = decodeHtmlEntities(String(item.title ?? "").trim());
    if (!title) {
      skipped += 1;
      continue;
    }
    const spot = item.spot ? decodeHtmlEntities(String(item.spot).trim()) : null;
    const content = resolveRssContentHtml(item) || (spot ? `<p>${spot}</p>` : `<p>${title}</p>`);
    let effectiveCategorySlug = String(item.categorySlug || feed.categorySlug || "gundem")
      .trim()
      .toLowerCase();
    if (isMisclassifiedSporItem(effectiveCategorySlug, title, spot, content)) {
      effectiveCategorySlug = "gundem";
    }
    const categoryRow = await findPortalGlobalCategoryBySlug(effectiveCategorySlug);
    const categoryId = categoryRow?.id ?? null;

    const sourceUrl = normalizeRssSourceUrl(item.link);
    if (await rssArticleAlreadyImported(null, sourceUrl, title)) {
      await refreshPortalRssNewsImageFromItem({ siteId: null, sourceUrl, imageUrl: item.imageUrl, title });
      skipped += 1;
      continue;
    }

    const slug = await ensureUniqueNewsSlug(stablePortalRssNewsSlug(title, sourceUrl));
    const publishedAt = new Date(item.publishedAt);
    const ts = Number.isFinite(publishedAt.getTime()) ? publishedAt : new Date();

    const imageUrl = await mirrorRssImportImageUrl(item.imageUrl, title);

    const [created] = await dualWriteInsert(newsTable, {
      title,
      slug,
      spot,
      content,
      imageUrl,
      categoryId,
      authorId: null,
      status: "published",
      isFeatured: false,
      isBreaking: false,
      tags: deriveRssImportNewsTags({
        title,
        spot,
        categoryName: categoryRow?.name ?? null,
        categorySlug: effectiveCategorySlug,
      }),
      views: 0,
      isAiGenerated: false,
      siteId: null,
      siteOnly: false,
      isEditorManual: false,
      rssSourceUrl: sourceUrl,
      createdAt: ts,
      updatedAt: ts,
    });

    if (created) {
      inserted += 1;
      void enqueuePortalRssMetaRewriteJob(created.id, title, spot).catch(() => {});
      void removeNewsSlugRedirect(slug, null).catch(() => {});
      scheduleGoogleNewsIndexing(created);
    } else skipped += 1;
  }

  return { inserted, skipped };
}

/** Mevcut `portal_rss_items` → `news` geri doldurma (deploy sonrası ilk tur). */
export async function backfillPortalRssNewsFromCache(limitPerFeed = 40): Promise<{ inserted: number; skipped: number }> {
  if (!isPortalRssSyncToNewsEnabled()) return { inserted: 0, skipped: 0 };

  const feeds = (await loadPortalHybridRssFeeds(null, "all")).filter(
    (feed) => feed.enabled && feed.url && !isBoxScopeFeedId(feed.id),
  );
  const activeFeeds = enabledPortalHybridRssFeeds(feeds);
  const items = await readPortalRssItemsForFeeds(activeFeeds);
  const byFeed = new Map<string, PortalRssItem[]>();
  for (const item of items) {
    const list = byFeed.get(item.feedId) ?? [];
    if (list.length < limitPerFeed) list.push(item);
    byFeed.set(item.feedId, list);
  }

  let inserted = 0;
  let skipped = 0;
  for (const feed of activeFeeds) {
    const batch = byFeed.get(feed.id) ?? [];
    if (!batch.length) continue;
    const res = await syncPortalRssItemsToNewsTable(feed, batch);
    inserted += res.inserted;
    skipped += res.skipped;
  }
  return { inserted, skipped };
}
