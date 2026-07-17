import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, inArray, isNull, not, notInArray, or, sql, type SQL } from "drizzle-orm";
import { adminNewsListScopeCondition, propagateAdminNewsDelete } from "../lib/news-delete-propagation.js";
import {
  db as mainDb,
  getNewsDbForRead,
  dualWriteInsert,
  dualWriteUpdate,
  dualWriteDelete,
  newsTable,
  categoriesTable,
  hmMakalelerTable,
  authorsTable,
} from "@workspace/db";
import {
  CreateNewsBody,
  UpdateNewsBody,
} from "@workspace/api-zod";
import { loadNewsContext, slugify } from "../lib/news-context";
import { buildNewsPageBundle, invalidateNewsPageBundleCache, readNewsPageBundleCache, writeNewsPageBundleCache } from "../lib/news-page-bundle.js";
import {
  serializeHmMakaleAsNews,
  serializeHmMakaleListItem,
  serializeNews,
  serializeNewsListItem,
  newsListSelectFields,
} from "../lib/serializers";
import { denyUnlessAdminMaintenance, panelHasPermission } from "../lib/admin-guard";
import { filterHmCategoryContentGuard } from "../lib/hm-category-content-guard.js";
import { getHmHiddenCategoryIds, getHmHiddenCategorySlugs } from "../lib/hm-public-layout";
import { filterPortalAuthorPeerIds, normalizeArticleTitle } from "../lib/hm-sync-source";
import { excludeKoseFromEditorialNewsList } from "../lib/kose-article.js";
import { findPortalCategoryIdsBySlug, findPortalGlobalCategoryBySlug } from "../lib/portal-category-slug.js";
import { enrichSerializedNewsListImages } from "../lib/news-list-image-enrich.js";
import { ensureNewsPublicSubmissionColumns } from "../lib/news-public-submission-schema";
import { deriveNewsTagsFromContent } from "../lib/newsAutoTags.js";
import { scheduleGoogleNewsIndexing } from "../lib/google-news-indexing.js";
import {
  recordNewsSlugRedirectBeforeDelete,
  removeNewsSlugRedirect,
  resolveMissingNewsRedirect,
} from "../lib/news-slug-redirect.js";
import {
  reclassifyNonTurkishNewsToGlobalAll,
  reclassifyNonTurkishNewsToGlobalBatch,
  reclassifyTurkishNewsOutOfGlobalBatch,
  reclassifyTurkishNewsOutOfGlobalAll,
} from "../lib/reclassifyNonTurkishNewsToGlobal.js";
import { recategorizeMisclassifiedSporBatch } from "../lib/recategorizeMisclassifiedSpor.js";
import { loadEditorScopedDbNews, resolveEditorScopedPoolOpts } from "../lib/hybrid-news-merge.js";
import { resolveHmHybridRssAccess } from "../lib/portal-hybrid-config.js";
import { filterGlobalCategoryNewsItems, HM_GLOBAL_NEWS_CATEGORY_SLUG } from "../lib/hm-global-news-category.js";
import { filterCorporatePublicNewsItems, centralNewsRowBelongsToCorporateSite } from "../lib/hm-corporate-news-policy.js";
import { isHmCorporateLayout, parseHmLayoutJson } from "../lib/hm-editor-categories.js";
import { getHmNewsSiteByIdCompat } from "../lib/hm-site-compat.js";

const router: IRouter = Router();

type NewsReadDb = ReturnType<typeof getNewsDbForRead>;

router.use((_req, _res, next) => {
  void ensureNewsPublicSubmissionColumns().then(() => next(), next);
});

async function newsSiteScopeCondition(readDb: NewsReadDb, siteId: number): Promise<SQL> {
  const ownedCategories = await readDb
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.exclusiveSiteId, siteId));
  const ownedCategoryIds = ownedCategories.map((row) => row.id).filter((id) => Number.isFinite(id) && id > 0);
  if (ownedCategoryIds.length === 0) return eq(newsTable.siteId, siteId);
  return or(eq(newsTable.siteId, siteId), and(isNull(newsTable.siteId), inArray(newsTable.categoryId, ownedCategoryIds)))!;
}

async function newsRowBelongsToSite(
  row: typeof newsTable.$inferSelect,
  siteId: number,
  readDb: NewsReadDb,
  isCorporate: boolean,
): Promise<boolean> {
  if (row.siteId === siteId) return true;
  if (row.siteId != null) return false;
  if (isCorporate) {
    if (row.categoryId == null) return false;
    const [cat] = await readDb
      .select({
        exclusiveSiteId: categoriesTable.exclusiveSiteId,
        slug: categoriesTable.slug,
      })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, row.categoryId))
      .limit(1);
    return centralNewsRowBelongsToCorporateSite(
      {
        siteId: row.siteId,
        rssSourceUrl: row.rssSourceUrl,
        categoryExclusiveSiteId: cat?.exclusiveSiteId ?? null,
        categorySlug: cat?.slug ?? null,
      },
      siteId,
    );
  }
  // Haber siteleri: yalnızca exclusive kategori ile bu siteye ait merkez satırlar.
  if (row.categoryId == null) return false;
  const [readCat, mainCat] = await Promise.all([
    readDb
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, row.categoryId), eq(categoriesTable.exclusiveSiteId, siteId)))
      .limit(1),
    mainDb
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, row.categoryId), eq(categoriesTable.exclusiveSiteId, siteId)))
      .limit(1),
  ]);
  return readCat.length > 0 || mainCat.length > 0;
}

