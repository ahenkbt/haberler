import { Router, type IRouter } from "express";
import { and, asc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, categoriesTable, hmNewsSitesTable, newsTable } from "@workspace/db";
import { mergeCategories } from "../lib/category-merge";
import { CreateCategoryBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { canListAllNewsCategories, denyUnlessAdminMaintenance } from "../lib/admin-guard";
import {
  normalizeNewsCategorySlug,
  parseHmCategorySortSlugsFromLayoutJson,
  sortNewsCategoriesForDisplay,
} from "../lib/categorySort";
import {
  categorySlugLooksSitePrefixed,
  filterHmPublicCategoryRows,
  formatAdminCategoryDisplayName,
  hmPublicCategoriesWhere,
  parseHiddenCategorySlugsFromLayout,
  parseHmLayoutJson,
} from "../lib/hm-editor-categories";
import { runConsolidateSitePrefixCategories } from "../lib/consolidate-site-prefix-categories";
import { ensureHmStandardNewsCategories } from "../lib/hm-standard-news-categories";
import { sanitizeDisplayText } from "../lib/sanitizeDisplayText.js";
import { invalidateNewsContextCache } from "../lib/news-context.js";

const router: IRouter = Router();

/** node-postgres / Drizzle zincirinden Postgres code + message çıkar */
function postgresMeta(err: unknown): { code?: string; message?: string } {
  let cur: unknown = err;
  for (let depth = 0; depth < 8 && cur != null; depth++) {
    if (typeof cur === "object") {
      const o = cur as Record<string, unknown>;
      const code = typeof o.code === "string" ? o.code : undefined;
      const message = typeof o.message === "string" ? o.message : undefined;
      if (code || message) return { code, message };
      cur = o.cause ?? o.originalError ?? o.error;
    } else break;
  }
  return {};
}

function parseHmSiteIdsForCategoryFilter(req: { query: unknown }): number[] {
  const q = req.query as Record<string, unknown>;
  const rawList = typeof q.siteIds === "string" ? q.siteIds : "";
  if (rawList.trim()) {
    return rawList
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  const sid = q.siteId;
  if (sid !== undefined && sid !== null && String(sid).trim() !== "") {
    const n = parseInt(String(sid), 10);
    if (Number.isFinite(n) && n > 0) return [n];
  }
  return [];
}

router.get("/categories", async (req, res): Promise<void> => {
  const listAll =
    String((req.query as { scope?: string }).scope ?? "").toLowerCase() === "admin" &&
    canListAllNewsCategories(req);

  let exclusiveWhere: SQL | undefined;
  const siteIds = parseHmSiteIdsForCategoryFilter(req);

  if (!listAll) {
    if (siteIds.length === 1) {
      const [siteRow] = await db
        .select({ layoutJson: hmNewsSitesTable.layoutJson })
        .from(hmNewsSitesTable)
        .where(eq(hmNewsSitesTable.id, siteIds[0]!));
      const layout = parseHmLayoutJson(siteRow?.layoutJson != null ? String(siteRow.layoutJson) : null);
      exclusiveWhere = hmPublicCategoriesWhere(siteIds[0]!, layout);
    } else if (siteIds.length > 1) {
      exclusiveWhere = or(isNull(categoriesTable.exclusiveSiteId), inArray(categoriesTable.exclusiveSiteId, siteIds));
    } else {
      exclusiveWhere = isNull(categoriesTable.exclusiveSiteId);
    }
  }

  const base = db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      color: categoriesTable.color,
      exclusiveSiteId: categoriesTable.exclusiveSiteId,
      sortOrder: categoriesTable.sortOrder,
    })
    .from(categoriesTable);
  let categories = await (exclusiveWhere ? base.where(exclusiveWhere) : base).orderBy(
    asc(categoriesTable.sortOrder),
    asc(categoriesTable.id),
  );

  if (siteIds.length === 1) {
    const [siteRow] = await db
      .select({ layoutJson: hmNewsSitesTable.layoutJson, slug: hmNewsSitesTable.slug })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.id, siteIds[0]!));
    const siteSlug = String(siteRow?.slug ?? "").trim().toLowerCase();
    const layout = parseHmLayoutJson(siteRow?.layoutJson != null ? String(siteRow.layoutJson) : null);
    const hiddenSlugs = parseHiddenCategorySlugsFromLayout(layout);
    categories = filterHmPublicCategoryRows(categories, siteIds[0]!, siteSlug, layout);
    categories = ensureHmStandardNewsCategories(categories, layout, hiddenSlugs);
    const sortSlugs = parseHmCategorySortSlugsFromLayoutJson(
      siteRow?.layoutJson != null ? String(siteRow.layoutJson) : null,
    );
    if (sortSlugs) {
      categories = sortNewsCategoriesForDisplay(categories, sortSlugs);
    }
  }

  const countRows = await db
    .select({
      categoryId: newsTable.categoryId,
      cnt: sql<number>`count(*)::int`,
    })
    .from(newsTable)
    .where(isNotNull(newsTable.categoryId))
    .groupBy(newsTable.categoryId);

  const newsCountByCategoryId = new Map<number, number>();
  for (const r of countRows) {
    if (r.categoryId != null) newsCountByCategoryId.set(r.categoryId, r.cnt);
  }

  let siteNameById = new Map<number, string>();
  let siteDisplayNameBySlug = new Map<string, string>();
  let hmSiteSlugs: string[] = [];
  if (listAll) {
    const hmSites = await db
      .select({ id: hmNewsSitesTable.id, displayName: hmNewsSitesTable.displayName, slug: hmNewsSitesTable.slug })
      .from(hmNewsSitesTable);
    siteNameById = new Map(hmSites.map((s) => [s.id, String(s.displayName ?? s.slug ?? `#${s.id}`).trim()]));
    siteDisplayNameBySlug = new Map(
      hmSites.map((s) => [String(s.slug ?? "").trim().toLowerCase(), String(s.displayName ?? s.slug ?? "").trim()]),
    );
    hmSiteSlugs = hmSites.map((s) => String(s.slug ?? "").trim().toLowerCase()).filter(Boolean);
  }

  const rows = categories.map((c) => ({
    ...c,
    name: sanitizeDisplayText(c.name),
    newsCount: newsCountByCategoryId.get(c.id) ?? 0,
    ...(listAll
      ? {
          name: sanitizeDisplayText(formatAdminCategoryDisplayName(c, siteNameById, siteDisplayNameBySlug, hmSiteSlugs)),
          exclusiveSiteName:
            c.exclusiveSiteId != null ? sanitizeDisplayText(siteNameById.get(c.exclusiveSiteId) ?? "") || null : null,
          looksSitePrefixedGlobal:
            c.exclusiveSiteId == null ? categorySlugLooksSitePrefixed(c.slug, hmSiteSlugs) != null : false,
        }
      : {}),
  }));

  res.json(rows);
});

