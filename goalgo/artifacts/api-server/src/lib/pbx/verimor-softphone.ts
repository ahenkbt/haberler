/**
 * Verimor softphone — API anahtarı olmadan SIP/WebRTC kayıt.
 * Admin panelden tanımlanan dahili + domain + şifre ile çalışır.
 */

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentStatusLabelTr } from "./auth.js";
import {
  agentLogin,
  getAgentById,
  listAgents,
  listCampaigns,
  listExtensions,
  setAgentStatus,
  upsertAgent,
  upsertExtension,
} from "./service.js";
import { ensureVerimorTables } from "./verimor-bridge.js";
import type { PbxAgent, PbxCampaign, PbxExtension } from "./types.js";

export type AgentSipCredentials = {
  extension: string;
  password: string;
  domain: string;
  wssUrl: string;
  sipUri: string;
  displayName: string;
};

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

function normalizeDomain(domain: string): string {
  return domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/** Verimor resmi WebRTC WSS uç noktası (Cihaz Kurulum Sihirbazı / destek). */
export const VERIMOR_WEBRTC_WSS_URL = "wss://api.bulutsantralim.com:7443";

/** Admin panelde sık yazılan :443 hatasını düzelt; bulutsantralim WebRTC her zaman 7443. */
export function normalizeVerimorWssUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return VERIMOR_WEBRTC_WSS_URL;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "wss:" && u.protocol !== "ws:") return trimmed;
    const host = u.hostname.toLowerCase();
    if (host.includes("bulutsantralim.com")) {
      if (!u.port || u.port === "443" || u.port === "80") {
        u.port = "7443";
      }
    }
    return u.toString();
  } catch {
    if (/bulutsantralim\.com/i.test(trimmed) && /:443(\/|$)/.test(trimmed)) {
      return trimmed.replace(/:443(\/|$)/, ":7443$1");
    }
    return trimmed;
  }
}

export function defaultVerimorWssUrl(_domain?: string): string {
  return VERIMOR_WEBRTC_WSS_URL;
}

async function resolveVerimorWssUrl(ext: { sipWssUrl?: string | null; sipDomain?: string | null }): Promise<string> {
  const explicit = ext.sipWssUrl?.trim();
  if (explicit) return normalizeVerimorWssUrl(explicit);
  try {
    const { loadGoogleSheetsConfig } = await import("./disposition.js");
    const cfg = await loadGoogleSheetsConfig();
    const fromSettings = cfg.verimorDefaultWssUrl?.trim();
    if (fromSettings) return normalizeVerimorWssUrl(fromSettings);
  } catch {
    /* optional admin override */
  }
  return defaultVerimorWssUrl(ext.sipDomain ?? undefined);
}

export async function isVerimorSoftphoneActive(): Promise<boolean> {
  await ensureVerimorTables();
  const row = rows<{ verimor_enabled: boolean; verimor_softphone_enabled: boolean }>(
    await db.execute(sql`
      SELECT verimor_enabled, verimor_softphone_enabled FROM pbx_settings WHERE id = 1 LIMIT 1
    `),
  )[0];
  if (row?.verimor_softphone_enabled || row?.verimor_enabled) return true;
  const exts = await listExtensions();
  return exts.some((e) => e.provider === "verimor" && e.enabled);
}

export async function getAgentSipCredentials(agentId: string): Promise<AgentSipCredentials | null> {
  const agent = await getAgentById(agentId);
  if (!agent?.extensionId) return null;
  const ext = (await listExtensions(true)).find((e) => e.id === agent.extensionId);
  if (!ext || !ext.enabled || ext.provider !== "verimor") return null;
  if (!ext.sipSecret || !ext.extension) return null;

  const domain = normalizeDomain(ext.sipDomain ?? "");
  if (!domain) return null;

  const wssUrl = await resolveVerimorWssUrl(ext);
  return {
    extension: ext.extension,
    password: ext.sipSecret,
    domain,
    wssUrl,
    sipUri: `sip:${ext.extension}@${domain}`,
    displayName: agent.displayName,
  };
}

/** Yekpare kullanıcı adı + şifre ile giriş; Verimor dahili bilgisi extension kaydından gelir. */
export async function verimorSoftphoneLogin(
  username: string,
  password: string,
): Promise<{ agent: PbxAgent; sip: AgentSipCredentials } | null> {
  const result = await agentLogin(username, password);
  if (!result) return null;
  const sip = await getAgentSipCredentials(result.agent.id);
  if (!sip) return null;
  return { agent: result.agent, sip };
}

