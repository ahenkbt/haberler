/**
 * GET /api/members/admin-panel-status — Container uyanmadan kenar oturum okuma.
 * Panel «Oturum doğrulanıyor / bilgisi yükleniyor» soğuk Container'da asılı kalmasın.
 * Arka planda Container ısıtılır (waitUntil).
 */
import { fetchApi, resolveApiOrigin } from "./api-upstream.js";
import { loadPanelSession, readCookie, unsignConnectSid } from "./hm-admin-site-edge.js";

const COOKIE_NAME = "connect.sid";

export function isAdminPanelStatusPath(pathname) {
  const p = String(pathname || "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return p === "/api/members/admin-panel-status";
}

/** Container isPanelFullAdminSession ile aynı: panelPermissions yok/null → tam yetki. */
export function panelStatusFromSession(sess) {
  const boot = sess?.panelBootstrap === true;
  const perms = sess?.panelPermissions;
  const panelFullAdmin = boot && (perms === undefined || perms === null);
  return {
    panelBootstrap: boot,
    panelFullAdmin,
    permissions: Array.isArray(perms) ? perms : null,
    edge: true,
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "cdn-cache-control": "no-store",
      vary: "Origin, Cookie",
      "x-yekpare-frontend": "cloudflare-admin-panel-status-edge",
    },
  });
}

function wakeContainer(env, ctx) {
  const waitUntil = typeof ctx?.waitUntil === "function" ? (p) => ctx.waitUntil(p) : null;
  if (!waitUntil) return;
  const origin = resolveApiOrigin(env) || "https://ahenk.net.tr";
  waitUntil(
    fetchApi(env, `${origin}/api/healthz`)
      .then((r) => r?.text?.().catch(() => null))
      .catch((err) => {
        console.error("[admin-panel-status-wake]", String(err?.message || err).slice(0, 160));
      }),
  );
}

/**
 * @returns {Promise<Response|null>}
 */
export async function handleAdminPanelStatusEdge(request, env, ctx) {
  if (String(request.method || "GET").toUpperCase() !== "GET") return null;
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (!isAdminPanelStatusPath(path)) return null;

  wakeContainer(env, ctx);

  const secret = String(env?.SESSION_SECRET || "").trim();
  if (!secret) {
    // Secret yoksa Container'a bırak (null).
    return null;
  }

  const sid = await unsignConnectSid(readCookie(request.headers.get("cookie"), COOKIE_NAME), secret);
  if (!sid) {
    return jsonResponse(200, panelStatusFromSession(null));
  }

  try {
    const { sess } = await loadPanelSession(env, sid);
    return jsonResponse(200, panelStatusFromSession(sess));
  } catch (err) {
    console.error("[admin-panel-status-edge]", String(err?.message || err).slice(0, 160));
    // Neon okunamadı — Container denesin (null).
    return null;
  }
}