router.post("/categories", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    /** Siteye özel kategoriler yalnızca HM editör API’sinden açılır; merkez panel her zaman genel kategori ekler. */
    const [row] = await db
      .insert(categoriesTable)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        color: parsed.data.color,
        exclusiveSiteId: null,
      })
      .returning();
    if (!row) {
      res.status(500).json({ error: "Kayıt oluşturulamadı" });
      return;
    }
    invalidateNewsContextCache();
    res.status(201).json({ ...row, newsCount: 0 });
  } catch (err: unknown) {
    const { code, message } = postgresMeta(err);
    if (code === "23505") {
      res.status(409).json({ error: "Bu slug zaten kullanılıyor" });
      return;
    }
    if (code === "42P01") {
      logger.error({ err, code, message }, "POST /categories: tablo yok");
      res.status(503).json({
        error:
          "Veritabanında «categories» tablosu yok. Railway Postgres için lib/db/migrations SQL şemasını uygulayın veya drizzle push kullanın.",
      });
      return;
    }
    if (code === "42501") {
      logger.error({ err, code, message }, "POST /categories: yetki");
      res.status(503).json({
        error: "Veritabanı izni yetersiz (categories). Railway DATABASE_URL kullanıcısının tabloya yazma yetkisi olmalı.",
      });
      return;
    }
    logger.error({ err, code, message }, "POST /categories failed");
    res.status(500).json({
      error: "Kategori eklenemedi",
      ...(process.env.API_VERBOSE_ERRORS === "1" && message
        ? { detail: message }
        : {}),
    });
  }
});

