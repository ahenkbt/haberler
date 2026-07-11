import type { PbxAgentStatus, PbxCampaign } from "./pbx-types";
import { MOCK_CAMPAIGNS } from "./pbx-types";

type AgentState = {
  status: PbxAgentStatus;
  activeCampaignId: string | null;
  lastDialNumber: string | null;
  updatedAt: string;
};

const agentStates = new Map<string, AgentState>();

function defaultState(): AgentState {
  return {
    status: "waiting",
    activeCampaignId: null,
    lastDialNumber: null,
    updatedAt: new Date().toISOString(),
  };
}

export function getAgentState(username: string): AgentState {
  const key = username.toLowerCase();
  if (!agentStates.has(key)) agentStates.set(key, defaultState());
  return agentStates.get(key)!;
}

export function setAgentStatus(username: string, status: PbxAgentStatus): AgentState {
  const state = getAgentState(username);
  state.status = status;
  state.updatedAt = new Date().toISOString();
  if (status !== "waiting") state.activeCampaignId = null;
  return state;
}

export function joinCampaign(username: string, campaignId: string): { ok: boolean; error?: string; state?: AgentState } {
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) return { ok: false, error: "Kampanya bulunamadı." };
  const state = getAgentState(username);
  state.status = "waiting";
  state.activeCampaignId = campaignId;
  state.updatedAt = new Date().toISOString();
  return { ok: true, state };
}

export function manualDial(username: string, number: string): { ok: boolean; error?: string; state?: AgentState } {
  const cleaned = number.replace(/[^\d+]/g, "");
  if (cleaned.length < 7) return { ok: false, error: "Geçerli bir telefon numarası girin." };
  const state = getAgentState(username);
  state.status = "on_call";
  state.lastDialNumber = cleaned;
  state.updatedAt = new Date().toISOString();
  return { ok: true, state };
}

export function listCampaigns(): PbxCampaign[] {
  return MOCK_CAMPAIGNS;
}
