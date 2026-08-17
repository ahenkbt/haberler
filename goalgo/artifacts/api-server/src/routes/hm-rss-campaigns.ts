/**
 * HM editör — RSS Kampanyaları (site-scoped).
 * Admin /api/rss/campaigns ile aynı motor; hedef her zaman JWT siteId.
 */
import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  rssCampaignsTable,
  rssLogsTable,
} from "@workspace/db";
import { CreateRssCampaignBody, UpdateRssCampaignBody } from "@workspace/api-zod";
import { parseHmEditorFromRequest } from "../lib/hmEditorJwt.js";
import { serializeRssCampaign, serializeRssLog } from "../lib/serializers";
import { ensureRssCampaignSchema } from "../lib/ensure-rss-campaign-schema.js";
import { preflightRssCampaignRun, scheduleRssCampaignRun } from "../lib/rssCampaignRun.js";
import {
  campaignIdFromRequestPath,
  parsePositiveInt,
  rssCampaignOwnedByHmSite,
} from "../lib/hm-rss-campaigns.js";
import {
  deleteNewsImportedByRssCampaign,
  purgeAhgRssCampaignNewsOnce,
  sqlSiteOwnsCampaign,
} from "../lib/hm-rss-campaign-news-purge.js";

const router: IRouter = Router();

function denyUnlessHmEditor(
  req: Request,
  res: { status: (n: number) => { json: (b: unknown) => void } },
): { editorId: number; siteId: number } | null {
  const x = parseHmEditorFromRequest(req);
  if (!x) {
    res.status(401).json({ error: "Editör oturumu gerekli (Bearer token)." });
    return null;
  }
  return x;
}

function campaignIdFromReq(req: Request): number | null {
  return campaignIdFromRequestPath(req.params.id, `${req.baseUrl || ""}${req.path || ""}`);
}

async function loadOwnedCampaign(id: number, siteId: number) {
  const [bySql] = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .where(and(eq(rssCampaignsTable.id, id), sqlSiteOwnsCampaign(siteId)));
  if (bySql) return bySql;

  const [row] = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .where(eq(rssCampaignsTable.id, id));
  if (!row || !rssCampaignOwnedByHmSite(row, siteId)) return null;
  return row;
}

/** JWT'li editör: okuma DB'de kayıt varsa çalıştır/kaydet (yazma ana DB boş dönebilir). */
async function loadCampaignForHmEditorMutate(id: number, siteId: number) {
  const owned = await loadOwnedCampaign(id, siteId);
  if (owned) return owned;
  const [row] = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .where(eq(rssCampaignsTable.id, id));
  return row ?? null;
}

async function writeCampaignUpdate(
  id: number,
  set: Record<string, unknown>,
) {
  const [row] = await dualWriteUpdate(
    rssCampaignsTable,
    set as typeof rssCampaignsTable.$inferInsert,
    eq(rssCampaignsTable.id, id),
  );
  if (row) return row;
  const [fromRead] = await getNewsDbForRead()
    .update(rssCampaignsTable)
    .set(set as typeof rssCampaignsTable.$inferInsert)
    .where(eq(rssCampaignsTable.id, id))
    .returning();
  return fromRead ?? null;
}

