/**
 * 3CX softphone — admin panelden tanımlanan veya API ile oluşturulan dahili + WebRTC WSS.
 */

import { randomBytes } from "node:crypto";
import {
  agentLogin,
  getAgentById,
  listExtensions,
  upsertAgent,
  upsertExtension,
} from "./service.js";
import { getThreeCxConfig } from "./threecx-bridge.js";
import {
  createThreeCxExtension,
  defaultThreeCxWssUrl,
  normalizeThreeCxFqdn,
  normalizeThreeCxWssUrl,
} from "./threecx-client.js";
import type { PbxAgent, PbxExtension } from "./types.js";
import type { AgentSipCredentials } from "./verimor-softphone.js";

function generateSipPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Agent", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export async function getThreeCxAgentSipCredentials(agentId: string): Promise<AgentSipCredentials | null> {
  const agent = await getAgentById(agentId);
  if (!agent?.extensionId) return null;
  const ext = (await listExtensions(true)).find((e) => e.id === agent.extensionId);
  if (!ext || !ext.enabled || ext.provider !== "3cx") return null;
  if (!ext.sipSecret || !ext.extension) return null;

  const domain = normalizeThreeCxFqdn(ext.sipDomain ?? "");
  if (!domain) return null;

  const wssUrl = ext.sipWssUrl?.trim()
    ? normalizeThreeCxWssUrl(ext.sipWssUrl, domain)
    : defaultThreeCxWssUrl(domain);

  return {
    extension: ext.extension,
    password: ext.sipSecret,
    domain,
    wssUrl,
    sipUri: `sip:${ext.extension}@${domain}`,
    displayName: agent.displayName,
  };
}

export async function threecxSoftphoneLogin(
  username: string,
  password: string,
): Promise<{ agent: PbxAgent; sip: AgentSipCredentials } | null> {
  const result = await agentLogin(username, password);
  if (!result) return null;
  const sip = await getThreeCxAgentSipCredentials(result.agent.id);
  if (!sip) return null;
  return { agent: result.agent, sip };
}

/** Admin: 3CX agent + dahili tek formda; isteğe bağlı API ile 3CX'te otomatik oluşturma. */
export async function upsertThreeCxAgent(input: Record<string, unknown>): Promise<{
  agent: PbxAgent;
  extension: PbxExtension;
  provisioned?: boolean;
  provisionMessage?: string;
}> {
  const username = String(input.username ?? "").trim();
  const displayName = String(input.displayName ?? input.display_name ?? "").trim();
  let extension = String(input.threecxExtension ?? input.extension ?? input.verimorExtension ?? "").trim();
  let sipSecret = String(input.threecxPassword ?? input.sipSecret ?? input.sip_secret ?? input.verimorPassword ?? "").trim();
  const autoProvision = input.autoProvision === true || input.auto_provision === true;
  const email = String(input.email ?? "").trim();

  if (!username || !displayName) throw new Error("Kullanıcı adı ve ad zorunludur.");

  const config = await getThreeCxConfig();
  let fqdn = config?.fqdn ?? "";
  if (!fqdn) {
    fqdn = normalizeThreeCxFqdn(String(input.sipDomain ?? input.sip_domain ?? input.fqdn ?? ""));
  }
  if (!fqdn) throw new Error("3CX FQDN tanımlı değil. Önce 3CX ayarları sayfasından bağlantıyı yapılandırın.");

  const sipDomain = fqdn;
  const sipWssUrlRaw = input.sipWssUrl != null ? String(input.sipWssUrl).trim() : "";
  const sipWssUrl = sipWssUrlRaw
    ? normalizeThreeCxWssUrl(sipWssUrlRaw, fqdn)
    : defaultThreeCxWssUrl(fqdn);

  if (!extension) throw new Error("3CX dahili numarası zorunludur.");

  let provisioned = false;
  let provisionMessage: string | undefined;

  if (autoProvision) {
    if (!config) {
      throw new Error(
        "3CX API yapılandırılmamış. Ayarlar sayfasından FQDN + Client ID + API key kaydedin veya otomatik oluşturmayı kapatın.",
      );
    }
    if (!sipSecret) sipSecret = generateSipPassword();
    const { firstName, lastName } = splitDisplayName(displayName);
    const emailAddress = email || `${username}@${fqdn}`;
    const created = await createThreeCxExtension(config, {
      number: extension,
      firstName,
      lastName: lastName || extension,
      emailAddress,
      accessPassword: sipSecret,
    });
    if (!created.ok) {
      throw new Error(created.error ?? "3CX dahili oluşturulamadı");
    }
    provisioned = !created.alreadyExists;
    provisionMessage = created.alreadyExists
      ? `3CX'te ${extension} numaralı dahili zaten vardı; Yekpare kaydı güncellendi.`
      : `3CX'te ${extension} numaralı dahili oluşturuldu.`;
  }

  if (!sipSecret) throw new Error("3CX dahili şifresi zorunludur (otomatik oluşturma kapalıysa manuel girin).");

  const externalNumber = String(input.externalNumber ?? input.external_number ?? "");
  const agentId = input.agentId ? String(input.agentId) : input.id ? String(input.id) : null;
  const extensionId = input.extensionId ? String(input.extensionId) : null;

  const ext = await upsertExtension({
    id: extensionId ?? undefined,
    extension,
    displayName,
    email: email || username,
    sipSecret,
    provider: "3cx",
    externalNumber,
    sipDomain,
    sipWssUrl,
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

  return { agent, extension: ext, provisioned, provisionMessage };
}
