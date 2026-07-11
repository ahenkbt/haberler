import { and, asc, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import {
  aiSettingsTable,
  db as mainDb,
  dualWriteUpdate,
  getNewsDbForRead,
  newsTable,
  portalRssMetaRewriteJobsTable,
} from "@workspace/db";
import {
  callChatWithOpenAiGeminiFallback,
  getSiteIntegrationKeys,
  hasAnyChatApiKey,
  mergeChatKeysFromAiAndSite,
} from "./aiChatProviders.js";
import { AI_NEWS_TR_STYLE_RULES } from "./aiNewsPrompts.js";
import { decodeHtmlEntities } from "./decodeHtmlEntities.js";

const newsDb = getNewsDbForRead();

async function updateMetaRewriteJob(
  set: Partial<typeof portalRssMetaRewriteJobsTable.$inferInsert>,
  where: SQL | undefined,
) {
  return mainDb.update(portalRssMetaRewriteJobsTable).set(set).where(where).returning();
}

const MAX_ATTEMPTS = 3;
const CONTENT_CONTEXT_MAX_CHARS = 280;

let schemaReady: Promise<void> | null = null;

function ensurePortalRssAiMetaSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = mainDb
      .execute(sql`
        ALTER TABLE ai_settings
          ADD COLUMN IF NOT EXISTS portal_rss_ai_meta_enabled BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE ai_settings
          ADD COLUMN IF NOT EXISTS portal_rss_ai_meta_hourly_limit INTEGER;
        CREATE TABLE IF NOT EXISTS portal_rss_meta_rewrite_jobs (
          id SERIAL PRIMARY KEY,
          news_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued',
          source_title TEXT NOT NULL,
          source_spot TEXT,
          error_message TEXT,
          attempts INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          processed_at TIMESTAMPTZ
        );
        CREATE UNIQUE INDEX IF NOT EXISTS portal_rss_meta_rewrite_jobs_news_id_unique
          ON portal_rss_meta_rewrite_jobs (news_id);
        CREATE INDEX IF NOT EXISTS portal_rss_meta_rewrite_jobs_status_created_idx
          ON portal_rss_meta_rewrite_jobs (status, created_at);
      `)
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

function envHourlyLimit(): number {
  const n = Number(process.env.PORTAL_RSS_AI_META_LIMIT ?? 20);
  return Number.isFinite(n) && n > 0 ? Math.min(200, Math.floor(n)) : 20;
}

function envEnabledDefault(): boolean {
  return process.env.PORTAL_RSS_AI_META_ENABLED?.trim() === "1";
}

async function getAiSettingsRow() {
  await ensurePortalRssAiMetaSchema();
  const rows = await mainDb.select().from(aiSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await mainDb.insert(aiSettingsTable).values({}).returning();
  return row;
}

export type PortalRssAiMetaConfig = {
  enabled: boolean;
  hourlyLimit: number;
  envHourlyLimit: number;
  envEnabledDefault: boolean;
};

export async function getPortalRssAiMetaConfig(): Promise<PortalRssAiMetaConfig> {
  const row = await getAiSettingsRow();
  const hourlyFromDb = row.portalRssAiMetaHourlyLimit;
  const hourlyLimit =
    hourlyFromDb != null && Number.isFinite(hourlyFromDb) && hourlyFromDb > 0
      ? Math.min(200, Math.floor(hourlyFromDb))
      : envHourlyLimit();
  return {
    enabled: row.portalRssAiMetaEnabled === true,
    hourlyLimit,
    envHourlyLimit: envHourlyLimit(),
    envEnabledDefault: envEnabledDefault(),
  };
}

export async function updatePortalRssAiMetaConfig(patch: {
  enabled?: boolean;
  hourlyLimit?: number | null;
}): Promise<PortalRssAiMetaConfig> {
  const current = await getAiSettingsRow();
  const updateData: Partial<typeof aiSettingsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof patch.enabled === "boolean") {
    updateData.portalRssAiMetaEnabled = patch.enabled;
  }
  if (patch.hourlyLimit === null) {
    updateData.portalRssAiMetaHourlyLimit = null;
  } else if (patch.hourlyLimit !== undefined) {
    const n = Number(patch.hourlyLimit);
    updateData.portalRssAiMetaHourlyLimit =
      Number.isFinite(n) && n > 0 ? Math.min(200, Math.floor(n)) : null;
  }
  await mainDb.update(aiSettingsTable).set(updateData).where(eq(aiSettingsTable.id, current.id));
  return getPortalRssAiMetaConfig();
}

export type PortalRssAiMetaQueueStats = {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  completedLastHour: number;
  hourlyLimit: number;
  enabled: boolean;
};

export async function getPortalRssAiMetaQueueStats(): Promise<PortalRssAiMetaQueueStats> {
  await ensurePortalRssAiMetaSchema();
  const config = await getPortalRssAiMetaConfig();
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const rows = await mainDb
    .select({
      status: portalRssMetaRewriteJobsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(portalRssMetaRewriteJobsTable)
    .groupBy(portalRssMetaRewriteJobsTable.status);

  const byStatus = new Map(rows.map((r) => [r.status, r.count]));
  const [hourRow] = await mainDb
    .select({ count: sql<number>`count(*)::int` })
    .from(portalRssMetaRewriteJobsTable)
    .where(
      and(
        eq(portalRssMetaRewriteJobsTable.status, "completed"),
        gte(portalRssMetaRewriteJobsTable.processedAt, oneHourAgo),
      ),
    );

  return {
    queued: byStatus.get("queued") ?? 0,
    processing: byStatus.get("processing") ?? 0,
    completed: byStatus.get("completed") ?? 0,
    failed: byStatus.get("failed") ?? 0,
    completedLastHour: hourRow?.count ?? 0,
    hourlyLimit: config.hourlyLimit,
    enabled: config.enabled,
  };
}

/** RSS import sonrası hızlı kuyruk kaydı — RSS tick'i bloklamaz. */
export async function enqueuePortalRssMetaRewriteJob(
  newsId: number,
  sourceTitle: string,
  sourceSpot: string | null,
): Promise<void> {
  const config = await getPortalRssAiMetaConfig();
  if (!config.enabled) return;

  await ensurePortalRssAiMetaSchema();
  try {
    await mainDb.insert(portalRssMetaRewriteJobsTable).values({
      newsId,
      status: "queued",
      sourceTitle: sourceTitle.trim(),
      sourceSpot: sourceSpot?.trim() || null,
    });
  } catch {
    /* news_id unique — zaten kuyrukta */
  }
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

function stripHtmlToPlain(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function metaRewriteSystemPrompt(lang: string): string {
  const langLine = lang === "tr" ? "Türkçe yaz. " : `${lang} dilinde yaz. `;
  return (
    `Sen profesyonel bir haber editörüsün. ${langLine}${AI_NEWS_TR_STYLE_RULES} ` +
    "Görev: Verilen RSS haberinin YALNIZCA başlık (baslik) ve spot alanını özgünleştir. " +
    "Gövde metnini yeniden yazma veya uydurma; bağlam özeti yalnızca tutarlılık içindir. " +
    "Spot en fazla 2 kısa cümle. Başlık özgün ama olayı doğru yansıtsın. " +
    'Yalnızca JSON döndür: {"baslik":"...","spot":"..."}'
  );
}

async function rewriteTitleAndSpot(opts: {
  sourceTitle: string;
  sourceSpot: string | null;
  contentExcerpt: string;
}): Promise<{ title: string; spot: string } | null> {
  const aiRow = await getAiSettingsRow();
  const siteKeys = await getSiteIntegrationKeys();
  const chatKeys = mergeChatKeysFromAiAndSite(aiRow, siteKeys);
  if (!hasAnyChatApiKey(chatKeys)) return null;

  const user =
    `Orijinal başlık: ${opts.sourceTitle}\n` +
    `Orijinal spot: ${opts.sourceSpot?.trim() || "(yok)"}\n` +
    `Gövde bağlamı (yeniden yazma, yalnızca tutarlılık): ${opts.contentExcerpt || "(yok)"}`;

  const { text } = await callChatWithOpenAiGeminiFallback({
    openaiApiKey: chatKeys.openaiApiKey,
    openaiModel: chatKeys.openaiModel,
    geminiApiKey: chatKeys.geminiApiKey,
    system: metaRewriteSystemPrompt(aiRow.language || "tr"),
    user,
    temperature: 0.35,
  });

  if (!text) return null;
  const parsed = jsonExtract(text);
  const title = String(parsed?.baslik ?? parsed?.title ?? "").trim();
  const spot = String(parsed?.spot ?? "").trim();
  if (!title || title.length < 8) return null;
  return { title: title.slice(0, 240), spot: spot.slice(0, 400) };
}

async function countCompletedInLastHour(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const [row] = await mainDb
    .select({ count: sql<number>`count(*)::int` })
    .from(portalRssMetaRewriteJobsTable)
    .where(
      and(
        eq(portalRssMetaRewriteJobsTable.status, "completed"),
        gte(portalRssMetaRewriteJobsTable.processedAt, oneHourAgo),
      ),
    );
  return row?.count ?? 0;
}

export type PortalRssAiMetaJobView = {
  id: number;
  newsId: number;
  status: string;
  sourceTitle: string;
  sourceSpot: string | null;
  resultTitle: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  processedAt: string | null;
};

export async function getPortalRssAiMetaRecentJobs(limit = 15): Promise<PortalRssAiMetaJobView[]> {
  await ensurePortalRssAiMetaSchema();
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const rows = await mainDb
    .select({
      id: portalRssMetaRewriteJobsTable.id,
      newsId: portalRssMetaRewriteJobsTable.newsId,
      status: portalRssMetaRewriteJobsTable.status,
      sourceTitle: portalRssMetaRewriteJobsTable.sourceTitle,
      sourceSpot: portalRssMetaRewriteJobsTable.sourceSpot,
      errorMessage: portalRssMetaRewriteJobsTable.errorMessage,
      attempts: portalRssMetaRewriteJobsTable.attempts,
      createdAt: portalRssMetaRewriteJobsTable.createdAt,
      processedAt: portalRssMetaRewriteJobsTable.processedAt,
    })
    .from(portalRssMetaRewriteJobsTable)
    .orderBy(
      desc(
        sql`coalesce(${portalRssMetaRewriteJobsTable.processedAt}, ${portalRssMetaRewriteJobsTable.createdAt})`,
      ),
    )
    .limit(safeLimit);

  const newsIds = [...new Set(rows.map((row) => row.newsId))];
  const titleByNewsId = new Map<number, string>();
  if (newsIds.length > 0) {
    const newsRows = await newsDb
      .select({ id: newsTable.id, title: newsTable.title })
      .from(newsTable)
      .where(inArray(newsTable.id, newsIds));
    for (const n of newsRows) {
      if (n.title) titleByNewsId.set(n.id, n.title);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    newsId: row.newsId,
    status: row.status,
    sourceTitle: row.sourceTitle,
    sourceSpot: row.sourceSpot,
    resultTitle: titleByNewsId.get(row.newsId) ?? null,
    errorMessage: row.errorMessage,
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
  }));
}

type ProcessOneOpts = { bypassQuota?: boolean; ignoreEnabled?: boolean };

async function processOnePortalRssMetaJob(
  opts?: ProcessOneOpts,
): Promise<"processed" | "skipped" | "quota"> {
  const config = await getPortalRssAiMetaConfig();
  if (!config.enabled && !opts?.ignoreEnabled) return "skipped";

  if (!opts?.bypassQuota) {
    const doneLastHour = await countCompletedInLastHour();
    if (doneLastHour >= config.hourlyLimit) return "quota";
  }

  const [job] = await mainDb
    .select()
    .from(portalRssMetaRewriteJobsTable)
    .where(eq(portalRssMetaRewriteJobsTable.status, "queued"))
    .orderBy(asc(portalRssMetaRewriteJobsTable.createdAt))
    .limit(1);
  if (!job) return "skipped";

  const [claimed] = await updateMetaRewriteJob(
    { status: "processing", updatedAt: new Date(), errorMessage: null },
    and(
      eq(portalRssMetaRewriteJobsTable.id, job.id),
      eq(portalRssMetaRewriteJobsTable.status, "queued"),
    ),
  );
  if (!claimed) return "skipped";

  const [newsRow] = await newsDb
    .select({
      id: newsTable.id,
      content: newsTable.content,
      tags: newsTable.tags,
    })
    .from(newsTable)
    .where(eq(newsTable.id, job.newsId))
    .limit(1);

  if (!newsRow) {
    await updateMetaRewriteJob(
      {
        status: "failed",
        errorMessage: "Haber kaydı bulunamadı",
        attempts: job.attempts + 1,
        processedAt: new Date(),
        updatedAt: new Date(),
      },
      eq(portalRssMetaRewriteJobsTable.id, job.id),
    );
    return "processed";
  }

  const contentExcerpt = stripHtmlToPlain(newsRow.content ?? "").slice(0, CONTENT_CONTEXT_MAX_CHARS);
  const rewritten = await rewriteTitleAndSpot({
    sourceTitle: job.sourceTitle,
    sourceSpot: job.sourceSpot,
    contentExcerpt,
  });

  if (!rewritten) {
    const nextAttempts = job.attempts + 1;
    const failed = nextAttempts >= MAX_ATTEMPTS;
    await updateMetaRewriteJob(
      {
        status: failed ? "failed" : "queued",
        attempts: nextAttempts,
        errorMessage: failed ? "AI yanıtı alınamadı veya geçersiz JSON" : "AI yanıtı geçici olarak alınamadı",
        updatedAt: new Date(),
        processedAt: failed ? new Date() : null,
      },
      eq(portalRssMetaRewriteJobsTable.id, job.id),
    );
    return "processed";
  }

  const tags = [...(newsRow.tags ?? [])];
  if (!tags.includes("meta-ai")) tags.push("meta-ai");

  await dualWriteUpdate(
    newsTable,
    {
      title: rewritten.title,
      spot: rewritten.spot || job.sourceSpot,
      tags,
      isAiGenerated: true,
      updatedAt: new Date(),
    },
    eq(newsTable.id, job.newsId),
  );

  await updateMetaRewriteJob(
    {
      status: "completed",
      errorMessage: null,
      attempts: job.attempts + 1,
      processedAt: new Date(),
      updatedAt: new Date(),
    },
    eq(portalRssMetaRewriteJobsTable.id, job.id),
  );

  return "processed";
}

/** Tick başına en fazla `maxJobs` iş — saatlik kota ve API yükü korunur. */
export async function processPortalRssMetaRewriteQueue(maxJobs = 1): Promise<{
  processed: number;
  quotaReached: boolean;
}> {
  await ensurePortalRssAiMetaSchema();
  let processed = 0;
  let quotaReached = false;

  for (let i = 0; i < maxJobs; i += 1) {
    const result = await processOnePortalRssMetaJob();
    if (result === "quota") {
      quotaReached = true;
      break;
    }
    if (result === "skipped") break;
    processed += 1;
  }

  return { processed, quotaReached };
}

/** Admin: tek işi hemen dene — saatlik kotayı ve (isteğe bağlı) pasif ayarı atlar. */
export async function adminProcessOnePortalRssMetaJob(): Promise<{
  result: "processed" | "skipped" | "quota";
}> {
  await ensurePortalRssAiMetaSchema();
  const result = await processOnePortalRssMetaJob({
    bypassQuota: true,
    ignoreEnabled: true,
  });
  return { result };
}