router.get("/hm/editor/rss/campaigns", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
  await purgeAhgRssCampaignNewsOnce();
  const rows = await getNewsDbForRead().select().from(rssCampaignsTable).orderBy(rssCampaignsTable.id);
  const items = rows.filter((r) => rssCampaignOwnedByHmSite(r, ctx.siteId)).map(serializeRssCampaign);
  const totalActive = items.filter((r) => r.active).length;
  const totalAdded = items.reduce((s, r) => s + (r.addedCount ?? 0), 0);
  res.json({
    items,
    totalActive,
    totalAdded,
    nextRunAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
});

router.post("/hm/editor/rss/campaigns", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
  const parsed = CreateRssCampaignBody.safeParse({
    ...(req.body && typeof req.body === "object" ? req.body : {}),
    hmSiteIds: [ctx.siteId],
    includeYekpareHaber: false,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await dualWriteInsert(rssCampaignsTable, {
    name: d.name,
    active: d.active ?? true,
    postType: d.postType,
    categorySlug: d.categorySlug,
    tags: d.tags ?? [],
    feeds: d.feeds ?? [],
    sourceType: d.sourceType,
    intervalMinutes: d.intervalMinutes ?? 30,
    daysWindow: d.daysWindow ?? 0,
    dailyLimit: d.dailyLimit ?? 0,
    downloadImages: d.downloadImages ?? false,
    headline: d.headline ?? false,
    breakingKeywords: d.breakingKeywords ?? [],
    minWords: d.minWords ?? 0,
    translateEnabled: d.translateEnabled ?? false,
    sourceLang: d.sourceLang ?? null,
    targetLang: d.targetLang ?? null,
    translateEngine: d.translateEngine ?? null,
    hmSiteIds: [ctx.siteId],
    includeYekpareHaber: false,
    haberlerFilterByTags: d.haberlerFilterByTags ?? false,
  });
  res.status(201).json(serializeRssCampaign(row));
});

router.get("/hm/editor/rss/campaigns/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
  const id = campaignIdFromReq(req);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const row = await loadOwnedCampaign(id, ctx.siteId);
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(serializeRssCampaign(row));
});

router.put("/hm/editor/rss/campaigns/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
  const id = campaignIdFromReq(req);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await loadCampaignForHmEditorMutate(id, ctx.siteId);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const parsed = UpdateRssCampaignBody.safeParse({
    ...(req.body && typeof req.body === "object" ? req.body : {}),
    hmSiteIds: [ctx.siteId],
    includeYekpareHaber: false,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const row = await writeCampaignUpdate(id, {
    name: d.name,
    active: d.active ?? true,
    postType: d.postType,
    categorySlug: d.categorySlug,
    tags: d.tags ?? [],
    feeds: d.feeds ?? [],
    sourceType: d.sourceType,
    intervalMinutes: d.intervalMinutes ?? 30,
    daysWindow: d.daysWindow ?? 0,
    dailyLimit: d.dailyLimit ?? 0,
    downloadImages: d.downloadImages ?? false,
    headline: d.headline ?? false,
    breakingKeywords: d.breakingKeywords ?? [],
    minWords: d.minWords ?? 0,
    translateEnabled: d.translateEnabled ?? false,
    sourceLang: d.sourceLang ?? null,
    targetLang: d.targetLang ?? null,
    translateEngine: d.translateEngine ?? null,
    hmSiteIds: [ctx.siteId],
    includeYekpareHaber: false,
    haberlerFilterByTags: d.haberlerFilterByTags ?? false,
  });
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(serializeRssCampaign(row));
});

router.delete("/hm/editor/rss/campaigns/:id/news", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = campaignIdFromReq(req);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await loadOwnedCampaign(id, ctx.siteId);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const result = await deleteNewsImportedByRssCampaign({ siteId: ctx.siteId, campaign: existing });
  res.json({ ok: true, message: "Kampanyanın eklediği haberler silindi.", hosts: result.hosts });
});

router.delete("/hm/editor/rss/campaigns/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = campaignIdFromReq(req);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await loadOwnedCampaign(id, ctx.siteId);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const deleteNews =
    String(req.query.deleteNews ?? req.query.delete_news ?? "").trim() === "1" ||
    (req.body && typeof req.body === "object" && (req.body as { deleteNews?: unknown }).deleteNews === true);
  if (deleteNews) {
    await deleteNewsImportedByRssCampaign({ siteId: ctx.siteId, campaign: existing });
  }
  await dualWriteDelete(rssLogsTable, eq(rssLogsTable.campaignId, id));
  await dualWriteDelete(rssCampaignsTable, eq(rssCampaignsTable.id, id));
  res.sendStatus(204);
});

router.post("/hm/editor/rss/campaigns/:id/run", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
  const id = campaignIdFromReq(req);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await loadCampaignForHmEditorMutate(id, ctx.siteId);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const preflight = await preflightRssCampaignRun(id, { forceHmSiteId: ctx.siteId });
  if (!preflight.ok) {
    res.status(400).json({
      accepted: false,
      added: 0,
      skipped: 0,
      errors: 1,
      error: preflight.message,
      message: preflight.message,
    });
    return;
  }
  const { alreadyRunning } = scheduleRssCampaignRun(id, { forceHmSiteId: ctx.siteId });
  res.status(202).json({
    accepted: true,
    added: 0,
    skipped: 0,
    errors: 0,
    message: alreadyRunning
      ? "Kampanya zaten çalışıyor; tamamlanınca İşlem Logları güncellenir."
      : "Kampanya arka planda çalıştırılıyor. Birkaç dakika sonra İşlem Logları ve EKLENEN sütununu kontrol edin.",
  });
});

router.get("/hm/editor/rss/logs", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
  const campaigns = await getNewsDbForRead().select().from(rssCampaignsTable);
  const owned = campaigns.filter((c) => rssCampaignOwnedByHmSite(c, ctx.siteId));
  const ids = owned.map((c) => c.id);
  if (ids.length === 0) {
    res.json([]);
    return;
  }
  const cidFilter = parsePositiveInt(req.query.campaignId);
  const campaignIds = cidFilter && ids.includes(cidFilter) ? [cidFilter] : ids;
  const rows = await getNewsDbForRead()
    .select()
    .from(rssLogsTable)
    .where(inArray(rssLogsTable.campaignId, campaignIds))
    .orderBy(desc(rssLogsTable.createdAt))
    .limit(300);
  const map = new Map(owned.map((c) => [c.id, c.name]));
  res.json(rows.map((r) => serializeRssLog(r, map.get(r.campaignId) ?? "")));
});

export default router;
