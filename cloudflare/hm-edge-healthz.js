/**
 * Container kapalıyken bile Worker'ın ayakta olduğunu bildir.
 * Panel ApiConnectivityBanner /healthz/live'a bakıyor; Container 503/timeout
 * yüzünden tüm panel «Sunucuya ulaşılamıyor» oluyordu.
 *
 * GET /api/healthz/live  → kenar JSON (Container yok).
 * Arka planda /api/healthz ile ısıtma yok: her canlılık yoklaması instance'ı
 * sleepAfter boyunca sıcak tutup GiB-sn yazıyordu.
 */

export function isEdgeHealthzLivePath(pathname) {
  const p = String(pathname || "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return p === "/api/healthz/live";
}

export async function handleEdgeHealthzLive(request, _env, _ctx) {
  if (String(request.method || "GET").toUpperCase() !== "GET") return null;
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (!isEdgeHealthzLivePath(path)) return null;

  return new Response(
    JSON.stringify({
      status: "ok",
      edge: true,
      wokeContainer: false,
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