router.put("/categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz kategori id" });
    return;
  }
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [existing] = await db
      .select({ id: categoriesTable.id, exclusiveSiteId: categoriesTable.exclusiveSiteId })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Kategori bulunamadı" });
      return;
    }
    const [row] = await db
      .update(categoriesTable)
      .set({
        name: parsed.data.name,
        slug: parsed.data.slug,
        color: parsed.data.color,
        exclusiveSiteId: existing.exclusiveSiteId ?? null,
      })
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!row) {
      res.status(500).json({ error: "Güncellenemedi" });
      return;
    }
    const [cntRow] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(eq(newsTable.categoryId, id));
    const newsCount = cntRow?.cnt ?? 0;
    invalidateNewsContextCache();
    res.json({ ...row, newsCount });
  } catch (err: unknown) {
    const { code, message } = postgresMeta(err);
    if (code === "23505") {
      res.status(409).json({ error: "Bu slug başka bir kategoride kullanılıyor" });
      return;
    }
    logger.error({ err, code, message }, "PUT /categories/:id failed");
    res.status(500).json({
      error: "Kategori güncellenemedi",
      ...(process.env.API_VERBOSE_ERRORS === "1" && message ? { detail: message } : {}),
    });
  }
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  invalidateNewsContextCache();
  res.sendStatus(204);
});

/** Siteye özel bir kategoriyi GENEL (shared) kategoriye yükseltir (promote). */
router.post("/categories/:id/promote", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz kategori id" });
    return;
  }
  try {
    const [existing] = await db
      .select({ id: categoriesTable.id, slug: categoriesTable.slug, exclusiveSiteId: categoriesTable.exclusiveSiteId })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Kategori bulunamadı" });
      return;
    }
    if (existing.exclusiveSiteId == null) {
      res.json({ ...existing, alreadyGeneral: true });
      return;
    }
    const [conflict] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.slug, existing.slug), isNull(categoriesTable.exclusiveSiteId)));
    if (conflict) {
      res.status(409).json({ error: "Aynı slug ile genel bir kategori zaten var" });
      return;
    }
    const [row] = await db
      .update(categoriesTable)
      .set({ exclusiveSiteId: null })
      .where(eq(categoriesTable.id, id))
      .returning();
    res.json({ ...row, promoted: true });
  } catch (err: unknown) {
    const { code, message } = postgresMeta(err);
    logger.error({ err, code, message }, "POST /categories/:id/promote failed");
    res.status(500).json({ error: "Kategori yükseltilemedi" });
  }
});

/**
 * Kategori birleştirme (merge). Birden çok kaynağı bir hedefe taşır.
 * body: { sourceIds: number[], targetId?: number, targetName?: string, targetSlug?: string, makeGeneral?: boolean }
 */
router.post("/categories/merge", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = (req.body ?? {}) as {
    sourceIds?: unknown;
    targetId?: unknown;
    targetName?: unknown;
    targetSlug?: unknown;
    makeGeneral?: unknown;
  };
  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.map((v) => parseInt(String(v), 10)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (sourceIds.length === 0) {
    res.status(400).json({ error: "En az bir kaynak kategori gerekli" });
    return;
  }
  try {
    const result = await mergeCategories({
      sourceIds,
      targetId: Number.isFinite(parseInt(String(body.targetId), 10)) ? parseInt(String(body.targetId), 10) : null,
      targetName: typeof body.targetName === "string" ? body.targetName : null,
      targetSlug: typeof body.targetSlug === "string" ? body.targetSlug : null,
      makeGeneral: body.makeGeneral === true,
      restrictSiteId: null,
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    invalidateNewsContextCache();
    res.json(result);
  } catch (err: unknown) {
    const { code, message } = postgresMeta(err);
    logger.error({ err, code, message }, "POST /categories/merge failed");
    res.status(500).json({ error: "Kategoriler birleştirilemedi" });
  }
});

/** Site slug önekli yanlış global kategorileri siteye özel kategorilere taşır (ör. vkd-faaliyetlerimiz). */
router.post("/categories/consolidate-site-prefix", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = req.body as { dryRun?: unknown; siteSlugs?: unknown };
  const dryRun = body.dryRun === true || String(body.dryRun ?? "").toLowerCase() === "true";
  const siteSlugs = Array.isArray(body.siteSlugs)
    ? body.siteSlugs.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
    : undefined;
  try {
    const result = await runConsolidateSitePrefixCategories({ dryRun, siteSlugs });
    res.json(result);
  } catch (err: unknown) {
    logger.error({ err }, "POST /categories/consolidate-site-prefix failed");
    res.status(500).json({
      error: "Kategori birleştirme başarısız",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
