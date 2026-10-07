/**
 * Container kapalıyken bile Worker'ın ayakta olduğunu bildir.
 * Panel ApiConnectivityBanner /healthz/live'a bakıyor; Container 503/timeout
 * yüzünden tüm panel «Sunucuya ulaşılamıyor» oluyordu.
 *
 * GET /api/healthz/live  → kenar JSON (Container yok)
 * Arka planda Container'ı ısıtır (waitUntil).
 */
import { fetchApi, resolveApiOrigin } from "./api-upstream.js";

export function isEdgeHealthzLivePath(pathname) {
  const p = String(pathname || "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return p === "/api/healthz/live";
}

export async function handleEdgeHealthzLive(request, env, ctx) {
  if (String(request.method || "GET").toUpperCase() !== "GET") return null;
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (!isEdgeHealthzLivePath(path)) return null;

  const waitUntil = typeof ctx?.waitUntil === "function" ? (p) => ctx.waitUntil(p) : null;
  if (waitUntil) {
    const origin = resolveApiOrigin(env) || "https://ahenk.net.tr";
    waitUntil(
      fetchApi(env, `${origin}/api/healthz`)
        .then((r) => r?.text?.().catch(() => null))
        .catch((err) => {
          console.error("[edge-healthz-wake]", String(err?.message || err).slice(0, 160));
        }),
    );
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      edge: true,
      wokeContainer: Boolean(waitUntil),
      ts: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "cdn-cache-control": "no-store",
        "x-yekpare-frontend": "cloudflare-edge-healthz",
      },
    },
  );
}
