import { apiFetch, apiUrl } from "@/lib/apiBase";

/** Agent panel status keys (UI) */
export type PbxAgentStatusUi = "break" | "waiting" | "paused" | "on_call";

/** API / DB status keys */
export type PbxAgentStatus =
  | "offline"
  | "available"
  | "on_call"
  | "wrap_up"
  | "break"
  | "paused";

export type PbxSummary = {
  totalRecords: number;
  activeCards: number;
  cancelledCards?: number;
  suspendedCards?: number;
  backend?: "agentlabs" | "demo" | "verimor";
  totalTrunks: number;
  activeTrunks: number;
  totalExtensions: number;
  activeExtensions: number;
  totalQueues: number;
  totalAgents: number;
  agentsOnline: number;
  callsInQueue: number;
  activeCalls: number;
  demoMode: boolean;
  sipBridgeConnected: boolean;
  /** @deprecated */
  amiConnected?: boolean;
};

export type PbxTrunk = {
  id: string;
  name: string;
  provider: string;
  host: string;
  username: string;
  hasPassword?: boolean;
  register: boolean;
  outboundCallerId: string;
  sipWssUrl?: string | null;
  maxChannels: number;
  enabled: boolean;
};

export type PbxExtension = {
  id: string;
  extension: string;
  displayName: string;
  email: string;
  sipSecret?: string;
  provider?: "local" | "verimor" | "3cx";
  externalNumber?: string;
  sipDomain?: string;
  sipWssUrl?: string | null;
  voicemail: boolean;
  queueIds: string[];
  enabled: boolean;
};

export type PbxQueue = {
  id: string;
  name: string;
  strategy: string;
  timeoutSec: number;
  /** @deprecated use timeoutSec */
  timeout?: number;
  maxlen: number;
  musicOnHold: string;
  memberExtensionIds: string[];
  enabled: boolean;
};

export type PbxAgent = {
  id: string;
  username: string;
  displayName: string;
  extensionId: string | null;
  extension?: string | null;
  queueIds: string[];
  status: PbxAgentStatus;
  statusLabelTr: string;
  activeCampaignId?: string | null;
  activeCampaignName?: string | null;
  enabled: boolean;
};

export type LiveQueueRow = {
  queueId: string;
  queueName: string;
  campaignName?: string;
  phone?: string;
  voip?: string;
  callType?: string;
  waiting: number;
  longestWaitSec: number;
  agentsLoggedIn: number;
  agentsAvailable: number;
  agentsOnCall: number;
  callsAnsweredToday: number;
  callsAbandonedToday: number;
  serviceLevelPct: number;
};

export type LiveAgentRow = {
  agentId: string;
  displayName: string;
  extension: string | null;
  campaignName?: string;
  groupName?: string;
  status: PbxAgentStatus;
  statusLabelTr: string;
  currentCall: string | null;
  queueNames: string[];
  loginDurationSec: number;
  callsHandledToday: number;
};

export type PbxCampaign = {
  id: string;
  name: string;
  campaignType: "manual" | "auto_dial";
  campaignTypeLabelTr: string;
  queueId: string | null;
  queueName?: string | null;
  status: string;
  contactCount?: number;
  pendingCount?: number;
  enabled: boolean;
};

export type PbxCampaignContact = {
  id: string;
  campaignId: string;
  phone: string;
  name: string;
  status: string;
  attempts: number;
  lastAttemptAt: string | null;
  createdAt: string;
};

export type PbxCampaignResult = {
  id: string;
  type: "call_log" | "disposition";
  phone: string;
  agentName: string | null;
  status: string;
  dispositionCode: string | null;
  dispositionLabel: string | null;
  notes: string | null;
  startedAt: string;
};

export type PbxIvrFlow = {
  id: string;
  name: string;
  enabled: boolean;
  flowJson: Record<string, unknown>;
};

export type PbxRoutingMode = "ai_only" | "human_only" | "hybrid";

export type PbxHybridSettings = {
  hybridModeEnabled: boolean;
  defaultRoutingMode: PbxRoutingMode;
  defaultPbxQueueId: string | null;
  transferWebhookSecret: string | null;
  transferWebhookUrl: string;
};

export type PbxAiQueueMapping = {
  id: string;
  aiCampaignId: string;
  aiCampaignName: string;
  routingMode: PbxRoutingMode;
  routingModeLabelTr?: string;
  pbxQueueId: string | null;
  pbxQueueName?: string | null;
  enabled: boolean;
};

