export type PbxAgentStatus =
  | "offline"
  | "available"
  | "on_call"
  | "wrap_up"
  | "break"
  | "paused";

export const PBX_AGENT_STATUS_LABELS: Record<PbxAgentStatus, string> = {
  offline: "Çevrimdışı",
  available: "Çağrı Bekliyor",
  on_call: "Aktif Çağrıda",
  wrap_up: "Sonuçlandırma",
  break: "Molada",
  paused: "Çağrı Alımı Kapalı",
};

export type PbxTrunk = {
  id: string;
  name: string;
  provider: string;
  host: string;
  username: string;
  hasPassword: boolean;
  register: boolean;
  outboundCallerId: string;
  /** Browser softphone WebSocket (WSS) — Asterisk/PJSIP WSS endpoint */
  sipWssUrl?: string | null;
  maxChannels: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PbxExtension = {
  id: string;
  extension: string;
  displayName: string;
  email: string;
  sipSecret?: string;
  provider?: "local" | "verimor" | "3cx";
  externalNumber?: string;
  verimorQueueNumbers?: number[];
  sipDomain?: string;
  sipWssUrl?: string | null;
  voicemail: boolean;
  queueIds: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PbxQueue = {
  id: string;
  name: string;
  strategy: string;
  timeoutSec: number;
  maxlen: number;
  musicOnHold: string;
  memberExtensionIds: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
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
  lastLoginAt: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PbxCampaign = {
  id: string;
  name: string;
  campaignType: "manual" | "auto_dial";
  campaignTypeLabelTr: string;
  queueId: string | null;
  queueName?: string | null;
  status: "draft" | "running" | "paused" | "completed";
  dialRatio: number;
  maxAttempts: number;
  contactCount?: number;
  pendingCount?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PbxIvrFlow = {
  id: string;
  name: string;
  enabled: boolean;
  flowJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PbxLiveQueueRow = {
  queueId: string;
  queueName: string;
  /** Kampanya adı (AgentLabs) */
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

export type PbxLiveAgentRow = {
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
};

export type PbxStats = {
  callsToday: number;
  answeredToday: number;
  abandonedToday: number;
  avgTalkSec: number;
  avgWaitSec: number;
  serviceLevelPct: number;
};

export type PbxSettings = {
  demoMode: boolean;
  sipBridgeUrl: string | null;
  sipBridgeWsUrl: string | null;
  verimorEnabled?: boolean;
  verimorDomain?: string | null;
};

export type PbxRealtimeEvent =
  | { type: "snapshot"; payload: PbxRealtimeSnapshot }
  | { type: "agent_status"; payload: { agentId: string; status: PbxAgentStatus } }
  | { type: "queue_update"; payload: PbxLiveQueueRow };

export type PbxRealtimeSnapshot = {
  summary: PbxSummary;
  queues: PbxLiveQueueRow[];
  agents: PbxLiveAgentRow[];
  stats: PbxStats;
  updatedAt: string;
};

export type PbxAgentSession = {
  token: string;
  agent: PbxAgent;
  sip?: {
    wsUrl: string | null;
    extension: string | null;
    sipSecret: string | null;
    demoMode: boolean;
  };
};
