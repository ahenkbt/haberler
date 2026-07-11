/**
 * PBX disposition (wrap-up) codes, scope rules, Google Sheets sync.
 */

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getAgentById } from "./service.js";
import { ensureVerimorTables } from "./verimor-bridge.js";
import { VERIMOR_WEBRTC_WSS_URL, normalizeVerimorWssUrl } from "./verimor-softphone.js";

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

export type PbxDispositionCode = {
  id: string;
  code: string;
  labelTr: string;
  category: string;
  categoryLabelTr: string;
  sortOrder: number;
  enabled: boolean;
  isSystem: boolean;
};

export type PbxCallDispositionRow = {
  id: string;
  agentId: string | null;
  agentName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  code: string;
  labelTr: string;
  phone: string;
  direction: string;
  notes: string;
  provider: string;
  createdAt: string;
  sheetsSynced: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  sales: "Satış / Pazarlama",
  support: "Destek / Sorun Çözme",
  system: "Sistem / Ulaşılamayan",
  admin: "İdari / Takip",
  general: "Genel",
};

const SEED_CODES: Array<{ code: string; labelTr: string; category: string; sortOrder: number }> = [
  { code: "sale_completed", labelTr: "Satış Gerçekleşti", category: "sales", sortOrder: 10 },
  { code: "lead_generated", labelTr: "Potansiyel Müşteri", category: "sales", sortOrder: 20 },
  { code: "quote_provided", labelTr: "Teklif Sunuldu", category: "sales", sortOrder: 30 },
  { code: "callback_thinking", labelTr: "Müşteri Düşünüyor / Geri Ara", category: "sales", sortOrder: 40 },
  { code: "refused", labelTr: "Red / İlgilenmiyor", category: "sales", sortOrder: 50 },
  { code: "resolved", labelTr: "Sorun Çözüldü", category: "support", sortOrder: 60 },
  { code: "ticket_created", labelTr: "Talep Alındı / İşlemde", category: "support", sortOrder: 70 },
  { code: "info_provided", labelTr: "Bilgilendirme Yapıldı", category: "support", sortOrder: 80 },
  { code: "wrong_number", labelTr: "Yanlış Arama", category: "support", sortOrder: 90 },
  { code: "dropped_call", labelTr: "Hat Kesildi / Ses Gitmedi", category: "system", sortOrder: 100 },
  { code: "voicemail", labelTr: "Telesekreter / Faks", category: "system", sortOrder: 110 },
  { code: "no_answer", labelTr: "Cevapsız / Ulaşılamıyor", category: "system", sortOrder: 120 },
  { code: "busy", labelTr: "Meşgul", category: "system", sortOrder: 130 },
  { code: "data_update", labelTr: "Bilgi Güncelleme", category: "admin", sortOrder: 140 },
  { code: "dnc", labelTr: "Kara Liste / Aranmak İstemiyor (DNC)", category: "admin", sortOrder: 150 },
  { code: "scheduled_callback", labelTr: "Tekrar Aranacak", category: "admin", sortOrder: 160 },
];

