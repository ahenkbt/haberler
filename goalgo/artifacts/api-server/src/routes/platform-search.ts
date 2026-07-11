import { Router, type IRouter } from "express";
import { fetchDdgMediaSearch } from "../lib/ddg-media-search.js";
import { buildUnifiedSearchAiPayload } from "../lib/geminiSearchService.js";
import { runGroupedUnifiedSearch, runPlatformUnifiedSearch } from "../lib/platform-unified-search.js";
import { runSearchSuggest } from "../lib/search-suggest.js";
import { runDailyTrends } from "../lib/search-trends.js";

const router: IRouter = Router();

function parseSearchQuery(req: { query: Record<string, unknown> }) {
  return String(req.query.q ?? req.query.search ?? "").trim();
}

/** GET /search/trends — günlük Google Trends (TR), 24s önbellek */
router.get("/search/trends", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  try {
    const force = String(req.query.refresh ?? "") === "1";
    const payload = await runDailyTrends(force);
    res.json({ success: true, ...payload });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err), categories: [] });
  }
});

/** GET /search/suggest?q=&limit=8 — Google tarzı hızlı öneriler */
router.get("/search/suggest", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
  try {
    const q = parseSearchQuery(req);
    const limit = Math.min(parseInt(String(req.query.limit ?? "8"), 10) || 8, 12);
    const payload = await runSearchSuggest({ q, limit });
    res.json({ success: true, ...payload });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err), suggestions: [] });
  }
});

/** GET /search/media?q= — DuckDuckGo görsel + video (Görsel/Video sekmeleri) */
router.get("/search/media", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
  try {
    const q = parseSearchQuery(req);
    if (!q) {
      res.json({ success: true, query: "", images: [], videos: [], source: "duckduckgo" });
      return;
    }
    const imageLimit = Math.min(parseInt(String(req.query.imageLimit ?? "24"), 10) || 24, 36);
    const videoLimit = Math.min(parseInt(String(req.query.videoLimit ?? "12"), 10) || 12, 24);
    const payload = await fetchDdgMediaSearch(q, { imageLimit, videoLimit, timeoutMs: 7_000 });
    res.json({
      success: true,
      query: q,
      source: "duckduckgo",
      images: payload.images.map((item) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        thumbnailUrl: item.thumbnailUrl,
        title: item.title,
        pageUrl: item.pageUrl,
        source: item.source,
      })),
      videos: payload.videos.map((item) => ({
        id: item.id,
        title: item.title,
        thumbnailUrl: item.thumbnailUrl,
        videoUrl: item.videoUrl,
        source: item.source,
        duration: item.duration,
        publisher: item.publisher,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err), images: [], videos: [] });
  }
});

/** GET /search/ai?q= — Yekpare AI sekmesi: Gemini web grounding özeti (ayrı bütçe) */
router.get("/search/ai", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const q = parseSearchQuery(req);
    if (!q) {
      res.json({
        success: true,
        query: "",
        aiSummary: null,
        internetSearchEnabled: false,
      });
      return;
    }
    const budgetMs = Math.min(
      Math.max(parseInt(String(req.query.budgetMs ?? "15000"), 10) || 15_000, 5_000),
      25_000,
    );
    const payload = await buildUnifiedSearchAiPayload(q, { budgetMs });
    res.json({
      success: true,
      query: q,
      aiSummary: payload.aiSummary,
      aiModel: payload.model,
      internetSearchEnabled: payload.enabled,
      searchMeta: { ai: payload.meta },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err), aiSummary: null });
  }
});

/** GET /search/unified?q=&city=&perSection=8 — gruplu site geneli arama */
router.get("/search/unified", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const q = parseSearchQuery(req);
    const city = String(req.query.city ?? "").trim();
    const perSection = Math.min(parseInt(String(req.query.perSection ?? "8"), 10) || 8, 24);

    if (!q) {
      res.json({
        success: true,
        query: "",
        sections: [],
        totalResults: 0,
        aiSummary: null,
        internetSearchEnabled: false,
      });
      return;
    }

    const payload = await runGroupedUnifiedSearch({ q, city, perSection });
    res.json({ success: true, ...payload });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err), sections: [], totalResults: 0 });
  }
});

/** GET /platform/search?q=&city=&limit=&offset= — düz liste (Keşfet uyumu) */
router.get("/platform/search", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const q = parseSearchQuery(req);
    const city = String(req.query.city ?? "").trim();
    const limit = Math.min(parseInt(String(req.query.limit ?? "24"), 10) || 24, 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

    if (!q) {
      res.json({ success: true, data: [], total: 0, count: 0 });
      return;
    }

    const { data, total } = await runPlatformUnifiedSearch({ q, city, limit, offset });
    res.json({
      success: true,
      data,
      total,
      count: data.length,
      query: q,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err), data: [], total: 0 });
  }
});

export default router;
