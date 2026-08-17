import { apiUrl } from "./apiBase";
import { readHmJwt } from "./hmSession";

export async function hmEditorRequest(path: string, init?: RequestInit): Promise<Response> {
  const t = readHmJwt();
  if (!t) throw new Error("Oturum yok");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${t}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), { ...init, headers });
}

export async function hmEditorJson<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await hmEditorRequest(path, init);
  const text = await r.text().catch(() => "");
  if (!r.ok) {
    let msg = text || `HTTP ${r.status}`;
    try {
      const j = JSON.parse(text) as { error?: string; message?: string };
      msg = String(j.error || j.message || msg);
    } catch {
      /* keep msg */
    }
    throw new Error(msg);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
