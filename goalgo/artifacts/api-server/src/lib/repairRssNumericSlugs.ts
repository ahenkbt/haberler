import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { isAsgHmNewsSiteRow } from "./hm-asg-editor-repair.js";
import {
  buildRssImportNewsSlug,
  isLegacyRssNumericSlug,
} from "./rss-import-slug.js";
import { normalizeRssSourceUrl } from "./rssImportDedupe.js";
import { upsertNewsSlugRedirectFromRow } from "./news-slug-redirect.js";
import { invalidateNewsPageBundleCache } from "./news-page-bundle.js";

export async function repairRssNumericSlugsBatch(options?: {
  siteId?: number;
  slugs?: string[];
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  updated: number;
  dryRun: boolean;
  samples: Array<{ id: number; oldSlug: string; newSlug: string }>;
}> {
  const limit = Math.min(5000, Math.max(1, options?.limit ?? 500));
  const dryRun = options?.dryRun === true;
  const explicitSlugs = (options?.slugs ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  const sites = await getNewsDbForRead().select().from(hmNewsSitesTable);
  let siteIds = sites.filter((s) => isAsgHmNewsSiteRow(s)).map((s) => s.id);
  if (options?.siteId != null && Number.isFinite(options.siteId) && options.siteId > 0) {
    siteIds = siteIds.filter((id) => id === options.siteId);
  }

  if (siteIds.length === 0) {
    return { scanned: 0, updated: 0, dryRun, samples: [] };
  }

  const slugCond =
    explicitSlugs.length > 0
      ? inArray(newsTable.slug, explicitSlugs)
      : sql`lower(${newsTable.slug}) ~ ${"^rss-[0-9]+$"}`;

  const where = and(inArray(newsTable.siteId, siteIds), slugCond);

  const rows = await getNewsDbForRead()
    .select({
      id: newsTable.id,
      title: newsTable.title,
      slug: newsTable.slug,
      siteId: newsTable.siteId,
      rssSourceUrl: newsTable.rssSourceUrl,
      categoryId: newsTable.categoryId,
      tags: newsTable.tags,
    })
    .from(newsTable)
    .where(where)
    .orderBy(desc(newsTable.id))
    .limit(limit);

  const samples: Array<{ id: number; oldSlug: string; newSlug: string }> = [];
  let updated = 0;

  for (const row of rows) {
    const oldSlug = String(row.slug ?? "").trim();
    if (!isLegacyRssNumericSlug(oldSlug) && explicitSlugs.length === 0) continue;

    const sourceUrl = normalizeRssSourceUrl(String(row.rssSourceUrl ?? ""));
    const newSlug = await buildRssImportNewsSlug({
      title: row.title,
      sourceUrl: sourceUrl || null,
      siteId: row.siteId,
    });
    if (newSlug === oldSlug) continue;

    samples.push({ id: row.id, oldSlug, newSlug });
    if (dryRun) {
      updated += 1;
      continue;
    }

    await upsertNewsSlugRedirectFromRow({
      slug: oldSlug,
      siteId: row.siteId,
      title: row.title,
      categoryId: row.categoryId,
      tags: row.tags,
    });
    await dualWriteUpdate(newsTable, { slug: newSlug, updatedAt: new Date() }, eq(newsTable.id, row.id));
    invalidateNewsPageBundleCache({ slug: oldSlug, siteId: row.siteId ?? null });
    invalidateNewsPageBundleCache({ slug: newSlug, siteId: row.siteId ?? null });
    updated += 1;
  }

  return { scanned: rows.length, updated, dryRun, samples: samples.slice(0, 20) };
}
