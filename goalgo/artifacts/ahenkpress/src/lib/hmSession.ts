export const HM_EDITOR_JWT_KEY = "hm_editor_jwt";
export const HM_EDITOR_SITE_KEY = "hm_editor_site";
export const HM_EDITOR_BRIEF_KEY = "hm_editor_brief";

export type HmSiteBrief = { id: number; slug: string; domain: string | null; displayName: string };
export type HmEditorBrief = { id: number; email: string; displayName: string | null };

export type HmSessionEventOpts = { silent?: boolean };

export function readHmJwt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(HM_EDITOR_JWT_KEY);
}

export function readHmSite(): HmSiteBrief | null {
  if (typeof window === "undefined") return null;
  try {
    const r = window.localStorage.getItem(HM_EDITOR_SITE_KEY);
    if (!r) return null;
    return JSON.parse(r) as HmSiteBrief;
  } catch {
    return null;
  }
}

export function readHmEditorBrief(): HmEditorBrief | null {
  if (typeof window === "undefined") return null;
  try {
    const r = window.localStorage.getItem(HM_EDITOR_BRIEF_KEY);
    if (!r) return null;
    return JSON.parse(r) as HmEditorBrief;
  } catch {
    return null;
  }
}

export function writeHmSession(
  token: string,
  site: HmSiteBrief,
  editor?: HmEditorBrief | null,
  opts?: HmSessionEventOpts,
): void {
  window.localStorage.setItem(HM_EDITOR_JWT_KEY, token);
  window.localStorage.setItem(HM_EDITOR_SITE_KEY, JSON.stringify(site));
  if (editor) {
    window.localStorage.setItem(HM_EDITOR_BRIEF_KEY, JSON.stringify(editor));
  }
  if (!opts?.silent) {
    window.dispatchEvent(new Event("hm-editor-session"));
  }
}

export function clearHmSession(opts?: HmSessionEventOpts): void {
  window.localStorage.removeItem(HM_EDITOR_JWT_KEY);
  window.localStorage.removeItem(HM_EDITOR_SITE_KEY);
  window.localStorage.removeItem(HM_EDITOR_BRIEF_KEY);
  if (!opts?.silent) {
    window.dispatchEvent(new Event("hm-editor-session"));
  }
}
