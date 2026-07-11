export type DemoMode = boolean;

export type SipTrunk = {
  id: string;
  name: string;
  provider: string;
  host: string;
  username: string;
  password?: string;
  register: boolean;
  outboundCallerId: string;
  maxChannels: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Extension = {
  id: string;
  extension: string;
  displayName: string;
  email: string;
  sipSecret: string;
  voicemail: boolean;
  queueIds: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Queue = {
  id: string;
  name: string;
  strategy: "ringall" | "leastrecent" | "fewestcalls" | "random" | "rrmemory";
  timeout: number;
  maxlen: number;
  musicOnHold: string;
  memberExtensionIds: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentStatus = "offline" | "available" | "on_call" | "wrap_up" | "break" | "paused";

export type Agent = {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  extensionId: string | null;
  queueIds: string[];
  status: AgentStatus;
  lastLoginAt: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LiveQueueRow = {
  queueId: string;
  queueName: string;
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
  status: AgentStatus;
  statusLabelTr: string;
  currentCall: string | null;
  queueNames: string[];
  loginDurationSec: number;
  callsHandledToday: number;
};

export type PbxSummary = {
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
  /** @deprecated use sipBridgeConnected — kept for gateway compat */
  amiConnected: boolean;
  sipBridgeConnected?: boolean;
};

export type AgentLoginResult = {
  ok: boolean;
  token?: string;
  agent?: Omit<Agent, "passwordHash">;
  error?: string;
};

export type ApiOk<T> = { ok: true; data: T; demoMode?: boolean };
export type ApiErr = { ok: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
