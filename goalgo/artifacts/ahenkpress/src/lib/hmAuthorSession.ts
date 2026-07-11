export const HM_AUTHOR_JWT_KEY = "hm_author_jwt";
export const HM_AUTHOR_PAYLOAD_KEY = "hm_author_payload";

export type HmAuthorSiteBrief = { id: number; slug: string; domain: string | null; displayName: string };
export type HmAuthorBrief = { id: number; name: string; email: string };

export type HmAuthorStoredPayload = { site: HmAuthorSiteBrief; author: HmAuthorBrief };

export function readHmAuthorJwt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(HM_AUTHOR_JWT_KEY);
}

export function readHmAuthorPayload(): HmAuthorStoredPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const r = window.localStorage.getItem(HM_AUTHOR_PAYLOAD_KEY);
    if (!r) return null;
    return JSON.parse(r) as HmAuthorStoredPayload;
  } catch {
    return null;
  }
}

export function writeHmAuthorSession(token: string, payload: HmAuthorStoredPayload): void {
  window.localStorage.setItem(HM_AUTHOR_JWT_KEY, token);
  window.localStorage.setItem(HM_AUTHOR_PAYLOAD_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("hm-author-session"));
}

export function clearHmAuthorSession(): void {
  window.localStorage.removeItem(HM_AUTHOR_JWT_KEY);
  window.localStorage.removeItem(HM_AUTHOR_PAYLOAD_KEY);
  window.dispatchEvent(new Event("hm-author-session"));
}