export type PbxPendingTransfer = {
  id: string;
  externalCallId: string;
  phone: string;
  aiCampaignId: string;
  aiCampaignName: string;
  queueId: string | null;
  queueName?: string | null;
  summary: string;
  context: Record<string, unknown>;
  status: string;
  createdAt: string;
};

export const ROUTING_MODE_OPTIONS = [
  { value: "ai_only" as const, label: "Sadece AI" },
  { value: "human_only" as const, label: "Sadece İnsan" },
  { value: "hybrid" as const, label: "Hibrit (AI önce, sonra aktar)" },
];

export type VerimorSettings = {
  enabled: boolean;
  softphoneEnabled?: boolean;
  domain: string | null;
  hasApiKey: boolean;
  apiKeyMasked: string;
  apiOptional?: boolean;
  webhookUrl: string;
  reportEventUrl: string;
};

export type VerimorCampaign = {
  id: string;
  verimorCampaignId: string;
  name: string;
  callType: string;
  queueNumber: number | null;
  status: string;
  enabled: boolean;
};

export type ThreeCxSettings = {
  enabled: boolean;
  fqdn: string | null;
  hasClientId: boolean;
  clientIdMasked: string;
  hasClientSecret: boolean;
  clientSecretMasked: string;
  defaultWssUrl: string | null;
  licenseNote: string;
  setupSteps: string[];
};

export type PbxDispositionCode = {
  id: string;
  code: string;
  labelTr: string;
  category: string;
  categoryLabelTr?: string;
  sortOrder?: number;
  enabled: boolean;
  isSystem?: boolean;
};

export type PbxCallDispositionRow = {
  id: string;
  agentId?: string | null;
  agentName?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  code: string;
  labelTr: string;
  phone: string;
  direction?: string;
  notes?: string;
  provider?: string;
  createdAt: string;
  sheetsSynced: boolean;
};

export type PbxGoogleSheetsConfig = {
  enabled: boolean;
  spreadsheetId: string;
  sheetName: string;
  webhookUrl: string;
  connectedEmail: string;
  verimorDefaultWssUrl: string;
};

export const AGENT_TOKEN_KEY = "pbxAgentToken";
export const AGENT_SIP_CONFIG_KEY = "pbxSipConfig";
export const AGENT_WEBPHONE_URL_KEY = "pbxWebphoneUrl";
export const AGENT_BACKEND_KEY = "pbxBackend";
export const PBX_SESSION_KEY = AGENT_TOKEN_KEY;

export const PBX_STATUS_OPTIONS = [
  { id: "break" as const, label: "Molada", description: "Kısa mola", tone: "amber" },
  { id: "waiting" as const, label: "Çağrı Bekliyor", description: "Kuyruktan çağrı almaya hazır", tone: "emerald" },
  { id: "paused" as const, label: "Çağrı Alımı Kapalı", description: "Otomatik dağıtım kapalı", tone: "slate" },
  { id: "on_call" as const, label: "Aktif Çağrıda", description: "Görüşme devam ediyor", tone: "violet" },
];

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return apiFetch(apiUrl(path), { credentials: "include", ...init });
}

async function parseApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text.slice(0, 180).trim() || `Sunucu yanıtı okunamadı (HTTP ${res.status})`);
  }
}

function uiToApiStatus(status: PbxAgentStatusUi | PbxAgentStatus): PbxAgentStatus {
  if (status === "waiting") return "available";
  return status as PbxAgentStatus;
}

function apiToUiStatus(status: PbxAgentStatus): PbxAgentStatusUi {
  if (status === "available") return "waiting";
  if (status === "wrap_up") return "paused";
  if (status === "offline") return "paused";
  return status as PbxAgentStatusUi;
}

export function statusBadgeClass(status: PbxAgentStatus | PbxAgentStatusUi): string {
  const s = status === "waiting" ? "available" : status;
  const map: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-800",
    break: "bg-amber-100 text-amber-800",
    paused: "bg-slate-200 text-slate-800",
    on_call: "bg-violet-100 text-violet-800",
    wrap_up: "bg-violet-100 text-violet-800",
    offline: "bg-gray-100 text-gray-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-700";
}

