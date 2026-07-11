import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  categoriesTable,
  db,
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import {
  categorySlugLooksSitePrefixed,
  cleanCategoryDisplayName,
  deriveCleanCategorySlug,
} from "./hm-editor-categories";

export type ConsolidateSitePrefixCategoriesResult = {
  dryRun: boolean;
  scanned: number;
  migrated: number;
  newsMoved: number;
  categoriesDeleted: number;
  categoriesCreated: number;
  skipped: Array<{ slug: string; reason: string }>;
  actions: string[];
};

async function findExclusiveCategory(siteId: number, slug: string) {
  const [row] = await getNewsDbForRead()
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.exclusiveSiteId, siteId), eq(categoriesTable.slug, slug)));
  return row ?? null;
}

export async function runConsolidateSitePrefixCategories(opts?: {
  dryRun?: boolean;
  siteSlugs?: string[];
}): Promise<ConsolidateSitePrefixCategoriesResult> {
  const dryRun = opts?.dryRun === true;
  const result: ConsolidateSitePrefixCategoriesResult = {
    dryRun,
    scanned: 0,
    migrated: 0,
    newsMoved: 0,
    categoriesDeleted: 0,
    categoriesCreated: 0,
    skipped: [],
    actions: [],
  };

  const sites = await db
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      displayName: hmNewsSitesTable.displayName,
    })
    .from(hmNewsSitesTable);
  const siteBySlug = new Map(sites.map((s) => [String(s.slug ?? "").trim().toLowerCase(), s]));
  const allSiteSlugs = sites.map((s) => String(s.slug ?? "").trim().toLowerCase()).filter(Boolean);

  const globals = await db
    .select()
    .from(categoriesTable)
    .where(isNull(categoriesTable.exclusiveSiteId));

  for (const cat of globals) {
    const rawSlug = String(cat.slug ?? "").trim();
    const matchedSiteSlug = categorySlugLooksSitePrefixed(rawSlug, allSiteSlugs);
    if (!matchedSiteSlug) continue;
    if (opts?.siteSlugs?.length && !opts.siteSlugs.map((s) => s.toLowerCase()).includes(matchedSiteSlug)) {
      continue;
    }
    const site = siteBySlug.get(matchedSiteSlug);
    if (!site) continue;

    result.scanned += 1;
    const cleanSlug = deriveCleanCategorySlug(rawSlug, matchedSiteSlug);
    if (!cleanSlug) {
      result.skipped.push({ slug: rawSlug, reason: "temiz slug üretilemedi" });
      continue;
    }

    let target = await findExclusiveCategory(site.id, cleanSlug);
    const cleanName = cleanCategoryDisplayName(String(cat.name ?? ""), String(site.displayName ?? ""), matchedSiteSlug);

    if (!target) {
      result.actions.push(`[+kategori] ${matchedSiteSlug}/${cleanSlug} ← ${rawSlug} (${cleanName})`);
      if (!dryRun) {
        const [maxRow] = await db
          .select({ m: sql<number>`coalesce(max(${categoriesTable.sortOrder}), 0)::int` })
          .from(categoriesTable)
          .where(eq(categoriesTable.exclusiveSiteId, site.id));
        const [created] = await dualWriteInsert(categoriesTable, {
          name: cleanName || cleanSlug,
          slug: cleanSlug,
          color: cat.color ?? "#CC0000",
          exclusiveSiteId: site.id,
          sortOrder: (maxRow?.m ?? 0) + 1,
        });
        target = created ?? null;
        if (target) result.categoriesCreated += 1;
      }
    } else {
      result.actions.push(`[=kategori] ${matchedSiteSlug}/${cleanSlug} mevcut ← ${rawSlug}`);
    }

    if (!target && dryRun) {
      result.migrated += 1;
      continue;
    }
    if (!target) {
      result.skipped.push({ slug: rawSlug, reason: "hedef kategori oluşturulamadı" });
      continue;
    }

    const newsRows = await db
      .select({ id: newsTable.id, siteId: newsTable.siteId })
      .from(newsTable)
      .where(eq(newsTable.categoryId, cat.id));

    const toMove = newsRows.filter((n) => n.siteId == null || n.siteId === site.id);
    if (toMove.length > 0) {
      result.actions.push(`[haber] ${toMove.length} kayıt ${rawSlug} → ${cleanSlug} (site ${site.id})`);
      if (!dryRun) {
        await dualWriteUpdate(
          newsTable,
          { categoryId: target.id },
          inArray(
            newsTable.id,
            toMove.map((n) => n.id),
          ),
        );
      }
      result.newsMoved += toMove.length;
    }

    const remaining = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(eq(newsTable.categoryId, cat.id));
    const remainCnt = remaining[0]?.cnt ?? 0;
    if (remainCnt > 0) {
      result.skipped.push({
        slug: rawSlug,
        reason: `${remainCnt} haber başka sitelerde; global kategori silinmedi`,
      });
      continue;
    }

    result.actions.push(`[-sil] global ${rawSlug}`);
    if (!dryRun) {
      await dualWriteDelete(categoriesTable, eq(categoriesTable.id, cat.id));
    }
    result.categoriesDeleted += 1;
    result.migrated += 1;
  }

  return result;
}