async function buildNewsListWhere(readDb: NewsReadDb, opts: {
  q?: string;
  status?: string;
  categorySlug?: string;
  siteId: number;
  authorId: number;
  siteScope: string;
  editorRaw?: string;
  includeHiddenCategories: boolean;
  isFoodRecipe?: boolean;
  foodRecipeCategorySlug?: string;
  /** `/yemek-tarifleri` — isFoodRecipe=true VEYA yemek-tarifleri/recipe kategorisi. */
  recipePageScope?: boolean;
}): Promise<SQL | undefined> {
  const conds: SQL[] = [];
  const hmScoped = Number.isFinite(opts.siteId) && opts.siteId > 0;
  if (!opts.status) conds.push(eq(newsTable.status, "published"));
  if (hmScoped && !opts.includeHiddenCategories) {
    const hiddenSlugs = await getHmHiddenCategorySlugs(opts.siteId);
    if (opts.categorySlug && hiddenSlugs.has(String(opts.categorySlug).trim().toLowerCase())) {
      return sql`false`;
    }
    const hiddenCategoryIds = await getHmHiddenCategoryIds(opts.siteId);
    if (hiddenCategoryIds.length > 0) {
      conds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
    }
  }
  if (opts.q) {
    const pattern = `%${opts.q}%`;
    if (opts.siteScope === "admin") {
      conds.push(
        or(
          ilike(newsTable.title, pattern),
          ilike(newsTable.spot, pattern),
          ilike(newsTable.slug, pattern),
        )!,
      );
    } else {
      conds.push(ilike(newsTable.title, pattern));
    }
  }
  if (opts.status && opts.status !== "all") conds.push(eq(newsTable.status, opts.status));
  if (Number.isFinite(opts.siteId)) conds.push(await newsSiteScopeCondition(readDb, opts.siteId));
  else if (opts.siteScope === "portal") conds.push(isNull(newsTable.siteId));
  else if (opts.siteScope === "admin") conds.push(adminNewsListScopeCondition());
  if (Number.isFinite(opts.authorId)) conds.push(eq(newsTable.authorId, opts.authorId));
  if (opts.editorRaw === "true") conds.push(eq(newsTable.isEditorManual, true));
  if (opts.editorRaw === "false") conds.push(eq(newsTable.isEditorManual, false));
  if (opts.recipePageScope) {
    const recipeSlugs = ["yemek-tarifleri", "recipe"];
    const recipeCatIds = new Set<number>();
    for (const slug of recipeSlugs) {
      const portalIds = await findPortalCategoryIdsBySlug(slug);
      for (const id of portalIds) recipeCatIds.add(id);
      if (hmScoped) {
        const catRows = await readDb
          .select({ id: categoriesTable.id, exclusiveSiteId: categoriesTable.exclusiveSiteId })
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, slug));
        const cat =
          catRows.find((row) => row.exclusiveSiteId === opts.siteId) ??
          catRows.find((row) => row.exclusiveSiteId == null);
        if (cat) recipeCatIds.add(cat.id);
      }
    }
    const recipeParts: SQL[] = [eq(newsTable.isFoodRecipe, true)];
    if (recipeCatIds.size > 0) {
      recipeParts.push(inArray(newsTable.categoryId, [...recipeCatIds]));
    }
    conds.push(or(...recipeParts)!);
  } else {
    if (opts.isFoodRecipe === true) conds.push(eq(newsTable.isFoodRecipe, true));
    if (opts.isFoodRecipe === false) conds.push(eq(newsTable.isFoodRecipe, false));
    if (opts.foodRecipeCategorySlug) {
      conds.push(eq(newsTable.foodRecipeCategorySlug, opts.foodRecipeCategorySlug.trim().toLowerCase()));
    }
  }
  if (opts.categorySlug && !opts.recipePageScope) {
    const portalScoped =
      !hmScoped && (opts.siteScope === "portal" || opts.siteScope === "admin");
    if (portalScoped) {
      const portalCategoryIds = await findPortalCategoryIdsBySlug(opts.categorySlug);
      if (portalCategoryIds.length > 0) conds.push(inArray(newsTable.categoryId, portalCategoryIds));
      else return sql`false`;
    } else {
      const catRows = await readDb
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, opts.categorySlug));
      const cat =
        hmScoped
          ? catRows.find((row) => row.exclusiveSiteId === opts.siteId) ??
            catRows.find((row) => row.exclusiveSiteId == null)
          : catRows.find((row) => row.exclusiveSiteId == null) ?? catRows[0];
      if (cat) conds.push(eq(newsTable.categoryId, cat.id));
      else return sql`false`;
    }
  }
  return conds.length ? and(...conds) : undefined;
}