export async function ensureDispositionTables(): Promise<void> {
  await ensureVerimorTables();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_disposition_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      label_tr TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled BOOLEAN NOT NULL DEFAULT true,
      is_system BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_disposition_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      disposition_id UUID NOT NULL REFERENCES pbx_disposition_codes(id) ON DELETE CASCADE,
      scope_type TEXT NOT NULL DEFAULT 'global',
      scope_key TEXT NOT NULL DEFAULT '',
      enabled BOOLEAN NOT NULL DEFAULT true,
      UNIQUE (disposition_id, scope_type, scope_key)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_call_dispositions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID REFERENCES pbx_agents(id) ON DELETE SET NULL,
      campaign_id UUID REFERENCES pbx_campaigns(id) ON DELETE SET NULL,
      disposition_code_id UUID REFERENCES pbx_disposition_codes(id) ON DELETE SET NULL,
      code TEXT NOT NULL DEFAULT '',
      label_tr TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      direction TEXT NOT NULL DEFAULT 'outbound',
      call_uuid TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT '',
      scope_key TEXT NOT NULL DEFAULT '',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      sheets_synced BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    ALTER TABLE pbx_settings
      ADD COLUMN IF NOT EXISTS google_sheets_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS google_sheets_spreadsheet_id TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS google_sheets_sheet_name TEXT NOT NULL DEFAULT 'PBX Rapor',
      ADD COLUMN IF NOT EXISTS google_sheets_webhook_url TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS google_sheets_connected_email TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS verimor_default_wss_url TEXT NOT NULL DEFAULT ''
  `);

  for (const c of SEED_CODES) {
    await db.execute(sql`
      INSERT INTO pbx_disposition_codes (code, label_tr, category, sort_order, enabled, is_system)
      VALUES (${c.code}, ${c.labelTr}, ${c.category}, ${c.sortOrder}, true, true)
      ON CONFLICT (code) DO NOTHING
    `);
  }
}

function mapCode(r: {
  id: string;
  code: string;
  label_tr: string;
  category: string;
  sort_order: number;
  enabled: boolean;
  is_system: boolean;
}): PbxDispositionCode {
  return {
    id: r.id,
    code: r.code,
    labelTr: r.label_tr,
    category: r.category,
    categoryLabelTr: CATEGORY_LABELS[r.category] ?? r.category,
    sortOrder: r.sort_order,
    enabled: r.enabled,
    isSystem: r.is_system,
  };
}

export async function listDispositionCodesAdmin(): Promise<PbxDispositionCode[]> {
  await ensureDispositionTables();
  const data = rows<{
    id: string;
    code: string;
    label_tr: string;
    category: string;
    sort_order: number;
    enabled: boolean;
    is_system: boolean;
  }>(await db.execute(sql`SELECT * FROM pbx_disposition_codes ORDER BY sort_order, label_tr`));
  return data.map(mapCode);
}

export async function upsertDispositionCode(input: Record<string, unknown>): Promise<PbxDispositionCode> {
  await ensureDispositionTables();
  const id = input.id ? String(input.id) : null;
  const code = String(input.code ?? "").trim();
  const labelTr = String(input.labelTr ?? input.label_tr ?? "").trim();
  const category = String(input.category ?? "general").trim();
  if (!code || !labelTr) throw new Error("Kod ve etiket zorunludur.");
  if (id) {
    await db.execute(sql`
      UPDATE pbx_disposition_codes SET
        code = ${code},
        label_tr = ${labelTr},
        category = ${category},
        sort_order = ${Number(input.sortOrder ?? 0)},
        enabled = ${input.enabled !== false},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    await db.execute(sql`
      INSERT INTO pbx_disposition_codes (code, label_tr, category, sort_order, enabled, is_system)
      VALUES (${code}, ${labelTr}, ${category}, ${Number(input.sortOrder ?? 0)}, ${input.enabled !== false}, false)
    `);
  }
  const all = await listDispositionCodesAdmin();
  return all.find((c) => c.code === code) ?? all[0]!;
}

export async function setDispositionRule(
  dispositionId: string,
  scopeType: string,
  scopeKey: string,
  enabled: boolean,
): Promise<void> {
  await ensureDispositionTables();
  await db.execute(sql`
    INSERT INTO pbx_disposition_rules (disposition_id, scope_type, scope_key, enabled)
    VALUES (${dispositionId}::uuid, ${scopeType}, ${scopeKey}, ${enabled})
    ON CONFLICT (disposition_id, scope_type, scope_key)
    DO UPDATE SET enabled = ${enabled}
  `);
}

export async function listDispositionRules(): Promise<
  Array<{ dispositionId: string; scopeType: string; scopeKey: string; enabled: boolean }>
> {
  await ensureDispositionTables();
  return rows<{ disposition_id: string; scope_type: string; scope_key: string; enabled: boolean }>(
    await db.execute(sql`SELECT disposition_id, scope_type, scope_key, enabled FROM pbx_disposition_rules`),
  ).map((r) => ({
    dispositionId: r.disposition_id,
    scopeType: r.scope_type,
    scopeKey: r.scope_key,
    enabled: r.enabled,
  }));
}

function ruleAllows(
  codeId: string,
  rules: Array<{ dispositionId: string; scopeType: string; scopeKey: string; enabled: boolean }>,
  scopeType: string,
  scopeKey: string,
): boolean | null {
  const match = rules.find(
    (r) => r.dispositionId === codeId && r.scopeType === scopeType && r.scopeKey === scopeKey,
  );
  return match ? match.enabled : null;
}

