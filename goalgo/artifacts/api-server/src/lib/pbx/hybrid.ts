import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { publishPbxRealtime } from "./service.js";
import type { PbxLiveQueueRow } from "./types.js";

export type PbxRoutingMode = "ai_only" | "human_only" | "hybrid";

export type PbxHybridSettings = {
  hybridModeEnabled: boolean;
  defaultRoutingMode: PbxRoutingMode;
  defaultPbxQueueId: string | null;
  transferWebhookSecret: string | null;
  transferWebhookUrl: string;
};

export type PbxAiCampaignConfig = {
  id: string;
  aiCampaignId: string;
  aiCampaignName: string;
  routingMode: PbxRoutingMode;
  pbxQueueId: string | null;
  pbxQueueName?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PbxPendingTransfer = {
  id: string;
  externalCallId: string;
  phone: string;
  aiCampaignId: string;
  aiCampaignName: string;
  queueId: string | null;
  queueName?: string | null;
  agentId: string | null;
  summary: string;
  context: Record<string, unknown>;
  status: "waiting" | "ringing" | "answered" | "abandoned" | "expired";
  createdAt: string;
  answeredAt: string | null;
};

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

function routingModeLabelTr(mode: PbxRoutingMode): string {
  const map: Record<PbxRoutingMode, string> = {
    ai_only: "Sadece AI",
    human_only: "Sadece İnsan",
    hybrid: "Hibrit (AI → Aktar)",
  };
  return map[mode] ?? mode;
}

export { routingModeLabelTr };

export async function ensureHybridTables(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE pbx_settings
      ADD COLUMN IF NOT EXISTS hybrid_mode_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS default_routing_mode TEXT NOT NULL DEFAULT 'hybrid',
      ADD COLUMN IF NOT EXISTS default_pbx_queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS transfer_webhook_secret TEXT
  `);
  await db.execute(sql`
    ALTER TABLE pbx_campaigns
      ADD COLUMN IF NOT EXISTS routing_mode TEXT NOT NULL DEFAULT 'human_only'
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_ai_campaign_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ai_campaign_id TEXT NOT NULL UNIQUE,
      ai_campaign_name TEXT NOT NULL DEFAULT '',
      routing_mode TEXT NOT NULL DEFAULT 'hybrid',
      pbx_queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_pending_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_call_id TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      ai_campaign_id TEXT NOT NULL DEFAULT '',
      ai_campaign_name TEXT NOT NULL DEFAULT '',
      queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
      agent_id UUID REFERENCES pbx_agents(id) ON DELETE SET NULL,
      summary TEXT NOT NULL DEFAULT '',
      context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      answered_at TIMESTAMPTZ,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);
}

function buildWebhookUrl(): string {
  const base = String(process.env.API_PUBLIC_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN ?? "").trim();
  if (base) {
    const origin = base.startsWith("http") ? base.replace(/\/+$/, "") : `https://${base.replace(/\/+$/, "")}`;
    return `${origin}/api/pbx/transfer-in`;
  }
  return "/api/pbx/transfer-in";
}

export async function loadHybridSettings(): Promise<PbxHybridSettings> {
  await ensureHybridTables();
  const row = rows<{
    hybrid_mode_enabled: boolean;
    default_routing_mode: string;
    default_pbx_queue_id: string | null;
    transfer_webhook_secret: string | null;
  }>(
    await db.execute(sql`
      SELECT hybrid_mode_enabled, default_routing_mode, default_pbx_queue_id, transfer_webhook_secret
      FROM pbx_settings WHERE id = 1 LIMIT 1
    `),
  )[0];
  const envSecret = String(process.env.PBX_TRANSFER_WEBHOOK_SECRET ?? "").trim() || null;
  return {
    hybridModeEnabled: row?.hybrid_mode_enabled === true,
    defaultRoutingMode: (row?.default_routing_mode ?? "hybrid") as PbxRoutingMode,
    defaultPbxQueueId: row?.default_pbx_queue_id ?? null,
    transferWebhookSecret: row?.transfer_webhook_secret ?? envSecret,
    transferWebhookUrl: buildWebhookUrl(),
  };
}

