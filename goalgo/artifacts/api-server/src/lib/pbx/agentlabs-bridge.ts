import { agentLabsBaseUrl } from "../call-center";
import { getAgentLabsBearerToken, proxyToAgentLabs } from "../agentlabs-proxy";
import { agentStatusLabelTr } from "./auth.js";
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
  PbxStats,
  PbxSummary,
  PbxTrunk,
} from "./types.js";

export type PbxBackendMode = "agentlabs" | "demo" | "verimor";

/** AgentLabs team üyesi anlık durumu (postgres-ai-call dışında hafif bellek). */
const agentPresence = new Map<
  string,
  { status: PbxAgentStatus; since: number; loginAt: number | null }
>();

export function isPbxAgentLabsMode(): boolean {
  const base = agentLabsBaseUrl();
  if (!base) return false;
  if (String(process.env.AGENTLABS_API_KEY ?? "").trim()) return true;
  const email = String(process.env.AGENTLABS_SERVICE_EMAIL ?? "").trim();
  const password = String(process.env.AGENTLABS_SERVICE_PASSWORD ?? "").trim();
  return Boolean(email && password);
}

export async function pbxBackendMode(): Promise<PbxBackendMode> {
  const { isPbxVerimorActive } = await import("./verimor-bridge.js");
  if (await isPbxVerimorActive()) return "verimor";
  if (!isPbxAgentLabsMode()) return "demo";
  const token = await getAgentLabsBearerToken();
  return token ? "agentlabs" : "demo";
}

async function alFetch<T = unknown>(
  apiPath: string,
  init?: { method?: string; query?: Record<string, string>; body?: unknown },
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const result = await proxyToAgentLabs(init?.method ?? "GET", apiPath, {
    query: init?.query,
    body: init?.body,
  });
  const body = result.body;
  const data =
    body && typeof body === "object" && "data" in (body as object)
      ? ((body as { data?: T }).data ?? (body as T))
      : (body as T);
  return { ok: result.ok, status: result.status, data: data ?? null };
}

function arr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object" && Array.isArray((v as { data?: unknown }).data)) {
    return (v as { data: T[] }).data;
  }
  return [];
}

type AlMember = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  status?: string;
  roleId?: string;
  roleName?: string;
  createdAt?: string;
};

