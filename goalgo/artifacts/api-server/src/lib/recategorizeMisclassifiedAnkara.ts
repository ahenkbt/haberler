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
import { isMisclassifiedAnkaraItem } from "./rss-ankara-category-guard.js";
import { findAllCategoryIdsByCanonicalSlug } from "./portal-category-slug.js";
import { invalidateNewsPageBundleCache } from "./news-page-bundle.js";
import { invalidateNewsContextCache } from "./news-context.js";

export async function recategorizeMisclassifiedAnkaraBatch(options?: {
  siteId?: number;
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  updated: number;
  dryRun: boolean;
  siteIds: number[];
}> {
  const limit = Math.min(10_000, Math.max(1, options?.limit ?? 2000));
  const dryRun = options?.dryRun === true;

  const sites = await getNewsDbForRead().select().from(hmNewsSitesTable);
  let targetSiteIds = sites.filter((s) => isAsgHmNewsSiteRow(s)).map((s) => s.id);
  if (options?.siteId != null && Number.isFinite(options.siteId) && options.siteId > 0) {
    targetSiteIds = targetSiteIds.filter((id) => id === options.siteId);
  }
  if (targetSiteIds.length === 0) {
    return { scanned: 0, updated: 0, dryRun, siteIds: [] };
  }

  const cats = await getNewsDbForRead()
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable);
  const ankaraCategoryIds = cats
    .filter((c) => categorySlugIsAnkara(c.slug, "asg"))
    .map((c) => c.id);
  if (ankaraCategoryIds.length === 0) {
    return { scanned: 0, updated: 0, dryRun, siteIds: targetSiteIds };
  }

  const gundemIds = await findAllCategoryIdsByCanonicalSlug("gundem");
  const defaultGundemId = gundemIds[0];
  if (defaultGundemId == null) {
    throw new Error("gundem kategori bulunamadı");
  }

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
      ),
    )
    .orderBy(desc(newsTable.id))
    .limit(limit);

  const toUpdate: number[] = [];
  for (const row of rows) {
    const catSlug = cats.find((c) => c.id === row.categoryId)?.slug ?? "ankara";
    if (isMisclassifiedAnkaraItem(catSlug, row.title, row.spot, row.content)) {
      toUpdate.push(row.id);
    }
  }

  let updated = 0;
  if (!dryRun && toUpdate.length > 0) {
    const siteGundem = new Map<number, number>();
    for (const siteId of targetSiteIds) {
      const [exclusive] = await getNewsDbForRead()
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(and(eq(categoriesTable.slug, "gundem"), eq(categoriesTable.exclusiveSiteId, siteId)))
        .limit(1);
      siteGundem.set(siteId, exclusive?.id ?? defaultGundemId);
    }

    for (const row of rows.filter((r) => toUpdate.includes(r.id))) {
      const gundemId = siteGundem.get(row.siteId ?? 0) ?? defaultGundemId;
      await dualWriteUpdate(newsTable, { categoryId: gundemId }, eq(newsTable.id, row.id));
      updated += 1;
      invalidateNewsPageBundleCache({ slug: row.slug ?? undefined, siteId: row.siteId ?? null });
    }
    invalidateNewsContextCache();
  } else {
    updated = toUpdate.length;
  }

  return { scanned: rows.length, updated, dryRun, siteIds: targetSiteIds };
}
