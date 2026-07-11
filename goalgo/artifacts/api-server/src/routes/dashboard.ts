import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  getNewsDbForRead,
  getYektubeDbForRead,
  newsTable,
  categoriesTable,
  authorsTable,
  rssCampaignsTable,
  videoSourcesTable,
} from "@workspace/db";
import { loadNewsContext } from "../lib/news-context";
import { serializeNews } from "../lib/serializers";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";

const router: IRouter = Router();
const newsDb = () => getNewsDbForRead();
const yektubeDb = () => getYektubeDbForRead();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "dashboard")) return;
  const [
    totalNewsRow,
    publishedRow,
    draftRow,
    catCountRow,
    authCountRow,
    campaigns,
    videoCountRow,
    recent,
  ] = await Promise.all([
    newsDb().select({ c: sql<number>`count(*)::int` }).from(newsTable),
    newsDb()
      .select({ c: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(eq(newsTable.status, "published")),
    newsDb()
      .select({ c: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(eq(newsTable.status, "draft")),
    newsDb().select({ c: sql<number>`count(*)::int` }).from(categoriesTable),
    newsDb().select({ c: sql<number>`count(*)::int` }).from(authorsTable),
    newsDb().select().from(rssCampaignsTable),
    yektubeDb().select({ c: sql<number>`count(*)::int` }).from(videoSourcesTable),
    newsDb()
      .select()
      .from(newsTable)
      .orderBy(desc(newsTable.createdAt))
      .limit(8),
  ]);

  const ctx = await loadNewsContext();
  res.json({
    totalNews: totalNewsRow[0]?.c ?? 0,
    publishedNews: publishedRow[0]?.c ?? 0,
    draftNews: draftRow[0]?.c ?? 0,
    totalCategories: catCountRow[0]?.c ?? 0,
    totalAuthors: authCountRow[0]?.c ?? 0,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.active).length,
    totalAddedByRss: campaigns.reduce((s, c) => s + c.addedCount, 0),
    totalVideoSources: videoCountRow[0]?.c ?? 0,
    recentNews: recent.map((r) => serializeNews(r, ctx)),
  });
});

export default router;
