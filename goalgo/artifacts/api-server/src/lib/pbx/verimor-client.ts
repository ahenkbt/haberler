const VERIMOR_API_BASE = "https://api.bulutsantralim.com";
const VERIMOR_WEBPHONE_BASE = "https://oim.verimor.com.tr/webphone";

export type VerimorConfig = {
  apiKey: string;
  domain: string | null;
};

export type VerimorAgentStatus = {
  agent: string;
  status: "AVAILABLE" | "TALKING" | "LOGGED_OUT" | "ON_BREAK";
  queues: string[];
  breakDescription?: string;
};

export type VerimorQueue = {
  number: number;
  name: string;
};

async function verimorText(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(`${VERIMOR_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "*/*",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.trim() };
}

async function verimorJson<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const result = await verimorText(path, init);
  if (!result.ok) {
    return { ok: false, status: result.status, data: null, error: result.text || `HTTP ${result.status}` };
  }
  if (!result.text) return { ok: true, status: result.status, data: null };
  try {
    return { ok: true, status: result.status, data: JSON.parse(result.text) as T };
  } catch {
    return { ok: true, status: result.status, data: result.text as unknown as T };
  }
}

export function webphoneIframeUrl(token: string): string {
  return `${VERIMOR_WEBPHONE_BASE}?token=${encodeURIComponent(token)}`;
}

/** Dahili için web telefon token'ı al (1 gün geçerli). */
export async function fetchWebphoneToken(config: VerimorConfig, extension: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const res = await verimorText("/webphone_tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: config.apiKey, extension }),
  });
  if (!res.ok) {
    return { ok: false, error: res.text || `HTTP ${res.status}` };
  }
  return { ok: true, token: res.text };
}

/** API anahtarı ve domain doğrulama. */
export async function testVerimorConnection(config: VerimorConfig): Promise<{ ok: boolean; message: string; queueCount?: number }> {
  const result = await verimorJson<VerimorQueue[]>(`/queues?key=${encodeURIComponent(config.apiKey)}`);
  if (!result.ok) {
    return { ok: false, message: result.error ?? "Bağlantı başarısız" };
  }
  const queues = Array.isArray(result.data) ? result.data : [];
  return {
    ok: true,
    message: `Verimor bağlantısı başarılı. ${queues.length} kuyruk bulundu.${config.domain ? ` Domain: ${config.domain}` : ""}`,
    queueCount: queues.length,
  };
}

export async function fetchVerimorQueues(config: VerimorConfig): Promise<VerimorQueue[]> {
  const result = await verimorJson<VerimorQueue[]>(`/queues?key=${encodeURIComponent(config.apiKey)}`);
  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchVerimorAgentStatuses(config: VerimorConfig, agent?: string): Promise<VerimorAgentStatus[]> {
  const params = new URLSearchParams({ key: config.apiKey });
  if (agent) params.set("agent", agent);
  const result = await verimorJson<VerimorAgentStatus[]>(`/agent_statuses?${params.toString()}`);
  return Array.isArray(result.data) ? result.data : [];
}

export async function fetchVerimorUserStatuses(config: VerimorConfig): Promise<Array<{ user: string; status: string }>> {
  const result = await verimorJson<Array<{ user: string; status: string }>>(
    `/user_statuses?key=${encodeURIComponent(config.apiKey)}`,
  );
  return Array.isArray(result.data) ? result.data : [];
}

export async function originateVerimorCall(
  config: VerimorConfig,
  extension: string,
  destination: string,
  callerId?: string,
): Promise<{ ok: boolean; callUuid?: string; error?: string }> {
  const params = new URLSearchParams({
    key: config.apiKey,
    extension,
    destination: destination.replace(/\D/g, ""),
  });
  if (callerId) params.set("caller_id", callerId.replace(/\D/g, ""));
  const result = await verimorText(`/originate?${params.toString()}`);
  if (!result.ok) return { ok: false, error: result.text };
  return { ok: true, callUuid: result.text };
}

export async function hangupVerimorCall(config: VerimorConfig, callUuid: string): Promise<{ ok: boolean; error?: string }> {
  const result = await verimorText(`/hangup/${encodeURIComponent(callUuid)}?key=${encodeURIComponent(config.apiKey)}`);
  if (!result.ok) return { ok: false, error: result.text };
  return { ok: true };
}

export async function setVerimorDnd(
  config: VerimorConfig,
  extension: string,
  state: "on" | "off",
): Promise<{ ok: boolean; error?: string }> {
  const result = await verimorText(
    `/dnd/${encodeURIComponent(extension)}?state=${state}&key=${encodeURIComponent(config.apiKey)}`,
  );
  if (!result.ok) return { ok: false, error: result.text };
  return { ok: true };
}

/** Kuyruğa dahili ekle/çıkar: action=add|remove|move */
export async function manageVerimorQueueUsers(
  config: VerimorConfig,
  queueNumber: number,
  action: "add" | "remove",
  user: string,
): Promise<{ ok: boolean; error?: string }> {
  const params = new URLSearchParams({
    key: config.apiKey,
    queue_number: String(queueNumber),
    action,
    user,
  });
  const result = await verimorText(`/queue/manage_users?${params.toString()}`);
  if (!result.ok) return { ok: false, error: result.text };
  return { ok: true };
}

export async function fetchVerimorQueueMembers(
  config: VerimorConfig,
  queueNumber: number,
): Promise<Array<{ user: number; name: string }>> {
  const result = await verimorJson<Array<{ user: number; name: string }>>(
    `/queue/user_list?key=${encodeURIComponent(config.apiKey)}&queue_number=${queueNumber}`,
  );
  return Array.isArray(result.data) ? result.data : [];
}

export async function stopVerimorCampaign(config: VerimorConfig, campaignId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await verimorText(
    `/ivr_campaigns/${encodeURIComponent(campaignId)}/stop?key=${encodeURIComponent(config.apiKey)}`,
  );
  if (!result.ok) return { ok: false, error: result.text };
  return { ok: true };
}

export async function createVerimorQueueCampaign(
  config: VerimorConfig,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; campaignId?: string; error?: string }> {
  const res = await verimorText("/ivr_campaigns.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: config.apiKey, ...payload }),
  });
  if (!res.ok) return { ok: false, error: res.text };
  return { ok: true, campaignId: res.text };
}