export async function listAgentDispositionCodes(agentId: string): Promise<PbxDispositionCode[]> {
  await ensureDispositionTables();
  const agent = await getAgentById(agentId);
  if (!agent) return [];

  const codes = await listDispositionCodesAdmin();
  const rules = await listDispositionRules();

  let campaignProvider = "";
  let campaignTrunkId = "";
  let campaignSipDomain = "";
  if (agent.activeCampaignId) {
    const camp = rows<{
      provider: string;
      trunk_id: string | null;
      sip_domain: string;
    }>(
      await db.execute(sql`
        SELECT provider, trunk_id, sip_domain FROM pbx_campaigns WHERE id = ${agent.activeCampaignId}::uuid LIMIT 1
      `),
    )[0];
    if (camp) {
      campaignProvider = camp.provider ?? "";
      campaignTrunkId = camp.trunk_id ?? "";
      campaignSipDomain = camp.sip_domain ?? "";
    }
  }

  let extDomain = "";
  if (agent.extensionId) {
    const ext = rows<{ sip_domain: string }>(
      await db.execute(sql`SELECT sip_domain FROM pbx_extensions WHERE id = ${agent.extensionId}::uuid LIMIT 1`),
    )[0];
    extDomain = ext?.sip_domain ?? "";
  }

  const scopes: Array<{ type: string; key: string }> = [
    { type: "agent", key: agentId },
    { type: "campaign", key: agent.activeCampaignId ?? "" },
    { type: "verimor_domain", key: campaignSipDomain || extDomain },
    { type: "trunk", key: campaignTrunkId },
    { type: "provider", key: campaignProvider },
    { type: "global", key: "" },
  ];

  return codes.filter((code) => {
    if (!code.enabled) return false;
    let allowed = true;
    for (const s of scopes) {
      if (!s.key && s.type !== "global") continue;
      const rule = ruleAllows(code.id, rules, s.type, s.key);
      if (rule === false) allowed = false;
      if (rule === true) allowed = true;
    }
    const globalRule = ruleAllows(code.id, rules, "global", "");
    if (globalRule === false) return false;
    return allowed;
  });
}

export type GoogleSheetsConfig = {
  enabled: boolean;
  spreadsheetId: string;
  sheetName: string;
  webhookUrl: string;
  connectedEmail: string;
  verimorDefaultWssUrl: string;
};

export async function loadGoogleSheetsConfig(): Promise<GoogleSheetsConfig> {
  await ensureDispositionTables();
  const row = rows<{
    google_sheets_enabled: boolean;
    google_sheets_spreadsheet_id: string;
    google_sheets_sheet_name: string;
    google_sheets_webhook_url: string;
    google_sheets_connected_email: string;
    verimor_default_wss_url: string;
  }>(
    await db.execute(sql`
      SELECT google_sheets_enabled, google_sheets_spreadsheet_id, google_sheets_sheet_name,
        google_sheets_webhook_url, google_sheets_connected_email, verimor_default_wss_url
      FROM pbx_settings WHERE id = 1 LIMIT 1
    `),
  )[0];
  return {
    enabled: row?.google_sheets_enabled ?? false,
    spreadsheetId: row?.google_sheets_spreadsheet_id ?? "",
    sheetName: row?.google_sheets_sheet_name ?? "PBX Rapor",
    webhookUrl: row?.google_sheets_webhook_url ?? "",
    connectedEmail: row?.google_sheets_connected_email ?? "",
    verimorDefaultWssUrl: normalizeVerimorWssUrl(row?.verimor_default_wss_url?.trim() || VERIMOR_WEBRTC_WSS_URL),
  };
}

export async function saveGoogleSheetsConfig(input: Record<string, unknown>): Promise<GoogleSheetsConfig> {
  await ensureDispositionTables();
  const wssRaw = String(input.verimorDefaultWssUrl ?? input.verimor_default_wss_url ?? "").trim();
  const wssUrl = wssRaw ? normalizeVerimorWssUrl(wssRaw) : "";
  await db.execute(sql`
    UPDATE pbx_settings SET
      google_sheets_enabled = ${input.enabled === true},
      google_sheets_spreadsheet_id = ${String(input.spreadsheetId ?? input.spreadsheet_id ?? "")},
      google_sheets_sheet_name = ${String(input.sheetName ?? input.sheet_name ?? "PBX Rapor")},
      google_sheets_webhook_url = ${String(input.webhookUrl ?? input.webhook_url ?? "")},
      google_sheets_connected_email = ${String(input.connectedEmail ?? input.connected_email ?? "")},
      verimor_default_wss_url = ${wssUrl},
      updated_at = NOW()
    WHERE id = 1
  `);
  return loadGoogleSheetsConfig();
}

