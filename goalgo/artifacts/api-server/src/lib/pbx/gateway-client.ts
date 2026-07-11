import type { PbxLiveAgentRow, PbxLiveQueueRow } from "./types.js";

function gatewayBaseUrl(): string | null {
  const raw = String(process.env.PBX_GATEWAY_URL ?? "").trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

type GatewayLivePayload = {
  ok?: boolean;
  data?: PbxLiveQueueRow[] | PbxLiveAgentRow[];
};

async function fetchGatewayJson<T>(path: string): Promise<T | null> {
  const base = gatewayBaseUrl();
  if (!base) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${base}${path}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    const body = (await res.json()) as { ok?: boolean; data?: T };
    if (!res.ok || !body.ok || body.data == null) return null;
    return body.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Asterisk AMI canlı kuyruk — gateway bağlı ve AMI aktifse DB demo verisinin üzerine yazar. */
export async function fetchLiveQueuesFromGateway(): Promise<PbxLiveQueueRow[] | null> {
  return fetchGatewayJson<PbxLiveQueueRow[]>("/api/live/queue");
}

export async function fetchLiveAgentsFromGateway(): Promise<PbxLiveAgentRow[] | null> {
  return fetchGatewayJson<PbxLiveAgentRow[]>("/api/live/agents");
}

export function isPbxGatewayConfigured(): boolean {
  return Boolean(gatewayBaseUrl());
}
