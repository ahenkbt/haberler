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

export type HmEditorRssCampaignRunResult = {
  ok: boolean;
  status: number;
  data: {
    accepted?: boolean;
    added?: number;
    skipped?: number;
    message?: string;
    error?: string;
  };
};

function isRssRunBusy(status: number, data: { error?: string; message?: string }, rawText: string): boolean {
  if (status === 502 || status === 503 || status === 504) return true;
  const blob = `${data.error || ""} ${data.message || ""} ${rawText}`;
  return /uyanıyor|meşgul|Failed to start|provisioning|timeout|Sunucu yanıtı okunamadı/i.test(blob);
}

/**
 * RSS kampanya Çalıştır — cold Container 503'te healthz ile ısıtıp yeniden dener.
 */
export async function hmEditorRunRssCampaign(campaignId: number): Promise<HmEditorRssCampaignRunResult> {
  const id = Number(campaignId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, status: 400, data: { error: "Geçersiz kampanya" } };
  }

  let lastStatus = 0;
  let data: HmEditorRssCampaignRunResult["data"] = {};

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    void fetch(apiUrl("/api/healthz/live"), { cache: "no-store" }).catch(() => null);

    const res = await hmEditorRequest(`/api/hm/editor/rss/campaigns/${id}/run`, {
      method: "POST",
      body: "{}",
    });
    lastStatus = res.status;
    const text = await res.text().catch(() => "");
    try {
      data = text ? (JSON.parse(text) as HmEditorRssCampaignRunResult["data"]) : {};
    } catch {
      data = {
        error: text.trim().slice(0, 180) || `Sunucu yanıtı okunamadı (HTTP ${res.status}).`,
      };
    }

    if (res.ok || !isRssRunBusy(res.status, data, text)) break;
  }

  return {
    ok: lastStatus >= 200 && lastStatus < 300,
    status: lastStatus,
    data,
  };
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
