/** Same-origin AgentLabs SPA kökü (Vercel middleware vekil). */
export const CALL_CENTER_APP_PREFIX = "/call-center-app";
export const CALL_CENTER_API_PREFIX = "/call-center-api";

/** AgentLabs uygulama yolu → yekpare.net üzerinde vekil URL. */
export function callCenterWorkspaceUrl(agentPath: string): string {
  const raw = agentPath.trim();
  const p = raw.startsWith("/") ? raw : `/${raw}`;
  const base = CALL_CENTER_APP_PREFIX.replace(/\/$/, "");
  if (p === "/" || p === "") return `${base}/`;
  return `${base}${p}`;
}

/** Yönetim panelinden çalışma alanına geçiş (abonelik kontrolü sonrası yönlendirme). */
export function callCenterAdminWorkspaceHref(agentPath: string): string {
  const clean = agentPath.replace(/^\/+/, "").replace(/^app\/?/, "app");
  const suffix = clean.startsWith("app") ? clean : `app/${clean}`;
  return `/admin/yekpare-ai-call/w/${suffix}`;
}
