import { Router, type IRouter } from "express";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import {
  bulkImportHmRssNewsToSite,
  deleteHmRssNewsItem,
  getHmRssNewsDetail,
  importHmRssNewsToSite,
  listHmRssNewsForManagement,
  normalizeRssCacheItemId,
  refreshHmSiteRssFeedsForEditor,
  removeHmRssNewsFromSite,
  removeYekparePoolNewsFromSite,
} from "../lib/hm-rss-news-service.js";
import jwt from "jsonwebtoken";
import { getHmEditorJwtSecret } from "../lib/secrets.js";

const router: IRouter = Router();

const JWT_TYP = "hm_editor";

function parseHmEditor(req: { headers: { authorization?: string } }): { editorId: number; siteId: number } | null {
  const h = String(req.headers.authorization ?? "").trim();
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  try {
    const p = jwt.verify(token, getHmEditorJwtSecret()) as { typ?: string; eid?: number; sid?: number };
    if (p.typ !== JWT_TYP || typeof p.eid !== "number" || typeof p.sid !== "number") return null;
    return { editorId: p.eid, siteId: p.sid };
  } catch {
    return null;
  }
}

function denyUnlessHmEditor(
  req: { headers: { authorization?: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } },
): { editorId: number; siteId: number } | null {
  const x = parseHmEditor(req);
  if (!x) {
    res.status(401).json({ error: "Editör oturumu gerekli (Bearer token)." });
    return null;
  }
  return x;
}

router.get("/hm/editor/rss-news", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const categorySlug =
    typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim().toLowerCase() : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const limit = Math.min(Number(req.query.limit ?? 300) || 300, 500);
  const rssScopeRaw = String((req.query as { rssScope?: string }).rssScope ?? "all").trim().toLowerCase();
  const rssScope = rssScopeRaw === "box" ? "box" : rssScopeRaw === "site" ? "site" : "all";
  try {
    const data = await listHmRssNewsForManagement({
      siteId: ctx.siteId,
      categorySlug: categorySlug || undefined,
      q,
      limit,
      rssScope,
    });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haberleri alınamadı" });
  }
});

router.post("/hm/editor/rss-feeds/refresh", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  try {
    const result = await refreshHmSiteRssFeedsForEditor(ctx.siteId);
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS beslemeleri yenilenemedi" });
  }
});

router.get("/hm/editor/rss-news/:itemId", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  try {
    const detail = await getHmRssNewsDetail(ctx.siteId, req.params.itemId);
    if (!detail) {
      res.status(404).json({ error: "RSS haberi bulunamadı" });
      return;
    }
    res.json(detail);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haber detayı alınamadı" });
  }
});

router.post("/hm/editor/rss-news/:itemId/import", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const body = req.body as {
    title?: unknown;
    spot?: unknown;
    content?: unknown;
    categorySlug?: unknown;
    status?: unknown;
  };
  try {
    const result = await importHmRssNewsToSite(ctx.siteId, req.params.itemId, {
      title: typeof body.title === "string" ? body.title : undefined,
      spot: typeof body.spot === "string" ? body.spot : body.spot === null ? null : undefined,
      content: typeof body.content === "string" ? body.content : body.content === null ? null : undefined,
      categorySlug: typeof body.categorySlug === "string" ? body.categorySlug : undefined,
      status: body.status === "draft" ? "draft" : "published",
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(result.skipped ? 200 : 201).json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haberi kaydedilemedi" });
  }
});

router.post("/hm/editor/rss-news/bulk-import", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const body = req.body as {
    items?: Array<{ rssItemId?: unknown; categorySlug?: unknown; status?: unknown }>;
    categorySlug?: unknown;
    status?: unknown;
  };
  const defaultCategorySlug = typeof body.categorySlug === "string" ? body.categorySlug.trim() : "";
  const defaultStatus = body.status === "draft" ? "draft" : "published";
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const rows = rawItems
    .map((row) => ({
      rssItemId: normalizeRssCacheItemId(row.rssItemId),
      categorySlug:
        (typeof row.categorySlug === "string" ? row.categorySlug.trim() : "") || defaultCategorySlug || undefined,
      status: (row.status === "draft" ? "draft" : defaultStatus) as "published" | "draft",
    }))
    .filter((row) => row.rssItemId.length > 0);

  if (rows.length === 0) {
    res.status(400).json({ error: "items dizisi gerekli" });
    return;
  }

  try {
    const result = await bulkImportHmRssNewsToSite(ctx.siteId, rows);
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Toplu kayıt başarısız" });
  }
});