export function statusToneClasses(tone: string, active: boolean): string {
  const base: Record<string, { idle: string; active: string }> = {
    amber: { idle: "border-amber-200 bg-amber-50 text-amber-900", active: "border-amber-500 bg-amber-500 text-white" },
    emerald: { idle: "border-emerald-200 bg-emerald-50 text-emerald-900", active: "border-emerald-600 bg-emerald-600 text-white" },
    slate: { idle: "border-slate-200 bg-slate-50 text-slate-800", active: "border-slate-700 bg-slate-800 text-white" },
    violet: { idle: "border-violet-200 bg-violet-50 text-violet-900", active: "border-violet-600 bg-violet-600 text-white" },
  };
  const palette = base[tone] ?? base.slate;
  return active ? palette.active : palette.idle;
}

export async function fetchPbxConfig(): Promise<{
  configured: boolean;
  demoMode: boolean;
  sipBridgeConnected: boolean;
  backend?: string;
  agentLabsConfigured?: boolean;
}> {
  const res = await adminFetch("/api/pbx/public/status");
  const data = await res.json();
  return {
    configured: Boolean(data.agentLabsConfigured) || true,
    demoMode: Boolean(data.demoMode),
    sipBridgeConnected: data.backend === "agentlabs",
    backend: data.backend,
    agentLabsConfigured: data.agentLabsConfigured,
  };
}

export async function fetchPbxSummary(): Promise<PbxSummary> {
  const res = await adminFetch("/api/pbx/admin/live");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Özet yüklenemedi");
  const s = data.summary as PbxSummary;
  return { ...s, amiConnected: s.sipBridgeConnected };
}

export async function fetchLiveQueues(): Promise<LiveQueueRow[]> {
  const res = await adminFetch("/api/pbx/admin/live");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kuyruk verisi yüklenemedi");
  return data.queues ?? [];
}

export async function fetchLiveAgents(): Promise<LiveAgentRow[]> {
  const res = await adminFetch("/api/pbx/admin/live");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Agent verisi yüklenemedi");
  return data.agents ?? [];
}

export async function fetchTrunks(): Promise<PbxTrunk[]> {
  const res = await adminFetch("/api/pbx/admin/trunks");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Trunk listesi yüklenemedi");
  return data.trunks ?? [];
}

export async function saveTrunk(body: Partial<PbxTrunk> & { name: string; password?: string }): Promise<PbxTrunk> {
  const res = await adminFetch("/api/pbx/admin/trunks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Trunk kaydedilemedi");
  return data.trunk;
}

export async function fetchExtensions(): Promise<PbxExtension[]> {
  const res = await adminFetch("/api/pbx/admin/extensions");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Dahili listesi yüklenemedi");
  return data.extensions ?? [];
}

export async function saveExtension(body: Partial<PbxExtension> & { extension: string; displayName: string }): Promise<PbxExtension> {
  const res = await adminFetch("/api/pbx/admin/extensions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Dahili kaydedilemedi");
  return data.extension;
}

export async function fetchQueues(): Promise<PbxQueue[]> {
  const res = await adminFetch("/api/pbx/admin/queues");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kuyruk listesi yüklenemedi");
  return data.queues ?? [];
}

export async function saveQueue(body: Partial<PbxQueue> & { name: string }): Promise<PbxQueue> {
  const res = await adminFetch("/api/pbx/admin/queues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kuyruk kaydedilemedi");
  return data.queue;
}

export async function fetchAgents(): Promise<PbxAgent[]> {
  const res = await adminFetch("/api/pbx/admin/agents");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Temsilci listesi yüklenemedi");
  return data.agents ?? [];
}

export async function saveAgent(body: Record<string, unknown>): Promise<PbxAgent> {
  const res = await adminFetch("/api/pbx/admin/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Temsilci kaydedilemedi");
  return data.agent;
}

export async function fetchCampaignsAdmin(): Promise<PbxCampaign[]> {
  const res = await adminFetch("/api/pbx/admin/campaigns");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanya listesi yüklenemedi");
  return data.campaigns ?? [];
}

export async function saveCampaign(body: Record<string, unknown>): Promise<PbxCampaign> {
  const res = await adminFetch("/api/pbx/admin/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanya kaydedilemedi");
  return data.campaign;
}

