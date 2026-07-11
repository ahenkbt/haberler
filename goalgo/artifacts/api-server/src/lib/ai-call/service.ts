import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { decryptSecret, encryptSecret, hasEncryptedValue, maskSecret } from "./crypto.js";
import type {
  AiCallAssistant,
  AiCallCampaign,
  AiCallContact,
  AiCallFlow,
  AiCallLog,
  AiCallSettings,
  AiCallStatus,
} from "./types.js";

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

let ensured = false;

export async function ensureAiCallTables(): Promise<void> {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_call_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      openai_api_key_enc TEXT,
      gemini_api_key_enc TEXT,
      default_provider TEXT NOT NULL DEFAULT 'openai',
      default_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      demo_mode BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    INSERT INTO ai_call_settings (default_provider, default_model, demo_mode)
    SELECT 'openai', 'gpt-4o-mini', true
    WHERE NOT EXISTS (SELECT 1 FROM ai_call_settings LIMIT 1)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_call_assistants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      system_prompt TEXT NOT NULL DEFAULT '',
      voice TEXT NOT NULL DEFAULT 'alloy',
      provider TEXT NOT NULL DEFAULT 'openai',
      model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_call_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      assistant_id UUID REFERENCES ai_call_assistants(id) ON DELETE SET NULL,
      trunk_id UUID REFERENCES pbx_trunks(id) ON DELETE SET NULL,
      contact_list_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      schedule_json JSONB,
      routing_mode TEXT NOT NULL DEFAULT 'ai_only',
      status TEXT NOT NULL DEFAULT 'draft',
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_call_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES ai_call_campaigns(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_called_at TIMESTAMPTZ,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_call_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES ai_call_campaigns(id) ON DELETE SET NULL,
      contact_id UUID REFERENCES ai_call_contacts(id) ON DELETE SET NULL,
      assistant_id UUID REFERENCES ai_call_assistants(id) ON DELETE SET NULL,
      phone TEXT NOT NULL DEFAULT '',
      direction TEXT NOT NULL DEFAULT 'outbound',
      status TEXT NOT NULL DEFAULT 'completed',
      duration_sec INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      transcript TEXT NOT NULL DEFAULT '',
      ai_summary TEXT NOT NULL DEFAULT '',
      transferred BOOLEAN NOT NULL DEFAULT false,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_call_flows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      flow_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ensured = true;
}

type SettingsRow = {
  id: string;
  openai_api_key_enc: string | null;
  gemini_api_key_enc: string | null;
  default_provider: string;
  default_model: string;
  demo_mode: boolean;
};

export async function loadSettingsRow(): Promise<SettingsRow> {
  await ensureAiCallTables();
  const row = rows<SettingsRow>(
    await db.execute(sql`
      SELECT id, openai_api_key_enc, gemini_api_key_enc, default_provider, default_model, demo_mode
      FROM ai_call_settings ORDER BY created_at LIMIT 1
    `),
  )[0];
  if (!row) throw new Error("AI Call ayarları bulunamadı.");
  return row;
}

export async function getSettingsPublic(): Promise<AiCallSettings> {
  const row = await loadSettingsRow();
  const openaiPlain = row.openai_api_key_enc ? decryptSecret(row.openai_api_key_enc) : "";
  const geminiPlain = row.gemini_api_key_enc ? decryptSecret(row.gemini_api_key_enc) : "";
  return {
    id: row.id,
    defaultProvider: row.default_provider === "gemini" ? "gemini" : "openai",
    defaultModel: row.default_model,
    demoMode: row.demo_mode === true,
    hasOpenaiKey: hasEncryptedValue(row.openai_api_key_enc),
    hasGeminiKey: hasEncryptedValue(row.gemini_api_key_enc),
    openaiKeyMasked: maskSecret(openaiPlain),
    geminiKeyMasked: maskSecret(geminiPlain),
  };
}

export async function updateSettings(input: Record<string, unknown>): Promise<AiCallSettings> {
  await ensureAiCallTables();
  const row = await loadSettingsRow();
  const openaiKey = input.openaiApiKey != null ? String(input.openaiApiKey).trim() : undefined;
  const geminiKey = input.geminiApiKey != null ? String(input.geminiApiKey).trim() : undefined;
  const clearOpenai = input.clearOpenaiKey === true;
  const clearGemini = input.clearGeminiKey === true;
  const defaultProvider = input.defaultProvider != null ? String(input.defaultProvider) : row.default_provider;
  const defaultModel = input.defaultModel != null ? String(input.defaultModel).trim() : row.default_model;
  const demoMode = input.demoMode !== undefined ? input.demoMode !== false : row.demo_mode;

  let openaiEnc = row.openai_api_key_enc;
  let geminiEnc = row.gemini_api_key_enc;
  if (clearOpenai) openaiEnc = null;
  else if (openaiKey) openaiEnc = encryptSecret(openaiKey);
  if (clearGemini) geminiEnc = null;
  else if (geminiKey) geminiEnc = encryptSecret(geminiKey);

  await db.execute(sql`
    UPDATE ai_call_settings SET
      openai_api_key_enc = ${openaiEnc},
      gemini_api_key_enc = ${geminiEnc},
      default_provider = ${defaultProvider},
      default_model = ${defaultModel},
      demo_mode = ${demoMode},
      updated_at = NOW()
    WHERE id = ${row.id}::uuid
  `);
  return getSettingsPublic();
}

function mapAssistant(r: {
  id: string;
  name: string;
  system_prompt: string;
  voice: string;
  provider: string;
  model: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}): AiCallAssistant {
  return {
    id: r.id,
    name: r.name,
    systemPrompt: r.system_prompt,
    voice: r.voice,
    provider: r.provider === "gemini" ? "gemini" : "openai",
    model: r.model,
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function listAssistants(): Promise<AiCallAssistant[]> {
  await ensureAiCallTables();
  return rows<Parameters<typeof mapAssistant>[0]>(
    await db.execute(sql`
      SELECT id, name, system_prompt, voice, provider, model, enabled, created_at, updated_at
      FROM ai_call_assistants ORDER BY name
    `),
  ).map(mapAssistant);
}

export async function getAssistant(id: string): Promise<AiCallAssistant | null> {
  await ensureAiCallTables();
  const row = rows<Parameters<typeof mapAssistant>[0]>(
    await db.execute(sql`
      SELECT id, name, system_prompt, voice, provider, model, enabled, created_at, updated_at
      FROM ai_call_assistants WHERE id = ${id}::uuid LIMIT 1
    `),
  )[0];
  return row ? mapAssistant(row) : null;
}

export async function upsertAssistant(input: Record<string, unknown>): Promise<AiCallAssistant> {
  await ensureAiCallTables();
  const id = input.id ? String(input.id) : null;
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Asistan adı zorunludur.");
  const systemPrompt = String(input.systemPrompt ?? input.system_prompt ?? "");
  const voice = String(input.voice ?? "alloy");
  const provider = String(input.provider ?? "openai");
  const model = String(input.model ?? "gpt-4o-mini");
  const enabled = input.enabled !== false;

  if (id) {
    await db.execute(sql`
      UPDATE ai_call_assistants SET
        name = ${name}, system_prompt = ${systemPrompt}, voice = ${voice},
        provider = ${provider}, model = ${model}, enabled = ${enabled}, updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
    const a = await getAssistant(id);
    if (!a) throw new Error("Asistan güncellenemedi.");
    return a;
  }
  const newId = randomUUID();
  await db.execute(sql`
    INSERT INTO ai_call_assistants (id, name, system_prompt, voice, provider, model, enabled)
    VALUES (${newId}::uuid, ${name}, ${systemPrompt}, ${voice}, ${provider}, ${model}, ${enabled})
  `);
  const a = await getAssistant(newId);
  if (!a) throw new Error("Asistan oluşturulamadı.");
  return a;
}

export async function deleteAssistant(id: string): Promise<void> {
  await ensureAiCallTables();
  await db.execute(sql`DELETE FROM ai_call_assistants WHERE id = ${id}::uuid`);
}

function mapCampaign(r: {
  id: string;
  name: string;
  assistant_id: string | null;
  assistant_name?: string | null;
  trunk_id: string | null;
  trunk_name?: string | null;
  routing_mode: string;
  status: string;
  enabled: boolean;
  schedule_json: unknown;
  contact_count?: number;
  created_at: Date;
  updated_at: Date;
}): AiCallCampaign {
  return {
    id: r.id,
    name: r.name,
    assistantId: r.assistant_id,
    assistantName: r.assistant_name ?? null,
    trunkId: r.trunk_id,
    trunkName: r.trunk_name ?? null,
    routingMode: r.routing_mode === "hybrid" ? "hybrid" : "ai_only",
    status: r.status as AiCallCampaign["status"],
    enabled: r.enabled,
    contactCount: Number(r.contact_count ?? 0),
    scheduleJson: r.schedule_json,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function listCampaigns(): Promise<AiCallCampaign[]> {
  await ensureAiCallTables();
  return rows<Parameters<typeof mapCampaign>[0]>(
    await db.execute(sql`
      SELECT c.id, c.name, c.assistant_id, a.name AS assistant_name,
             c.trunk_id, t.name AS trunk_name, c.routing_mode, c.status, c.enabled,
             c.schedule_json,
             (SELECT COUNT(*)::int FROM ai_call_contacts cc WHERE cc.campaign_id = c.id) AS contact_count,
             c.created_at, c.updated_at
      FROM ai_call_campaigns c
      LEFT JOIN ai_call_assistants a ON a.id = c.assistant_id
      LEFT JOIN pbx_trunks t ON t.id = c.trunk_id
      ORDER BY c.created_at DESC
    `),
  ).map(mapCampaign);
}

export async function getCampaign(id: string): Promise<AiCallCampaign | null> {
  const all = await listCampaigns();
  return all.find((c) => c.id === id) ?? null;
}

export async function upsertCampaign(input: Record<string, unknown>): Promise<AiCallCampaign> {
  await ensureAiCallTables();
  const id = input.id ? String(input.id) : null;
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Kampanya adı zorunludur.");
  const assistantId = input.assistantId ?? input.assistant_id ?? null;
  const trunkId = input.trunkId ?? input.trunk_id ?? null;
  const routingMode = String(input.routingMode ?? input.routing_mode ?? "ai_only");
  const enabled = input.enabled !== false;
  const scheduleJson = input.scheduleJson ?? input.schedule_json ?? null;
  const contacts = Array.isArray(input.contacts) ? input.contacts : null;

  let campaignId = id;
  if (id) {
    await db.execute(sql`
      UPDATE ai_call_campaigns SET
        name = ${name},
        assistant_id = ${assistantId ? String(assistantId) : null}::uuid,
        trunk_id = ${trunkId ? String(trunkId) : null}::uuid,
        routing_mode = ${routingMode},
        enabled = ${enabled},
        schedule_json = ${scheduleJson ? JSON.stringify(scheduleJson) : null}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    campaignId = randomUUID();
    await db.execute(sql`
      INSERT INTO ai_call_campaigns (id, name, assistant_id, trunk_id, routing_mode, enabled, schedule_json)
      VALUES (
        ${campaignId}::uuid, ${name},
        ${assistantId ? String(assistantId) : null}::uuid,
        ${trunkId ? String(trunkId) : null}::uuid,
        ${routingMode}, ${enabled},
        ${scheduleJson ? JSON.stringify(scheduleJson) : null}::jsonb
      )
    `);
  }

  if (contacts && campaignId) {
    await syncCampaignContacts(campaignId, contacts);
  }

  const c = await getCampaign(campaignId!);
  if (!c) throw new Error("Kampanya kaydedilemedi.");
  return c;
}

export async function syncCampaignContacts(
  campaignId: string,
  contacts: { phone: string; name?: string }[],
): Promise<void> {
  await ensureAiCallTables();
  await db.execute(sql`DELETE FROM ai_call_contacts WHERE campaign_id = ${campaignId}::uuid`);
  for (const c of contacts) {
    const phone = String(c.phone ?? "").trim();
    if (!phone) continue;
    await db.execute(sql`
      INSERT INTO ai_call_contacts (campaign_id, phone, name, status)
      VALUES (${campaignId}::uuid, ${phone}, ${String(c.name ?? "")}, 'pending')
    `);
  }
}

export async function listCampaignContacts(campaignId: string): Promise<AiCallContact[]> {
  await ensureAiCallTables();
  return rows<{
    id: string;
    campaign_id: string;
    phone: string;
    name: string;
    status: string;
    attempts: number;
    last_called_at: Date | null;
  }>(
    await db.execute(sql`
      SELECT id, campaign_id, phone, name, status, attempts, last_called_at
      FROM ai_call_contacts WHERE campaign_id = ${campaignId}::uuid ORDER BY created_at
    `),
  ).map((r) => ({
    id: r.id,
    campaignId: r.campaign_id,
    phone: r.phone,
    name: r.name,
    status: r.status as AiCallContact["status"],
    attempts: r.attempts,
    lastCalledAt: r.last_called_at ? new Date(r.last_called_at).toISOString() : null,
  }));
}

export async function setCampaignStatus(id: string, status: string): Promise<AiCallCampaign> {
  await ensureAiCallTables();
  await db.execute(sql`
    UPDATE ai_call_campaigns SET status = ${status}, updated_at = NOW() WHERE id = ${id}::uuid
  `);
  const c = await getCampaign(id);
  if (!c) throw new Error("Kampanya bulunamadı.");
  return c;
}

export async function deleteCampaign(id: string): Promise<void> {
  await ensureAiCallTables();
  await db.execute(sql`DELETE FROM ai_call_campaigns WHERE id = ${id}::uuid`);
}

function mapLog(r: {
  id: string;
  campaign_id: string | null;
  contact_id: string | null;
  assistant_id: string | null;
  phone: string;
  direction: string;
  status: string;
  duration_sec: number;
  provider: string;
  model: string;
  transcript: string;
  ai_summary: string;
  transferred: boolean;
  started_at: Date;
  ended_at: Date | null;
}): AiCallLog {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    contactId: r.contact_id,
    assistantId: r.assistant_id,
    phone: r.phone,
    direction: r.direction,
    status: r.status,
    durationSec: r.duration_sec,
    provider: r.provider,
    model: r.model,
    transcript: r.transcript,
    aiSummary: r.ai_summary,
    transferred: r.transferred,
    startedAt: new Date(r.started_at).toISOString(),
    endedAt: r.ended_at ? new Date(r.ended_at).toISOString() : null,
  };
}

export async function listLogs(limit = 100): Promise<AiCallLog[]> {
  await ensureAiCallTables();
  const lim = Math.min(Math.max(limit, 1), 500);
  return rows<Parameters<typeof mapLog>[0]>(
    await db.execute(sql`
      SELECT id, campaign_id, contact_id, assistant_id, phone, direction, status,
             duration_sec, provider, model, transcript, ai_summary, transferred,
             started_at, ended_at
      FROM ai_call_logs ORDER BY started_at DESC LIMIT ${lim}
    `),
  ).map(mapLog);
}

export async function insertCallLog(input: {
  campaignId?: string | null;
  contactId?: string | null;
  assistantId?: string | null;
  phone: string;
  provider: string;
  model: string;
  transcript: string;
  aiSummary: string;
  transferred?: boolean;
  durationSec?: number;
  status?: string;
}): Promise<string> {
  await ensureAiCallTables();
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO ai_call_logs (
      id, campaign_id, contact_id, assistant_id, phone, direction, status,
      duration_sec, provider, model, transcript, ai_summary, transferred, ended_at
    ) VALUES (
      ${id}::uuid,
      ${input.campaignId ?? null}::uuid,
      ${input.contactId ?? null}::uuid,
      ${input.assistantId ?? null}::uuid,
      ${input.phone},
      'outbound',
      ${input.status ?? "completed"},
      ${input.durationSec ?? 0},
      ${input.provider},
      ${input.model},
      ${input.transcript},
      ${input.aiSummary},
      ${input.transferred === true},
      NOW()
    )
  `);
  return id;
}

export async function getNativeStatus(): Promise<AiCallStatus> {
  await ensureAiCallTables();
  const settings = await getSettingsPublic();
  const stats = rows<{
    trunk_count: number;
    assistant_count: number;
    campaign_count: number;
    running: number;
    total_calls: number;
  }>(
    await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM pbx_trunks) AS trunk_count,
        (SELECT COUNT(*)::int FROM ai_call_assistants) AS assistant_count,
        (SELECT COUNT(*)::int FROM ai_call_campaigns) AS campaign_count,
        (SELECT COUNT(*)::int FROM ai_call_campaigns WHERE status = 'running') AS running,
        (SELECT COUNT(*)::int FROM ai_call_logs) AS total_calls
    `),
  )[0];
  return {
    native: true,
    demoMode: settings.demoMode,
    configured: settings.hasOpenaiKey || settings.hasGeminiKey || settings.demoMode,
    openaiConfigured: settings.hasOpenaiKey,
    geminiConfigured: settings.hasGeminiKey,
    trunkCount: stats?.trunk_count ?? 0,
    assistantCount: stats?.assistant_count ?? 0,
    campaignCount: stats?.campaign_count ?? 0,
    runningCampaigns: stats?.running ?? 0,
    totalCalls: stats?.total_calls ?? 0,
  };
}

export async function listFlows(): Promise<AiCallFlow[]> {
  await ensureAiCallTables();
  return rows<{
    id: string;
    name: string;
    description: string;
    flow_json: unknown;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    await db.execute(sql`
      SELECT id, name, description, flow_json, enabled, created_at, updated_at
      FROM ai_call_flows ORDER BY name
    `),
  ).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    flowJson: r.flow_json,
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function upsertFlow(input: Record<string, unknown>): Promise<AiCallFlow> {
  await ensureAiCallTables();
  const id = input.id ? String(input.id) : randomUUID();
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Akış adı zorunludur.");
  const description = String(input.description ?? "");
  const flowJson = input.flowJson ?? input.flow_json ?? {};
  const enabled = input.enabled !== false;
  const exists = rows<{ id: string }>(
    await db.execute(sql`SELECT id FROM ai_call_flows WHERE id = ${id}::uuid LIMIT 1`),
  )[0];
  if (exists) {
    await db.execute(sql`
      UPDATE ai_call_flows SET name = ${name}, description = ${description},
        flow_json = ${JSON.stringify(flowJson)}::jsonb, enabled = ${enabled}, updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    await db.execute(sql`
      INSERT INTO ai_call_flows (id, name, description, flow_json, enabled)
      VALUES (${id}::uuid, ${name}, ${description}, ${JSON.stringify(flowJson)}::jsonb, ${enabled})
    `);
  }
  const flows = await listFlows();
  const flow = flows.find((f) => f.id === id);
  if (!flow) throw new Error("Akış kaydedilemedi.");
  return flow;
}

export async function deleteFlow(id: string): Promise<void> {
  await ensureAiCallTables();
  await db.execute(sql`DELETE FROM ai_call_flows WHERE id = ${id}::uuid`);
}

export async function seedDemoIfEmpty(): Promise<{ seeded: boolean }> {
  await ensureAiCallTables();
  const assistants = await listAssistants();
  if (assistants.length > 0) return { seeded: false };

  const assistant = await upsertAssistant({
    name: "Demo Asistan",
    systemPrompt:
      "Sen Yekpare AI Call demo asistanısın. Kısa, nazik ve Türkçe yanıt ver. Müşteriye ürün hakkında bilgi ver.",
    provider: "openai",
    model: "gpt-4o-mini",
    voice: "alloy",
  });

  await upsertCampaign({
    name: "Demo Kampanya",
    assistantId: assistant.id,
    routingMode: "hybrid",
    contacts: [
      { phone: "+905551112233", name: "Demo Kişi 1" },
      { phone: "+905554445566", name: "Demo Kişi 2" },
    ],
  });

  return { seeded: true };
}
