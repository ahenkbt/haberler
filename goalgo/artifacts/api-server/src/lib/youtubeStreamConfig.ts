import axios from "axios";
import os from "node:os";
import path from "node:path";

export type YoutubeStreamEnv = {
  poToken?: string;
  visitorData?: string;
  proxyUrl?: string;
  playerCacheDir: string;
};

function pickProxyUrl(): string | undefined {
  const direct = process.env.YOUTUBE_EGRESS_PROXY_URL?.trim();
  if (direct) return direct;
  const raw = process.env.YOUTUBE_EGRESS_PROXY_URLS?.trim();
  if (!raw) return undefined;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

function parseAxiosProxy(proxyUrl: string): {
  protocol: string;
  host: string;
  port: number;
  auth?: { username: string; password: string };
} {
  const u = new URL(proxyUrl);
  return {
    protocol: u.protocol.replace(":", ""),
    host: u.hostname,
    port: Number(u.port) || (u.protocol === "https:" ? 443 : 80),
    auth: u.username
      ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password || "") }
      : undefined,
  };
}

export function readYoutubeStreamEnv(): YoutubeStreamEnv {
  const playerCacheDir =
    process.env.YOUTUBE_PLAYER_CACHE_DIR?.trim() ||
    path.join(os.tmpdir(), "yektube-youtubei-player-cache");

  return {
    poToken: process.env.YOUTUBE_PO_TOKEN?.trim() || undefined,
    visitorData: process.env.YOUTUBE_VISITOR_DATA?.trim() || undefined,
    proxyUrl: pickProxyUrl(),
    playerCacheDir,
  };
}

/** InnerTube / googlevideo istekleri — TR egress proxy (opsiyonel) */
export async function youtubeStreamFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const { proxyUrl } = readYoutubeStreamEnv();
  if (!proxyUrl) return fetch(input, init);

  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : String(input);

  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const headerInit = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  const headers: Record<string, string> = {};
  if (headerInit instanceof Headers) {
    headerInit.forEach((v, k) => {
      headers[k] = v;
    });
  } else if (Array.isArray(headerInit)) {
    for (const [k, v] of headerInit) headers[k] = v;
  } else if (headerInit && typeof headerInit === "object") {
    Object.assign(headers, headerInit as Record<string, string>);
  }

  let body: unknown = init?.body;
  if (body == null && input instanceof Request && method !== "GET" && method !== "HEAD") {
    body = await input.clone().text();
  }

  const res = await axios({
    url,
    method,
    headers,
    data: body,
    proxy: parseAxiosProxy(proxyUrl),
    responseType: "arraybuffer",
    validateStatus: () => true,
    timeout: 65_000,
    maxRedirects: 5,
  });

  const outHeaders = new Headers();
  for (const [k, v] of Object.entries(res.headers)) {
    if (v == null) continue;
    outHeaders.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  }

  return new Response(res.data, { status: res.status, headers: outHeaders });
}

export function innertubeIntegrityBody(env: YoutubeStreamEnv): Record<string, unknown> | undefined {
  if (!env.poToken) return undefined;
  return { serviceIntegrityDimensions: { poToken: env.poToken } };
}

export function innertubeVisitorHeaders(env: YoutubeStreamEnv): Record<string, string> {
  if (!env.visitorData) return {};
  return { "X-Goog-Visitor-Id": env.visitorData };
}