export async function updateHybridSettings(patch: {
  hybridModeEnabled?: boolean;
  defaultRoutingMode?: PbxRoutingMode;
  defaultPbxQueueId?: string | null;
  transferWebhookSecret?: string | null;
}): Promise<PbxHybridSettings> {
  await ensureHybridTables();
  if (patch.hybridModeEnabled !== undefined) {
    await db.execute(sql`
      UPDATE pbx_settings SET hybrid_mode_enabled = ${patch.hybridModeEnabled}, updated_at = NOW() WHERE id = 1
    `);
  }
  if (patch.defaultRoutingMode !== undefined) {
    await db.execute(sql`
      UPDATE pbx_settings SET default_routing_mode = ${patch.defaultRoutingMode}, updated_at = NOW() WHERE id = 1
    `);
  }
  if (patch.defaultPbxQueueId !== undefined) {
    await db.execute(sql`
      UPDATE pbx_settings SET default_pbx_queue_id = ${patch.defaultPbxQueueId}::uuid, updated_at = NOW() WHERE id = 1
    `);
  }
  if (patch.transferWebhookSecret !== undefined) {
    await db.execute(sql`
      UPDATE pbx_settings SET transfer_webhook_secret = ${patch.transferWebhookSecret}, updated_at = NOW() WHERE id = 1
    `);
  }
  await publishPbxRealtime();
  return loadHybridSettings();
}

export async function listAiCampaignConfigs(): Promise<PbxAiCampaignConfig[]> {
  await ensureHybridTables();
  return rows<{
    id: string;
    ai_campaign_id: string;
    ai_campaign_name: string;
    routing_mode: string;
    pbx_queue_id: string | null;
    queue_name: string | null;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    await db.execute(sql`
      SELECT c.*, q.name AS queue_name
      FROM pbx_ai_campaign_config c
      LEFT JOIN pbx_queues q ON q.id = c.pbx_queue_id
      ORDER BY c.ai_campaign_name, c.ai_campaign_id
    `),
  ).map((r) => ({
    id: r.id,
    aiCampaignId: r.ai_campaign_id,
    aiCampaignName: r.ai_campaign_name,
    routingMode: r.routing_mode as PbxRoutingMode,
    routingModeLabelTr: routingModeLabelTr(r.routing_mode as PbxRoutingMode),
    pbxQueueId: r.pbx_queue_id,
    pbxQueueName: r.queue_name,
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  })) as (PbxAiCampaignConfig & { routingModeLabelTr: string })[];
}

