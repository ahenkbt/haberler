import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { decryptSecret, encryptSecret, hasEncryptedValue, maskSecret } from "../ai-call/crypto.js";
import { agentStatusLabelTr } from "./auth.js";
import {
  fetchVerimorAgentStatuses,
  fetchVerimorQueues,
  fetchVerimorUserStatuses,
  fetchWebphoneToken,
  manageVerimorQueueUsers,
  testVerimorConnection,
  webphoneIframeUrl,
  type VerimorConfig,
} from "./verimor-client.js";
import { listExtensions, listAgents, listTrunks, upsertAgent } from "./service.js";
import type {
  PbxAgent,
  PbxAgentStatus,
  PbxExtension,
  PbxLiveAgentRow,
  PbxLiveQueueRow,
  PbxRealtimeSnapshot,
  PbxStats,
  PbxSummary,
} from "./types.js";

export type VerimorSettingsPublic = {
  enabled: boolean;
  softphoneEnabled: boolean;
  domain: string | null;
  hasApiKey: boolean;
  apiKeyMasked: string;
  apiOptional: boolean;
  webhookUrl: string;
  reportEventUrl: string;
};

export type VerimorCampaignRow = {
  id: string;
  verimorCampaignId: string;
  name: string;
  callType: string;
  queueNumber: number | null;
  status: string;
  enabled: boolean;
};

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

function publicBaseUrl(): string {
  return String(process.env.PUBLIC_API_URL ?? process.env.API_PUBLIC_URL ?? "https://yekpare.net").replace(/\/+$/, "");
}

