export type AiCallProvider = "openai" | "gemini";

export type AiCallRoutingMode = "ai_only" | "hybrid";

export type AiCallCampaignStatus = "draft" | "running" | "paused" | "completed";

export type AiCallContactStatus = "pending" | "calling" | "completed" | "failed" | "transferred";

export type AiCallSettings = {
  id: string;
  defaultProvider: AiCallProvider;
  defaultModel: string;
  demoMode: boolean;
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
  openaiKeyMasked: string;
  geminiKeyMasked: string;
};

export type AiCallAssistant = {
  id: string;
  name: string;
  systemPrompt: string;
  voice: string;
  provider: AiCallProvider;
  model: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiCallCampaign = {
  id: string;
  name: string;
  assistantId: string | null;
  assistantName?: string | null;
  trunkId: string | null;
  trunkName?: string | null;
  routingMode: AiCallRoutingMode;
  status: AiCallCampaignStatus;
  enabled: boolean;
  contactCount: number;
  scheduleJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AiCallContact = {
  id: string;
  campaignId: string;
  phone: string;
  name: string;
  status: AiCallContactStatus;
  attempts: number;
  lastCalledAt: string | null;
};

export type AiCallLog = {
  id: string;
  campaignId: string | null;
  contactId: string | null;
  assistantId: string | null;
  phone: string;
  direction: string;
  status: string;
  durationSec: number;
  provider: string;
  model: string;
  transcript: string;
  aiSummary: string;
  transferred: boolean;
  startedAt: string;
  endedAt: string | null;
};

export type AiCallFlow = {
  id: string;
  name: string;
  description: string;
  flowJson: unknown;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiCallStatus = {
  native: true;
  demoMode: boolean;
  configured: boolean;
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  trunkCount: number;
  assistantCount: number;
  campaignCount: number;
  runningCampaigns: number;
  totalCalls: number;
};