export async function fetchCampaignAdmin(id: string): Promise<PbxCampaign> {
  const res = await adminFetch(`/api/pbx/admin/campaigns/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanya yüklenemedi");
  return data.campaign;
}

export async function fetchCampaignContacts(campaignId: string): Promise<PbxCampaignContact[]> {
  const res = await adminFetch(`/api/pbx/admin/campaigns/${encodeURIComponent(campaignId)}/contacts`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kişi listesi yüklenemedi");
  return data.contacts ?? [];
}

export async function addCampaignContacts(
  campaignId: string,
  input: { contacts?: { phone: string; name?: string }[]; text?: string },
): Promise<{ added: number; skipped: number; contactCount: number; campaign: PbxCampaign }> {
  const res = await adminFetch(`/api/pbx/admin/campaigns/${encodeURIComponent(campaignId)}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kişiler eklenemedi");
  return data;
}

export async function importCampaignContactsFile(
  campaignId: string,
  file: File,
): Promise<{ added: number; skipped: number; contactCount: number; parsedCount: number; campaign: PbxCampaign }> {
  const form = new FormData();
  form.append("file", file);
  const res = await adminFetch(`/api/pbx/admin/campaigns/${encodeURIComponent(campaignId)}/contacts/import`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Dosya içe aktarılamadı");
  return data;
}

export async function fetchCampaignResults(campaignId: string): Promise<PbxCampaignResult[]> {
  const res = await adminFetch(`/api/pbx/admin/campaigns/${encodeURIComponent(campaignId)}/results`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Sonuçlar yüklenemedi");
  return data.results ?? [];
}

export async function fetchIvrFlows(): Promise<PbxIvrFlow[]> {
  const res = await adminFetch("/api/pbx/admin/ivr");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "IVR listesi yüklenemedi");
  return data.flows ?? [];
}

export async function saveIvrFlow(body: Record<string, unknown>): Promise<PbxIvrFlow> {
  const res = await adminFetch("/api/pbx/admin/ivr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "IVR kaydedilemedi");
  return data.flow;
}

export async function fetchHybridSettings(): Promise<PbxHybridSettings> {
  const res = await adminFetch("/api/pbx/admin/hybrid-settings");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Hibrit ayarları yüklenemedi");
  return data.settings;
}

export async function saveHybridSettings(body: Partial<PbxHybridSettings>): Promise<PbxHybridSettings> {
  const res = await adminFetch("/api/pbx/admin/hybrid-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Hibrit ayarları kaydedilemedi");
  return data.settings;
}

export async function fetchAiQueueMappings(): Promise<PbxAiQueueMapping[]> {
  const res = await adminFetch("/api/pbx/admin/ai-queue-mapping");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Eşleme listesi yüklenemedi");
  return data.mappings ?? [];
}

export async function saveAiQueueMapping(body: Record<string, unknown>): Promise<PbxAiQueueMapping> {
  const res = await adminFetch("/api/pbx/admin/ai-queue-mapping", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Eşleme kaydedilemedi");
  return data.mapping;
}

export async function mockTransferIn(body: Record<string, unknown> = {}): Promise<{ message?: string }> {
  const res = await adminFetch("/api/pbx/admin/transfer-in/mock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Demo aktarım başarısız");
  return data;
}

export async function fetchPendingTransfers(token: string): Promise<PbxPendingTransfer[]> {
  const res = await fetch(apiUrl("/api/pbx/agent/transfers/pending"), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok || !data.ok) return [];
  return data.transfers ?? [];
}

export async function acceptTransfer(token: string, transferId: string): Promise<PbxPendingTransfer> {
  const res = await fetch(apiUrl(`/api/pbx/agent/transfers/${transferId}/accept`), {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Aktarım kabul edilemedi");
  return data.transfer;
}

export async function agentLogin(username: string, password: string): Promise<{
  token: string;
  agent: PbxAgent;
  backend?: string;
  sip?: {
    extension: string;
    password: string;
    domain: string;
    wssUrl: string;
    sipUri: string;
  };
}> {
  const res = await fetch(apiUrl("/api/pbx/agent/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseApiJson(res);
  if (!res.ok || !data.ok || !data.token) {
    throw new Error(String(data.error ?? "Giriş yapılamadı."));
  }
  return {
    token: String(data.token),
    agent: data.agent as PbxAgent,
    backend: data.backend != null ? String(data.backend) : undefined,
    sip: data.sip as {
      extension: string;
      password: string;
      domain: string;
      wssUrl: string;
      sipUri: string;
    } | undefined,
  };
}

export async function agentSetStatus(token: string, status: string): Promise<PbxAgent> {
  const res = await fetch(apiUrl("/api/pbx/agent/status"), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ status: uiToApiStatus(status as PbxAgentStatusUi) }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Durum güncellenemedi");
  return data.agent;
}

export async function agentManualDial(token: string, phone: string) {
  const res = await fetch(apiUrl("/api/pbx/agent/dial"), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

export async function agentHangup(token: string) {
  const res = await fetch(apiUrl("/api/pbx/agent/hangup"), {
    method: "POST",
    headers: authHeaders(token),
  });
  return res.json();
}

export async function fetchAgentMe(token: string): Promise<PbxAgent> {
  const res = await fetch(apiUrl("/api/pbx/agent/me"), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Oturum geçersiz");
  return data.agent;
}

export async function fetchAgentSipCredentials(token: string): Promise<{
  extension: string;
  password: string;
  domain: string;
  wssUrl: string;
  sipUri: string;
} | null> {
  const res = await fetch(apiUrl("/api/pbx/agent/sip-credentials"), { headers: authHeaders(token) });
  const data = await parseApiJson(res);
  if (!res.ok || !data.ok) {
    throw new Error(String(data.error ?? "SIP bilgisi alınamadı"));
  }
  const sip = data.sip as {
    extension: string;
    password: string;
    domain: string;
    wssUrl: string;
    sipUri: string;
  } | null;
  return sip?.wssUrl ? sip : null;
}

export async function fetchAgentQueues(token: string): Promise<PbxQueue[]> {
  const res = await fetch(apiUrl("/api/pbx/agent/queues"), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kuyruklar yüklenemedi");
  return data.queues ?? [];
}

/** Legacy aliases */
export const pbxLogin = async (username: string, password: string) => {
  const { token, agent } = await agentLogin(username, password);
  return {
    ok: true as const,
    session: {
      username: agent.username,
      displayName: agent.displayName,
      extension: agent.extension ?? "",
      token,
    },
  };
};

export function loadPbxSession() {
  const token = localStorage.getItem(AGENT_TOKEN_KEY);
  if (!token) return null;
  return { token };
}

export function clearPbxSession() {
  localStorage.removeItem(AGENT_TOKEN_KEY);
}

export function savePbxSession(token: string) {
  localStorage.setItem(AGENT_TOKEN_KEY, token);
}

export async function pbxSetStatus(token: string, status: PbxAgentStatusUi) {
  return agentSetStatus(token, status);
}

export async function pbxManualDial(token: string, number: string) {
  return agentManualDial(token, number);
}

export { apiToUiStatus, uiToApiStatus };

export async function fetchVerimorSettings(): Promise<VerimorSettings> {
  const res = await adminFetch("/api/pbx/admin/verimor-settings");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Verimor ayarları yüklenemedi");
  return data.settings;
}

export async function saveVerimorSettings(body: {
  enabled?: boolean;
  softphoneEnabled?: boolean;
  domain?: string | null;
  apiKey?: string;
}): Promise<VerimorSettings> {
  const res = await adminFetch("/api/pbx/admin/verimor-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Verimor ayarları kaydedilemedi");
  return data.settings;
}

export async function testVerimorConnection(): Promise<{ ok: boolean; message: string; queueCount?: number }> {
  const res = await adminFetch("/api/pbx/admin/verimor-settings/test", { method: "POST" });
  const data = await res.json();
  if (!res.ok && !data.message) throw new Error(data.error || "Test başarısız");
  return { ok: Boolean(data.ok), message: data.message ?? data.error ?? "Test tamamlandı", queueCount: data.queueCount };
}

export async function fetchVerimorQueues(): Promise<Array<{ number: number; name: string }>> {
  const res = await adminFetch("/api/pbx/admin/verimor/queues");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kuyruk listesi alınamadı");
  return data.queues ?? [];
}

export async function fetchVerimorCampaigns(): Promise<VerimorCampaign[]> {
  const res = await adminFetch("/api/pbx/admin/verimor/campaigns");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanya listesi alınamadı");
  return data.campaigns ?? [];
}

export async function saveVerimorCampaign(body: Record<string, unknown>): Promise<VerimorCampaign> {
  const res = await adminFetch("/api/pbx/admin/verimor/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanya kaydedilemedi");
  return data.campaign;
}

export async function fetchWebphoneToken(token: string): Promise<{ token: string; url: string }> {
  const res = await fetch(apiUrl("/api/pbx/agent/webphone-token"), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Web telefon token alınamadı");
  return data.webphone;
}

export async function saveVerimorAgent(body: Record<string, unknown>): Promise<{ agent: PbxAgent; extension: PbxExtension }> {
  const res = await adminFetch("/api/pbx/admin/verimor-agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseApiJson(res);
  if (!res.ok || !data.ok) throw new Error(String(data.error ?? "Verimor agent kaydedilemedi"));
  return { agent: data.agent as PbxAgent, extension: data.extension as PbxExtension };
}

export async function fetchThreeCxSettings(): Promise<ThreeCxSettings> {
  const res = await adminFetch("/api/pbx/admin/3cx/settings");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "3CX ayarları yüklenemedi");
  return data.settings;
}

export async function saveThreeCxSettings(body: {
  enabled?: boolean;
  fqdn?: string | null;
  clientId?: string;
  clientSecret?: string;
}): Promise<ThreeCxSettings> {
  const res = await adminFetch("/api/pbx/admin/3cx/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "3CX ayarları kaydedilemedi");
  return data.settings;
}

export async function testThreeCxConnection(): Promise<{ ok: boolean; message: string; userCount?: number }> {
  const res = await adminFetch("/api/pbx/admin/3cx/test", { method: "POST" });
  const data = await res.json();
  if (!res.ok && !data.message) throw new Error(data.error || "Test başarısız");
  return { ok: Boolean(data.ok), message: data.message ?? data.error ?? "Test tamamlandı", userCount: data.userCount };
}

export async function saveThreeCxAgent(body: Record<string, unknown>): Promise<{
  agent: PbxAgent;
  extension: PbxExtension;
  provisioned?: boolean;
  provisionMessage?: string;
}> {
  const res = await adminFetch("/api/pbx/admin/3cx/provision-extension", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseApiJson(res);
  if (!res.ok || !data.ok) throw new Error(String(data.error ?? "3CX agent kaydedilemedi"));
  return {
    agent: data.agent as PbxAgent,
    extension: data.extension as PbxExtension,
    provisioned: data.provisioned as boolean | undefined,
    provisionMessage: data.provisionMessage as string | undefined,
  };
}

export async function fetchAgentCampaigns(token: string): Promise<{
  campaigns: PbxCampaign[];
  activeCampaign: PbxCampaign | null;
}> {
  const res = await fetch(apiUrl("/api/pbx/agent/campaigns"), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanyalar yüklenemedi");
  return { campaigns: data.campaigns ?? [], activeCampaign: data.activeCampaign ?? null };
}

export async function joinAgentCampaign(token: string, campaignId: string): Promise<PbxAgent> {
  const res = await fetch(apiUrl(`/api/pbx/agent/campaigns/${campaignId}/join`), {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanyaya katılım başarısız");
  return data.agent;
}

export async function leaveAgentCampaign(token: string): Promise<PbxAgent> {
  const res = await fetch(apiUrl("/api/pbx/agent/campaigns/leave"), {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Kampanyadan ayrılma başarısız");
  return data.agent;
}

export async function fetchDispositionCodesAdmin(): Promise<{ codes: PbxDispositionCode[] }> {
  const res = await adminFetch("/api/pbx/admin/disposition-codes");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Sonlandırma kodları yüklenemedi");
  return { codes: data.codes ?? [] };
}

export async function saveDispositionCode(
  body: Partial<PbxDispositionCode> & { id?: string; code?: string; labelTr?: string },
): Promise<PbxDispositionCode> {
  const res = await adminFetch("/api/pbx/admin/disposition-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Sonlandırma kodu kaydedilemedi");
  return data.code;
}

export async function fetchDispositionLog(): Promise<PbxCallDispositionRow[]> {
  const res = await adminFetch("/api/pbx/admin/disposition-log");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Sonlandırma kayıtları yüklenemedi");
  return data.log ?? [];
}

export async function fetchGoogleSheetsConfig(): Promise<PbxGoogleSheetsConfig> {
  const res = await adminFetch("/api/pbx/admin/google-sheets");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Google Sheets ayarları yüklenemedi");
  return data.config;
}

export async function saveGoogleSheetsConfig(body: PbxGoogleSheetsConfig): Promise<PbxGoogleSheetsConfig> {
  const res = await adminFetch("/api/pbx/admin/google-sheets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Google Sheets ayarları kaydedilemedi");
  return data.config;
}

export async function fetchAgentDispositionCodes(token: string): Promise<PbxDispositionCode[]> {
  const res = await fetch(apiUrl("/api/pbx/agent/disposition-codes"), { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Sonlandırma kodları yüklenemedi");
  return data.codes ?? [];
}

export async function submitAgentDisposition(
  token: string,
  body: Record<string, unknown>,
): Promise<PbxCallDispositionRow> {
  const res = await fetch(apiUrl("/api/pbx/agent/disposition"), {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Sonlandırma kaydedilemedi");
  return data.disposition;
}