router.get("/news", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  const offset = Number(req.query.offset ?? 0) || 0;
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const authorIdRaw = req.query.authorId;
  const authorId =
    authorIdRaw !== undefined && authorIdRaw !== null && String(authorIdRaw).trim() !== ""
      ? parseInt(String(authorIdRaw), 10)
      : NaN;
  const editorRaw = typeof req.query.isEditorManual === "string" ? req.query.isEditorManual : undefined;
  /** `portal` = yalnızca merkez (site_id NULL) kayıtlar — `/haberler` ile HM vitrininin karışmaması için. */
  const siteScope = typeof req.query.siteScope === "string" ? req.query.siteScope.trim().toLowerCase() : "";
  const includeHiddenCategories =
    req.query.includeHiddenCategories === "1" ||
    req.query.includeHiddenCategories === "true";
  const isFoodRecipeRaw = typeof req.query.isFoodRecipe === "string" ? req.query.isFoodRecipe.trim().toLowerCase() : "";
  const isFoodRecipe =
    isFoodRecipeRaw === "true" || isFoodRecipeRaw === "1"
      ? true
      : isFoodRecipeRaw === "false" || isFoodRecipeRaw === "0"
        ? false
        : undefined;
  const foodRecipeCategorySlug =
    typeof req.query.foodRecipeCategorySlug === "string" ? req.query.foodRecipeCategorySlug : undefined;
  const recipePageScope =
    req.query.recipePage === "1" ||
    req.query.recipePage === "true" ||
    req.query.recipeScope === "1" ||
    req.query.recipeScope === "true";

  const adminNewsAccess = panelHasPermission(req, "haberler");
  if (!adminNewsAccess && status && status !== "published") {
    res.status(401).json({ error: "Taslak haberler için yönetici oturumu gerekli" });
    return;
  }

  const useEditorScopedPool =
    !adminNewsAccess &&
    Number.isFinite(siteId) &&
    siteId > 0 &&
    siteScope !== "portal" &&
    (!status || status === "published") &&
    !editorRaw &&
    isFoodRecipe === undefined &&
    !foodRecipeCategorySlug &&
    !recipePageScope &&
    !Number.isFinite(authorId);

  if (useEditorScopedPool) {
    const hmAccess = await resolveHmHybridRssAccess(siteId);
    if (hmAccess?.active) {
      const hiddenSlugs = includeHiddenCategories ? new Set<string>() : await getHmHiddenCategorySlugs(siteId);
      const poolOpts = resolveEditorScopedPoolOpts(hmAccess);
      const { items: merged } = await loadEditorScopedDbNews({
        siteId,
        categorySlug,
        q,
        limit: Math.min(limit + offset + 200, 600),
        offset: 0,
        ...poolOpts,
      });
      let filtered = merged;
      if (categorySlug && categorySlug.trim().toLowerCase() === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
        filtered = filterGlobalCategoryNewsItems(filtered);
      }
      if (hmAccess.isCorporate) {
        filtered = filterCorporatePublicNewsItems(filtered, { siteSlug: hmAccess.slug });
      }
      if (hiddenSlugs.size > 0) {
        filtered = filtered.filter(
          (item) => !hiddenSlugs.has(String(item.categorySlug ?? "").trim().toLowerCase()),
        );
      }
      filtered = excludeKoseFromEditorialNewsList(filtered);
      filtered.sort(
        (a, b) =>
          new Date(String(b.createdAt ?? 0)).getTime() -
          new Date(String(a.createdAt ?? 0)).getTime(),
      );
      const totalForResponse = filtered.length;
      const pageItems = filtered.slice(offset, offset + limit);
      if (offset === 0 && !q) {
        res.setHeader("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=300");
      }
      res.json({ items: pageItems, total: totalForResponse });
      return;
    }
  }

  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();
  const where = await buildNewsListWhere(readDb, {
    q,
    status: adminNewsAccess ? status : status ?? "published",
    categorySlug,
    siteId,
    authorId,
    siteScope,
    editorRaw,
    includeHiddenCategories,
    isFoodRecipe,
    foodRecipeCategorySlug,
    recipePageScope,
  });
  const [rows, totalRows] = await Promise.all([
    readDb
      .select(newsListSelectFields)
      .from(newsTable)
      .where(where)
      .orderBy(desc(newsTable.createdAt))
      .limit(limit)
      .offset(offset),
    readDb
      .select({ count: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(where),
  ]);
  let rowsForResponse = rows;
  let totalForResponse = totalRows[0]?.count ?? 0;
  if (
    rowsForResponse.length === 0 &&
    Number.isFinite(siteId) &&
    siteId > 0 &&
    isFoodRecipe === undefined &&
    !foodRecipeCategorySlug &&
    !recipePageScope
  ) {
    const mainWhere = await buildNewsListWhere(mainDb as NewsReadDb, {
      q,
      status: adminNewsAccess ? status : status ?? "published",
      categorySlug,
      siteId,
      authorId,
      siteScope,
      editorRaw,
      includeHiddenCategories,
      isFoodRecipe,
      foodRecipeCategorySlug,
      recipePageScope,
    });
    const [mainRows, mainTotalRows] = await Promise.all([
      mainDb
        .select(newsListSelectFields)
        .from(newsTable)
        .where(mainWhere)
        .orderBy(desc(newsTable.createdAt))
        .limit(limit)
        .offset(offset),
      mainDb
        .select({ count: sql<number>`count(*)::int` })
        .from(newsTable)
        .where(mainWhere),
    ]);
    rowsForResponse = mainRows;
    totalForResponse = mainTotalRows[0]?.count ?? 0;
  }

  const serialized = rowsForResponse.map((r) => serializeNewsListItem(r, ctx));
  const deduped =
    Number.isFinite(authorId) && siteScope === "portal"
      ? (() => {
          const seen = new Set<string>();
          const out: typeof serialized = [];
          for (const item of serialized) {
            const key = normalizeArticleTitle(item.title) || String(item.slug ?? item.id);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(item);
          }
          return out;
        })()
      : serialized;

  const isPublicHmList =
    !adminNewsAccess &&
    (!status || status === "published") &&
    offset === 0 &&
    Number.isFinite(siteId) &&
    siteId > 0 &&
    !q;
  if (isPublicHmList) {
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=300");
  }

  const siteScopedList = Number.isFinite(siteId) && siteId > 0;
  res.json({
    items: siteScopedList ? deduped : await enrichSerializedNewsListImages(deduped),
    total: totalForResponse,
  });
});

router.get("/news/featured", async (req, res): Promise<void> => {
  const ctx = await loadNewsContext();
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const siteScoped = Number.isFinite(siteId) && siteId > 0;
  const includeHiddenCategories =
    req.query.includeHiddenCategories === "1" ||
    req.query.includeHiddenCategories === "true";
  const hiddenCategoryIds = siteScoped && !includeHiddenCategories ? await getHmHiddenCategoryIds(siteId) : [];
  const readDb = getNewsDbForRead();

  const featuredConds: SQL[] = [eq(newsTable.isFeatured, true), eq(newsTable.status, "published")];
  if (siteScoped) featuredConds.push(await newsSiteScopeCondition(readDb, siteId));
  else featuredConds.push(isNull(newsTable.siteId));
  if (hiddenCategoryIds.length > 0) {
    featuredConds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
  }

  const strictFeatured =
    req.query.strict === "1" ||
    req.query.strict === "true" ||
    req.query.strictOnly === "1" ||
    req.query.strictOnly === "true";

  const editorOnlyFeatured =
    req.query.editorOnly === "1" ||
    req.query.editorOnly === "true" ||
    req.query.tepeOnly === "1" ||
    req.query.tepeOnly === "true";

  if (editorOnlyFeatured) {
    featuredConds.push(
      or(eq(newsTable.isEditorManual, true), isNull(newsTable.rssSourceUrl))!,
      or(isNull(newsTable.rssSourceUrl), not(sql`${newsTable.rssSourceUrl} LIKE 'yekpare-hm-pool:%'`))!,
    );
  }

  const limitRaw = req.query.limit;
  const parsedLimit = Number(limitRaw);
  const responseLimit = strictFeatured
    ? 20
    : Math.min(Math.max(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20, 1), 30);

  const featured = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(...featuredConds))
    .orderBy(desc(newsTable.updatedAt), desc(newsTable.createdAt))
    .limit(responseLimit);

  let rows = featured;
  if (!strictFeatured && rows.length < responseLimit) {
    const featuredIds = rows.map((r) => r.id);
    const needed = responseLimit - rows.length;
    const { notInArray } = await import("drizzle-orm");
    const recentConds: SQL[] = [eq(newsTable.status, "published")];
    if (siteScoped) recentConds.push(await newsSiteScopeCondition(readDb, siteId));
    else recentConds.push(isNull(newsTable.siteId));
    if (hiddenCategoryIds.length > 0) {
      recentConds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
    }
    if (featuredIds.length > 0) recentConds.push(notInArray(newsTable.id, featuredIds));
    const recent = await getNewsDbForRead()
      .select(newsListSelectFields)
      .from(newsTable)
      .where(and(...recentConds))
      .orderBy(desc(newsTable.createdAt))
      .limit(needed);
    rows = [...rows, ...recent];
  }

  const enriched = rows.map((r) => {
    const base = serializeNewsListItem(r, ctx);
    const hasImage = Boolean(String(base.imageUrl ?? "").trim());
    return {
      item: base,
      hasImage,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    };
  });
  enriched.sort((a, b) => {
    if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime();
  });

  const featuredItems = excludeKoseFromEditorialNewsList(enriched.map((e) => e.item));
  res.json(siteScoped ? featuredItems : await enrichSerializedNewsListImages(featuredItems));
});