export async function upsertAiCampaignConfig(input: Record<string, unknown>): Promise<PbxAiCampaignConfig> {
  await ensureHybridTables();
  const aiCampaignId = String(input.aiCampaignId ?? input.ai_campaign_id ?? "").trim();
  if (!aiCampaignId) throw new Error("AI kampanya kimliği zorunludur.");
  const aiCampaignName = String(input.aiCampaignName ?? input.ai_campaign_name ?? aiCampaignId).trim();
  const routingMode = String(input.routingMode ?? input.routing_mode ?? "hybrid") as PbxRoutingMode;
  const pbxQueueId = input.pbxQueueId != null ? String(input.pbxQueueId) : input.pbx_queue_id != null ? String(input.pbx_queue_id) : null;
  const id = input.id ? String(input.id) : null;
  const enabled = input.enabled !== false;

  if (id) {
    await db.execute(sql`
      UPDATE pbx_ai_campaign_config SET
        ai_campaign_id = ${aiCampaignId},
        ai_campaign_name = ${aiCampaignName},
        routing_mode = ${routingMode},
        pbx_queue_id = ${pbxQueueId}::uuid,
        enabled = ${enabled},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    await db.execute(sql`
      INSERT INTO pbx_ai_campaign_config (ai_campaign_id, ai_campaign_name, routing_mode, pbx_queue_id, enabled)
      VALUES (${aiCampaignId}, ${aiCampaignName}, ${routingMode}, ${pbxQueueId}::uuid, ${enabled})
      ON CONFLICT (ai_campaign_id) DO UPDATE SET
        ai_campaign_name = EXCLUDED.ai_campaign_name,
        routing_mode = EXCLUDED.routing_mode,
        pbx_queue_id = EXCLUDED.pbx_queue_id,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `);
  }
  const all = await listAiCampaignConfigs();
  const row = id ? all.find((c) => c.id === id) : all.find((c) => c.aiCampaignId === aiCampaignId);
  if (!row) throw new Error("AI kampanya yapılandırması kaydedilemedi.");
  await publishPbxRealtime();
  return row;
}

export async function deleteAiCampaignConfig(id: string): Promise<void> {
  await ensureHybridTables();
  await db.execute(sql`DELETE FROM pbx_ai_campaign_config WHERE id = ${id}::uuid`);
  await publishPbxRealtime();
}

export async function updatePbxCampaignRouting(
  campaignId: string,
  routingMode: PbxRoutingMode,
): Promise<{ id: string; routingMode: PbxRoutingMode }> {
  await ensureHybridTables();
  await db.execute(sql`
    UPDATE pbx_campaigns SET routing_mode = ${routingMode}, updated_at = NOW() WHERE id = ${campaignId}::uuid
  `);
  await publishPbxRealtime();
  return { id: campaignId, routingMode };
}

export async function getPbxCampaignRouting(campaignId: string): Promise<{ id: string; routingMode: PbxRoutingMode; name: string } | null> {
  await ensureHybridTables();
  const row = rows<{ id: string; routing_mode: string; name: string }>(
    await db.execute(sql`SELECT id, routing_mode, name FROM pbx_campaigns WHERE id = ${campaignId}::uuid LIMIT 1`),
  )[0];
  if (!row) return null;
  return { id: row.id, routingMode: row.routing_mode as PbxRoutingMode, name: row.name };
}

async function resolveTransferTarget(aiCampaignId: string): Promise<{
  routingMode: PbxRoutingMode;
  queueId: string | null;
  campaignName: string;
  allowed: boolean;
  reason?: string;
}> {
  const settings = await loadHybridSettings();
  const config = aiCampaignId
    ? (await listAiCampaignConfigs()).find((c) => c.aiCampaignId === aiCampaignId && c.enabled)
    : undefined;

  const routingMode = (config?.routingMode ?? settings.defaultRoutingMode) as PbxRoutingMode;
  const queueId = config?.pbxQueueId ?? settings.defaultPbxQueueId;
  const campaignName = config?.aiCampaignName ?? aiCampaignId;

  if (!settings.hybridModeEnabled && routingMode === "hybrid") {
    return { routingMode, queueId, campaignName, allowed: false, reason: "Hibrit mod kapalı." };
  }
  if (routingMode === "ai_only") {
    return { routingMode, queueId, campaignName, allowed: false, reason: "Kampanya yalnızca AI modunda." };
  }
  if (routingMode === "human_only" || routingMode === "hybrid") {
    if (!queueId) {
      return { routingMode, queueId, campaignName, allowed: false, reason: "PBX kuyruk eşlemesi tanımlı değil." };
    }
    return { routingMode, queueId, campaignName, allowed: true };
  }
  return { routingMode, queueId, campaignName, allowed: false, reason: "Geçersiz yönlendirme modu." };
}

export type TransferInInput = {
  callId?: string;
  call_id?: string;
  phone?: string;
  campaignId?: string;
  campaign_id?: string;
  campaignName?: string;
  campaign_name?: string;
  summary?: string;
  context?: Record<string, unknown>;
  intent?: string;
  transferReason?: string;
};

export async function handleTransferIn(input: TransferInInput): Promise<{
  ok: boolean;
  transfer?: PbxPendingTransfer;
  error?: string;
}> {
  await ensureHybridTables();
  const externalCallId = String(input.callId ?? input.call_id ?? randomUUID());
  const phone = String(input.phone ?? "").trim();
  const aiCampaignId = String(input.campaignId ?? input.campaign_id ?? "").trim();
  const aiCampaignName = String(input.campaignName ?? input.campaign_name ?? "").trim();
  const summaryParts = [
    input.summary,
    input.intent ? `Niyet: ${input.intent}` : null,
    input.transferReason ? `Aktarım nedeni: ${input.transferReason}` : null,
  ].filter(Boolean);
  const summary = summaryParts.join("\n") || "AI görüşme özeti iletildi.";
  const context = (input.context ?? {}) as Record<string, unknown>;

  const target = await resolveTransferTarget(aiCampaignId);
  if (!target.allowed) {
    return { ok: false, error: target.reason ?? "Aktarım reddedildi." };
  }

  const transferId = randomUUID();
  await db.execute(sql`
    INSERT INTO pbx_pending_transfers (
      id, external_call_id, phone, ai_campaign_id, ai_campaign_name,
      queue_id, summary, context_json, status, metadata_json
    ) VALUES (
      ${transferId}, ${externalCallId}, ${phone}, ${aiCampaignId},
      ${aiCampaignName || target.campaignName}, ${target.queueId}::uuid,
      ${summary}, ${JSON.stringify(context)}::jsonb, 'waiting',
      ${JSON.stringify({ routingMode: target.routingMode, source: "agentlabs" })}::jsonb
    )
  `);

  await publishPbxRealtime();
  const transfer = await getPendingTransferById(transferId);
  return { ok: true, transfer: transfer ?? undefined };
}

function mapTransferRow(r: {
  id: string;
  external_call_id: string;
  phone: string;
  ai_campaign_id: string;
  ai_campaign_name: string;
  queue_id: string | null;
  queue_name?: string | null;
  agent_id: string | null;
  summary: string;
  context_json: Record<string, unknown>;
  status: string;
  created_at: Date;
  answered_at: Date | null;
}): PbxPendingTransfer {
  return {
    id: r.id,
    externalCallId: r.external_call_id,
    phone: r.phone,
    aiCampaignId: r.ai_campaign_id,
    aiCampaignName: r.ai_campaign_name,
    queueId: r.queue_id,
    queueName: r.queue_name ?? null,
    agentId: r.agent_id,
    summary: r.summary,
    context: r.context_json ?? {},
    status: r.status as PbxPendingTransfer["status"],
    createdAt: new Date(r.created_at).toISOString(),
    answeredAt: r.answered_at ? new Date(r.answered_at).toISOString() : null,
  };
}

export async function getPendingTransferById(id: string): Promise<PbxPendingTransfer | null> {
  await ensureHybridTables();
  const row = rows<{
    id: string;
    external_call_id: string;
    phone: string;
    ai_campaign_id: string;
    ai_campaign_name: string;
    queue_id: string | null;
    queue_name: string | null;
    agent_id: string | null;
    summary: string;
    context_json: Record<string, unknown>;
    status: string;
    created_at: Date;
    answered_at: Date | null;
  }>(
    await db.execute(sql`
      SELECT t.*, q.name AS queue_name
      FROM pbx_pending_transfers t
      LEFT JOIN pbx_queues q ON q.id = t.queue_id
      WHERE t.id = ${id}::uuid LIMIT 1
    `),
  )[0];
  return row ? mapTransferRow(row) : null;
}

export async function listPendingTransfersForAgent(
  queueIds: string[],
): Promise<PbxPendingTransfer[]> {
  await ensureHybridTables();
  if (queueIds.length === 0) return [];
  const inList = sql.join(queueIds.map((id) => sql`${id}::uuid`), sql`, `);
  const result = await db.execute(sql`
    SELECT t.*, q.name AS queue_name
    FROM pbx_pending_transfers t
    LEFT JOIN pbx_queues q ON q.id = t.queue_id
    WHERE t.status IN ('waiting', 'ringing')
      AND (t.queue_id IN (${inList}) OR t.queue_id IS NULL)
    ORDER BY t.created_at ASC
    LIMIT 20
  `);
  return rows<{
    id: string;
    external_call_id: string;
    phone: string;
    ai_campaign_id: string;
    ai_campaign_name: string;
    queue_id: string | null;
    queue_name: string | null;
    agent_id: string | null;
    summary: string;
    context_json: Record<string, unknown>;
    status: string;
    created_at: Date;
    answered_at: Date | null;
  }>(result).map(mapTransferRow);
}

export async function acceptPendingTransfer(
  transferId: string,
  agentId: string,
): Promise<PbxPendingTransfer | null> {
  await ensureHybridTables();
  const existing = await getPendingTransferById(transferId);
  if (!existing || !["waiting", "ringing"].includes(existing.status)) {
    return null;
  }
  await db.execute(sql`
    UPDATE pbx_pending_transfers SET
      status = 'answered',
      agent_id = ${agentId}::uuid,
      answered_at = NOW()
    WHERE id = ${transferId}::uuid
  `);
  const { setAgentStatus } = await import("./service.js");
  await setAgentStatus(agentId, "on_call");
  await publishPbxRealtime();
  return getPendingTransferById(transferId);
}

export async function countActiveTransfersByQueue(): Promise<Map<string, { count: number; oldest: PbxPendingTransfer | null }>> {
  await ensureHybridTables();
  const pending = rows<{
    id: string;
    external_call_id: string;
    phone: string;
    ai_campaign_id: string;
    ai_campaign_name: string;
    queue_id: string | null;
    queue_name: string | null;
    agent_id: string | null;
    summary: string;
    context_json: Record<string, unknown>;
    status: string;
    created_at: Date;
    answered_at: Date | null;
  }>(
    await db.execute(sql`
      SELECT t.*, q.name AS queue_name
      FROM pbx_pending_transfers t
      LEFT JOIN pbx_queues q ON q.id = t.queue_id
      WHERE t.status IN ('waiting', 'ringing')
      ORDER BY t.created_at ASC
    `),
  ).map(mapTransferRow);

  const map = new Map<string, { count: number; oldest: PbxPendingTransfer | null }>();
  for (const t of pending) {
    const qid = t.queueId ?? "_none";
    const cur = map.get(qid) ?? { count: 0, oldest: null };
    cur.count += 1;
    if (!cur.oldest) cur.oldest = t;
    map.set(qid, cur);
  }
  return map;
}

export function mergeAiTransfersIntoLiveQueues(
  queues: PbxLiveQueueRow[],
  transferMap: Map<string, { count: number; oldest: PbxPendingTransfer | null }>,
): PbxLiveQueueRow[] {
  return queues.map((q) => {
    const t = transferMap.get(q.queueId);
    if (!t?.count) return q;
    const oldest = t.oldest;
    const waitSec = oldest
      ? Math.max(0, Math.floor((Date.now() - Date.parse(oldest.createdAt)) / 1000))
      : q.longestWaitSec;
    return {
      ...q,
      waiting: q.waiting + t.count,
      longestWaitSec: Math.max(q.longestWaitSec, waitSec),
      callType: t.count > 0 ? "AI Aktarım" : q.callType,
      phone: oldest?.phone ?? q.phone,
      campaignName: oldest?.aiCampaignName ?? q.campaignName,
    };
  });
}

export async function verifyTransferWebhookSecret(headerSecret: string | undefined): Promise<boolean> {
  const settings = await loadHybridSettings();
  const expected = settings.transferWebhookSecret;
  if (!expected) return true;
  return Boolean(headerSecret && headerSecret === expected);
}