router.delete("/hm/editor/rss-news/:itemId", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  try {
    const result = await removeHmRssNewsFromSite(ctx.siteId, req.params.itemId);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haberi siteden kaldırılamadı" });
  }
});

router.delete("/hm/editor/yekpare-pool/:articleId", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  try {
    const result = await removeYekparePoolNewsFromSite(ctx.siteId, req.params.articleId);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Haber siteden kaldırılamadı" });
  }
});

router.get("/admin/rss-news", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const categorySlug =
    typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim().toLowerCase() : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  const limit = Math.min(Number(req.query.limit ?? 300) || 300, 500);
  const rssScopeRaw = String((req.query as { rssScope?: string }).rssScope ?? "all").trim().toLowerCase();
  const rssScope = rssScopeRaw === "box" ? "box" : rssScopeRaw === "site" ? "site" : "all";
  try {
    const data = await listHmRssNewsForManagement({
      siteId,
      categorySlug: categorySlug || undefined,
      q,
      limit,
      rssScope,
    });
    res.json(data);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haberleri alınamadı" });
  }
});

router.get("/admin/rss-news/:itemId", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  try {
    const detail = await getHmRssNewsDetail(siteId, req.params.itemId);
    if (!detail) {
      res.status(404).json({ error: "RSS haberi bulunamadı" });
      return;
    }
    res.json(detail);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haber detayı alınamadı" });
  }
});

router.post("/admin/rss-news/:itemId/import", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = req.body as {
    title?: unknown;
    spot?: unknown;
    content?: unknown;
    categorySlug?: unknown;
    status?: unknown;
    siteId?: unknown;
  };
  const siteIdRaw = Number(body.siteId ?? req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  try {
    const result = await importHmRssNewsToSite(siteId, req.params.itemId, {
      title: typeof body.title === "string" ? body.title : undefined,
      spot: typeof body.spot === "string" ? body.spot : body.spot === null ? null : undefined,
      content: typeof body.content === "string" ? body.content : body.content === null ? null : undefined,
      categorySlug: typeof body.categorySlug === "string" ? body.categorySlug : undefined,
      status: body.status === "draft" ? "draft" : "published",
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(result.skipped ? 200 : 201).json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haberi kaydedilemedi" });
  }
});

router.post("/admin/rss-news/bulk-import", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const body = req.body as {
    items?: Array<{ rssItemId?: unknown; categorySlug?: unknown; status?: unknown }>;
    categorySlug?: unknown;
    status?: unknown;
    siteId?: unknown;
  };
  const siteIdRaw = Number(body.siteId ?? req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  const defaultCategorySlug = typeof body.categorySlug === "string" ? body.categorySlug.trim() : "";
  const defaultStatus = body.status === "draft" ? "draft" : "published";
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const rows = rawItems
    .map((row) => ({
      rssItemId: normalizeRssCacheItemId(row.rssItemId),
      categorySlug:
        (typeof row.categorySlug === "string" ? row.categorySlug.trim() : "") || defaultCategorySlug || undefined,
      status: (row.status === "draft" ? "draft" : defaultStatus) as "published" | "draft",
    }))
    .filter((row) => row.rssItemId.length > 0);

  if (rows.length === 0) {
    res.status(400).json({ error: "items dizisi gerekli" });
    return;
  }

  try {
    const result = await bulkImportHmRssNewsToSite(siteId, rows);
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Toplu kayıt başarısız" });
  }
});

router.delete("/admin/rss-news/:itemId", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const siteIdRaw = Number(req.query.siteId ?? 0);
  const siteId = Number.isFinite(siteIdRaw) && siteIdRaw > 0 ? siteIdRaw : null;
  try {
    const result = await deleteHmRssNewsItem(siteId, req.params.itemId);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS haberi silinemedi" });
  }
});

export default router;