type AlTrunk = {
  id: string;
  name?: string;
  provider?: string;
  host?: string;
  username?: string;
  outboundCallerId?: string;
  maxChannels?: number;
  enabled?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AlCampaign = {
  id: string;
  name: string;
  status?: string;
  type?: string;
  contactCount?: number;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type AlCall = {
  id: string;
  status?: string;
  phoneNumber?: string;
  toNumber?: string;
  fromNumber?: string;
  duration?: number;
  campaignId?: string;
  campaignName?: string;
  createdAt?: string;
  startedAt?: string;
};

type AlFlow = {
  id: string;
  name: string;
  enabled?: boolean;
  status?: string;
  flowData?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

function memberDisplayName(m: AlMember): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return n || m.name || m.email.split("@")[0] || m.email;
}

function extensionFromMember(m: AlMember, idx: number): string {
  return String(100 + idx + 1);
}

function mapCampaignStatus(s?: string): PbxCampaign["status"] {
  const v = String(s ?? "").toLowerCase();
  if (v.includes("run") || v === "active" || v === "executing") return "running";
  if (v.includes("pause")) return "paused";
  if (v.includes("complete") || v.includes("done")) return "completed";
  return "draft";
}

function mapCampaignType(t?: string): PbxCampaign["campaignType"] {
  const v = String(t ?? "").toLowerCase();
  if (v.includes("batch") || v.includes("auto") || v.includes("predict")) return "auto_dial";
  return "manual";
}

function getPresence(memberId: string): { status: PbxAgentStatus; since: number; loginAt: number | null } {
  return agentPresence.get(memberId) ?? { status: "offline", since: Date.now(), loginAt: null };
}

export function setAgentLabsAgentPresence(memberId: string, status: PbxAgentStatus): void {
  const prev = getPresence(memberId);
  agentPresence.set(memberId, {
    status,
    since: Date.now(),
    loginAt: status === "offline" ? null : (prev.loginAt ?? Date.now()),
  });
}

export async function agentLabsTeamLogin(
  email: string,
  password: string,
): Promise<{ token: string; member: AlMember } | null> {
  const base = agentLabsBaseUrl();
  if (!base) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${base}/api/team/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      signal: ctrl.signal,
    });
    const body = (await res.json()) as {
      token?: string;
      member?: AlMember;
      error?: string;
    };
    if (!res.ok || !body.token || !body.member) return null;
    setAgentLabsAgentPresence(body.member.id, "available");
    return { token: body.token, member: body.member };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function agentLabsTeamMe(token: string): Promise<AlMember | null> {
  const base = agentLabsBaseUrl();
  if (!base) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`${base}/api/team/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { member?: AlMember };
    return body.member ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mapMemberToAgent(m: AlMember, idx: number, campaignNames: string[]): PbxAgent {
  const presence = getPresence(m.id);
  const enabled = m.status !== "inactive" && m.status !== "suspended";
  return {
    id: m.id,
    username: m.email,
    displayName: memberDisplayName(m),
    extensionId: m.id,
    extension: extensionFromMember(m, idx),
    queueIds: campaignNames.length ? [] : [],
    status: enabled ? presence.status : "offline",
    statusLabelTr: agentStatusLabelTr(enabled ? presence.status : "offline"),
    lastLoginAt: presence.loginAt ? new Date(presence.loginAt).toISOString() : null,
    enabled,
    createdAt: m.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchAgentLabsTrunks(): Promise<PbxTrunk[]> {
  const res = await alFetch<AlTrunk[]>("/api/sip/trunks");
  if (!res.ok) return [];
  return arr<AlTrunk>(res.data).map((t) => ({
    id: String(t.id),
    name: t.name ?? "SIP Trunk",
    provider: t.provider ?? "SIP",
    host: t.host ?? "",
    username: t.username ?? "",
    hasPassword: true,
    register: true,
    outboundCallerId: t.outboundCallerId ?? "",
    maxChannels: t.maxChannels ?? 10,
    enabled: t.enabled !== false && t.status !== "disabled",
    createdAt: t.createdAt ?? new Date().toISOString(),
    updatedAt: t.updatedAt ?? new Date().toISOString(),
  }));
}

export async function fetchAgentLabsMembers(): Promise<AlMember[]> {
  const res = await alFetch<{ members?: AlMember[] }>("/api/team/members");
  if (!res.ok) return [];
  const data = res.data;
  if (data && typeof data === "object" && "members" in data) {
    return arr<AlMember>((data as { members?: AlMember[] }).members);
  }
  return arr<AlMember>(data);
}

export async function fetchAgentLabsCampaigns(): Promise<PbxCampaign[]> {
  const res = await alFetch<AlCampaign[]>("/api/campaigns");
  if (!res.ok) return [];
  return arr<AlCampaign>(res.data).map((c) => ({
    id: String(c.id),
    name: c.name,
    campaignType: mapCampaignType(c.type),
    campaignTypeLabelTr: mapCampaignType(c.type) === "auto_dial" ? "Otomatik Arama" : "Manuel",
    queueId: String(c.id),
    queueName: c.name,
    status: mapCampaignStatus(c.status),
    dialRatio: 1,
    maxAttempts: 3,
    contactCount: c.contactCount ?? 0,
    pendingCount: 0,
    enabled: c.enabled !== false,
    createdAt: c.createdAt ?? new Date().toISOString(),
    updatedAt: c.updatedAt ?? new Date().toISOString(),
  }));
}

export async function fetchAgentLabsCalls(): Promise<AlCall[]> {
  const res = await alFetch<AlCall[]>("/api/calls");
  if (!res.ok) return [];
  return arr<AlCall>(res.data);
}

export async function fetchAgentLabsFlows(): Promise<PbxIvrFlow[]> {
  const res = await alFetch<AlFlow[]>("/api/flow-automation/flows");
  if (!res.ok) return [];
  return arr<AlFlow>(res.data).map((f) => ({
    id: String(f.id),
    name: f.name,
    enabled: f.enabled !== false && f.status !== "disabled",
    flowJson: f.flowData ?? {},
    createdAt: f.createdAt ?? new Date().toISOString(),
    updatedAt: f.updatedAt ?? new Date().toISOString(),
  }));
}

export async function fetchAgentLabsExtensions(): Promise<PbxExtension[]> {
  const members = await fetchAgentLabsMembers();
  return members.map((m, idx) => ({
    id: m.id,
    extension: extensionFromMember(m, idx),
    displayName: memberDisplayName(m),
    email: m.email,
    voicemail: true,
    queueIds: [],
    enabled: m.status === "active" || !m.status,
    createdAt: m.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export async function fetchAgentLabsQueues(): Promise<PbxQueue[]> {
  const campaigns = await fetchAgentLabsCampaigns();
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    strategy: c.campaignType === "auto_dial" ? "leastrecent" : "ringall",
    timeoutSec: 30,
    maxlen: 100,
    musicOnHold: "default",
    memberExtensionIds: [],
    enabled: c.enabled,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export async function fetchAgentLabsAgents(): Promise<PbxAgent[]> {
  const [members, campaigns] = await Promise.all([fetchAgentLabsMembers(), fetchAgentLabsCampaigns()]);
  const running = campaigns.filter((c) => c.status === "running").map((c) => c.name);
  return members.map((m, idx) => mapMemberToAgent(m, idx, running));
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export async function buildAgentLabsLiveQueues(): Promise<PbxLiveQueueRow[]> {
  const [campaigns, calls] = await Promise.all([fetchAgentLabsCampaigns(), fetchAgentLabsCalls()]);
  const activeCalls = calls.filter((c) => {
    const s = String(c.status ?? "").toLowerCase();
    return s.includes("progress") || s.includes("ring") || s === "queued";
  });
  return campaigns.map((c, idx) => {
    const campCalls = calls.filter((x) => x.campaignId === c.id || x.campaignName === c.name);
    const waiting = activeCalls.filter((x) => x.campaignId === c.id).length;
    const answered = campCalls.filter((x) => isToday(x.startedAt ?? x.createdAt) && String(x.status).includes("complete")).length;
    const abandoned = campCalls.filter((x) => isToday(x.startedAt ?? x.createdAt) && String(x.status).includes("fail")).length;
    return {
      queueId: c.id,
      queueName: c.name,
      campaignName: c.name,
      phone: campCalls[0]?.phoneNumber ?? campCalls[0]?.toNumber ?? "—",
      voip: "SIP",
      callType: c.campaignTypeLabelTr,
      waiting,
      longestWaitSec: waiting > 0 ? 15 + idx * 8 : 0,
      agentsLoggedIn: 0,
      agentsAvailable: 0,
      agentsOnCall: activeCalls.filter((x) => x.campaignId === c.id).length,
      callsAnsweredToday: answered,
      callsAbandonedToday: abandoned,
      serviceLevelPct: answered + abandoned > 0 ? Math.round((answered / (answered + abandoned)) * 100) : 95,
    };
  });
}

export async function buildAgentLabsLiveAgents(): Promise<PbxLiveAgentRow[]> {
  const [members, campaigns, calls] = await Promise.all([
    fetchAgentLabsMembers(),
    fetchAgentLabsCampaigns(),
    fetchAgentLabsCalls(),
  ]);
  const runningCampaign = campaigns.find((c) => c.status === "running")?.name ?? "—";
  return members.map((m, idx) => {
    const presence = getPresence(m.id);
    const agentCalls = calls.filter((c) => isToday(c.startedAt ?? c.createdAt));
    const onCall = calls.find((c) => {
      const s = String(c.status ?? "").toLowerCase();
      return s.includes("progress") || s.includes("ring");
    });
    return {
      agentId: m.id,
      displayName: memberDisplayName(m),
      extension: extensionFromMember(m, idx),
      campaignName: runningCampaign,
      groupName: m.roleName ?? "Genel",
      status: presence.status,
      statusLabelTr: agentStatusLabelTr(presence.status),
      currentCall:
        presence.status === "on_call" ? (onCall?.phoneNumber ?? onCall?.toNumber ?? "+90…") : null,
      queueNames: campaigns.filter((c) => c.status === "running").map((c) => c.name),
      loginDurationSec: presence.loginAt ? Math.floor((Date.now() - presence.loginAt) / 1000) : 0,
      callsHandledToday: agentCalls.length > 0 ? Math.max(1, Math.floor(agentCalls.length / members.length)) : 0,
    };
  });
}

export async function buildAgentLabsSummary(): Promise<PbxSummary> {
  const { listTrunks: listLocalTrunks } = await import("./service.js");
  const [localTrunks, extensions, queues, agents, campaigns, calls] = await Promise.all([
    listLocalTrunks(),
    fetchAgentLabsExtensions(),
    fetchAgentLabsQueues(),
    fetchAgentLabsAgents(),
    fetchAgentLabsCampaigns(),
    fetchAgentLabsCalls(),
  ]);
  const liveQueues = await buildAgentLabsLiveQueues();
  const contactTotal = campaigns.reduce((s, c) => s + (c.contactCount ?? 0), 0);
  const activeCalls = calls.filter((c) => {
    const s = String(c.status ?? "").toLowerCase();
    return s.includes("progress") || s.includes("ring");
  }).length;
  return {
    totalRecords: contactTotal,
    activeCards: campaigns.filter((c) => c.status === "running").length,
    cancelledCards: campaigns.filter((c) => c.status === "completed").length,
    suspendedCards: campaigns.filter((c) => c.status === "paused").length,
    totalTrunks: localTrunks.length,
    activeTrunks: localTrunks.filter((t) => t.enabled).length,
    totalExtensions: extensions.length,
    activeExtensions: extensions.filter((e) => e.enabled).length,
    totalQueues: queues.length,
    totalAgents: agents.length,
    agentsOnline: agents.filter((a) => a.status !== "offline").length,
    callsInQueue: liveQueues.reduce((s, q) => s + q.waiting, 0),
    activeCalls,
    demoMode: false,
    sipBridgeConnected: localTrunks.some((t) => t.enabled),
    backend: "agentlabs",
  } as PbxSummary & { cancelledCards?: number; suspendedCards?: number; backend?: string };
}

export async function buildAgentLabsStats(): Promise<PbxStats> {
  const calls = await fetchAgentLabsCalls();
  const today = calls.filter((c) => isToday(c.startedAt ?? c.createdAt));
  const answered = today.filter((c) => String(c.status ?? "").toLowerCase().includes("complete"));
  const abandoned = today.filter((c) => String(c.status ?? "").toLowerCase().includes("fail"));
  const avgTalk =
    answered.length > 0
      ? Math.round(answered.reduce((s, c) => s + (c.duration ?? 0), 0) / answered.length)
      : 0;
  const queues = await buildAgentLabsLiveQueues();
  const avgWait = queues.length ? Math.round(queues.reduce((s, q) => s + q.longestWaitSec, 0) / queues.length) : 0;
  const sl = queues.length ? Math.round(queues.reduce((s, q) => s + q.serviceLevelPct, 0) / queues.length) : 0;
  return {
    callsToday: today.length,
    answeredToday: answered.length,
    abandonedToday: abandoned.length,
    avgTalkSec: avgTalk,
    avgWaitSec: avgWait,
    serviceLevelPct: sl,
  };
}

export async function buildAgentLabsSnapshot(): Promise<PbxRealtimeSnapshot> {
  const [summary, queues, agents, stats] = await Promise.all([
    buildAgentLabsSummary(),
    buildAgentLabsLiveQueues(),
    buildAgentLabsLiveAgents(),
    buildAgentLabsStats(),
  ]);
  return { summary, queues, agents, stats, updatedAt: new Date().toISOString() };
}

export function mapAgentLabsMemberToPbxAgent(member: AlMember, idx = 0): PbxAgent {
  return mapMemberToAgent(member, idx, []);
}
