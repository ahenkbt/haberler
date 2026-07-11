import { apiFetch } from "@/lib/apiBase";

export type AiCallSettings = {
  id: string;
  defaultProvider: "openai" | "gemini";
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
  provider: "openai" | "gemini";
  model: string;
  enabled: boolean;
};

export type AiCallCampaign = {
  id: string;
  name: string;
  assistantId: string | null;
  assistantName?: string | null;
  trunkId: string | null;
  trunkName?: string | null;
  routingMode: "ai_only" | "hybrid";
  status: string;
  enabled: boolean;
  contactCount: number;
};

export type AiCallLog = {
  id: string;
  phone: string;
  status: string;
  provider: string;
  model: string;
  transcript: string;
  aiSummary: string;
  transferred: boolean;
  durationSec: number;
  startedAt: string;
};

export type AiCallStatus = {
  native: boolean;
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

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data;
}

export async function fetchAiCallStatus(): Promise<AiCallStatus> {
  const res = await apiFetch("/api/ai-call/admin/status");
  return parseJson<{ ok: boolean } & AiCallStatus>(res);
}

export async function fetchAiCallSettings(): Promise<AiCallSettings> {
  const res = await apiFetch("/api/ai-call/admin/settings");
  const data = await parseJson<{ ok: boolean; settings: AiCallSettings }>(res);
  return data.settings;
}

export async function saveAiCallSettings(patch: Record<string, unknown>): Promise<AiCallSettings> {
  const res = await apiFetch("/api/ai-call/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJson<{ ok: boolean; settings: AiCallSettings }>(res);
  return data.settings;
}

export async function testOpenAi(apiKey?: string, model?: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  const res = await apiFetch("/api/ai-call/admin/settings/test-openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, model }),
  });
  return parseJson(res);
}

export async function testGemini(apiKey?: string, model?: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  const res = await apiFetch("/api/ai-call/admin/settings/test-gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, model }),
  });
  return parseJson(res);
}

export async function fetchAssistants(): Promise<AiCallAssistant[]> {
  const res = await apiFetch("/api/ai-call/admin/assistants");
  const data = await parseJson<{ ok: boolean; assistants: AiCallAssistant[] }>(res);
  return data.assistants;
}

export async function saveAssistant(input: Partial<AiCallAssistant> & { id?: string }): Promise<AiCallAssistant> {
  const res = await apiFetch("/api/ai-call/admin/assistants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ ok: boolean; assistant: AiCallAssistant }>(res);
  return data.assistant;
}

export async function deleteAssistant(id: string): Promise<void> {
  const res = await apiFetch(`/api/ai-call/admin/assistants/${id}`, { method: "DELETE" });
  await parseJson(res);
}

export async function fetchAiCampaigns(): Promise<AiCallCampaign[]> {
  const res = await apiFetch("/api/ai-call/admin/campaigns");
  const data = await parseJson<{ ok: boolean; campaigns: AiCallCampaign[] }>(res);
  return data.campaigns;
}

export async function saveAiCampaign(input: Record<string, unknown>): Promise<AiCallCampaign> {
  const res = await apiFetch("/api/ai-call/admin/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ ok: boolean; campaign: AiCallCampaign }>(res);
  return data.campaign;
}

export async function startAiCampaign(id: string): Promise<void> {
  const res = await apiFetch(`/api/ai-call/admin/campaigns/${id}/start`, { method: "POST" });
  await parseJson(res);
}

export async function stopAiCampaign(id: string): Promise<void> {
  const res = await apiFetch(`/api/ai-call/admin/campaigns/${id}/stop`, { method: "POST" });
  await parseJson(res);
}

export async function fetchAiCallLogs(limit = 50): Promise<AiCallLog[]> {
  const res = await apiFetch(`/api/ai-call/admin/logs?limit=${limit}`);
  const data = await parseJson<{ ok: boolean; logs: AiCallLog[] }>(res);
  return data.logs;
}

export async function seedAiCallDemo(): Promise<void> {
  const res = await apiFetch("/api/ai-call/admin/seed-demo", { method: "POST" });
  await parseJson(res);
}

export async function fetchAiCallHealth(): Promise<{ ok: boolean; status: string; latencyMs?: number; error?: string }> {
  const res = await apiFetch("/api/ai-call/health");
  return parseJson(res);
}