export async function ensureVerimorTables(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE pbx_settings
      ADD COLUMN IF NOT EXISTS verimor_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS verimor_api_key_enc TEXT,
      ADD COLUMN IF NOT EXISTS verimor_domain TEXT,
      ADD COLUMN IF NOT EXISTS verimor_webhook_secret TEXT
  `);
  await db.execute(sql`
    ALTER TABLE pbx_extensions
      ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'local',
      ADD COLUMN IF NOT EXISTS external_number TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS verimor_queue_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS sip_domain TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS sip_wss_url TEXT
  `);
  await db.execute(sql`
    ALTER TABLE pbx_agents
      ADD COLUMN IF NOT EXISTS active_campaign_id UUID REFERENCES pbx_campaigns(id) ON DELETE SET NULL
  `);
  await db.execute(sql`
    ALTER TABLE pbx_settings
      ADD COLUMN IF NOT EXISTS verimor_softphone_enabled BOOLEAN NOT NULL DEFAULT false
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_verimor_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      verimor_campaign_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      call_type TEXT NOT NULL DEFAULT 'queue',
      queue_number INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      enabled BOOLEAN NOT NULL DEFAULT true,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_verimor_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL DEFAULT '',
      caller_id TEXT NOT NULL DEFAULT '',
      extension TEXT NOT NULL DEFAULT '',
      call_uuid TEXT NOT NULL DEFAULT '',
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function loadVerimorSettingsRow(): Promise<{
  enabled: boolean;
  softphoneEnabled: boolean;
  apiKeyEnc: string | null;
  domain: string | null;
  webhookSecret: string | null;
}> {
  await ensureVerimorTables();
  const row = rows<{
    verimor_enabled: boolean;
    verimor_softphone_enabled: boolean;
    verimor_api_key_enc: string | null;
    verimor_domain: string | null;
    verimor_webhook_secret: string | null;
  }>(
    await db.execute(sql`
      SELECT verimor_enabled, verimor_softphone_enabled, verimor_api_key_enc, verimor_domain, verimor_webhook_secret
      FROM pbx_settings WHERE id = 1 LIMIT 1
    `),
  )[0];
  return {
    enabled: row?.verimor_enabled === true,
    softphoneEnabled: row?.verimor_softphone_enabled === true,
    apiKeyEnc: row?.verimor_api_key_enc ?? null,
    domain: row?.verimor_domain ?? null,
    webhookSecret: row?.verimor_webhook_secret ?? null,
  };
}

export async function getVerimorConfig(): Promise<VerimorConfig | null> {
  const row = await loadVerimorSettingsRow();
  const envKey = String(process.env.VERIMOR_API_KEY ?? "").trim();
  const apiKey = envKey || (row.apiKeyEnc ? decryptSecret(row.apiKeyEnc) : "");
  if (!apiKey) return null;
  const domain = row.domain || String(process.env.VERIMOR_DOMAIN ?? "").trim() || null;
  return { apiKey, domain };
}

export function isPbxVerimorMode(): boolean {
  const envKey = String(process.env.VERIMOR_API_KEY ?? "").trim();
  if (envKey) return true;
  return false;
}

export async function isPbxVerimorActive(): Promise<boolean> {
  const { isVerimorSoftphoneActive } = await import("./verimor-softphone.js");
  if (await isVerimorSoftphoneActive()) return true;
  const row = await loadVerimorSettingsRow();
  if (row.enabled && (await getVerimorConfig())) return true;
  return Boolean(process.env.VERIMOR_API_KEY);
}

export async function getVerimorSettingsPublic(): Promise<VerimorSettingsPublic> {
  const row = await loadVerimorSettingsRow();
  const config = await getVerimorConfig();
  const base = publicBaseUrl();
  const plainKey = config?.apiKey ?? "";
  return {
    enabled: row.enabled || row.softphoneEnabled,
    softphoneEnabled: row.softphoneEnabled || row.enabled,
    domain: row.domain ?? process.env.VERIMOR_DOMAIN ?? null,
    hasApiKey: hasEncryptedValue(row.apiKeyEnc) || Boolean(process.env.VERIMOR_API_KEY),
    apiKeyMasked: plainKey ? maskSecret(plainKey) : "",
    apiOptional: true,
    webhookUrl: `${base}/api/pbx/webhooks/verimor/report-event`,
    reportEventUrl: `${base}/api/pbx/webhooks/verimor/report-event`,
  };
}

export async function updateVerimorSettings(input: {
  enabled?: boolean;
  softphoneEnabled?: boolean;
  domain?: string | null;
  apiKey?: string;
}): Promise<VerimorSettingsPublic> {
  await ensureVerimorTables();
  if (input.enabled !== undefined) {
    await db.execute(sql`UPDATE pbx_settings SET verimor_enabled = ${input.enabled}, updated_at = NOW() WHERE id = 1`);
  }
  if (input.softphoneEnabled !== undefined) {
    await db.execute(sql`
      UPDATE pbx_settings SET verimor_softphone_enabled = ${input.softphoneEnabled}, verimor_enabled = ${input.softphoneEnabled}, updated_at = NOW() WHERE id = 1
    `);
  }
  if (input.domain !== undefined) {
    await db.execute(sql`UPDATE pbx_settings SET verimor_domain = ${input.domain}, updated_at = NOW() WHERE id = 1`);
  }
  if (input.apiKey !== undefined && input.apiKey.trim()) {
    await db.execute(sql`
      UPDATE pbx_settings SET verimor_api_key_enc = ${encryptSecret(input.apiKey.trim())}, updated_at = NOW() WHERE id = 1
    `);
  }
  const secretRow = rows<{ s: string | null }>(
    await db.execute(sql`SELECT verimor_webhook_secret AS s FROM pbx_settings WHERE id = 1`),
  )[0];
  if (!secretRow?.s) {
    await db.execute(sql`
      UPDATE pbx_settings SET verimor_webhook_secret = ${randomBytes(24).toString("hex")}, updated_at = NOW() WHERE id = 1
    `);
  }
  return getVerimorSettingsPublic();
}

function mapVerimorStatus(status: string): PbxAgentStatus {
  const map: Record<string, PbxAgentStatus> = {
    AVAILABLE: "available",
    TALKING: "on_call",
    LOGGED_OUT: "offline",
    ON_BREAK: "break",
    online: "available",
    offline: "offline",
    busy: "on_call",
  };
  return map[status] ?? "offline";
}

export async function buildVerimorSnapshot(): Promise<PbxRealtimeSnapshot> {
  const config = await getVerimorConfig();
  const extensions = await listExtensions();
  const agents = await listAgents();
  let queueRows: PbxLiveQueueRow[] = [];
  let agentRows: PbxLiveAgentRow[] = agents.map((a) => ({
    agentId: a.id,
    displayName: a.displayName,
    extension: a.extension ?? null,
    campaignName: a.activeCampaignName ?? undefined,
    status: a.status,
    statusLabelTr: a.statusLabelTr,
    currentCall: a.status === "on_call" ? "Aktif" : null,
    queueNames: [],
    loginDurationSec: 0,
    callsHandledToday: 0,
  }));

  if (config) {
    try {
      const [queues, agentStatuses] = await Promise.all([
        fetchVerimorQueues(config),
        fetchVerimorAgentStatuses(config),
      ]);
      queueRows = queues.map((q) => ({
        queueId: String(q.number),
        queueName: q.name,
        waiting: 0,
        longestWaitSec: 0,
        agentsLoggedIn: agentStatuses.filter((a) => a.queues.includes(String(q.number))).length,
        agentsAvailable: agentStatuses.filter((a) => a.queues.includes(String(q.number)) && a.status === "AVAILABLE").length,
        agentsOnCall: agentStatuses.filter((a) => a.queues.includes(String(q.number)) && a.status === "TALKING").length,
        callsAnsweredToday: 0,
        callsAbandonedToday: 0,
        serviceLevelPct: 0,
      }));
    } catch {
      /* API yoksa veya hata — yerel veri kullan */
    }
  }

  const trunks = await listTrunks();
  const summary: PbxSummary = {
    totalRecords: extensions.length,
    activeCards: extensions.filter((e) => e.enabled).length,
    backend: "verimor",
    totalTrunks: trunks.length,
    activeTrunks: trunks.filter((t) => t.enabled).length,
    totalExtensions: extensions.length,
    activeExtensions: extensions.filter((e) => e.enabled).length,
    totalQueues: queueRows.length,
    totalAgents: agents.length || agentRows.length,
    agentsOnline: agentRows.filter((a) => a.status !== "offline").length,
    callsInQueue: 0,
    activeCalls: agentRows.filter((a) => a.status === "on_call").length,
    demoMode: false,
    sipBridgeConnected: true,
  };
  const stats: PbxStats = {
    callsToday: 0,
    answeredToday: 0,
    abandonedToday: 0,
    avgTalkSec: 0,
    avgWaitSec: 0,
    serviceLevelPct: 0,
  };
  return { summary, queues: queueRows, agents: agentRows, stats, updatedAt: new Date().toISOString() };
}

export async function verifyVerimorExtensionLogin(
  username: string,
  password: string,
): Promise<{ extension: PbxExtension; agent: PbxAgent; webphoneToken: string; webphoneUrl: string } | null> {
  const config = await getVerimorConfig();
  if (!config) return null;

  const extensions = await listExtensions(true);
  const extNum = username.trim();
  const ext = extensions.find(
    (e) => e.enabled && (e.extension === extNum || e.extension === extNum.replace(/^0+/, "")),
  );
  if (!ext || ext.sipSecret !== password) {
    const agents = await listAgents();
    const agent = agents.find((a) => a.username === extNum || a.username === username.trim());
    if (!agent || !agent.enabled) return null;
    const linked = extensions.find((e) => e.id === agent.extensionId);
    if (!linked || linked.sipSecret !== password) {
      const row = await getAgentPasswordHash(agent.id);
      if (!row || !(await bcrypt.compare(password, row))) return null;
      if (!linked) return null;
    }
    const tokenResult = await fetchWebphoneToken(config, linked.extension);
    if (!tokenResult.ok || !tokenResult.token) return null;
    return {
      extension: linked,
      agent: { ...agent, extension: linked.extension },
      webphoneToken: tokenResult.token,
      webphoneUrl: webphoneIframeUrl(tokenResult.token),
    };
  }

  const tokenResult = await fetchWebphoneToken(config, ext.extension);
  if (!tokenResult.ok || !tokenResult.token) return null;

  let agent = (await listAgents()).find((a) => a.extensionId === ext.id);
  if (!agent) {
    agent = await upsertAgent({
      username: ext.extension,
      displayName: ext.displayName,
      password,
      extensionId: ext.id,
      enabled: true,
      queueIds: ext.queueIds ?? [],
    });
  }

  return {
    extension: ext,
    agent: { ...agent, extension: ext.extension },
    webphoneToken: tokenResult.token,
    webphoneUrl: webphoneIframeUrl(tokenResult.token),
  };
}

async function getAgentPasswordHash(agentId: string): Promise<string | null> {
  const row = rows<{ password_hash: string }>(
    await db.execute(sql`SELECT password_hash FROM pbx_agents WHERE id = ${agentId}::uuid LIMIT 1`),
  )[0];
  return row?.password_hash ?? null;
}

export async function refreshAgentWebphoneToken(extensionNumber: string): Promise<{ token: string; url: string } | null> {
  const config = await getVerimorConfig();
  if (!config) return null;
  const result = await fetchWebphoneToken(config, extensionNumber);
  if (!result.ok || !result.token) return null;
  return { token: result.token, url: webphoneIframeUrl(result.token) };
}

export async function listVerimorCampaigns(): Promise<VerimorCampaignRow[]> {
  await ensureVerimorTables();
  return rows<{
    id: string;
    verimor_campaign_id: string;
    name: string;
    call_type: string;
    queue_number: number | null;
    status: string;
    enabled: boolean;
  }>(
    await db.execute(sql`
      SELECT id, verimor_campaign_id, name, call_type, queue_number, status, enabled
      FROM pbx_verimor_campaigns ORDER BY created_at DESC
    `),
  ).map((r) => ({
    id: r.id,
    verimorCampaignId: r.verimor_campaign_id,
    name: r.name,
    callType: r.call_type,
    queueNumber: r.queue_number,
    status: r.status,
    enabled: r.enabled,
  }));
}

export async function upsertVerimorCampaign(input: Record<string, unknown>): Promise<VerimorCampaignRow> {
  await ensureVerimorTables();
  const id = input.id ? String(input.id) : null;
  const verimorCampaignId = String(input.verimorCampaignId ?? input.verimor_campaign_id ?? "").trim();
  const name = String(input.name ?? "").trim();
  if (!verimorCampaignId || !name) throw new Error("Kampanya ID ve ad zorunludur.");
  const callType = String(input.callType ?? input.call_type ?? "queue");
  const queueNumber = input.queueNumber != null ? Number(input.queueNumber) : null;
  const status = String(input.status ?? "active");
  const enabled = input.enabled !== false;

  if (id) {
    await db.execute(sql`
      UPDATE pbx_verimor_campaigns SET
        verimor_campaign_id = ${verimorCampaignId},
        name = ${name},
        call_type = ${callType},
        queue_number = ${queueNumber},
        status = ${status},
        enabled = ${enabled},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    await db.execute(sql`
      INSERT INTO pbx_verimor_campaigns (verimor_campaign_id, name, call_type, queue_number, status, enabled)
      VALUES (${verimorCampaignId}, ${name}, ${callType}, ${queueNumber}, ${status}, ${enabled})
    `);
  }
  const all = await listVerimorCampaigns();
  const row = all.find((c) => c.verimorCampaignId === verimorCampaignId);
  if (!row) throw new Error("Kampanya kaydedilemedi.");
  return row;
}

export async function joinVerimorCampaignQueue(
  extensionNumber: string,
  queueNumber: number,
): Promise<{ ok: boolean; error?: string }> {
  const config = await getVerimorConfig();
  if (!config) return { ok: false, error: "Verimor yapılandırılmamış." };
  return manageVerimorQueueUsers(config, queueNumber, "add", extensionNumber);
}

export async function leaveVerimorCampaignQueue(
  extensionNumber: string,
  queueNumber: number,
): Promise<{ ok: boolean; error?: string }> {
  const config = await getVerimorConfig();
  if (!config) return { ok: false, error: "Verimor yapılandırılmamış." };
  return manageVerimorQueueUsers(config, queueNumber, "remove", extensionNumber);
}

export async function storeVerimorReportEvent(payload: Record<string, unknown>): Promise<void> {
  await ensureVerimorTables();
  await db.execute(sql`
    INSERT INTO pbx_verimor_events (event_type, caller_id, extension, call_uuid, payload_json)
    VALUES (
      ${String(payload.event ?? payload.event_type ?? "unknown")},
      ${String(payload.caller_id ?? payload.callerId ?? "")},
      ${String(payload.extension ?? payload.user ?? "")},
      ${String(payload.call_uuid ?? payload.callUuid ?? "")},
      ${JSON.stringify(payload)}::jsonb
    )
  `);
}

export { testVerimorConnection, fetchVerimorQueues };
