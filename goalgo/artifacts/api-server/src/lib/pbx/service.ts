import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentStatusLabelTr, campaignTypeLabelTr } from "./auth.js";
import { isDemoSeedAllowed, pbxDemoAgentPassword } from "../demo-credentials.js";
import { broadcastPbxSnapshot } from "./realtime.js";
import type {
  PbxAgent,
  PbxAgentStatus,
  PbxCampaign,
  PbxExtension,
  PbxIvrFlow,
  PbxLiveAgentRow,
  PbxLiveQueueRow,
  PbxQueue,
  PbxRealtimeSnapshot,
  PbxSettings,
  PbxStats,
  PbxSummary,
  PbxTrunk,
} from "./types.js";

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

function normalizeExtensionProvider(raw: unknown): "local" | "verimor" | "3cx" {
  const p = String(raw ?? "local");
  if (p === "verimor") return "verimor";
  if (p === "3cx") return "3cx";
  return "local";
}

let ensured = false;

export async function ensurePbxTables(): Promise<void> {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_trunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      host TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL DEFAULT '',
      password_enc TEXT,
      register BOOLEAN NOT NULL DEFAULT true,
      outbound_caller_id TEXT NOT NULL DEFAULT '',
      max_channels INTEGER NOT NULL DEFAULT 10,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    ALTER TABLE pbx_trunks
      ADD COLUMN IF NOT EXISTS sip_wss_url TEXT
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_extensions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      extension TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      sip_secret TEXT NOT NULL,
      voicemail BOOLEAN NOT NULL DEFAULT true,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_queues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      strategy TEXT NOT NULL DEFAULT 'ringall',
      timeout_sec INTEGER NOT NULL DEFAULT 30,
      maxlen INTEGER NOT NULL DEFAULT 50,
      music_on_hold TEXT NOT NULL DEFAULT 'default',
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_queue_members (
      queue_id UUID NOT NULL REFERENCES pbx_queues(id) ON DELETE CASCADE,
      extension_id UUID NOT NULL REFERENCES pbx_extensions(id) ON DELETE CASCADE,
      PRIMARY KEY (queue_id, extension_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      extension_id UUID REFERENCES pbx_extensions(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      last_login_at TIMESTAMPTZ,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_agent_queues (
      agent_id UUID NOT NULL REFERENCES pbx_agents(id) ON DELETE CASCADE,
      queue_id UUID NOT NULL REFERENCES pbx_queues(id) ON DELETE CASCADE,
      PRIMARY KEY (agent_id, queue_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      campaign_type TEXT NOT NULL DEFAULT 'manual',
      queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      dial_ratio INTEGER NOT NULL DEFAULT 1,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      schedule_json JSONB,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_campaign_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES pbx_campaigns(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TIMESTAMPTZ,
      metadata_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_ivr_flows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      flow_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_call_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      direction TEXT NOT NULL DEFAULT 'outbound',
      from_number TEXT NOT NULL DEFAULT '',
      to_number TEXT NOT NULL DEFAULT '',
      agent_id UUID REFERENCES pbx_agents(id) ON DELETE SET NULL,
      queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
      campaign_id UUID REFERENCES pbx_campaigns(id) ON DELETE SET NULL,
      trunk_id UUID REFERENCES pbx_trunks(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      duration_sec INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      recording_url TEXT,
      metadata_json JSONB
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pbx_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      demo_mode BOOLEAN NOT NULL DEFAULT true,
      sip_bridge_url TEXT,
      sip_bridge_ws_url TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Legacy/partial schemas: CREATE IF NOT EXISTS skips; ensure columns before seed row.
  await db.execute(sql`
    ALTER TABLE pbx_settings
      ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS sip_bridge_url TEXT,
      ADD COLUMN IF NOT EXISTS sip_bridge_ws_url TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await db.execute(sql`
    INSERT INTO pbx_settings (id, demo_mode)
    SELECT 1, true
    WHERE NOT EXISTS (SELECT 1 FROM pbx_settings WHERE id = 1)
  `);
  const { ensureVerimorTables } = await import("./verimor-bridge.js");
  await ensureVerimorTables();
  const { ensureThreeCxTables } = await import("./threecx-bridge.js");
  await ensureThreeCxTables();
  const { ensureHybridTables } = await import("./hybrid.js");
  await ensureHybridTables();
  ensured = true;
}

export async function loadPbxSettings(): Promise<PbxSettings> {
  await ensurePbxTables();
  const row = rows<{
    demo_mode: boolean;
    sip_bridge_url: string | null;
    sip_bridge_ws_url: string | null;
    verimor_enabled: boolean;
    verimor_domain: string | null;
  }>(
    await db.execute(sql`
      SELECT demo_mode, sip_bridge_url, sip_bridge_ws_url, verimor_enabled, verimor_domain
      FROM pbx_settings WHERE id = 1 LIMIT 1
    `),
  )[0];
  return {
    demoMode: row?.demo_mode !== false,
    sipBridgeUrl: row?.sip_bridge_url ?? process.env.PBX_BRIDGE_URL ?? null,
    sipBridgeWsUrl:
      row?.sip_bridge_ws_url ?? process.env.PBX_BRIDGE_WS_URL ?? process.env.PBX_WSS_URL ?? null,
    verimorEnabled: row?.verimor_enabled === true,
    verimorDomain: row?.verimor_domain ?? process.env.VERIMOR_DOMAIN ?? null,
  };
}

export async function updatePbxSettings(patch: Partial<PbxSettings>): Promise<PbxSettings> {
  await ensurePbxTables();
  if (patch.demoMode !== undefined) {
    await db.execute(sql`UPDATE pbx_settings SET demo_mode = ${patch.demoMode}, updated_at = NOW() WHERE id = 1`);
  }
  if (patch.sipBridgeUrl !== undefined) {
    await db.execute(sql`UPDATE pbx_settings SET sip_bridge_url = ${patch.sipBridgeUrl}, updated_at = NOW() WHERE id = 1`);
  }
  if (patch.sipBridgeWsUrl !== undefined) {
    await db.execute(sql`UPDATE pbx_settings SET sip_bridge_ws_url = ${patch.sipBridgeWsUrl}, updated_at = NOW() WHERE id = 1`);
  }
  return loadPbxSettings();
}

export async function seedPbxDemoIfEmpty(): Promise<{ seeded: boolean }> {
  if (!isDemoSeedAllowed()) return { seeded: false };
  await ensurePbxTables();
  const count = rows<{ c: number }>(await db.execute(sql`SELECT COUNT(*)::int AS c FROM pbx_agents`))[0]?.c ?? 0;
  if (count > 0) return { seeded: false };

  const ext101 = randomUUID();
  const ext102 = randomUUID();
  const ext103 = randomUUID();
  const qSales = randomUUID();
  const qSupport = randomUUID();
  const hash = await bcrypt.hash(pbxDemoAgentPassword(), 10);

  await db.execute(sql`
    INSERT INTO pbx_extensions (id, extension, display_name, email, sip_secret, voicemail, enabled)
    VALUES
      (${ext101}, '101', 'Ayşe Yılmaz', 'ayse@firma.com', 'demo-secret-101', true, true),
      (${ext102}, '102', 'Mehmet Kaya', 'mehmet@firma.com', 'demo-secret-102', true, true),
      (${ext103}, '103', 'Zeynep Demir', 'zeynep@firma.com', 'demo-secret-103', false, true)
  `);
  await db.execute(sql`
    INSERT INTO pbx_trunks (name, provider, host, username, register, outbound_caller_id, max_channels, enabled)
    VALUES
      ('TurkNet SIP (Demo)', 'TurkNet', 'sip.turknet.app', '100001', true, '+902121234567', 30, true),
      ('Netgsm Yedek (Demo)', 'Netgsm', 'sip.netgsm.com.tr', '850xxxxxxx', true, '+908501234567', 10, false)
  `);
  await db.execute(sql`
    INSERT INTO pbx_queues (id, name, strategy, timeout_sec, maxlen, enabled)
    VALUES
      (${qSales}, 'Satış Kuyruğu', 'leastrecent', 25, 50, true),
      (${qSupport}, 'Destek Kuyruğu', 'ringall', 30, 100, true)
  `);
  await db.execute(sql`
    INSERT INTO pbx_queue_members (queue_id, extension_id) VALUES
      (${qSales}, ${ext101}), (${qSales}, ${ext102}),
      (${qSupport}, ${ext102}), (${qSupport}, ${ext103})
  `);

  const agent1 = randomUUID();
  const agent2 = randomUUID();
  const agent3 = randomUUID();
  const now = new Date().toISOString();
  await db.execute(sql`
    INSERT INTO pbx_agents (id, username, password_hash, display_name, extension_id, status, last_login_at, enabled)
    VALUES
      (${agent1}, 'ayse', ${hash}, 'Ayşe Yılmaz', ${ext101}, 'available', ${now}::timestamptz, true),
      (${agent2}, 'mehmet', ${hash}, 'Mehmet Kaya', ${ext102}, 'on_call', ${now}::timestamptz, true),
      (${agent3}, 'zeynep', ${hash}, 'Zeynep Demir', ${ext103}, 'break', NULL, true)
  `);
  await db.execute(sql`
    INSERT INTO pbx_agent_queues (agent_id, queue_id) VALUES
      (${agent1}, ${qSales}),
      (${agent2}, ${qSales}), (${agent2}, ${qSupport}),
      (${agent3}, ${qSupport})
  `);

  const campaignId = randomUUID();
  await db.execute(sql`
    INSERT INTO pbx_campaigns (id, name, campaign_type, queue_id, status, dial_ratio, max_attempts, enabled)
    VALUES (${campaignId}, 'Haziran Satış Kampanyası', 'auto_dial', ${qSales}, 'running', 2, 3, true)
  `);
  await db.execute(sql`
    INSERT INTO pbx_campaign_contacts (campaign_id, phone, name, status) VALUES
      (${campaignId}, '+905551112233', 'Ali Veli', 'pending'),
      (${campaignId}, '+905553334455', 'Fatma Kaya', 'pending'),
      (${campaignId}, '+905556667788', 'Can Öztürk', 'dialing')
  `);

  await db.execute(sql`
    INSERT INTO pbx_ivr_flows (name, enabled, flow_json) VALUES
      ('Ana Karşılama', true, ${JSON.stringify({
        greeting: "Yekpare çağrı merkezine hoş geldiniz.",
        menu: [
          { digit: "1", label: "Satış", action: "queue", targetId: qSales },
          { digit: "2", label: "Destek", action: "queue", targetId: qSupport },
          { digit: "0", label: "Operatör", action: "extension", targetId: ext101 },
        ],
      })}::jsonb)
  `);

  await db.execute(sql`
    INSERT INTO pbx_call_logs (direction, from_number, to_number, agent_id, queue_id, status, duration_sec, started_at, ended_at)
    VALUES
      ('outbound', '+902121234567', '+905551112233', ${agent2}, ${qSales}, 'answered', 245, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes'),
      ('inbound', '+905559998877', '+902121234567', ${agent1}, ${qSales}, 'answered', 180, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '57 minutes'),
      ('inbound', '+905551234567', '+902121234567', NULL, ${qSupport}, 'abandoned', 0, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '29 minutes')
  `);

  await db.execute(sql`
    UPDATE pbx_settings SET
      hybrid_mode_enabled = true,
      default_routing_mode = 'hybrid',
      default_pbx_queue_id = ${qSupport}::uuid,
      updated_at = NOW()
    WHERE id = 1
  `);
  await db.execute(sql`
    INSERT INTO pbx_ai_campaign_config (ai_campaign_id, ai_campaign_name, routing_mode, pbx_queue_id, enabled)
    VALUES
      ('demo-ai-campaign', 'Demo AI Kampanyası', 'hybrid', ${qSupport}::uuid, true)
    ON CONFLICT (ai_campaign_id) DO NOTHING
  `);

  return { seeded: true };
}

export async function listTrunks(): Promise<PbxTrunk[]> {
  await ensurePbxTables();
  return rows<{
    id: string;
    name: string;
    provider: string;
    host: string;
    username: string;
    password_enc: string | null;
    register: boolean;
    outbound_caller_id: string;
    sip_wss_url: string | null;
    max_channels: number;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    await db.execute(sql`SELECT * FROM pbx_trunks ORDER BY name`),
  ).map((r) => ({
    id: r.id,
    name: r.name,
    provider: r.provider,
    host: r.host,
    username: r.username,
    hasPassword: Boolean(r.password_enc),
    register: r.register,
    outboundCallerId: r.outbound_caller_id,
    sipWssUrl: r.sip_wss_url ?? null,
    maxChannels: r.max_channels,
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function upsertTrunk(input: Record<string, unknown>): Promise<PbxTrunk> {
  await ensurePbxTables();
  let id = input.id ? String(input.id) : null;
  const name = String(input.name ?? "").trim();
  const provider = String(input.provider ?? "").trim();
  const host = String(input.host ?? "").trim();
  if (!name) throw new Error("Trunk adı zorunludur.");
  if (!provider) throw new Error("Sağlayıcı adı zorunludur.");
  if (!host) throw new Error("SIP sunucusu (host) zorunludur.");
  const password = input.password != null ? String(input.password) : undefined;
  const sipWssUrl =
    input.sipWssUrl != null
      ? String(input.sipWssUrl).trim() || null
      : input.sip_wss_url != null
        ? String(input.sip_wss_url).trim() || null
        : null;
  if (id) {
    await db.execute(sql`
      UPDATE pbx_trunks SET
        name = ${name},
        provider = ${provider},
        host = ${host},
        username = ${String(input.username ?? "")},
        password_enc = COALESCE(${password ?? null}, password_enc),
        register = ${input.register !== false},
        outbound_caller_id = ${String(input.outboundCallerId ?? input.outbound_caller_id ?? "")},
        sip_wss_url = ${sipWssUrl},
        max_channels = ${Number(input.maxChannels ?? input.max_channels ?? 10)},
        enabled = ${input.enabled !== false},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    const inserted = rows<{ id: string }>(
      await db.execute(sql`
      INSERT INTO pbx_trunks (name, provider, host, username, password_enc, register, outbound_caller_id, sip_wss_url, max_channels, enabled)
      VALUES (${name}, ${provider}, ${host}, ${String(input.username ?? "")},
        ${password ?? null}, ${input.register !== false}, ${String(input.outboundCallerId ?? "")},
        ${sipWssUrl}, ${Number(input.maxChannels ?? 10)}, ${input.enabled !== false})
      RETURNING id
    `),
    )[0];
    id = inserted?.id ?? null;
  }
  if (!id) throw new Error("Trunk kaydedilemedi.");
  const all = await listTrunks();
  const row = all.find((t) => t.id === id);
  if (!row) throw new Error("Trunk kaydedilemedi.");
  try {
    await publishPbxRealtime();
  } catch {
    /* trunk kaydı tamam; canlı yayın isteğe bağlı */
  }
  return row;
}

export async function listExtensions(includeSecrets = false): Promise<PbxExtension[]> {
  await ensurePbxTables();
  const extRows = rows<{
    id: string;
    extension: string;
    display_name: string;
    email: string;
    sip_secret: string;
    provider: string;
    external_number: string;
    verimor_queue_numbers: number[] | null;
    sip_domain: string;
    sip_wss_url: string | null;
    voicemail: boolean;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }>(await db.execute(sql`SELECT * FROM pbx_extensions ORDER BY extension`));
  const memberRows = rows<{ queue_id: string; extension_id: string }>(
    await db.execute(sql`SELECT queue_id, extension_id FROM pbx_queue_members`),
  );
  return extRows.map((r) => ({
    id: r.id,
    extension: r.extension,
    displayName: r.display_name,
    email: r.email,
    ...(includeSecrets ? { sipSecret: r.sip_secret } : {}),
    provider: normalizeExtensionProvider(r.provider),
    externalNumber: r.external_number ?? "",
    verimorQueueNumbers: Array.isArray(r.verimor_queue_numbers) ? r.verimor_queue_numbers : [],
    sipDomain: r.sip_domain ?? "",
    sipWssUrl: r.sip_wss_url ?? null,
    voicemail: r.voicemail,
    queueIds: memberRows.filter((m) => m.extension_id === r.id).map((m) => m.queue_id),
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function upsertExtension(input: Record<string, unknown>): Promise<PbxExtension> {
  await ensurePbxTables();
  const id = input.id ? String(input.id) : null;
  const extension = String(input.extension ?? "").trim();
  const displayName = String(input.displayName ?? input.display_name ?? "").trim();
  if (!extension || !displayName) throw new Error("Dahili numara ve ad zorunludur.");
  const sipSecret = String(input.sipSecret ?? input.sip_secret ?? randomUUID().slice(0, 12));
  const provider = normalizeExtensionProvider(input.provider);
  const externalNumber = String(input.externalNumber ?? input.external_number ?? "");
  const sipDomain = String(input.sipDomain ?? input.sip_domain ?? "");
  const sipWssUrl = input.sipWssUrl != null ? String(input.sipWssUrl).trim() || null : input.sip_wss_url != null ? String(input.sip_wss_url).trim() || null : null;
  const verimorQueueNumbers = Array.isArray(input.verimorQueueNumbers)
    ? JSON.stringify(input.verimorQueueNumbers)
    : JSON.stringify([]);
  let extId = id;
  if (id) {
    await db.execute(sql`
      UPDATE pbx_extensions SET
        extension = ${extension},
        display_name = ${displayName},
        email = ${String(input.email ?? "")},
        sip_secret = COALESCE(${input.sipSecret ? sipSecret : null}, sip_secret),
        provider = ${provider},
        external_number = ${externalNumber},
        verimor_queue_numbers = ${verimorQueueNumbers}::jsonb,
        sip_domain = ${sipDomain},
        sip_wss_url = ${sipWssUrl},
        voicemail = ${input.voicemail !== false},
        enabled = ${input.enabled !== false},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    extId = randomUUID();
    await db.execute(sql`
      INSERT INTO pbx_extensions (id, extension, display_name, email, sip_secret, provider, external_number, verimor_queue_numbers, sip_domain, sip_wss_url, voicemail, enabled)
      VALUES (${extId}, ${extension}, ${displayName}, ${String(input.email ?? "")}, ${sipSecret}, ${provider}, ${externalNumber}, ${verimorQueueNumbers}::jsonb, ${sipDomain}, ${sipWssUrl}, ${input.voicemail !== false}, ${input.enabled !== false})
    `);
  }
  const queueIds = Array.isArray(input.queueIds) ? input.queueIds.map(String) : [];
  if (extId) {
    await db.execute(sql`DELETE FROM pbx_queue_members WHERE extension_id = ${extId}::uuid`);
    for (const qid of queueIds) {
      await db.execute(sql`INSERT INTO pbx_queue_members (queue_id, extension_id) VALUES (${qid}::uuid, ${extId}::uuid) ON CONFLICT DO NOTHING`);
    }
  }
  const all = await listExtensions(true);
  const row = all.find((e) => e.id === extId);
  if (!row) throw new Error("Dahili kaydedilemedi.");
  await publishPbxRealtime();
  return row;
}

export async function listQueues(): Promise<PbxQueue[]> {
  await ensurePbxTables();
  const qRows = rows<{
    id: string;
    name: string;
    strategy: string;
    timeout_sec: number;
    maxlen: number;
    music_on_hold: string;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }>(await db.execute(sql`SELECT * FROM pbx_queues ORDER BY name`));
  const members = rows<{ queue_id: string; extension_id: string }>(
    await db.execute(sql`SELECT queue_id, extension_id FROM pbx_queue_members`),
  );
  return qRows.map((r) => ({
    id: r.id,
    name: r.name,
    strategy: r.strategy,
    timeoutSec: r.timeout_sec,
    maxlen: r.maxlen,
    musicOnHold: r.music_on_hold,
    memberExtensionIds: members.filter((m) => m.queue_id === r.id).map((m) => m.extension_id),
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function upsertQueue(input: Record<string, unknown>): Promise<PbxQueue> {
  await ensurePbxTables();
  const id = input.id ? String(input.id) : null;
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Kuyruk adı zorunludur.");
  let queueId = id;
  if (id) {
    await db.execute(sql`
      UPDATE pbx_queues SET
        name = ${name},
        strategy = ${String(input.strategy ?? "ringall")},
        timeout_sec = ${Number(input.timeoutSec ?? input.timeout_sec ?? 30)},
        maxlen = ${Number(input.maxlen ?? 50)},
        music_on_hold = ${String(input.musicOnHold ?? input.music_on_hold ?? "default")},
        enabled = ${input.enabled !== false},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    queueId = randomUUID();
    await db.execute(sql`
      INSERT INTO pbx_queues (id, name, strategy, timeout_sec, maxlen, music_on_hold, enabled)
      VALUES (${queueId}, ${name}, ${String(input.strategy ?? "ringall")}, ${Number(input.timeoutSec ?? 30)},
        ${Number(input.maxlen ?? 50)}, ${String(input.musicOnHold ?? "default")}, ${input.enabled !== false})
    `);
  }
  const memberIds = Array.isArray(input.memberExtensionIds) ? input.memberExtensionIds.map(String) : [];
  if (queueId) {
    await db.execute(sql`DELETE FROM pbx_queue_members WHERE queue_id = ${queueId}::uuid`);
    for (const eid of memberIds) {
      await db.execute(sql`INSERT INTO pbx_queue_members (queue_id, extension_id) VALUES (${queueId}::uuid, ${eid}::uuid) ON CONFLICT DO NOTHING`);
    }
  }
  const all = await listQueues();
  const row = all.find((q) => q.id === queueId);
  if (!row) throw new Error("Kuyruk kaydedilemedi.");
  await publishPbxRealtime();
  return row;
}

export async function listAgents(): Promise<PbxAgent[]> {
  await ensurePbxTables();
  const agentRows = rows<{
    id: string;
    username: string;
    display_name: string;
    extension_id: string | null;
    extension: string | null;
    active_campaign_id: string | null;
    active_campaign_name: string | null;
    status: PbxAgentStatus;
    last_login_at: Date | null;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    await db.execute(sql`
      SELECT a.*, e.extension, c.name AS active_campaign_name
      FROM pbx_agents a
      LEFT JOIN pbx_extensions e ON e.id = a.extension_id
      LEFT JOIN pbx_campaigns c ON c.id = a.active_campaign_id
      ORDER BY a.display_name
    `),
  );
  const aq = rows<{ agent_id: string; queue_id: string }>(
    await db.execute(sql`SELECT agent_id, queue_id FROM pbx_agent_queues`),
  );
  return agentRows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    extensionId: r.extension_id,
    extension: r.extension,
    queueIds: aq.filter((x) => x.agent_id === r.id).map((x) => x.queue_id),
    status: r.status,
    statusLabelTr: agentStatusLabelTr(r.status),
    activeCampaignId: r.active_campaign_id,
    activeCampaignName: r.active_campaign_name,
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function getAgentById(id: string): Promise<PbxAgent | null> {
  const all = await listAgents();
  return all.find((a) => a.id === id) ?? null;
}

export async function getAgentByUsername(username: string): Promise<(PbxAgent & { passwordHash: string }) | null> {
  await ensurePbxTables();
  const r = rows<{
    id: string;
    username: string;
    password_hash: string;
    display_name: string;
    extension_id: string | null;
    extension: string | null;
    status: PbxAgentStatus;
    last_login_at: Date | null;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    await db.execute(sql`
      SELECT a.*, e.extension FROM pbx_agents a
      LEFT JOIN pbx_extensions e ON e.id = a.extension_id
      WHERE LOWER(a.username) = LOWER(${username}) LIMIT 1
    `),
  )[0];
  if (!r) return null;
  const aq = rows<{ queue_id: string }>(await db.execute(sql`SELECT queue_id FROM pbx_agent_queues WHERE agent_id = ${r.id}::uuid`));
  return {
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    displayName: r.display_name,
    extensionId: r.extension_id,
    extension: r.extension,
    queueIds: aq.map((x) => x.queue_id),
    status: r.status,
    statusLabelTr: agentStatusLabelTr(r.status),
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function upsertAgent(input: Record<string, unknown>): Promise<PbxAgent> {
  await ensurePbxTables();
  const id = input.id ? String(input.id) : null;
  const username = String(input.username ?? "").trim();
  const displayName = String(input.displayName ?? input.display_name ?? "").trim();
  if (!username || !displayName) throw new Error("Kullanıcı adı ve ad zorunludur.");
  const password = input.password != null ? String(input.password) : undefined;
  let agentId = id;
  if (id) {
    const hash = password ? await bcrypt.hash(password, 10) : null;
    await db.execute(sql`
      UPDATE pbx_agents SET
        username = ${username},
        display_name = ${displayName},
        extension_id = ${input.extensionId ? String(input.extensionId) : input.extension_id ? String(input.extension_id) : null}::uuid,
        password_hash = COALESCE(${hash}, password_hash),
        enabled = ${input.enabled !== false},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    agentId = randomUUID();
    const plain = password?.trim() || (process.env.NODE_ENV === "production" ? "" : pbxDemoAgentPassword());
    if (!plain) throw new Error("Yeni temsilci için şifre zorunludur.");
    const hash = await bcrypt.hash(plain, 10);
    await db.execute(sql`
      INSERT INTO pbx_agents (id, username, password_hash, display_name, extension_id, enabled)
      VALUES (${agentId}, ${username}, ${hash}, ${displayName},
        ${input.extensionId ? String(input.extensionId) : null}::uuid, ${input.enabled !== false})
    `);
  }
  const queueIds = Array.isArray(input.queueIds) ? input.queueIds.map(String) : [];
  if (agentId) {
    await db.execute(sql`DELETE FROM pbx_agent_queues WHERE agent_id = ${agentId}::uuid`);
    for (const qid of queueIds) {
      await db.execute(sql`INSERT INTO pbx_agent_queues (agent_id, queue_id) VALUES (${agentId}::uuid, ${qid}::uuid) ON CONFLICT DO NOTHING`);
    }
  }
  const all = await listAgents();
  const row = all.find((a) => a.id === agentId);
  if (!row) throw new Error("Agent kaydedilemedi.");
  await publishPbxRealtime();
  return row;
}

export async function setAgentStatus(agentId: string, status: PbxAgentStatus): Promise<PbxAgent | null> {
  await ensurePbxTables();
  const lastLogin = status !== "offline" ? new Date().toISOString() : null;
  await db.execute(sql`
    UPDATE pbx_agents SET
      status = ${status},
      last_login_at = COALESCE(last_login_at, ${lastLogin}::timestamptz),
      updated_at = NOW()
    WHERE id = ${agentId}::uuid
  `);
  await publishPbxRealtime();
  return getAgentById(agentId);
}

export async function listCampaigns(): Promise<PbxCampaign[]> {
  await ensurePbxTables();
  const rowsData = rows<{
    id: string;
    name: string;
    campaign_type: string;
    queue_id: string | null;
    queue_name: string | null;
    status: PbxCampaign["status"];
    dial_ratio: number;
    max_attempts: number;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
    contact_count: number;
    pending_count: number;
  }>(
    await db.execute(sql`
      SELECT c.*, q.name AS queue_name,
        (SELECT COUNT(*)::int FROM pbx_campaign_contacts cc WHERE cc.campaign_id = c.id) AS contact_count,
        (SELECT COUNT(*)::int FROM pbx_campaign_contacts cc WHERE cc.campaign_id = c.id AND cc.status = 'pending') AS pending_count
      FROM pbx_campaigns c
      LEFT JOIN pbx_queues q ON q.id = c.queue_id
      ORDER BY c.updated_at DESC
    `),
  );
  return rowsData.map((r) => ({
    id: r.id,
    name: r.name,
    campaignType: r.campaign_type as PbxCampaign["campaignType"],
    campaignTypeLabelTr: campaignTypeLabelTr(r.campaign_type),
    queueId: r.queue_id,
    queueName: r.queue_name,
    status: r.status,
    dialRatio: r.dial_ratio,
    maxAttempts: r.max_attempts,
    contactCount: r.contact_count,
    pendingCount: r.pending_count,
    enabled: r.enabled,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function upsertCampaign(input: Record<string, unknown>): Promise<PbxCampaign> {
  await ensurePbxTables();
  const id = input.id ? String(input.id) : null;
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Kampanya adı zorunludur.");
  if (id) {
    await db.execute(sql`
      UPDATE pbx_campaigns SET
        name = ${name},
        campaign_type = ${String(input.campaignType ?? input.campaign_type ?? "manual")},
        queue_id = ${input.queueId ? String(input.queueId) : null}::uuid,
        status = ${String(input.status ?? "draft")},
        dial_ratio = ${Number(input.dialRatio ?? 1)},
        max_attempts = ${Number(input.maxAttempts ?? 3)},
        enabled = ${input.enabled !== false},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    await db.execute(sql`
      INSERT INTO pbx_campaigns (name, campaign_type, queue_id, status, dial_ratio, max_attempts, enabled)
      VALUES (${name}, ${String(input.campaignType ?? "manual")}, ${input.queueId ? String(input.queueId) : null}::uuid,
        ${String(input.status ?? "draft")}, ${Number(input.dialRatio ?? 1)}, ${Number(input.maxAttempts ?? 3)}, ${input.enabled !== false})
    `);
  }
  const all = await listCampaigns();
  const row = id ? all.find((c) => c.id === id) : all[0];
  if (!row) throw new Error("Kampanya kaydedilemedi.");
  await publishPbxRealtime();
  return row;
}

export async function listIvrFlows(): Promise<PbxIvrFlow[]> {
  await ensurePbxTables();
  return rows<{
    id: string;
    name: string;
    enabled: boolean;
    flow_json: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
  }>(await db.execute(sql`SELECT * FROM pbx_ivr_flows ORDER BY name`)).map((r) => ({
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    flowJson: r.flow_json ?? {},
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function upsertIvrFlow(input: Record<string, unknown>): Promise<PbxIvrFlow> {
  await ensurePbxTables();
  const id = input.id ? String(input.id) : null;
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("IVR adı zorunludur.");
  const flowJson = (input.flowJson ?? input.flow_json ?? {}) as Record<string, unknown>;
  if (id) {
    await db.execute(sql`
      UPDATE pbx_ivr_flows SET name = ${name}, enabled = ${input.enabled !== false},
        flow_json = ${JSON.stringify(flowJson)}::jsonb, updated_at = NOW()
      WHERE id = ${id}::uuid
    `);
  } else {
    await db.execute(sql`
      INSERT INTO pbx_ivr_flows (name, enabled, flow_json)
      VALUES (${name}, ${input.enabled !== false}, ${JSON.stringify(flowJson)}::jsonb)
    `);
  }
  const all = await listIvrFlows();
  const row = id ? all.find((f) => f.id === id) : all[0];
  if (!row) throw new Error("IVR kaydedilemedi.");
  return row;
}

export async function buildLiveQueues(): Promise<PbxLiveQueueRow[]> {
  const queues = await listQueues();
  const agents = await listAgents();
  const demoOffsets = [3, 1];
  const base = queues.map((q, idx) => {
    const qAgents = agents.filter((a) => a.queueIds.includes(q.id) && a.status !== "offline");
    return {
      queueId: q.id,
      queueName: q.name,
      waiting: demoOffsets[idx] ?? 0,
      longestWaitSec: 18 + idx * 24,
      agentsLoggedIn: qAgents.length,
      agentsAvailable: qAgents.filter((a) => a.status === "available").length,
      agentsOnCall: qAgents.filter((a) => a.status === "on_call").length,
      callsAnsweredToday: 87 + idx * 47,
      callsAbandonedToday: 4 + idx * 3,
      serviceLevelPct: 92 - idx * 4,
    };
  });
  const { countActiveTransfersByQueue, mergeAiTransfersIntoLiveQueues } = await import("./hybrid.js");
  const transferMap = await countActiveTransfersByQueue();
  return mergeAiTransfersIntoLiveQueues(base, transferMap);
}

export async function buildLiveAgents(): Promise<PbxLiveAgentRow[]> {
  const agents = await listAgents();
  const queues = await listQueues();
  return agents.map((a) => ({
    agentId: a.id,
    displayName: a.displayName,
    extension: a.extension ?? null,
    status: a.status,
    statusLabelTr: a.statusLabelTr,
    currentCall: a.status === "on_call" ? "+905551112233" : null,
    queueNames: queues.filter((q) => a.queueIds.includes(q.id)).map((q) => q.name),
    loginDurationSec: a.lastLoginAt ? Math.floor((Date.now() - Date.parse(a.lastLoginAt)) / 1000) : 0,
    callsHandledToday: a.status === "on_call" ? 12 : a.status === "available" ? 8 : 0,
  }));
}

export async function buildStats(): Promise<PbxStats> {
  await ensurePbxTables();
  const today = rows<{
    calls_today: number;
    answered_today: number;
    abandoned_today: number;
    avg_talk: number;
  }>(
    await db.execute(sql`
      SELECT
        COUNT(*)::int AS calls_today,
        COUNT(*) FILTER (WHERE status IN ('answered', 'completed'))::int AS answered_today,
        COUNT(*) FILTER (WHERE status = 'abandoned')::int AS abandoned_today,
        COALESCE(AVG(duration_sec) FILTER (WHERE duration_sec > 0), 0)::int AS avg_talk
      FROM pbx_call_logs
      WHERE started_at >= date_trunc('day', NOW())
    `),
  )[0];
  const queues = await buildLiveQueues();
  const avgWait = queues.length ? Math.round(queues.reduce((s, q) => s + q.longestWaitSec, 0) / queues.length) : 0;
  const sl = queues.length ? Math.round(queues.reduce((s, q) => s + q.serviceLevelPct, 0) / queues.length) : 0;
  return {
    callsToday: today?.calls_today ?? 0,
    answeredToday: today?.answered_today ?? 0,
    abandonedToday: today?.abandoned_today ?? 0,
    avgTalkSec: today?.avg_talk ?? 0,
    avgWaitSec: avgWait,
    serviceLevelPct: sl,
  };
}

export async function buildSummary(settings: PbxSettings): Promise<PbxSummary> {
  const trunks = await listTrunks();
  const extensions = await listExtensions();
  const queues = await listQueues();
  const agents = await listAgents();
  const liveQueues = await buildLiveQueues();
  const campaigns = await listCampaigns();
  const contactCount = campaigns.reduce((s, c) => s + (c.contactCount ?? 0), 0);
  return {
    totalRecords: contactCount,
    activeCards: campaigns.filter((c) => c.status === "running").length,
    cancelledCards: campaigns.filter((c) => c.status === "completed").length,
    suspendedCards: campaigns.filter((c) => c.status === "paused").length,
    backend: "demo" as const,
    totalTrunks: trunks.length,
    activeTrunks: trunks.filter((t) => t.enabled).length,
    totalExtensions: extensions.length,
    activeExtensions: extensions.filter((e) => e.enabled).length,
    totalQueues: queues.length,
    totalAgents: agents.length,
    agentsOnline: agents.filter((a) => a.status !== "offline").length,
    callsInQueue: liveQueues.reduce((s, q) => s + q.waiting, 0),
    activeCalls: agents.filter((a) => a.status === "on_call").length,
    demoMode: settings.demoMode,
    sipBridgeConnected: settings.demoMode || Boolean(settings.sipBridgeUrl),
  };
}

export async function buildRealtimeSnapshot(): Promise<PbxRealtimeSnapshot> {
  const settings = await loadPbxSettings();
  const [summary, queues, agents, stats] = await Promise.all([
    buildSummary(settings),
    buildLiveQueues(),
    buildLiveAgents(),
    buildStats(),
  ]);

  const { fetchLiveAgentsFromGateway, fetchLiveQueuesFromGateway } = await import("./gateway-client.js");
  const [gwQueues, gwAgents] = await Promise.all([
    fetchLiveQueuesFromGateway(),
    fetchLiveAgentsFromGateway(),
  ]);

  return {
    summary: {
      ...summary,
      sipBridgeConnected: summary.sipBridgeConnected || Boolean(gwQueues?.length),
    },
    queues: gwQueues?.length ? gwQueues : queues,
    agents: gwAgents?.length ? gwAgents : agents,
    stats,
    updatedAt: new Date().toISOString(),
  };
}

export async function publishPbxRealtime(): Promise<void> {
  const snapshot = await buildRealtimeSnapshot();
  broadcastPbxSnapshot(snapshot);
}

export async function agentLogin(username: string, password: string): Promise<{ agent: PbxAgent; extensionSecret: string | null } | null> {
  await seedPbxDemoIfEmpty();
  const row = await getAgentByUsername(username);
  if (!row || !row.enabled) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return null;
  await setAgentStatus(row.id, "available");
  const agent = await getAgentById(row.id);
  if (!agent) return null;
  let extensionSecret: string | null = null;
  if (agent.extensionId) {
    const ext = (await listExtensions(true)).find((e) => e.id === agent.extensionId);
    extensionSecret = ext?.sipSecret ?? null;
  }
  return { agent, extensionSecret };
}

export async function getExtensionSipSecret(extensionId: string): Promise<string | null> {
  const ext = (await listExtensions(true)).find((e) => e.id === extensionId);
  return ext?.sipSecret ?? null;
}
