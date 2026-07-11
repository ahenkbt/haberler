import axios from "axios";
import { sitePublicOrigin } from "./site-public-origin";

const ALLOWED_HOSTS = [
  "yemeksepeti.com",
  "www.yemeksepeti.com",
  "getir.com",
  "www.getir.com",
  "getiryemek.com",
  "yemek.getir.com",
  "migros.com.tr",
  "www.migros.com.tr",
  "trendyol.com",
  "www.trendyol.com",
  "tgoyemek.com",
];

function refererForUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("getir")) return `${u.protocol}//${u.hostname}/yemek/`;
    if (host.includes("yemeksepeti")) return `${u.protocol}//${u.hostname}/`;
    if (host.includes("migros")) return `${u.protocol}//${u.hostname}/`;
    if (host.includes("trendyol") || host.includes("tgoyemek")) return `${u.protocol}//${u.hostname}/`;
    return `${u.protocol}//${u.hostname}/`;
  } catch {
    return "https://www.google.com/";
  }
}

function buildBrowserHeaders(url: string): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: refererForUrl(url),
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}

export function isAllowedExternalImportUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
  } catch {
    return false;
  }
}

function pickProxyFromEnv():
  | { protocol?: "http" | "https"; host: string; port: number; auth?: { username: string; password: string } }
  | undefined {
  const raw = String(process.env.IMPORT_PROXY_URLS || "").trim();
  if (!raw) return undefined;
  const list = raw.split(",").map((x) => x.trim()).filter(Boolean);
  if (!list.length) return undefined;
  const selected = list[Math.floor(Math.random() * list.length)];
  try {
    const u = new URL(selected);
    if (!u.hostname || !u.port) return undefined;
    return {
      protocol: (u.protocol.replace(":", "") as "http" | "https"),
      host: u.hostname,
      port: Number(u.port),
      auth: u.username
        ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password || "") }
        : undefined,
    };
  } catch {
    return undefined;
  }
}

function urlVariants(url: string): string[] {
  const trimmed = url.trim();
  const noTrail = trimmed.replace(/\/+$/, "");
  const withTrail = `${noTrail}/`;
  return [...new Set([trimmed, noTrail, withTrail])];
}

async function fetchViaEdge(
  sourceUrl: string,
  opts?: { referer?: string; json?: boolean },
): Promise<{ status: number; html: string } | null> {
  const secret = String(process.env.EDGE_FETCH_SECRET || "").trim();
  if (!secret) return null;
  const origin = String(process.env.EDGE_FETCH_ORIGIN || sitePublicOrigin()).replace(/\/+$/, "");
  try {
    const res = await fetch(`${origin}/api/internal/edge-fetch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Edge-Fetch-Secret": secret,
      },
      body: JSON.stringify({
        url: sourceUrl,
        referer: opts?.referer,
        json: opts?.json ?? /fd-api\.com|\/api\/v5\//i.test(sourceUrl),
      }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; html?: string; body?: string };
    const html = String(data?.html ?? data?.body ?? "");
    const minLen = opts?.json || /fd-api\.com|\/api\/v5\//i.test(sourceUrl) ? 80 : 400;
    if (html.length > minLen) {
      return { status: Number(data.status) || 200, html };
    }
  } catch {
    /* edge unavailable */
  }
  return null;
}

/** Vercel edge vekili — JSON API yanıtları (Yemeksepeti menü API vb.). */
export async function fetchExternalApiViaEdge(
  apiUrl: string,
  referer: string,
): Promise<{ status: number; json: unknown | null }> {
  const edge = await fetchViaEdge(apiUrl, { referer, json: true });
  if (!edge?.html) return { status: edge?.status ?? 0, json: null };
  try {
    return { status: edge.status, json: JSON.parse(edge.html) };
  } catch {
    return { status: edge.status, json: null };
  }
}

async function fetchDirect(url: string): Promise<{ status: number; html: string } | null> {
  const headers = buildBrowserHeaders(url);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    const html = await res.text();
    if (res.ok && html.length > 400) return { status: res.status, html };
    if (html.length > 400 && res.status < 500) return { status: res.status, html };
    return { status: res.status, html: res.ok ? html : "" };
  } catch {
    return null;
  }
}

async function fetchViaAxiosProxy(url: string): Promise<{ status: number; html: string } | null> {
  const proxy = pickProxyFromEnv();
  if (!proxy) return null;
  try {
    const resp = await axios.get<string>(url, {
      timeout: 30_000,
      headers: buildBrowserHeaders(url),
      proxy,
      responseType: "text",
      validateStatus: () => true,
      maxRedirects: 5,
    });
    const html = String(resp.data ?? "");
    if (html.length > 400) return { status: resp.status, html };
    return { status: resp.status, html: "" };
  } catch {
    return null;
  }
}

/** Yemeksepeti / Getir vb. sayfa HTML — doğrudan, proxy veya Vercel edge vekili. */
export async function fetchExternalPageHtml(sourceUrl: string): Promise<{ status: number; html: string; via: string }> {
  if (!isAllowedExternalImportUrl(sourceUrl)) {
    throw new Error("Desteklenmeyen kaynak URL");
  }

  let lastStatus = 0;
  for (const variant of urlVariants(sourceUrl)) {
    const direct = await fetchDirect(variant);
    if (direct?.html && direct.html.length > 400) {
      return { ...direct, via: "direct" };
    }
    if (direct?.status) lastStatus = direct.status;
  }

  const proxied = await fetchViaAxiosProxy(sourceUrl);
  if (proxied?.html && proxied.html.length > 400) {
    return { ...proxied, via: "proxy" };
  }
  if (proxied?.status) lastStatus = proxied.status;

  const edge = await fetchViaEdge(sourceUrl);
  if (edge?.html && edge.html.length > 400) {
    return { ...edge, via: "edge" };
  }
  if (edge?.status) lastStatus = edge.status;

  return { status: lastStatus || 502, html: "", via: "none" };
}
