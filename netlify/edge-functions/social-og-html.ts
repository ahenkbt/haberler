import type { Context } from "https://edge.netlify.com";

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";
const EDGE_FETCH_TIMEOUT_MS = 4000;

function apiOrigin(): string {
  return (
    Netlify.env.get("RENDER_API_ORIGIN") ||
    Netlify.env.get("RAILWAY_API_ORIGIN") ||
    DEFAULT_API
  ).replace(/\/+$/, "");
}

function shortAbortSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

function isSocialPreviewBot(userAgent: string): boolean {
  const ua = String(userAgent ?? "").toLowerCase();
  return /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|bingbot|googlebot|duckduckbot|yandexbot|gptbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot|google-extended|applebot|cohere-ai|bytespider|meta-externalagent|amazonbot/.test(
    ua,
  );
}

function parsePortalExtraHosts(): string[] {
  return String(Netlify.env.get("VITE_PORTAL_HOSTS") ?? Netlify.env.get("PORTAL_EXTRA_HOSTS") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
}

function isDefaultPortalHost(host: string): boolean {
  const h = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
  return (
    h === "yekpare.net" ||
    h === "www.yekpare.net" ||
    h === "turknet.app" ||
    h === "www.turknet.app" ||
    h === "goalgo.org" ||
    h === "turkiye.li" ||
    h === "getirsepeti.com.tr" ||
    h === "ahenk.net.tr" ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".vercel.app") ||
    h.endsWith(".netlify.app") ||
    parsePortalExtraHosts().includes(h)
  );
}

function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/yektube-v2/") ||
    pathname.startsWith("/yp/") ||
    /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$/i.test(pathname)
  );
}

function isHmLegacyRedirectPath(pathOnly: string): boolean {
  return (
    /^\/(?:etiket|tag|etiketler)(?:\/|$)/i.test(pathOnly) ||
    /^\/\d{4}\/\d{2}(?:\/|$)/.test(pathOnly) ||
    /^\/feed(?:\/|$)/i.test(pathOnly)
  );
}

function needsHmHostLookup(host: string, pathOnly: string, isBot: boolean): boolean {
  if (isDefaultPortalHost(host)) return false;
  if (isBot) return true;
  if (pathOnly === "/llms.txt" || pathOnly === "/ai.txt") return true;
  return isHmLegacyRedirectPath(pathOnly);
}

function isPortalOgSharePath(pathname: string): boolean {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (
    p === "/kesfet" ||
    p === "/haberler" ||
    p === "/siparis" ||
    p === "/alisveris" ||
    p === "/turizm" ||
    p === "/bilgiagaci" ||
    p === "/ansiklopedi" ||
    p === "/magaza"
  ) {
    return true;
  }
  if (p.startsWith("/bilgi/")) return true;
  if (p.startsWith("/bilgiagaci/") || p.startsWith("/ansiklopedi/")) return true;
  if (/^\/haberler\/rss\/[^/]+$/.test(p)) return true;
  if (/^\/(?:yp|yektube-v2)?\/kanal\/[^/]+\/[^/]+$/.test(p)) return true;
  if (/^\/kanal\/[^/]+\/[^/]+$/.test(p)) return true;
  if (/^\/(siparis\/satici|alisveris\/magaza|magaza\/magaza)\/[^/]+\/blog(?:\/[^/]+)?$/.test(p)) return true;
  return (
    /^\/siparis\/satici\/[^/]+$/.test(p) ||
    /^\/alisveris\/magaza\/[^/]+$/.test(p) ||
    /^\/magaza\/magaza\/[^/]+$/.test(p) ||
    /^\/magaza\/urun\/[^/]+$/.test(p) ||
    /^\/kesfet\/[^/]+$/.test(p) ||
    /^\/haber\/[^/]+$/.test(p) ||
    /^\/turizm\/[^/]+\/[^/]+$/.test(p)
  );
}

function isYektubeWatchPath(pathname: string): boolean {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return /^\/(?:yp|yektube-v2)?\/kanal\/[^/]+\/[^/]+$/.test(p) || /^\/kanal\/[^/]+\/[^/]+$/.test(p);
}

