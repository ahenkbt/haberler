import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import {
  db as mainDb,
  aiSettingsTable,
  dualWriteDelete,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmAiJobsTable,
  hmContentPoolItemsTable,
  hmNewsSitesTable,
  newsTable,
} from "@workspace/db";
import {
  callChatWithOpenAiGeminiFallback,
  getSiteIntegrationKeys,
  hasAnyChatApiKey,
  mergeChatKeysFromAiAndSite,
} from "./aiChatProviders.js";
import { aiNewsSystemPrompt, aiNewsUserJsonHint } from "./aiNewsPrompts.js";
import { finalizeAiNewsArticle } from "./aiNewsArticle.js";
import { isCorporateHmSiteRow } from "./hm-yekpare-news-sync.js";

const db = getNewsDbForRead();

async function getAiSettingsRow() {
  const rows = await mainDb.select().from(aiSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await mainDb.insert(aiSettingsTable).values({}).returning();
  return row;
}

function jsonExtract(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Aktif HM site id'lerini doğrular; geçersiz ve kurumsal id'leri atar. */
export async function resolveActiveHmTargetSiteIds(rawIds: number[]): Promise<number[]> {
  const uniq = [...new Set(rawIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))];
  if (uniq.length === 0) return [];
  const rows = await db
    .select({ id: hmNewsSitesTable.id, layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(and(eq(hmNewsSitesTable.active, true), inArray(hmNewsSitesTable.id, uniq)));
  const allowed = new Set(
    rows.filter((row) => !isCorporateHmSiteRow(row)).map((r) => r.id),
  );
  return uniq.filter((id) => allowed.has(id));
}

async function loadActiveHmSite(targetSiteId: number): Promise<{ id: number; slug: string; displayName: string } | null> {
  const sid = Number(targetSiteId);
  if (!Number.isFinite(sid) || sid <= 0) return null;
  const [site] = await db
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      displayName: hmNewsSitesTable.displayName,
    })
    .from(hmNewsSitesTable)
    .where(and(eq(hmNewsSitesTable.id, sid), eq(hmNewsSitesTable.active, true)))
    .limit(1);
  return site ?? null;
}

/** Havuz dağıtımında hedef haber durumu; AI Robotu `post_status` ayarından bağımsız, varsayılan yayında. */
export function resolveHmPoolNewsPostStatus(jobPostStatus: string | null | undefined): "draft" | "published" {
  if (jobPostStatus === "draft") return "draft";
  if (jobPostStatus === "published") return "published";
  return "published";
}

function makeHmPoolSlug(base: string, targetSiteId: number, jobId: number): string {
  const raw = String(base ?? "haber")
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${raw || "haber"}-hm${targetSiteId}-j${jobId}`;
}

async function refreshPoolItemStatus(poolItemId: number): Promise<void> {
  const siblings = await db.select().from(hmAiJobsTable).where(eq(hmAiJobsTable.poolItemId, poolItemId));
  const pending = siblings.filter((j) => j.status === "queued" || j.status === "processing");
  if (pending.length === 0) {
    const failed = siblings.every((j) => j.status === "failed");
    await dualWriteUpdate(hmContentPoolItemsTable, { status: failed ? "failed" : "done" }, eq(hmContentPoolItemsTable.id, poolItemId));
  }
}

/**
 * Tek havuz işi: kaynak haberi hedef HM sitesine kopyalar veya AI ile özgünleştirir.
 */
export async function processOneHmAiJob(jobId: number): Promise<{ ok: boolean; newsId?: number; error?: string }> {
  const [job] = await db.select().from(hmAiJobsTable).where(eq(hmAiJobsTable.id, jobId));
  if (!job) return { ok: false, error: "İş bulunamadı" };
  if (job.status !== "queued" && job.status !== "processing") {
    return { ok: false, error: `Geçersiz durum: ${job.status}` };
  }

  const [claimed] = await dualWriteUpdate(
    hmAiJobsTable,
    { status: "processing", updatedAt: new Date(), errorMessage: null },
    and(eq(hmAiJobsTable.id, jobId), eq(hmAiJobsTable.status, "queued")),
  );
  if (!claimed) {
    return { ok: false, error: "İş başka bir istek tarafından alındı" };
  }

  const [pool] = await db
    .select()
    .from(hmContentPoolItemsTable)
    .where(eq(hmContentPoolItemsTable.id, claimed.poolItemId));
  if (!pool?.sourceNewsId) {
    await dualWriteUpdate(
      hmAiJobsTable,
      {
        status: "failed",
        errorMessage: "Havuz kaydında kaynak haber yok",
        updatedAt: new Date(),
      },
      eq(hmAiJobsTable.id, jobId),
    );
    await refreshPoolItemStatus(claimed.poolItemId);
    return { ok: false, error: "Kaynak haber yok" };
  }

  const [src] = await db.select().from(newsTable).where(eq(newsTable.id, pool.sourceNewsId));
  if (!src) {
    await dualWriteUpdate(hmAiJobsTable, { status: "failed", errorMessage: "Kaynak haber silinmiş", updatedAt: new Date() }, eq(hmAiJobsTable.id, jobId));
    await refreshPoolItemStatus(claimed.poolItemId);
    return { ok: false, error: "Kaynak haber yok" };
  }

  const ai = await getAiSettingsRow();
  const postStatus = resolveHmPoolNewsPostStatus(claimed.postStatus);
  const targetSiteId = Number(claimed.targetSiteId);
  if (!Number.isFinite(targetSiteId) || targetSiteId <= 0) {
    await dualWriteUpdate(
      hmAiJobsTable,
      {
        status: "failed",
        errorMessage: "Geçersiz hedef site kimliği",
        updatedAt: new Date(),
      },
      eq(hmAiJobsTable.id, jobId),
    );
    await refreshPoolItemStatus(claimed.poolItemId);
    return { ok: false, error: "Geçersiz hedef site" };
  }
  const targetSite = await loadActiveHmSite(targetSiteId);
  if (!targetSite) {
    await dualWriteUpdate(
      hmAiJobsTable,
      {
        status: "failed",
        errorMessage: "Hedef HM sitesi bulunamadı veya pasif",
        updatedAt: new Date(),
      },
      eq(hmAiJobsTable.id, jobId),
    );
    await refreshPoolItemStatus(claimed.poolItemId);
    return { ok: false, error: "Hedef site yok" };
  }
  const [targetSiteRow] = await db
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, targetSiteId))
    .limit(1);
  if (targetSiteRow && isCorporateHmSiteRow(targetSiteRow)) {
    await dualWriteUpdate(
      hmAiJobsTable,
      {
        status: "failed",
        errorMessage: "Kurumsal sitelere havuz dağıtımı yapılamaz",
        updatedAt: new Date(),
      },
      eq(hmAiJobsTable.id, jobId),
    );
    await refreshPoolItemStatus(claimed.poolItemId);
    return { ok: false, error: "Kurumsal site hedefi reddedildi" };
  }

  const markJobCompleted = async (newsId: number) => {
    await dualWriteUpdate(
      hmAiJobsTable,
      {
        status: "completed",
        errorMessage: null,
        resultNewsId: newsId,
        updatedAt: new Date(),
      },
      eq(hmAiJobsTable.id, jobId),
    );
    await refreshPoolItemStatus(claimed.poolItemId);
  };

  try {
    if (claimed.mode === "same") {
      const slug = makeHmPoolSlug(src.slug || src.title, targetSiteId, jobId);
      const [created] = await dualWriteInsert(newsTable, {
          title: src.title,
          slug,
          spot: src.spot,
          content: src.content,
          imageUrl: src.imageUrl,
          categoryId: src.categoryId,
          authorId: null,
          status: postStatus,
          isFeatured: false,
          isBreaking: false,
          tags: src.tags ?? [],
          views: 0,
          isAiGenerated: false,
          siteId: targetSiteId,
          rssSourceUrl: null,
        });

      if (!created?.id || created.siteId !== targetSiteId) {
        if (created?.id) await dualWriteDelete(newsTable, eq(newsTable.id, created.id));
        await dualWriteUpdate(
          hmAiJobsTable,
          {
            status: "failed",
            errorMessage: "Haber hedef siteye yazılamadı (site_id doğrulanamadı)",
            updatedAt: new Date(),
          },
          eq(hmAiJobsTable.id, jobId),
        );
        await refreshPoolItemStatus(claimed.poolItemId);
        return { ok: false, error: "site_id doğrulanamadı" };
      }
      await markJobCompleted(created.id);
      return { ok: true, newsId: created.id };
    }

    const siteKeys = await getSiteIntegrationKeys();
    const chatKeys = mergeChatKeysFromAiAndSite(ai, siteKeys);
    if (!hasAnyChatApiKey(chatKeys)) {
      await dualWriteUpdate(
        hmAiJobsTable,
        {
          status: "failed",
          errorMessage:
            "OpenAI veya Gemini anahtarı yok (AI İçerik Robotu → Ayarlar veya Genel Ayarlar → Entegrasyonlar)",
          updatedAt: new Date(),
        },
        eq(hmAiJobsTable.id, jobId),
      );
      await refreshPoolItemStatus(claimed.poolItemId);
      return { ok: false, error: "AI anahtarı tanımlı değil" };
    }

    const langInstruction =
      ai.language === "tr" ? "Metni Türkçe yaz." : "Write in English.";
    const system = aiNewsSystemPrompt({ langInstruction, extra: "Metni tamamen özgünleştir." });
    const user = `Kaynak başlık: ${src.title}\nÖzet: ${(src.spot ?? "").slice(0, 400)}\nİçerik:\n${(src.content ?? "").slice(0, 6000)}\n\n${aiNewsUserJsonHint(ai.wordCount)}`;

    const aiOut = await callChatWithOpenAiGeminiFallback({
      openaiApiKey: chatKeys.openaiApiKey,
      openaiModel: chatKeys.openaiModel,
      geminiApiKey: chatKeys.geminiApiKey,
      system,
      user,
      temperature: 0.72,
    });
    if (!aiOut.text) {
      const errMsg = aiOut.detail?.slice(0, 400) || "AI yanıt vermedi";
      await dualWriteUpdate(hmAiJobsTable, { status: "failed", errorMessage: errMsg, updatedAt: new Date() }, eq(hmAiJobsTable.id, jobId));
      await refreshPoolItemStatus(claimed.poolItemId);
      return { ok: false, error: errMsg };
    }

    const parsed = jsonExtract(aiOut.text);
    const baslik = typeof parsed?.baslik === "string" ? parsed.baslik.trim() : "";
    const icerikRaw = typeof parsed?.icerik === "string" ? parsed.icerik.trim() : "";
    const finalized = icerikRaw
      ? await finalizeAiNewsArticle({ icerikRaw, title: src.title, sourceImageUrl: src.imageUrl })
      : null;
    const icerik = finalized?.content ?? "";
    if (!baslik || !icerik || !parsed) {
      await dualWriteUpdate(
        hmAiJobsTable,
        {
          status: "failed",
          errorMessage: "AI geçerli JSON üretmedi",
          updatedAt: new Date(),
        },
        eq(hmAiJobsTable.id, jobId),
      );
      await refreshPoolItemStatus(claimed.poolItemId);
      return { ok: false, error: "Geçersiz AI çıktısı" };
    }

    const spot = typeof parsed.spot === "string" ? parsed.spot.trim() : null;
    const tags = Array.isArray(parsed.etiketler)
      ? (parsed.etiketler as unknown[]).map((t) => String(t)).filter(Boolean)
      : [];

    const slug = makeHmPoolSlug(baslik, targetSiteId, jobId);
    const [created] = await dualWriteInsert(newsTable, {
        title: baslik,
        slug,
        spot: spot || null,
        content: icerik,
        imageUrl: finalized?.imageUrl ?? src.imageUrl,
        categoryId: src.categoryId,
        authorId: null,
        status: postStatus,
        isFeatured: false,
        isBreaking: false,
        tags,
        views: 0,
        isAiGenerated: true,
        siteId: targetSiteId,
        rssSourceUrl: null,
      });

    if (!created?.id || created.siteId !== targetSiteId) {
      if (created?.id) await dualWriteDelete(newsTable, eq(newsTable.id, created.id));
      await dualWriteUpdate(
        hmAiJobsTable,
        {
          status: "failed",
          errorMessage: "AI haberi hedef siteye yazılamadı (site_id doğrulanamadı)",
          updatedAt: new Date(),
        },
        eq(hmAiJobsTable.id, jobId),
      );
      await refreshPoolItemStatus(claimed.poolItemId);
      return { ok: false, error: "site_id doğrulanamadı" };
    }
    await markJobCompleted(created.id);
    return { ok: true, newsId: created.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await dualWriteUpdate(
      hmAiJobsTable,
      {
        status: "failed",
        errorMessage: msg.slice(0, 500),
        updatedAt: new Date(),
      },
      eq(hmAiJobsTable.id, jobId),
    );
    await refreshPoolItemStatus(claimed.poolItemId);
    return { ok: false, error: msg };
  }
}

export type HmPoolQueueStats = {
  queued: number;
  processing: number;
  failed: number;
  completed: number;
};

export async function getHmPoolQueueStats(): Promise<HmPoolQueueStats> {
  const rows = await db
    .select({ status: hmAiJobsTable.status })
    .from(hmAiJobsTable);
  let queued = 0;
  let processing = 0;
  let failed = 0;
  let completed = 0;
  for (const r of rows) {
    if (r.status === "queued") queued++;
    else if (r.status === "processing") processing++;
    else if (r.status === "failed") failed++;
    else if (r.status === "completed") completed++;
  }
  return { queued, processing, failed, completed };
}

/** `failed` işleri yeniden `queued` yapar (eski API hatası sonrası tekrar deneme). */
export async function requeueFailedHmAiJobs(limit = 50): Promise<number> {
  const lim = Math.min(200, Math.max(1, limit));
  const failed = await db
    .select({ id: hmAiJobsTable.id })
    .from(hmAiJobsTable)
    .where(eq(hmAiJobsTable.status, "failed"))
    .orderBy(asc(hmAiJobsTable.id))
    .limit(lim);
  if (failed.length === 0) return 0;
  const ids = failed.map((f) => f.id);
  const updated = await dualWriteUpdate(hmAiJobsTable, {
      status: "queued",
      errorMessage: null,
      updatedAt: new Date(),
    }, inArray(hmAiJobsTable.id, ids));
  return updated.length;
}

export async function getHmPoolAiKeysReady(): Promise<boolean> {
  const ai = await getAiSettingsRow();
  const siteKeys = await getSiteIntegrationKeys();
  return hasAnyChatApiKey(mergeChatKeysFromAiAndSite(ai, siteKeys));
}

/** Sıradaki `queued` işleri işler (admin tetiklemesi veya cron). */
export async function processHmAiJobQueue(limit = 8): Promise<{
  attempted: number;
  completed: number;
  failed: number;
  details: { jobId: number; ok: boolean; error?: string; newsId?: number }[];
}> {
  const details: { jobId: number; ok: boolean; error?: string; newsId?: number }[] = [];
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < limit; i++) {
    const [next] = await db
      .select({ id: hmAiJobsTable.id })
      .from(hmAiJobsTable)
      .where(eq(hmAiJobsTable.status, "queued"))
      .orderBy(asc(hmAiJobsTable.id))
      .limit(1);
    if (!next) break;

    const r = await processOneHmAiJob(next.id);
    details.push({ jobId: next.id, ok: r.ok, error: r.error, newsId: r.newsId });
    if (r.ok) completed++;
    else failed++;
  }

  return { attempted: details.length, completed, failed, details };
}

/** Takılı kalan `processing` kayıtlarını sıfırlar (sunucu çökmesi sonrası). */
export async function resetStaleHmAiJobsProcessing(olderThanMs = 30 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stuck = await db
    .select({ id: hmAiJobsTable.id })
    .from(hmAiJobsTable)
    .where(and(eq(hmAiJobsTable.status, "processing"), lte(hmAiJobsTable.updatedAt, cutoff)));
  if (stuck.length === 0) return 0;
  const ids = stuck.map((s) => s.id);
  const updated = await dualWriteUpdate(
    hmAiJobsTable,
    {
      status: "queued",
      errorMessage: "İşlem yarım kaldı; yeniden kuyruğa alındı",
      updatedAt: new Date(),
    },
    and(inArray(hmAiJobsTable.id, ids), eq(hmAiJobsTable.status, "processing")),
  );
  return updated.length;
}

export async function deleteHmAiJob(jobId: number): Promise<{ ok: boolean; error?: string }> {
  const id = Number(jobId);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Geçersiz iş kimliği" };
  const [job] = await db.select().from(hmAiJobsTable).where(eq(hmAiJobsTable.id, id));
  if (!job) return { ok: false, error: "İş bulunamadı" };
  if (job.status === "processing") {
    return { ok: false, error: "İşleniyor durumundaki kayıt silinemez; birkaç dakika sonra tekrar deneyin." };
  }
  const poolItemId = job.poolItemId;
  await dualWriteDelete(hmAiJobsTable, eq(hmAiJobsTable.id, id));
  await refreshPoolItemStatus(poolItemId);
  return { ok: true };
}

export async function deleteHmPoolItem(poolItemId: number): Promise<{ ok: boolean; error?: string }> {
  const id = Number(poolItemId);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Geçersiz havuz kaydı" };
  const [item] = await db.select().from(hmContentPoolItemsTable).where(eq(hmContentPoolItemsTable.id, id));
  if (!item) return { ok: false, error: "Havuz kaydı bulunamadı" };
  const activeJobs = await db
    .select({ id: hmAiJobsTable.id })
    .from(hmAiJobsTable)
    .where(and(eq(hmAiJobsTable.poolItemId, id), eq(hmAiJobsTable.status, "processing")));
  if (activeJobs.length > 0) {
    return { ok: false, error: "Bu havuz kaydında işlenmekte olan iş var; önce kuyruğun bitmesini bekleyin." };
  }
  await dualWriteDelete(hmContentPoolItemsTable, eq(hmContentPoolItemsTable.id, id));
  return { ok: true };
}

export async function listHmAiJobsWithSites(limit = 100) {
  const jobs = await db
    .select({
      id: hmAiJobsTable.id,
      poolItemId: hmAiJobsTable.poolItemId,
      targetSiteId: hmAiJobsTable.targetSiteId,
      mode: hmAiJobsTable.mode,
      status: hmAiJobsTable.status,
      errorMessage: hmAiJobsTable.errorMessage,
      resultNewsId: hmAiJobsTable.resultNewsId,
      createdAt: hmAiJobsTable.createdAt,
      updatedAt: hmAiJobsTable.updatedAt,
      targetSlug: hmNewsSitesTable.slug,
      targetName: hmNewsSitesTable.displayName,
    })
    .from(hmAiJobsTable)
    .innerJoin(hmNewsSitesTable, eq(hmNewsSitesTable.id, hmAiJobsTable.targetSiteId))
    .orderBy(desc(hmAiJobsTable.id))
    .limit(limit);
  return jobs;
}
