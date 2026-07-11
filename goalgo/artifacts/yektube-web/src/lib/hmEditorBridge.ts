const HM_EDITOR_JWT_KEY = "hm_editor_jwt";
const HM_EDITOR_SITE_KEY = "hm_editor_site";
const HM_EDITOR_BRIEF_KEY = "hm_editor_brief";

export const HM_EDITOR_JWT_POST_MESSAGE = "goalgo:hm-editor-jwt";

export function readHmEditorJwt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(HM_EDITOR_JWT_KEY)?.trim() || null;
}

export function writeHmEditorJwt(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HM_EDITOR_JWT_KEY, token.trim());
}

export function readHmEditorSiteSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HM_EDITOR_SITE_KEY);
    if (!raw) return null;
    const site = JSON.parse(raw) as { slug?: string };
    return site.slug?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export function readHmEditorEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HM_EDITOR_BRIEF_KEY);
    if (!raw) return null;
    const editor = JSON.parse(raw) as { email?: string };
    return editor.email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export function writeHmEditorSession(token: string, site: { id: number; slug: string; domain?: string | null; displayName: string }, editor: { id: number; email: string; displayName?: string | null }): void {
  window.localStorage.setItem(HM_EDITOR_JWT_KEY, token);
  window.localStorage.setItem(HM_EDITOR_SITE_KEY, JSON.stringify(site));
  window.localStorage.setItem(HM_EDITOR_BRIEF_KEY, JSON.stringify(editor));
}

/** Editör paneli üst çerçeveden JWT al (iframe localStorage gecikmesi / çerez sorunları). */
export function listenForHmEditorJwtFromParent(onToken: (token: string) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (ev: MessageEvent) => {
    if (ev.origin !== window.location.origin) return;
    const data = ev.data as { type?: string; token?: string } | null;
    if (data?.type !== HM_EDITOR_JWT_POST_MESSAGE) return;
    const token = data.token?.trim();
    if (token) onToken(token);
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
