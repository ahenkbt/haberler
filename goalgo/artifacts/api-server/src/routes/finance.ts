import { Router, type IRouter } from "express";
import { getLiveFinance } from "../lib/finance-fetcher";

const router: IRouter = Router();

router.get("/finance", async (req, res): Promise<void> => {
  try {
    const items = await getLiveFinance();
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "finance: failed to get data");
    res.status(500).json({ error: "Finance data unavailable" });
  }
});

export default router;