router.get("/news/breaking", async (req, res): Promise<void> => {
  const ctx = await loadNewsContext();
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const scoped = Number.isFinite(siteId) && siteId > 0;
  const readDb = getNewsDbForRead();
  const conds: SQL[] = [eq(newsTable.isBreaking, true), eq(newsTable.status, "published")];
  if (scoped) conds.push(await newsSiteScopeCondition(readDb, siteId));
  else conds.push(isNull(newsTable.siteId));
  if (scoped) {
    const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
    if (hiddenCategoryIds.length > 0) {
      conds.push(or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))!);
    }
  }
  const rows = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(and(...conds))
    .orderBy(desc(newsTable.createdAt))
    .limit(15);
  res.json(rows.map((r) => serializeNewsListItem(r, ctx)));
});

router.get("/news/popular", async (req, res): Promise<void> => {
  const ctx = await loadNewsContext();
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 30);

  if (Number.isFinite(siteId) && siteId > 0) {
    const hiddenCategoryIds = await getHmHiddenCategoryIds(siteId);
    const hiddenCond =
      hiddenCategoryIds.length > 0
        ? or(isNull(newsTable.categoryId), notInArray(newsTable.categoryId, hiddenCategoryIds))
        : undefined;
    const newsWhere = hiddenCond
      ? and(eq(newsTable.status, "published"), await newsSiteScopeCondition(getNewsDbForRead(), siteId), hiddenCond)
      : and(eq(newsTable.status, "published"), await newsSiteScopeCondition(getNewsDbForRead(), siteId));
    const newsRows = await getNewsDbForRead()
      .select(newsListSelectFields)
      .from(newsTable)
      .where(newsWhere)
      .orderBy(desc(newsTable.views))
      .limit(limit);
    const makRows = await getNewsDbForRead()
      .select()
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.status, "published"), eq(hmMakalelerTable.siteId, siteId)))
      .orderBy(desc(hmMakalelerTable.views))
      .limit(limit);
    const merged = [
      ...newsRows.map((r) => serializeNewsListItem(r, ctx)),
      ...makRows.map((m) => serializeHmMakaleListItem(m, ctx)),
    ];
    merged.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    res.json(merged.slice(0, limit));
    return;
  }

  const rows = await getNewsDbForRead()
    .select(newsListSelectFields)
    .from(newsTable)
    .where(eq(newsTable.status, "published"))
    .orderBy(desc(newsTable.views))
    .limit(limit);
  res.json(rows.map((r) => serializeNewsListItem(r, ctx)));
});

const CATEGORY_NEWS_LEGACY_LIMIT = 8;
const CATEGORY_NEWS_PAGE_MAX = 32;

function parseCategoryNewsListQuery(req: { query: unknown }): {
  paged: boolean;
  limit: number;
  offset: number;
  includeTotal: boolean;
} {
  const q = req.query as Record<string, unknown>;
  const includeTotal = q.includeTotal === "1" || q.includeTotal === "true";
  const limitRaw = parseInt(String(q.limit ?? ""), 10);
  const offsetRaw = parseInt(String(q.offset ?? ""), 10);
  const paged =
    includeTotal ||
    (Number.isFinite(limitRaw) && limitRaw > 0) ||
    (Number.isFinite(offsetRaw) && offsetRaw > 0);
  const limit = paged
    ? Math.min(CATEGORY_NEWS_PAGE_MAX, Math.max(1, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : CATEGORY_NEWS_PAGE_MAX))
    : CATEGORY_NEWS_LEGACY_LIMIT;
  const offset = paged && Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
  return { paged, limit, offset, includeTotal: includeTotal || paged };
}