/** Admin: Verimor agent + dahili tek formda kaydet. */
export async function upsertVerimorAgent(input: Record<string, unknown>): Promise<{ agent: PbxAgent; extension: PbxExtension }> {
  const username = String(input.username ?? "").trim();
  const displayName = String(input.displayName ?? input.display_name ?? "").trim();
  const extension = String(input.verimorExtension ?? input.extension ?? "").trim();
  const sipSecret = String(input.verimorPassword ?? input.sipSecret ?? input.sip_secret ?? "").trim();
  const sipDomain = normalizeDomain(String(input.sipDomain ?? input.sip_domain ?? input.domain ?? ""));
  const externalNumber = String(input.externalNumber ?? input.external_number ?? "");
  const sipWssUrlRaw = input.sipWssUrl != null ? String(input.sipWssUrl).trim() : undefined;
  const sipWssUrl = sipWssUrlRaw ? normalizeVerimorWssUrl(sipWssUrlRaw) : undefined;

  if (!username || !displayName) throw new Error("Kullanıcı adı ve ad zorunludur.");
  if (!extension || !sipSecret || !sipDomain) throw new Error("Verimor dahili no, şifre ve domain zorunludur.");

  const agentId = input.agentId ? String(input.agentId) : input.id ? String(input.id) : null;
  const extensionId = input.extensionId ? String(input.extensionId) : null;

  const ext = await upsertExtension({
    id: extensionId ?? undefined,
    extension,
    displayName,
    email: String(input.email ?? ""),
    sipSecret,
    provider: "verimor",
    externalNumber,
    sipDomain,
    sipWssUrl: sipWssUrl || null,
    enabled: input.enabled !== false,
    queueIds: Array.isArray(input.queueIds) ? input.queueIds : [],
  });

  const agent = await upsertAgent({
    id: agentId ?? undefined,
    username,
    displayName,
    password: input.password != null ? String(input.password) : undefined,
    extensionId: ext.id,
    queueIds: Array.isArray(input.queueIds) ? input.queueIds : ext.queueIds,
    enabled: input.enabled !== false,
  });

  return { agent, extension: ext };
}

export async function listAgentAvailableCampaigns(agentId: string): Promise<PbxCampaign[]> {
  const agent = await getAgentById(agentId);
  if (!agent) return [];
  const campaigns = await listCampaigns();
  return campaigns.filter(
    (c) =>
      c.enabled &&
      (c.status === "running" || c.status === "paused") &&
      (!c.queueId || agent.queueIds.includes(c.queueId)),
  );
}

export async function joinAgentCampaign(agentId: string, campaignId: string): Promise<PbxAgent | null> {
  const campaigns = await listCampaigns();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign || !campaign.enabled) throw new Error("Kampanya bulunamadı.");
  if (campaign.status !== "running" && campaign.status !== "paused") {
    throw new Error("Kampanya aktif değil. Admin panelden durumu 'running' yapın.");
  }

  await db.execute(sql`
    UPDATE pbx_agents SET active_campaign_id = ${campaignId}::uuid, status = 'available', updated_at = NOW()
    WHERE id = ${agentId}::uuid
  `);

  if (campaign.queueId) {
    const agent = await getAgentById(agentId);
    if (agent && !agent.queueIds.includes(campaign.queueId)) {
      await db.execute(sql`
        INSERT INTO pbx_agent_queues (agent_id, queue_id) VALUES (${agentId}::uuid, ${campaign.queueId}::uuid)
        ON CONFLICT DO NOTHING
      `);
    }
  }

  return setAgentStatus(agentId, "available");
}

export async function leaveAgentCampaign(agentId: string): Promise<PbxAgent | null> {
  await db.execute(sql`
    UPDATE pbx_agents SET active_campaign_id = NULL, status = 'paused', updated_at = NOW()
    WHERE id = ${agentId}::uuid
  `);
  return getAgentById(agentId);
}

export async function getAgentActiveCampaign(agentId: string): Promise<PbxCampaign | null> {
  const row = rows<{ active_campaign_id: string | null }>(
    await db.execute(sql`SELECT active_campaign_id FROM pbx_agents WHERE id = ${agentId}::uuid LIMIT 1`),
  )[0];
  if (!row?.active_campaign_id) return null;
  const campaigns = await listCampaigns();
  return campaigns.find((c) => c.id === row.active_campaign_id) ?? null;
}

export { agentStatusLabelTr };
