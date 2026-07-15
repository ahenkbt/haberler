/**
 * Geçici: tüm trafik → Render (SPA + API aynı origin).
 * Netlify kredi / CF asset build olmadan siteler açılsın.
 * Neon cutover sonrası bu vekil kaldırılıp Assets+Container'a dönülecek.
 */

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";

function upstreamOrigin(env) {
  return String(env.API_ORIGIN || env.RENDER_API_ORIGIN || DEFAULT_API).replace(/\/+$/, "");
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const origin = upstreamOrigin(env);
    const target = new URL(incoming.pathname + incoming.search, origin);

    const headers = new Headers(request.headers);
    headers.set("host", new URL(origin).host);
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", incoming.protocol.replace(":", "") || "https");
    headers.set("x-forwarded-for", request.headers.get("cf-connecting-ip") || "");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");
    headers.delete("content-length");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    try {
      const upstream = await fetch(target.toString(), init);
      const out = new Headers(upstream.headers);
      out.delete("content-encoding");
      out.delete("transfer-encoding");
      out.set("x-yekpare-frontend", "cloudflare-render-proxy");
      // SPA/HTML önbelleğini kırma
      if ((out.get("content-type") || "").includes("text/html")) {
        out.set("cache-control", "no-store, max-age=0, must-revalidate");
      }
      return new Response(upstream.body, { status: upstream.status, headers: out });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "render_upstream_unavailable",
          detail: String(err?.message || err),
          upstream: origin,
        }),
        {
          status: 502,
          headers: { "content-type": "application/json", "x-yekpare-frontend": "cloudflare-render-proxy" },
        },
      );
    }
  },
};
