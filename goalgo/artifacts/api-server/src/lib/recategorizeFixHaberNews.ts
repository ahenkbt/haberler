/**
 * Fix Haber — yanlış/global kategorili veya merkez havuzdaki RSS haberlerini site slug’larına taşır.
 */
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import {
  categoriesTable,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { FIXHABER_CAMPAIGN_TAG, FIXHABER_SLUG } from "./hm-fixhaber-site.js";
import { resolveFixHaberImportCategorySlug } from "./hm-fixhaber-category-router.js";
import { loadHmSiteCategoryCatalog } from "./hm-local-category-router.js";
import { resolveHmEditorCategoryId } from "./hm-editor-categories.js";
import { invalidateNewsContextCache } from "./news-context.js";

function normalizeSlug(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

export async function recategorizeFixHaberNewsBatch(options?: {
  siteId?: number;
  limit?: number;
  dryRun?: boolean;
}): Promise<{ scanned: number; updated: number; dryRun: boolean; siteId: number | null }> {
  const limit = Math.min(5000, Math.max(1, options?.limit ?? 1500));
  const dryRun = options?.dryRun === true;

  const [site] = await getNewsDbForRead()
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, FIXHABER_SLUG))
    .limit(1);
  const siteId = options?.siteId ?? site?.id ?? null;
  if (!siteId) return { scanned: 0, updated: 0, dryRun, siteId: null };

  const catalog = await loadHmSiteCategoryCatalog(siteId);
  const catRows = await getNewsDbForRead()
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));
  const slugById = new Map(catRows.map((c) => [c.id, normalizeSlug(c.slug)]));

  const rows = await getNewsDbForRead()
    .select({
      id: newsTable.id,
      title: newsTable.title,
      spot: newsTable.spot,
      content: newsTable.content,
      categoryId: newsTable.categoryId,
      siteId: newsTable.siteId,
      tags: newsTable.tags,
      rssSourceUrl: newsTable.rssSourceUrl,
    })
    .from(newsTable)
    .where(
      or(
        eq(newsTable.siteId, siteId),
        and(
          isNull(newsTable.siteId),
          sql`${FIXHABER_CAMPAIGN_TAG} = ANY(${newsTable.tags})`,
        ),
      )!,
    )
    .orderBy(desc(newsTable.updatedAt))
    .limit(limit);

  let updated = 0;
  for (const row of rows) {
    const currentSlug = row.categoryId != null ? slugById.get(row.categoryId) ?? "" : "";
    const needsSite = row.siteId !== siteId;
    const needsCategory = !currentSlug.startsWith("fixhaber-");
    if (!needsSite && !needsCategory) continue;

    const nextSlug = resolveFixHaberImportCategorySlug(currentSlug || "fixhaber-haberler", row.title, row.spot, row.content, {
      siteCategories: catalog,
    });
    const nextCategoryId = await resolveHmEditorCategoryId(siteId, nextSlug);
    if (!needsSite && nextCategoryId === row.categoryId) continue;

    if (!dryRun) {
      await dualWriteUpdate(
        newsTable,
        {
          siteId,
          ownerSiteId: siteId,
          siteOnly: true,
          categoryId: nextCategoryId,
          updatedAt: new Date(),
        },
        eq(newsTable.id, row.id),
      );
    }
    updated += 1;
  }

  if (updated > 0 && !dryRun) {
    invalidateNewsContextCache();
  }

  return { scanned: rows.length, updated, dryRun, siteId };
}