router.get("/news/by-category/:categorySlug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.categorySlug)
    ? req.params.categorySlug[0]
    : req.params.categorySlug;
  if (!slug) {
    res.status(400).json({ error: "categorySlug required" });
    return;
  }
  const { paged, limit, offset, includeTotal } = parseCategoryNewsListQuery(req);
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;

  /** HM editör sitesi: Yekpare havuz + site manuel — GET /api/news ile aynı kapsam. */
  if (Number.isFinite(siteId) && siteId > 0) {
    const hmAccess = await resolveHmHybridRssAccess(siteId);
    if (hmAccess?.active) {
      const hiddenSlugs = await getHmHiddenCategorySlugs(siteId);
  const slugNorm = String(slug).trim().toLowerCase();
      if (slugNorm === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
        res.json(paged ? { items: [], total: 0 } : []);
        return;
      }
      if (hiddenSlugs.has(slugNorm)) {
        res.json(paged ? { items: [], total: 0 } : []);
        return;
      }
      const poolOpts = resolveEditorScopedPoolOpts(hmAccess);
      const { items: merged } = await loadEditorScopedDbNews({
        siteId,
        categorySlug: slug,
        limit: Math.min(limit + offset + 200, 600),
        offset: 0,
        ...poolOpts,
      });
      let filtered = merged;
      if (slugNorm === HM_GLOBAL_NEWS_CATEGORY_SLUG) {
        filtered = filterGlobalCategoryNewsItems(filtered);
      }
      if (hmAccess.isCorporate) {
        filtered = filterCorporatePublicNewsItems(filtered, { siteSlug: hmAccess.slug });
      }
      filtered = filterHmCategoryContentGuard(filtered, slugNorm);
      filtered.sort(
        (a, b) =>
          new Date(String(b.createdAt ?? 0)).getTime() -
          new Date(String(a.createdAt ?? 0)).getTime(),
      );
      const totalForResponse = filtered.length;
      const pageItems = filtered.slice(offset, offset + limit);
      if (paged) {
        res.json({ items: pageItems, total: includeTotal ? totalForResponse : pageItems.length });
        return;
      }
      res.json(pageItems);
      return;
    }
  }

  if (Number.isFinite(siteId) && siteId > 0) {
    const hiddenSlugs = await getHmHiddenCategorySlugs(siteId);
    if (hiddenSlugs.has(String(slug).trim().toLowerCase())) {
      res.json(paged ? { items: [], total: 0 } : []);
      return;
    }
  }

  const cat = await getNewsDbForRead()
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug));

  const ctx = await loadNewsContext();

  const respond = async (catConds: SQL[]) => {
    if (paged) {
      let total = 0;
      if (includeTotal) {
        const [countRow] = await getNewsDbForRead()
          .select({ count: sql<number>`count(*)::int` })
          .from(newsTable)
          .where(and(...catConds));
        total = countRow?.count ?? 0;
      }
      const rows = await getNewsDbForRead()
        .select(newsListSelectFields)
        .from(newsTable)
        .where(and(...catConds))
        .orderBy(desc(newsTable.createdAt))
        .limit(limit)
        .offset(offset);
      let rowsForResponse = rows;
      let totalForResponse = total;
      if (rowsForResponse.length === 0 && Number.isFinite(siteId) && siteId > 0) {
        const mainCats = await mainDb.select().from(categoriesTable).where(eq(categoriesTable.slug, slug));
        const mainCat =
          mainCats.find((row) => row.exclusiveSiteId === siteId) ?? mainCats.find((row) => row.exclusiveSiteId == null);
        if (mainCat) {
          const mainConds = [eq(newsTable.categoryId, mainCat.id), eq(newsTable.status, "published")];
          if (mainCat.exclusiveSiteId === siteId) mainConds.push(or(eq(newsTable.siteId, siteId), isNull(newsTable.siteId))!);
          else mainConds.push(eq(newsTable.siteId, siteId));
          const [mainRows, mainCountRows] = await Promise.all([
            mainDb
              .select(newsListSelectFields)
              .from(newsTable)
              .where(and(...mainConds))
              .orderBy(desc(newsTable.createdAt))
              .limit(limit)
              .offset(offset),
            mainDb.select({ count: sql<number>`count(*)::int` }).from(newsTable).where(and(...mainConds)),
          ]);
          rowsForResponse = mainRows;
          totalForResponse = mainCountRows[0]?.count ?? 0;
        }
      }
      const items = rowsForResponse.map((r) => serializeNewsListItem(r, ctx));
      if (!includeTotal) {
        res.json({ items, total: items.length });
        return;
      }
      res.json({ items, total: totalForResponse });
      return;
    }
    const rows = await getNewsDbForRead()
      .select(newsListSelectFields)
      .from(newsTable)
      .where(and(...catConds))
      .orderBy(desc(newsTable.createdAt))
      .limit(limit);
    if (rows.length > 0 || !Number.isFinite(siteId) || siteId <= 0) {
      res.json(rows.map((r) => serializeNewsListItem(r, ctx)));
      return;
    }
    const mainCats = await mainDb.select().from(categoriesTable).where(eq(categoriesTable.slug, slug));
    const mainCat =
      mainCats.find((row) => row.exclusiveSiteId === siteId) ?? mainCats.find((row) => row.exclusiveSiteId == null);
    if (!mainCat) {
      res.json([]);
      return;
    }
    const mainConds = [eq(newsTable.categoryId, mainCat.id), eq(newsTable.status, "published")];
    if (mainCat.exclusiveSiteId === siteId) mainConds.push(or(eq(newsTable.siteId, siteId), isNull(newsTable.siteId))!);
    else mainConds.push(eq(newsTable.siteId, siteId));
    const mainRows = await mainDb
      .select(newsListSelectFields)
      .from(newsTable)
      .where(and(...mainConds))
      .orderBy(desc(newsTable.createdAt))
      .limit(limit);
    res.json(mainRows.map((r) => serializeNewsListItem(r, ctx)));
  };

  /**
   * HM `blog` kategorisi: yalnızca `news` tablosunda bu kategoriye bağlı yayınlar.
   * Köşe yazıları (`hm_makaleler`) ayrı akıştadır; blog bölümüne karıştırılmaz (yazarlar vitrininde ve haber detayında kalır).
   */
  if (slug === "blog" && Number.isFinite(siteId) && siteId > 0) {
    if (!cat[0]) {
      res.json(paged ? { items: [], total: 0 } : []);
      return;
    }
    const catConds = [
      eq(newsTable.categoryId, cat[0].id),
      eq(newsTable.status, "published"),
      eq(newsTable.siteId, siteId),
    ];
    await respond(catConds);
    return;
  }

  if (!cat[0]) {
    res.json(paged ? { items: [], total: 0 } : []);
    return;
  }

  const catConds = [eq(newsTable.categoryId, cat[0].id), eq(newsTable.status, "published")];
  if (Number.isFinite(siteId) && siteId > 0) {
    if (cat[0].exclusiveSiteId === siteId) {
      catConds.push(or(eq(newsTable.siteId, siteId), isNull(newsTable.siteId))!);
    } else {
      catConds.push(eq(newsTable.siteId, siteId));
    }
  } else {
    catConds.push(isNull(newsTable.siteId));
  }

  await respond(catConds);
});