async function fetchHmSlugForHost(host: string): Promise<string | null> {
  const h = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
  if (!h || isDefaultPortalHost(h)) return null;
  try {
    const res = await fetch(`${apiOrigin()}/api/hm/meta/by-domain?domain=${encodeURIComponent(h)}`, {
      headers: { accept: "application/json" },
      signal: shortAbortSignal(EDGE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const meta = await res.json().catch(() => null);
    const slug = String(meta?.slug ?? meta?.data?.slug ?? "").trim();
    return slug || null;
  } catch {
    return null;
  }
}

export default async (request: Request, context: Context) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return context.next();
  }

  const incoming = new URL(request.url);
  const host = (incoming.hostname || "").toLowerCase();
  const pathOnly = incoming.pathname.replace(/\/+$/, "") || "/";

  if (isStaticAssetPath(incoming.pathname)) {
    return context.next();
  }

  const ua = request.headers.get("user-agent") ?? "";
  const isBot = isSocialPreviewBot(ua);

  let hmBound = false;
  if (needsHmHostLookup(host, pathOnly, isBot)) {
    hmBound = Boolean(await fetchHmSlugForHost(host));
  }

  if (hmBound) {
    if (isHmLegacyRedirectPath(pathOnly)) {
      const dest = new URL("/sondakika", incoming.origin);
      dest.search = incoming.search;
      return Response.redirect(dest.toString(), 301);
    }
    if (pathOnly === "/llms.txt" || pathOnly === "/ai.txt") {
      const apiPath = pathOnly === "/llms.txt" ? "/api/hm/llms.txt" : "/api/hm/ai.txt";
      try {
        const upstream = await fetch(`${apiOrigin()}${apiPath}`, {
          headers: { accept: "text/plain", host: incoming.host, "x-forwarded-host": incoming.host },
          signal: shortAbortSignal(EDGE_FETCH_TIMEOUT_MS),
        });
        if (upstream.ok) {
          const headers = new Headers(upstream.headers);
          headers.set("cache-control", "public, max-age=3600");
          if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
          return new Response(upstream.body, { status: upstream.status, headers });
        }
      } catch {
        /* fall through to SPA */
      }
    }
  }

  if (!isBot) {
    return context.next();
  }

  const cleanPath = incoming.pathname.replace(/\/+$/, "") || "/";
  if (isYektubeWatchPath(cleanPath)) {
    const target = new URL(`${apiOrigin()}/api/video/og/watch-by-path`);
    target.searchParams.set("path", cleanPath);
    target.searchParams.set("origin", incoming.origin);
    try {
      const upstream = await fetch(target.toString(), {
        headers: { accept: "text/html", "user-agent": ua },
        signal: shortAbortSignal(EDGE_FETCH_TIMEOUT_MS),
      });
      if (upstream.ok) {
        const headers = new Headers(upstream.headers);
        headers.delete("content-encoding");
        headers.set("cache-control", "public, max-age=600, s-maxage=600");
        if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
        return new Response(upstream.body, { status: upstream.status, headers });
      }
    } catch {
      /* fall through */
    }
  }

  const isHmSlugPath = /^\/tr\/[^/]+(?:\/.*)?$/.test(cleanPath);
  const isCustomHmDomainPath = hmBound;
  const isPortalSharePath = (isDefaultPortalHost(host) || !hmBound) && isPortalOgSharePath(cleanPath);

  if (!isHmSlugPath && !isCustomHmDomainPath && !isPortalSharePath) {
    return context.next();
  }

  const target = new URL(`${apiOrigin()}/api/public/og-html`);
  target.searchParams.set("path", cleanPath);
  target.searchParams.set("origin", incoming.origin);

  try {
    const upstream = await fetch(target.toString(), {
      headers: { accept: "text/html", "user-agent": ua },
      signal: shortAbortSignal(EDGE_FETCH_TIMEOUT_MS),
    });
    if (!upstream.ok) {
      return context.next();
    }
    const headers = new Headers(upstream.headers);
    headers.delete("content-encoding");
    headers.set("cache-control", "public, max-age=300, s-maxage=300");
    if (request.method === "HEAD") {
      return new Response(null, { status: upstream.status, headers });
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return context.next();
  }
};
