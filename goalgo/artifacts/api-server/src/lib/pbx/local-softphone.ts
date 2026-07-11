/**
 * SIP trunk / yerel Asterisk dahili — tarayıcı softphone (sip.js + WSS).
 */

import {
  getAgentById,
  listExtensions,
  listTrunks,
  loadPbxSettings,
  agentLogin,
} from "./service.js";
import type { PbxAgent } from "./types.js";

export type LocalAgentSipCredentials = {
  extension: string;
  password: string;
  domain: string;
  wssUrl: string;
  sipUri: string;
  displayName: string;
  callerId: string;
};

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^wss?:\/\//i, "")
    .replace(/^sip:/i, "")
    .replace(/\/+$/, "")
    .split(":")[0]
    .split("/")[0]
    .trim();
}

function hostFromUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const withProto = /^wss?:\/\//i.test(trimmed) || /^https?:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;
    return normalizeDomain(new URL(withProto).hostname);
  } catch {
    return normalizeDomain(trimmed);
  }
}

async function resolveLocalWssUrl(
  ext: { sipWssUrl?: string | null; sipDomain?: string },
  domain: string,
): Promise<string> {
  const explicit = ext.sipWssUrl?.trim();
  if (explicit) return explicit;

  const trunks = await listTrunks();
  const domainNorm = normalizeDomain(domain);
  const byHost = trunks.find(
    (t) => t.enabled && t.sipWssUrl?.trim() && normalizeDomain(t.host) === domainNorm,
  );
  if (byHost?.sipWssUrl?.trim()) return byHost.sipWssUrl.trim();

  const anyTrunkWss = trunks.find((t) => t.enabled && t.sipWssUrl?.trim());
  if (anyTrunkWss?.sipWssUrl?.trim()) return anyTrunkWss.sipWssUrl.trim();

  const settings = await loadPbxSettings();
  if (settings.sipBridgeWsUrl?.trim()) return settings.sipBridgeWsUrl.trim();

  return String(process.env.PBX_WSS_URL ?? process.env.PBX_BRIDGE_WS_URL ?? "").trim();
}

async function resolveLocalDomain(ext: { sipDomain?: string; sipWssUrl?: string | null }): Promise<string> {
  const fromExt = normalizeDomain(ext.sipDomain ?? "");
  if (fromExt) return fromExt;

  const trunks = await listTrunks();
  const enabledTrunk = trunks.find((t) => t.enabled && normalizeDomain(t.host));
  if (enabledTrunk) return normalizeDomain(enabledTrunk.host);

  const settings = await loadPbxSettings();
  const fromBridge = hostFromUrl(settings.sipBridgeUrl ?? "");
  if (fromBridge) return fromBridge;

  const wssUrl = ext.sipWssUrl?.trim() || settings.sipBridgeWsUrl?.trim() || "";
  const fromWss = hostFromUrl(wssUrl);
  if (fromWss) return fromWss;

  return "";
}

export async function getLocalAgentSipCredentials(agentId: string): Promise<LocalAgentSipCredentials | null> {
  const agent = await getAgentById(agentId);
  if (!agent?.extensionId) return null;
  const ext = (await listExtensions(true)).find((e) => e.id === agent.extensionId);
  if (!ext || !ext.enabled || ext.provider !== "local") return null;
  if (!ext.sipSecret || !ext.extension) return null;

  const domain = await resolveLocalDomain(ext);
  if (!domain) return null;

  const wssUrl = await resolveLocalWssUrl(ext, domain);
  const trunks = await listTrunks();
  const trunk =
    trunks.find((t) => t.enabled && normalizeDomain(t.host) === domain) ??
    trunks.find((t) => t.enabled && t.outboundCallerId?.trim());
  const callerId = ext.externalNumber?.trim() || trunk?.outboundCallerId?.trim() || "";

  return {
    extension: ext.extension,
    password: ext.sipSecret,
    domain,
    wssUrl,
    sipUri: `sip:${ext.extension}@${domain}`,
    displayName: agent.displayName,
    callerId,
  };
}

export async function localSoftphoneLogin(
  username: string,
  password: string,
): Promise<{ agent: PbxAgent; sip: LocalAgentSipCredentials | null } | null> {
  const result = await agentLogin(username, password);
  if (!result) return null;
  const sip = await getLocalAgentSipCredentials(result.agent.id);
  return { agent: result.agent, sip };
}
