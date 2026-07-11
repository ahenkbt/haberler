export type PbxAgentStatus = "break" | "waiting" | "paused" | "on_call";

export type PbxAgentRecord = {
  username: string;
  password: string;
  displayName: string;
  extension: string;
};

export type PbxAgentSession = {
  username: string;
  displayName: string;
  extension: string;
};

export type PbxCampaign = {
  id: string;
  name: string;
  queue: string;
  waitingCount: number;
  activeAgents: number;
};

export const PBX_STATUS_LABELS: Record<PbxAgentStatus, string> = {
  break: "Molada",
  waiting: "Çağrı Bekliyor",
  paused: "Çağrı Alımı Kapalı",
  on_call: "Aktif Çağrıda",
};

export function parsePbxAgents(raw: string | undefined): PbxAgentRecord[] {
  const fallback = "agent1:demo123:Ayşe Yılmaz:101,demo:demo123:Demo Agent:100";
  const source = String(raw ?? fallback).trim() || fallback;
  const agents: PbxAgentRecord[] = [];
  for (const chunk of source.split(",")) {
    const parts = chunk.trim().split(":");
    if (parts.length < 2) continue;
    const [username, password, displayName, extension] = parts;
    if (!username || !password) continue;
    agents.push({
      username: username.trim(),
      password: password.trim(),
      displayName: (displayName ?? username).trim(),
      extension: (extension ?? "100").trim(),
    });
  }
  return agents;
}

export function findAgent(agents: PbxAgentRecord[], username: string, password: string): PbxAgentRecord | null {
  const u = username.trim().toLowerCase();
  return (
    agents.find((a) => a.username.toLowerCase() === u && a.password === password) ?? null
  );
}

export const MOCK_CAMPAIGNS: PbxCampaign[] = [
  { id: "sales", name: "Satış Kampanyası", queue: "sales-queue", waitingCount: 3, activeAgents: 5 },
  { id: "support", name: "Destek Hattı", queue: "support-queue", waitingCount: 1, activeAgents: 2 },
  { id: "survey", name: "Memnuniyet Anketi", queue: "survey-queue", waitingCount: 0, activeAgents: 1 },
];