/**
 * HM sitesinde kaldırılmış / değişmiş slug için yakın yayın (slug öneki veya son haber).
 */
router.get("/news/hm-nearest-slug", async (req, res): Promise<void> => {
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const legacy = String(req.query.slug ?? "").trim();
  if (!Number.isFinite(siteId) || siteId <= 0 || !legacy) {
    res.status(400).json({ error: "siteId and slug required" });
    return;
  }
  const ctx = await loadNewsContext();
  const parts = legacy.split("-").filter(Boolean);
  const keep: string[] = [];
  for (const p of parts) {
    if (/^\d{10,}/.test(p)) break;
    keep.push(p);
  }
  const prefix = keep.join("-").trim();
  let row: typeof newsTable.$inferSelect | undefined;
  if (prefix.length >= 6) {
    [row] = await getNewsDbForRead()
      .select()
      .from(newsTable)
      .where(
        and(
          eq(newsTable.siteId, siteId),
          eq(newsTable.status, "published"),
          ilike(newsTable.slug, `${prefix}%`),
        ),
      )
      .orderBy(desc(newsTable.createdAt))
      .limit(1);
  }
  if (!row) {
    [row] = await getNewsDbForRead()
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.siteId, siteId), eq(newsTable.status, "published")))
      .orderBy(desc(newsTable.createdAt))
      .limit(1);
  }
  if (!row && prefix.length >= 6) {
    const [m] = await getNewsDbForRead()
      .select()
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.siteId, siteId),
          eq(hmMakalelerTable.status, "published"),
          ilike(hmMakalelerTable.slug, `${prefix}%`),
        ),
      )
      .orderBy(desc(hmMakalelerTable.createdAt))
      .limit(1);
    if (m) {
      res.json(serializeHmMakaleAsNews(m, ctx));
      return;
    }
    const [mainM] = await mainDb
      .select()
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.siteId, siteId),
          eq(hmMakalelerTable.status, "published"),
          ilike(hmMakalelerTable.slug, `${prefix}%`),
        ),
      )
      .orderBy(desc(hmMakalelerTable.createdAt))
      .limit(1);
    if (mainM) {
      res.json(serializeHmMakaleAsNews(mainM, ctx));
      return;
    }
  }
  if (!row) {
    const [m2] = await getNewsDbForRead()
      .select()
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.siteId, siteId), eq(hmMakalelerTable.status, "published")))
      .orderBy(desc(hmMakalelerTable.createdAt))
      .limit(1);
    if (m2) {
      res.json(serializeHmMakaleAsNews(m2, ctx));
      return;
    }
    const [mainM2] = await mainDb
      .select()
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.siteId, siteId), eq(hmMakalelerTable.status, "published")))
      .orderBy(desc(hmMakalelerTable.createdAt))
      .limit(1);
    if (mainM2) {
      res.json(serializeHmMakaleAsNews(mainM2, ctx));
      return;
    }
    res.json(null);
    return;
  }
  res.json(serializeNews(row, ctx));
});

/**
 * Silinen / bulunamayan haber slug — HTTP 301 arama yönlendirmesi (Google bot + referrer).
 */
router.get("/news/deleted-redirect/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const siteIdRaw = req.query.siteId;
  const siteSlugRaw = req.query.siteSlug;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : null;
  const siteSlug = String(siteSlugRaw ?? "").trim() || null;
  const scopedSiteId = siteId != null && Number.isFinite(siteId) && siteId > 0 ? siteId : null;
  const redirect = await resolveMissingNewsRedirect(String(raw ?? ""), scopedSiteId, siteSlug);
  if (!redirect) {
    res.status(404).json({ error: "Yönlendirme bulunamadı" });
    return;
  }
  res.redirect(301, redirect.location);
});

/**
 * Sıcak makale bundle önbelleği — popüler haber linkleri (sosyal medya paylaşımı vb.)
 * her istekte 3-5 DB sorgusu tetikliyordu; kısa TTL ile bellekten döner.
 */
