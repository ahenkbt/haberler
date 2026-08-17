/**
 * HM editör — RSS Kampanyaları (site-scoped).
 * Admin /api/rss/campaigns ile aynı motor; hedef her zaman JWT siteId.
 */
import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import {
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  rssCampaignsTable,
  rssLogsTable,
} from "@workspace/db";
import { CreateRssCampaignBody, UpdateRssCampaignBody } from "@workspace/api-zod";
import { getHmEditorJwtSecret } from "../lib/secrets.js";
import { serializeRssCampaign, serializeRssLog } from "../lib/serializers";
import { ensureRssCampaignSchema } from "../lib/ensure-rss-campaign-schema.js";
import { preflightRssCampaignRun, scheduleRssCampaignRun } from "../lib/rssCampaignRun.js";
import { parsePositiveInt, rssCampaignOwnedByHmSite } from "../lib/hm-rss-campaigns.js";

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

async function loadOwnedCampaign(id: number, siteId: number) {
  const [row] = await getNewsDbForRead()
    .select()
    .from(rssCampaignsTable)
    .where(eq(rssCampaignsTable.id, id));
  if (!row || !rssCampaignOwnedByHmSite(row, siteId)) return null;
  return row;
}

router.get("/hm/editor/rss/campaigns", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
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
  const id = parsePositiveInt(req.params.id);
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
  const id = parsePositiveInt(req.params.id);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await loadOwnedCampaign(id, ctx.siteId);
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
  const [row] = await dualWriteUpdate(
    rssCampaignsTable,
    {
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
    },
    eq(rssCampaignsTable.id, id),
  );
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(serializeRssCampaign(row));
});

router.delete("/hm/editor/rss/campaigns/:id", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  const id = parsePositiveInt(req.params.id);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await loadOwnedCampaign(id, ctx.siteId);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  await dualWriteDelete(rssLogsTable, eq(rssLogsTable.campaignId, id));
  await dualWriteDelete(rssCampaignsTable, eq(rssCampaignsTable.id, id));
  res.sendStatus(204);
});

router.post("/hm/editor/rss/campaigns/:id/run", async (req, res): Promise<void> => {
  const ctx = denyUnlessHmEditor(req, res);
  if (!ctx) return;
  await ensureRssCampaignSchema();
  const id = parsePositiveInt(req.params.id);
  if (id == null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const existing = await loadOwnedCampaign(id, ctx.siteId);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const preflight = await preflightRssCampaignRun(id);
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
  const { alreadyRunning } = scheduleRssCampaignRun(id);
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
