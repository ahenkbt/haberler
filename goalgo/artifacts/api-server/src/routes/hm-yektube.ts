import { Router, type IRouter } from "express";
import {
  HM_YEKTUBE_CATALOG_CACHE_CONTROL,
  HM_YEKTUBE_HOP_HEADER,
  emptyHmYektubeCatalog,
  hmYektubeCategoriesFallback,
  loadHmYektubeCatalog,
  parseHmYektubeCatalogQuery,
} from "../lib/hmYektubeCatalog.js";

const router: IRouter = Router();

router.get("/hm/yektube/categories", (_req, res): void => {
  res.setHeader("Cache-Control", HM_YEKTUBE_CATALOG_CACHE_CONTROL);
  res.setHeader("X-Yekpare-Hm-Yektube", "categories");
  res.json({ items: hmYektubeCategoriesFallback(), persistedToNews: false });
});

router.get("/hm/yektube/videos", async (req, res): Promise<void> => {
  const query = parseHmYektubeCatalogQuery({
    categorySlug: typeof req.query.categorySlug === "string" ? req.query.categorySlug : null,
    limit: typeof req.query.limit === "string" ? req.query.limit : null,
    seed: typeof req.query.seed === "string" ? req.query.seed : null,
  });
  const hopSeen = String(req.get(HM_YEKTUBE_HOP_HEADER) ?? "") === "1";
  res.setHeader("Cache-Control", HM_YEKTUBE_CATALOG_CACHE_CONTROL);
  res.setHeader("X-Yekpare-Hm-Yektube", "videos");
  try {
    const body = await loadHmYektubeCatalog(query, { hopSeen });
    res.json(body);
  } catch {
    res.json(emptyHmYektubeCatalog());
  }
});

export default router;
