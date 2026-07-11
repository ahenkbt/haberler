import { apiUrl } from "@/lib/apiBase";
import type { HmEditorBrief, HmSiteBrief } from "@/lib/hmSession";
import type { HmSeoVerification } from "@/lib/pageSeo";
import { parseNewsSiteLayoutFromJson, type NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

export type HmEditorSessionStatus = "idle" | "checking" | "ok" | "denied" | "transient";

export const VERIFY_TIMEOUT_MS = 15_000;

export type HmEditorMePayload = {
  editor: HmEditorBrief;
  site: HmSiteBrief & {
    contactJson?: string;
    layoutJson?: string | null;
    seoVerification?: HmSeoVerification | null;
    createdAt?: string;
  };
};

export type HmEditorSessionVerifyResult =
  | { status: "ok"; data: HmEditorMePayload; newsLayoutPrefs: NewsSiteLayoutPrefs; seoVerification: HmSeoVerification | null }
  | { status: "denied" }
  | { status: "transient" };

async function verifyHmEditorSessionInner(token: string): Promise<HmEditorSessionVerifyResult> {
  const res = await fetch(apiUrl("/api/hm/editor/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return { status: "denied" };
  if (res.status === 429 || res.status >= 500) return { status: "transient" };
  if (!res.ok) return { status: "transient" };
  const j = (await res.json()) as HmEditorMePayload;
  if (!j?.editor || !j?.site) return { status: "denied" };
  return {
    status: "ok",
    data: j,
    newsLayoutPrefs: parseNewsSiteLayoutFromJson(j.site.layoutJson ?? null),
    seoVerification: j.site.seoVerification ?? null,
  };
}

/** `/api/hm/editor/me` — yalnızca 401 oturumu reddeder; ağ/502 geçici sayılır. */
export async function verifyHmEditorSession(token: string): Promise<HmEditorSessionVerifyResult> {
  try {
    return await Promise.race([
      verifyHmEditorSessionInner(token),
      new Promise<HmEditorSessionVerifyResult>((resolve) => {
        setTimeout(() => resolve({ status: "transient" }), VERIFY_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return { status: "transient" };
  }
}
