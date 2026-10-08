import { and, desc, eq, inArray } from "drizzle-orm";
import {
  categoriesTable,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import { categorySlugIsAnkara } from "./hm-vatanhaber-ankara-sync.js";
import { isAsgHmNewsSiteRow } from "./hm-asg-editor-repair.js";
import {
  isMisclassifiedAnkaraItem,
  resolveAnkaraReplacementCategorySlug,
} from "./rss-ankara-category-guard.js";
import {
  findAllCategoryIdsByCanonicalSlug,
  loadHmSiteSlugPrefixes,
  normalizePortalCategorySlug,
  resolveCanonicalPortalCategorySlug,
} from "./portal-category-slug.js";
import { invalidateNewsPageBundleCache } from "./news-page-bundle.js";
import { invalidateNewsContextCache } from "./news-context.js";

type CategoryRow = { id: number; slug: string; exclusiveSiteId: number | null };

function resolveCategoryIdForSite(
  siteId: number,
  canonicalSlug: string,
  allCats: CategoryRow[],
  siteSlugs: string[],
  defaultByCanonical: Map<string, number>,
): number | null {
  const normalizedTarget = normalizePortalCategorySlug(canonicalSlug);
  const siteExclusive = allCats.find(
    (c) =>
      c.exclusiveSiteId === siteId &&
      resolveCanonicalPortalCategorySlug(c.slug, siteSlugs) === normalizedTarget,
  );
  if (siteExclusive) return siteExclusive.id;
  return defaultByCanonical.get(normalizedTarget) ?? defaultByCanonical.get("gundem") ?? null;
}

export async function recategorizeMisclassifiedAnkaraBatch(options?: {
  siteId?: number;
  limit?: number;
  dryRun?: boolean;
  slugs?: string[];
}): Promise<{
  scanned: number;
  updated: number;
  dryRun: boolean;
  siteIds: number[];
  byTargetSlug: Record<string, number>;
}> {
  const limit = Math.min(10_000, Math.max(1, options?.limit ?? 2000));
  const dryRun = options?.dryRun === true;
  const byTargetSlug: Record<string, number> = {};

  const sites = await getNewsDbForRead().select().from(hmNewsSitesTable);
  let targetSiteIds = sites.filter((s) => isAsgHmNewsSiteRow(s)).map((s) => s.id);
  if (options?.siteId != null && Number.isFinite(options.siteId) && options.siteId > 0) {
    targetSiteIds = targetSiteIds.filter((id) => id === options.siteId);
  }
  if (targetSiteIds.length === 0) {
    return { scanned: 0, updated: 0, dryRun, siteIds: [], byTargetSlug };
  }

  const siteSlugs = await loadHmSiteSlugPrefixes();
  const cats = await getNewsDbForRead()
    .select({
      id: categoriesTable.id,
      slug: categoriesTable.slug,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
    })
    .from(categoriesTable);
  const ankaraCategoryIds = cats
    .filter((c) => categorySlugIsAnkara(c.slug, "asg"))
    .map((c) => c.id);
  if (ankaraCategoryIds.length === 0) {
    return { scanned: 0, updated: 0, dryRun, siteIds: targetSiteIds, byTargetSlug };
  }

  const canonicalSlugs = ["gundem", "ekonomi", "dunya", "spor", "teknoloji", "saglik", "siyaset"];
  const defaultByCanonical = new Map<string, number>();
  for (const slug of canonicalSlugs) {
    const ids = await findAllCategoryIdsByCanonicalSlug(slug);
    if (ids[0] != null) defaultByCanonical.set(normalizePortalCategorySlug(slug), ids[0]);
  }
  if (!defaultByCanonical.has("gundem")) {
    throw new Error("gundem kategori bulunamadı");
  }

  const slugFilter =
    options?.slugs?.map((s) => String(s).trim()).filter(Boolean) ?? [];
  const rows = await getNewsDbForRead()
    .select({
      id: newsTable.id,
      title: newsTable.title,
      spot: newsTable.spot,
      content: newsTable.content,
      slug: newsTable.slug,
      siteId: newsTable.siteId,
      categoryId: newsTable.categoryId,
    })
    .from(newsTable)
    .where(
      and(
        inArray(newsTable.siteId, targetSiteIds),
        inArray(newsTable.categoryId, ankaraCategoryIds),
        eq(newsTable.status, "published"),
        ...(slugFilter.length > 0 ? [inArray(newsTable.slug, slugFilter)] : []),
      ),
    )
    .orderBy(desc(newsTable.id))
    .limit(limit);

  const updates: Array<{ id: number; targetCategoryId: number; targetSlug: string; row: (typeof rows)[0] }> =
    [];
  for (const row of rows) {
    const catSlug = cats.find((c) => c.id === row.categoryId)?.slug ?? "ankara";
    if (!isMisclassifiedAnkaraItem(catSlug, row.title, row.spot, row.content)) continue;
    const targetSlug = resolveAnkaraReplacementCategorySlug(row.title, row.spot, row.content);
    const siteId = row.siteId ?? 0;
    const targetCategoryId = resolveCategoryIdForSite(
      siteId,
      targetSlug,
      cats,
      siteSlugs,
      defaultByCanonical,
    );
    let resolvedCategoryId = targetCategoryId;
    if (resolvedCategoryId == null) {
      resolvedCategoryId =
        resolveCategoryIdForSite(siteId, "gundem", cats, siteSlugs, defaultByCanonical) ??
        defaultByCanonical.get("gundem") ??
        null;
    }
    if (resolvedCategoryId == null) continue;
    const effectiveSlug = targetCategoryId == null ? "gundem" : targetSlug;
    updates.push({
      id: row.id,
      targetCategoryId: resolvedCategoryId,
      targetSlug: effectiveSlug,
      row,
    });
    byTargetSlug[effectiveSlug] = (byTargetSlug[effectiveSlug] ?? 0) + 1;
  }

  let updated = 0;
  if (!dryRun && updates.length > 0) {
    for (const item of updates) {
      await dualWriteUpdate(
        newsTable,
        { categoryId: item.targetCategoryId },
        eq(newsTable.id, item.id),
      );
      updated += 1;
      invalidateNewsPageBundleCache({
        slug: item.row.slug ?? undefined,
        siteId: item.row.siteId ?? null,
      });
    }
    invalidateNewsContextCache();
  } else {
    updated = updates.length;
  }

  return { scanned: rows.length, updated, dryRun, siteIds: targetSiteIds, byTargetSlug };
}
