import { apiFetch } from "@/lib/apiBase";

/** AgentLabs API yolu — vekil: /api/call-center/proxy/{path} */
export async function callCenterProxy<T = unknown>(
  agentPath: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const clean = agentPath.replace(/^\/api\//, "").replace(/^\/+/, "");
  const res = await apiFetch(`/api/call-center/proxy/${clean}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}

export function proxyErrorMessage(data: unknown, fallback = "İstek başarısız"): string {
  if (!data || typeof data !== "object") return fallback;
  const o = data as Record<string, unknown>;
  if (typeof o.error === "string") return o.error;
  const err = o.error as Record<string, unknown> | undefined;
  if (err && typeof err.message === "string") return err.message;
  if (typeof o.message === "string") return o.message;
  return fallback;
}