router.get("/news/page-bundle/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const siteScoped = Number.isFinite(siteId) && siteId > 0;
  const cacheKey = `${String(raw ?? "")}|${siteScoped ? siteId : 0}`;

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const cached = readNewsPageBundleCache(cacheKey);
  if (cached != null) {
    res.setHeader("X-Yekpare-Cache", "hit");
    res.json(cached);
    return;
  }

  const bundle = await buildNewsPageBundle(String(raw ?? ""), siteScoped ? siteId : null);
  if (!bundle.article) {
    const siteSlugQ = req.query.siteSlug;
    const siteSlug = String(siteSlugQ ?? "").trim() || null;
    const redirect = await resolveMissingNewsRedirect(
      String(raw ?? ""),
      siteScoped ? siteId : null,
      siteSlug,
    );
    if (redirect) {
      writeNewsPageBundleCache(cacheKey, { ...bundle, redirect });
      res.json({ ...bundle, redirect });
      return;
    }
  }
  writeNewsPageBundleCache(cacheKey, bundle);
  res.json(bundle);
});

router.get("/news/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ctx = await loadNewsContext();
  const readDb = getNewsDbForRead();

  const siteIdRaw = req.query.siteId;
  const siteId =
    siteIdRaw !== undefined && siteIdRaw !== null && String(siteIdRaw).trim() !== ""
      ? parseInt(String(siteIdRaw), 10)
      : NaN;
  const siteScoped = Number.isFinite(siteId) && siteId > 0;
  let isCorporate = false;
  if (siteScoped) {
    const site = await getHmNewsSiteByIdCompat(siteId);
    isCorporate = isHmCorporateLayout(parseHmLayoutJson(site?.layoutJson != null ? String(site.layoutJson) : null));
  }

  // Yalnızca tamamen sayısal id — "15-temmuz-..." → 15 yanlış eşleşmesini önle.
  const numericId = /^\d+$/.test(String(raw).trim()) ? parseInt(String(raw).trim(), 10) : NaN;
  let row: typeof newsTable.$inferSelect | undefined;

  if (!Number.isNaN(numericId)) {
    [row] = await readDb
      .select()
      .from(newsTable)
      .where(eq(newsTable.id, numericId));
  }

  if (!row && siteScoped) {
    [row] = await readDb
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.slug, String(raw)), await newsSiteScopeCondition(readDb, siteId)))
      .limit(1);
  }

  if (!row && siteScoped && isCorporate) {
    [row] = await readDb
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.slug, String(raw)), eq(newsTable.siteId, siteId)))
      .limit(1);
  }

  if (!row && !siteScoped) {
    [row] = await readDb
      .select()
      .from(newsTable)
      .where(eq(newsTable.slug, String(raw)));
  }

  let mak: typeof hmMakalelerTable.$inferSelect | undefined;
  if (!row && Number.isFinite(siteId) && siteId > 0) {
    const [m] = await getNewsDbForRead()
      .select()
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.slug, String(raw)), eq(hmMakalelerTable.siteId, siteId)))
      .limit(1);
    if (m && m.status === "published") mak = m;
    if (!mak) {
      const [mainM] = await mainDb
        .select()
        .from(hmMakalelerTable)
        .where(and(eq(hmMakalelerTable.slug, String(raw)), eq(hmMakalelerTable.siteId, siteId)))
        .limit(1);
      if (mainM && mainM.status === "published") mak = mainM;
    }
  }

  if (!row && !mak) {
    if (!Number.isNaN(numericId)) {
      [row] = await mainDb.select().from(newsTable).where(eq(newsTable.id, numericId));
    }
    if (!row && siteScoped && isCorporate) {
      [row] = await mainDb
        .select()
        .from(newsTable)
        .where(and(eq(newsTable.slug, String(raw)), eq(newsTable.siteId, siteId)))
        .limit(1);
    }
    if (!row && !siteScoped) {
      [row] = await mainDb.select().from(newsTable).where(eq(newsTable.slug, String(raw)));
    }
  }

  if (!row && !mak) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  if (mak) {
    await dualWriteUpdate(
      hmMakalelerTable,
      { views: mak.views + 1 },
      eq(hmMakalelerTable.id, mak.id),
    );
    const serialized = serializeHmMakaleAsNews({ ...mak, views: mak.views + 1 }, ctx);
    res.json(serialized);
    return;
  }

  if (siteScoped && !(await newsRowBelongsToSite(row!, siteId, readDb, isCorporate))) {
    res.status(404).json({ error: "News not found" });
    return;
  }
  await dualWriteUpdate(newsTable, { views: row!.views + 1 }, eq(newsTable.id, row!.id));
  const serialized = serializeNews({ ...row!, views: row!.views + 1 }, ctx);
  const isSiteLocal = row!.siteId != null && row!.siteId > 0;
  if (siteScoped || isSiteLocal) {
    res.json(serialized);
    return;
  }
  const [enriched] = await enrichSerializedNewsListImages([serialized]);
  res.json(enriched ?? serialized);
});

router.post("/news", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const parsed = CreateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const ctx = await loadNewsContext();
  let categoryId: number | null = null;
  for (const [id, cat] of ctx.categories) {
    if (cat.slug === data.categorySlug) {
      categoryId = id;
      break;
    }
  }
  const slug = data.slug ?? slugify(data.title);
  let categoryName: string | null = null;
  if (categoryId != null) {
    categoryName = ctx.categories.get(categoryId)?.name ?? null;
  }
  const tags = deriveNewsTagsFromContent({
    title: data.title,
    spot: data.spot,
    content: data.content,
    categoryName,
    categorySlug: data.categorySlug ?? null,
    existingTags: data.tags ?? [],
    minTags: 10,
  });
  const [row] = await dualWriteInsert(newsTable, {
    title: data.title,
    slug,
    spot: data.spot ?? null,
    content: data.content ?? null,
    imageUrl: data.imageUrl ?? null,
    categoryId,
    authorId: data.authorId ?? null,
    senderFullName: data.senderFullName ?? null,
    senderEmail: data.senderEmail ?? null,
    senderPhone: data.senderPhone ?? null,
    status: data.status,
    isFeatured: data.isFeatured ?? false,
    isSiteManset: data.isSiteManset ?? false,
    isBreaking: data.isBreaking ?? false,
    tags,
    isEditorManual: true,
    isFoodRecipe: data.isFoodRecipe ?? false,
    foodRecipeCategorySlug: data.isFoodRecipe ? (data.foodRecipeCategorySlug?.trim().toLowerCase() || null) : null,
  });
  if (row) {
    void removeNewsSlugRedirect(row.slug, row.siteId ?? null).catch(() => {});
    scheduleGoogleNewsIndexing(row);
  }
  res.status(201).json(serializeNews(row, ctx));
});

