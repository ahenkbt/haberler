import { Router, type IRouter } from "express";
import { runDailyTrends, toHomeTrendCategories } from "../lib/search-trends.js";

const router: IRouter = Router();

/** GET /trends/daily — Google Trends TR (24s bellek önbelleği) */
router.get("/trends/daily", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  try {
    const force = String(req.query.refresh ?? "") === "1";
    const payload = await runDailyTrends(force);
    res.json({
      success: true,
      source: payload.source,
      geo: payload.geo,
      date: payload.date,
      updatedAt: payload.fetchedAt,
      categories: toHomeTrendCategories(payload),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      source: "fallback",
      geo: "TR",
      updatedAt: new Date().toISOString(),
      categories: {
        popular: [],
        isletme: [],
        seyahat: [],
        haber: [],
        oto: [],
        harita: [],
      },
      error: String(err),
    });
  }
});

export default router;
