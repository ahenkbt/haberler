import { Router, type IRouter } from "express";
import {
  getSuperligRecentMatches,
  getSuperligStandings,
  normalizeTffLeagueId,
} from "../lib/superlig-fetcher";

const router: IRouter = Router();

/** GET /api/public/superlig/puan — Süper Lig / 1. Lig puan durumu (TFF proxy). */
router.get("/public/superlig/puan", async (req, res): Promise<void> => {
  try {
    const league = normalizeTffLeagueId(req.query.lig);
    const payload = await getSuperligStandings(league);
    if (!payload) {
      res.status(503).json({ ok: false, error: "League standings unavailable", league });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=1800");
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "superlig: failed to get standings");
    res.status(500).json({ ok: false, error: "League standings unavailable" });
  }
});

/** GET /api/public/superlig/fikstur — Son maç skorları veya güncel hafta fikstürü. */
router.get("/public/superlig/fikstur", async (req, res): Promise<void> => {
  try {
    const league = normalizeTffLeagueId(req.query.lig);
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 20) : 8;
    const scope = String(req.query.scope ?? "recent").trim().toLowerCase() === "week" ? "week" : "recent";
    const payload = await getSuperligRecentMatches(limit, scope, league);
    if (!payload) {
      res.status(503).json({ ok: false, error: "League fixtures unavailable", league });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=1800");
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "superlig: failed to get fixtures");
    res.status(500).json({ ok: false, error: "League fixtures unavailable" });
  }
});

export default router;