async function appendDispositionToSheets(row: PbxCallDispositionRow, agentName: string | null): Promise<boolean> {
  const cfg = await loadGoogleSheetsConfig();
  if (!cfg.enabled || !cfg.webhookUrl.trim()) return false;
  try {
    const payload = {
      timestamp: row.createdAt,
      agent: agentName ?? "",
      campaign: row.campaignName ?? "",
      phone: row.phone,
      direction: row.direction,
      dispositionCode: row.code,
      dispositionLabel: row.labelTr,
      notes: row.notes,
      provider: row.provider,
    };
    const res = await fetch(cfg.webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitAgentDisposition(
  agentId: string,
  input: Record<string, unknown>,
): Promise<PbxCallDispositionRow> {
  await ensureDispositionTables();
  const codeId = input.dispositionCodeId ? String(input.dispositionCodeId) : null;
  const codeSlug = String(input.code ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const notes = String(input.notes ?? "").trim();
  const callUuid = String(input.callUuid ?? input.call_uuid ?? "").trim();
  const direction = String(input.direction ?? "outbound");

  const agent = await getAgentById(agentId);
  if (!agent) throw new Error("Agent bulunamadı.");

  let codeRow = codeId
    ? rows<{ id: string; code: string; label_tr: string }>(
        await db.execute(sql`SELECT id, code, label_tr FROM pbx_disposition_codes WHERE id = ${codeId}::uuid LIMIT 1`),
      )[0]
    : codeSlug
      ? rows<{ id: string; code: string; label_tr: string }>(
          await db.execute(sql`SELECT id, code, label_tr FROM pbx_disposition_codes WHERE code = ${codeSlug} LIMIT 1`),
        )[0]
      : undefined;

  if (!codeRow) throw new Error("Geçerli bir sonlandırma kodu seçin.");

  const allowed = await listAgentDispositionCodes(agentId);
  if (!allowed.some((c) => c.id === codeRow!.id)) {
    throw new Error("Bu sonlandırma kodu sizin için aktif değil.");
  }

  let campaignName: string | null = null;
  let provider = "";
  if (agent.activeCampaignId) {
    const camp = rows<{ name: string; provider: string }>(
      await db.execute(sql`SELECT name, provider FROM pbx_campaigns WHERE id = ${agent.activeCampaignId}::uuid LIMIT 1`),
    )[0];
    campaignName = camp?.name ?? null;
    provider = camp?.provider ?? "";
  }

  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO pbx_call_dispositions (
      id, agent_id, campaign_id, disposition_code_id, code, label_tr, phone, direction,
      call_uuid, notes, provider, metadata_json
    ) VALUES (
      ${id}::uuid, ${agentId}::uuid, ${agent.activeCampaignId ?? null}::uuid,
      ${codeRow.id}::uuid, ${codeRow.code}, ${codeRow.label_tr}, ${phone}, ${direction},
      ${callUuid}, ${notes}, ${provider}, ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
  `);

  const result: PbxCallDispositionRow = {
    id,
    agentId,
    agentName: agent.displayName,
    campaignId: agent.activeCampaignId ?? null,
    campaignName,
    code: codeRow.code,
    labelTr: codeRow.label_tr,
    phone,
    direction,
    notes,
    provider,
    createdAt: new Date().toISOString(),
    sheetsSynced: false,
  };

  const synced = await appendDispositionToSheets(result, agent.displayName);
  if (synced) {
    await db.execute(sql`UPDATE pbx_call_dispositions SET sheets_synced = true WHERE id = ${id}::uuid`);
    result.sheetsSynced = true;
  }

  if (agent.activeCampaignId && phone) {
    const { markCampaignContactFromDisposition } = await import("./campaign-contacts.js");
    await markCampaignContactFromDisposition(agent.activeCampaignId, phone, codeRow.code);
  }

  return result;
}

export async function listCallDispositions(limit = 100): Promise<PbxCallDispositionRow[]> {
  await ensureDispositionTables();
  return rows<{
    id: string;
    agent_id: string | null;
    agent_name: string | null;
    campaign_id: string | null;
    campaign_name: string | null;
    code: string;
    label_tr: string;
    phone: string;
    direction: string;
    notes: string;
    provider: string;
    sheets_synced: boolean;
    created_at: Date;
  }>(
    await db.execute(sql`
      SELECT d.*, a.display_name AS agent_name, c.name AS campaign_name
      FROM pbx_call_dispositions d
      LEFT JOIN pbx_agents a ON a.id = d.agent_id
      LEFT JOIN pbx_campaigns c ON c.id = d.campaign_id
      ORDER BY d.created_at DESC
      LIMIT ${limit}
    `),
  ).map((r) => ({
    id: r.id,
    agentId: r.agent_id,
    agentName: r.agent_name,
    campaignId: r.campaign_id,
    campaignName: r.campaign_name,
    code: r.code,
    labelTr: r.label_tr,
    phone: r.phone,
    direction: r.direction,
    notes: r.notes,
    provider: r.provider,
    createdAt: new Date(r.created_at).toISOString(),
    sheetsSynced: r.sheets_synced,
  }));
}
