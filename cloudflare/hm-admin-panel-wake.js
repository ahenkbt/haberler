/**
 * Yönetici paneli HM site CRUD / onarım — soğuk Container bütçe aşımını azaltır.
 * admin-panel-status ile aynı healthz ısıtma; ağır /api/hm/* yollarında erken tetiklenir.
 */
import { fetchApi, resolveApiOrigin } from "./api-upstream.js";

export function isHmAdminPanelHeavyApiPath(pathname, method) {
  const p = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  const m = String(method || "GET").toUpperCase();
  if (p === "/api/hm/sites") return true;
  if (/^\/api\/hm\/sites\/\d+$/.test(p)) return true;
  if (/^\/api\/hm\/sites\/\d+\/ensure-gundemi$/.test(p)) return true;
  if (p.startsWith("/api/hm/admin/")) return true;
  if (m !== "GET" && m !== "HEAD" && m !== "POST" && m !== "PATCH" && m !== "PUT" && m !== "DELETE") {
    return false;
  }
  return false;
}

/** @param {unknown} env @param {{ waitUntil?: (p: Promise<unknown>) => void } | null | undefined} ctx */
export function wakeApiContainerBackground(env, ctx) {
  const waitUntil = typeof ctx?.waitUntil === "function" ? (p) => ctx.waitUntil(p) : null;
  if (!waitUntil) return;
  const origin = resolveApiOrigin(env) || "https://ahenk.net.tr";
  const live = `${origin}/api/healthz/live`;
  const healthz = `${origin}/api/healthz`;
  waitUntil(
    fetchApi(env, live)
      .catch(() => null)
      .then(() =>
        fetchApi(env, healthz)
          .then((r) => r?.text?.().catch(() => null))
          .catch((err) => {
            console.error("[hm-admin-panel-wake]", String(err?.message || err).slice(0, 160));
          }),
      ),
  );
}
