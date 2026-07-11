import { createHash, randomUUID } from "node:crypto";
import type {
  Agent,
  AgentStatus,
  Extension,
  LiveAgentRow,
  LiveQueueRow,
  PbxSummary,
  Queue,
  SipTrunk,
} from "../types.js";

const now = () => new Date().toISOString();

function seedTrunks(): SipTrunk[] {
  const t = now();
  return [
    {
      id: "trunk-1",
      name: "TurkNet SIP",
      provider: "TurkNet",
      host: "sip.turknet.app",
      username: "100001",
      register: true,
      outboundCallerId: "+902121234567",
      maxChannels: 30,
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "trunk-2",
      name: "Yedek Hat",
      provider: "Netgsm",
      host: "sip.netgsm.com.tr",
      username: "850xxxxxxx",
      register: true,
      outboundCallerId: "+908501234567",
      maxChannels: 10,
      enabled: false,
      createdAt: t,
      updatedAt: t,
    },
  ];
}

function seedExtensions(): Extension[] {
  const t = now();
  return [
    {
      id: "ext-101",
      extension: "101",
      displayName: "Ayşe Yılmaz",
      email: "ayse@firma.com",
      sipSecret: "demo-secret-101",
      voicemail: true,
      queueIds: ["queue-sales"],
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "ext-102",
      extension: "102",
      displayName: "Mehmet Kaya",
      email: "mehmet@firma.com",
      sipSecret: "demo-secret-102",
      voicemail: true,
      queueIds: ["queue-sales", "queue-support"],
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "ext-103",
      extension: "103",
      displayName: "Zeynep Demir",
      email: "zeynep@firma.com",
      sipSecret: "demo-secret-103",
      voicemail: false,
      queueIds: ["queue-support"],
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
  ];
}

function seedQueues(): Queue[] {
  const t = now();
  return [
    {
      id: "queue-sales",
      name: "Satış Kuyruğu",
      strategy: "leastrecent",
      timeout: 25,
      maxlen: 50,
      musicOnHold: "default",
      memberExtensionIds: ["ext-101", "ext-102"],
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "queue-support",
      name: "Destek Kuyruğu",
      strategy: "ringall",
      timeout: 30,
      maxlen: 100,
      musicOnHold: "default",
      memberExtensionIds: ["ext-102", "ext-103"],
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
  ];
}

export function hashDemoPassword(password: string): string {
  return createHash("sha256").update(`pbx-demo:${password}`).digest("hex");
}

async function seedAgents(): Promise<Agent[]> {
  const t = now();
  const hash = hashDemoPassword("agent123");
  return [
    {
      id: "agent-1",
      username: "ayse",
      passwordHash: hash,
      displayName: "Ayşe Yılmaz",
      extensionId: "ext-101",
      queueIds: ["queue-sales"],
      status: "available",
      lastLoginAt: t,
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "agent-2",
      username: "mehmet",
      passwordHash: hash,
      displayName: "Mehmet Kaya",
      extensionId: "ext-102",
      queueIds: ["queue-sales", "queue-support"],
      status: "on_call",
      lastLoginAt: t,
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "agent-3",
      username: "zeynep",
      passwordHash: hash,
      displayName: "Zeynep Demir",
      extensionId: "ext-103",
      queueIds: ["queue-support"],
      status: "break",
      lastLoginAt: null,
      enabled: true,
      createdAt: t,
      updatedAt: t,
    },
  ];
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  offline: "Çevrimdışı",
  available: "Çağrı Bekliyor",
  on_call: "Görüşmede",
  wrap_up: "Sonuçlandırma",
  break: "Molada",
  paused: "Duraklatıldı",
};

class MemoryStore {
  trunks: SipTrunk[] = seedTrunks();
  extensions: Extension[] = seedExtensions();
  queues: Queue[] = seedQueues();
  agents: Agent[] = [];
  demoLiveQueue: LiveQueueRow[] = [
    {
      queueId: "queue-sales",
      queueName: "Satış Kuyruğu",
      waiting: 3,
      longestWaitSec: 42,
      agentsLoggedIn: 2,
      agentsAvailable: 1,
      agentsOnCall: 1,
      callsAnsweredToday: 87,
      callsAbandonedToday: 4,
      serviceLevelPct: 92,
    },
    {
      queueId: "queue-support",
      queueName: "Destek Kuyruğu",
      waiting: 1,
      longestWaitSec: 18,
      agentsLoggedIn: 2,
      agentsAvailable: 0,
      agentsOnCall: 1,
      callsAnsweredToday: 134,
      callsAbandonedToday: 7,
      serviceLevelPct: 88,
    },
  ];
  demoLiveAgents: LiveAgentRow[] = [];
  activeCalls = 2;

  async init(): Promise<void> {
    this.agents = await seedAgents();
    this.refreshDemoLiveAgents();
  }

  refreshDemoLiveAgents(): void {
    this.demoLiveAgents = this.agents.map((a) => {
      const ext = this.extensions.find((e) => e.id === a.extensionId);
      const queueNames = this.queues
        .filter((q) => a.queueIds.includes(q.id))
        .map((q) => q.name);
      return {
        agentId: a.id,
        displayName: a.displayName,
        extension: ext?.extension ?? null,
        status: a.status,
        statusLabelTr: STATUS_LABELS[a.status],
        currentCall: a.status === "on_call" ? "+905551112233" : null,
        queueNames,
        loginDurationSec: a.lastLoginAt ? Math.floor((Date.now() - Date.parse(a.lastLoginAt)) / 1000) : 0,
        callsHandledToday: a.status === "on_call" ? 12 : a.status === "available" ? 8 : 0,
      };
    });
  }

  summary(bridgeConnected: boolean, demoMode: boolean): PbxSummary {
    return {
      totalTrunks: this.trunks.length,
      activeTrunks: this.trunks.filter((t) => t.enabled).length,
      totalExtensions: this.extensions.length,
      activeExtensions: this.extensions.filter((e) => e.enabled).length,
      totalQueues: this.queues.length,
      totalAgents: this.agents.length,
      agentsOnline: this.agents.filter((a) => a.status !== "offline").length,
      callsInQueue: this.demoLiveQueue.reduce((s, q) => s + q.waiting, 0),
      activeCalls: this.activeCalls,
      demoMode,
      amiConnected: bridgeConnected,
    };
  }

  stripAgent(agent: Agent): Omit<Agent, "passwordHash"> {
    const { passwordHash: _, ...rest } = agent;
    return rest;
  }

  upsertTrunk(input: Partial<SipTrunk> & { name: string }): SipTrunk {
    const t = now();
    if (input.id) {
      const idx = this.trunks.findIndex((x) => x.id === input.id);
      if (idx >= 0) {
        this.trunks[idx] = { ...this.trunks[idx], ...input, updatedAt: t };
        return this.trunks[idx];
      }
    }
    const row: SipTrunk = {
      id: randomUUID(),
      name: input.name,
      provider: input.provider ?? "",
      host: input.host ?? "",
      username: input.username ?? "",
      password: input.password,
      register: input.register ?? true,
      outboundCallerId: input.outboundCallerId ?? "",
      maxChannels: input.maxChannels ?? 10,
      enabled: input.enabled ?? true,
      createdAt: t,
      updatedAt: t,
    };
    this.trunks.push(row);
    return row;
  }

  upsertExtension(input: Partial<Extension> & { extension: string; displayName: string }): Extension {
    const t = now();
    if (input.id) {
      const idx = this.extensions.findIndex((x) => x.id === input.id);
      if (idx >= 0) {
        this.extensions[idx] = { ...this.extensions[idx], ...input, updatedAt: t };
        return this.extensions[idx];
      }
    }
    const row: Extension = {
      id: randomUUID(),
      extension: input.extension,
      displayName: input.displayName,
      email: input.email ?? "",
      sipSecret: input.sipSecret ?? randomUUID().slice(0, 12),
      voicemail: input.voicemail ?? true,
      queueIds: input.queueIds ?? [],
      enabled: input.enabled ?? true,
      createdAt: t,
      updatedAt: t,
    };
    this.extensions.push(row);
    return row;
  }

  upsertQueue(input: Partial<Queue> & { name: string }): Queue {
    const t = now();
    if (input.id) {
      const idx = this.queues.findIndex((x) => x.id === input.id);
      if (idx >= 0) {
        this.queues[idx] = { ...this.queues[idx], ...input, updatedAt: t };
        return this.queues[idx];
      }
    }
    const row: Queue = {
      id: randomUUID(),
      name: input.name,
      strategy: input.strategy ?? "ringall",
      timeout: input.timeout ?? 30,
      maxlen: input.maxlen ?? 50,
      musicOnHold: input.musicOnHold ?? "default",
      memberExtensionIds: input.memberExtensionIds ?? [],
      enabled: input.enabled ?? true,
      createdAt: t,
      updatedAt: t,
    };
    this.queues.push(row);
    return row;
  }

  async upsertAgent(input: Partial<Agent> & { username: string; displayName: string; password?: string }): Promise<Agent> {
    const t = now();
    if (input.id) {
      const idx = this.agents.findIndex((x) => x.id === input.id);
      if (idx >= 0) {
        const patch = { ...input, updatedAt: t } as Partial<Agent>;
        if (input.password) {
          patch.passwordHash = hashDemoPassword(input.password);
        }
        delete (patch as { password?: string }).password;
        this.agents[idx] = { ...this.agents[idx], ...patch };
        this.refreshDemoLiveAgents();
        return this.agents[idx];
      }
    }
    const row: Agent = {
      id: randomUUID(),
      username: input.username,
      passwordHash: hashDemoPassword(input.password ?? "agent123"),
      displayName: input.displayName,
      extensionId: input.extensionId ?? null,
      queueIds: input.queueIds ?? [],
      status: input.status ?? "offline",
      lastLoginAt: null,
      enabled: input.enabled ?? true,
      createdAt: t,
      updatedAt: t,
    };
    this.agents.push(row);
    this.refreshDemoLiveAgents();
    return row;
  }

  setAgentStatus(agentId: string, status: AgentStatus): Agent | null {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return null;
    agent.status = status;
    agent.updatedAt = now();
    if (status !== "offline" && !agent.lastLoginAt) {
      agent.lastLoginAt = now();
    }
    this.refreshDemoLiveAgents();
    return agent;
  }
}

export const store = new MemoryStore();

export function agentStatusLabelTr(status: AgentStatus): string {
  return STATUS_LABELS[status];
}
