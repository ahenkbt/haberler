import { agentLabsBaseUrl } from "./call-center";

type CachedAuth = {
  token: string;
  expiresAt: number;
};

let cachedAuth: CachedAuth | null = null;

/** AgentLabs JWT veya servis hesabı oturumu. */
export async function getAgentLabsBearerToken(): Promise<string | null> {
  const staticToken = String(process.env.AGENTLABS_API_KEY ?? "").trim();
  if (staticToken) return staticToken;

  const email = String(process.env.AGENTLABS_SERVICE_EMAIL ?? "").trim();
  const password = String(process.env.AGENTLABS_SERVICE_PASSWORD ?? "").trim();
  if (!email || !password) return null;

  const now = Date.now();
  if (cachedAuth && cachedAuth.expiresAt > now + 60_000) {
    return cachedAuth.token;
  }

  const baseUrl = agentLabsBaseUrl();
  if (!baseUrl) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      signal: ctrl.signal,
    });
    const body = (await res.json()) as { token?: string; expiresIn?: number; error?: string };
    if (!res.ok || !body.token) {
      cachedAuth = null;
      return null;
    }
    const ttlSec = typeof body.expiresIn === "number" && body.expiresIn > 60 ? body.expiresIn : 3600;
    cachedAuth = { token: body.token, expiresAt: now + ttlSec * 1000 };
    return cachedAuth.token;
  } catch {
    cachedAuth = null;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const BLOCKED_PATH_FRAGMENTS = ["/api/team/auth", "/api/admin/", "/api/webhooks/", "/api/auth/"];

const ALLOWED_PREFIXES = [
  "/api/sip/",
  "/api/messaging/",
  "/api/team/members",
  "/api/team/roles",
  "/api/team/permissions",
  "/api/team/",
  "/api/user/api-keys",
  "/api/campaigns",
  "/api/calls",
  "/api/flow-automation/",
  "/api/contacts",
  "/api/analytics/",
];

export function normalizeAgentLabsApiPath(raw: string): string {
  let p = raw.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.startsWith("/api/")) {
    p = `/api/${p.replace(/^\/+/, "")}`;
  }
  return p.replace(/\/+/g, "/");
}

export function isAgentLabsProxyPathAllowed(apiPath: string): boolean {
  const p = normalizeAgentLabsApiPath(apiPath);
  for (const blocked of BLOCKED_PATH_FRAGMENTS) {
    if (p.includes(blocked)) return false;
  }
  return ALLOWED_PREFIXES.some((prefix) => p.startsWith(prefix));
}

export type AgentLabsProxyResult = {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  rawText: string;
};

export async function proxyToAgentLabs(
  method: string,
  apiPath: string,
  options?: {
    query?: Record<string, string | string[] | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<AgentLabsProxyResult> {
  const baseUrl = agentLabsBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      status: 503,
      headers: {},
      body: { error: "Yekpare AI Call sunucusu yapılandırılmamış (AGENTLABS_URL)." },
      rawText: "",
    };
  }

  const normalized = normalizeAgentLabsApiPath(apiPath);
  if (!isAgentLabsProxyPathAllowed(normalized)) {
    return {
      ok: false,
      status: 403,
      body: { error: "Bu AgentLabs yolu vekil üzerinden izinli değil." },
      headers: {},
      rawText: "",
    };
  }

  const token = await getAgentLabsBearerToken();
  if (!token) {
    return {
      ok: false,
      status: 503,
      headers: {},
      body: {
        error:
          "AgentLabs kimlik bilgisi yok. AGENTLABS_API_KEY (JWT) veya AGENTLABS_SERVICE_EMAIL + AGENTLABS_SERVICE_PASSWORD tanımlayın.",
      },
      rawText: "",
    };
  }

  const url = new URL(`${baseUrl}${normalized}`);
  if (options?.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v == null) continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, item);
      } else {
        url.searchParams.set(k, v);
      }
    }
  }

  const upper = method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(upper) && options?.body !== undefined;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const upstream = await fetch(url.toString(), {
      method: upper,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Yekpare-AI-Call-Proxy/1.0",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });

    const rawText = await upstream.text();
    let body: unknown = null;
    const ct = upstream.headers.get("content-type") ?? "";
    if (ct.includes("application/json") && rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = { raw: rawText.slice(0, 2000) };
      }
    } else if (rawText) {
      body = { raw: rawText.slice(0, 2000) };
    }

    return {
      ok: upstream.ok,
      status: upstream.status,
      headers: {
        "x-yekpare-upstream-status": String(upstream.status),
      },
      body,
      rawText,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 502,
      headers: {},
      body: { error: "AgentLabs sunucusuna ulaşılamadı.", detail: message },
      rawText: "",
    };
  } finally {
    clearTimeout(timer);
  }
}