router.put("/news/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const ctx = await loadNewsContext();
  let categoryId: number | null = null;
  for (const [cid, cat] of ctx.categories) {
    if (cat.slug === data.categorySlug) {
      categoryId = cid;
      break;
    }
  }
  let categoryName: string | null = null;
  if (categoryId != null) {
    categoryName = ctx.categories.get(categoryId)?.name ?? null;
  }
  const tags = deriveNewsTagsFromContent({
    title: data.title,
    spot: data.spot,
    content: data.content,
    categoryName,
    categorySlug: data.categorySlug ?? null,
    existingTags: data.tags ?? [],
    minTags: 10,
  });
  const [row] = await dualWriteUpdate(
    newsTable,
    {
      title: data.title,
      slug: data.slug ?? slugify(data.title),
      spot: data.spot ?? null,
      content: data.content ?? null,
      imageUrl: data.imageUrl ?? null,
      categoryId,
      authorId: data.authorId ?? null,
      senderFullName: data.senderFullName ?? null,
      senderEmail: data.senderEmail ?? null,
      senderPhone: data.senderPhone ?? null,
      status: data.status,
      isFeatured: data.isFeatured ?? false,
      isSiteManset: data.isSiteManset ?? false,
      isBreaking: data.isBreaking ?? false,
      tags,
      isFoodRecipe: data.isFoodRecipe ?? false,
      foodRecipeCategorySlug: data.isFoodRecipe ? (data.foodRecipeCategorySlug?.trim().toLowerCase() || null) : null,
    },
    eq(newsTable.id, id),
  );
  if (!row) {
    res.status(404).json({ error: "News not found" });
    return;
  }
  void removeNewsSlugRedirect(row.slug, row.siteId ?? null).catch(() => {});
  scheduleGoogleNewsIndexing(row);
  invalidateNewsPageBundleCache({ slug: row.slug, siteId: row.siteId });
  res.json(serializeNews(row, ctx));
});

/** Türkçe olmayan haberleri global kategoriye taşır (news + portal RSS havuzu). */
router.post("/news/reclassify-non-turkish-to-global", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body ?? {}) as { limit?: number; dryRun?: boolean; all?: boolean };
  const dryRun = body.dryRun === true;
  const limit = Math.min(10_000, Math.max(1, Number(body.limit) || 2000));
  try {
    const turkishOut = body.all
      ? await reclassifyTurkishNewsOutOfGlobalAll({ batchSize: limit, dryRun })
      : await reclassifyTurkishNewsOutOfGlobalBatch({ limit, dryRun });
    const result = body.all
      ? await reclassifyNonTurkishNewsToGlobalAll({ batchSize: limit, dryRun })
      : await reclassifyNonTurkishNewsToGlobalBatch({ limit, dryRun });
    res.json({ ok: true, dryRun, turkishOutOfGlobal: turkishOut, ...result });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Yeniden sınıflandırma başarısız",
    });
  }
});

/** Spor kategorisinde yanlış etiketlenmiş (spor sinyali olmayan) haberleri gündem'e taşır. */
router.post("/news/reclassify-spor-misfits", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body ?? {}) as { limit?: number; dryRun?: boolean };
  const dryRun = body.dryRun === true;
  const limit = Math.min(10_000, Math.max(1, Number(body.limit) || 2000));
  try {
    const result = await recategorizeMisclassifiedSporBatch({ limit, dryRun });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Spor→gündem düzeltmesi başarısız",
    });
  }
});

router.post("/news/bulk-category", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = req.body as { ids?: unknown; categorySlug?: unknown };
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids dizisi gerekli" });
    return;
  }
  const categorySlug = typeof body.categorySlug === "string" ? body.categorySlug.trim().toLowerCase() : "";
  if (!categorySlug) {
    res.status(400).json({ error: "categorySlug gerekli" });
    return;
  }
  const numIds = ids.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (numIds.length === 0) {
    res.status(400).json({ error: "Geçerli id yok" });
    return;
  }
  const ctx = await loadNewsContext();
  let categoryId: number | null = null;
  for (const [cid, cat] of ctx.categories) {
    if (cat.slug === categorySlug) {
      categoryId = cid;
      break;
    }
  }
  if (categoryId == null) {
    res.status(400).json({ error: "Geçerli kategori bulunamadı" });
    return;
  }
  const updated = await dualWriteUpdate(newsTable, { categoryId }, inArray(newsTable.id, numIds));
  res.json({ updated: updated.length });
});

router.delete("/news/bulk", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const { ids } = req.body as { ids: unknown };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }
  const numIds = (ids as unknown[]).map(id => parseInt(String(id), 10)).filter(id => !Number.isNaN(id));
  if (numIds.length === 0) {
    res.status(400).json({ error: "No valid ids" });
    return;
  }
  for (const nid of numIds) {
    await recordNewsSlugRedirectBeforeDelete(nid);
    await propagateAdminNewsDelete(nid);
  }
  res.json({ deleted: numIds.length });
});

router.delete("/news/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await recordNewsSlugRedirectBeforeDelete(id);
  await propagateAdminNewsDelete(id);
  res.sendStatus(204);
});

export default router;
