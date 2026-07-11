export function pbxGatewayBaseUrl(): string | null {
  const raw = String(process.env.PBX_GATEWAY_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    return u.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

type ProxyOptions = {
  method: string;
  path: string;
  authorization?: string | null;
  body?: unknown;
};

export async function proxyToPbxGateway(opts: ProxyOptions): Promise<{ status: number; body: unknown }> {
  const base = pbxGatewayBaseUrl();
  if (!base) {
    return { status: 503, body: { ok: false, error: "PBX_GATEWAY_URL tanımlı değil." } };
  }

  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (opts.authorization) headers.Authorization = opts.authorization;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${base}${path}`, {
      method: opts.method,
      headers,
      body:
        opts.method !== "GET" && opts.method !== "HEAD" && opts.body !== undefined
          ? JSON.stringify(opts.body)
          : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { ok: false, raw: text.slice(0, 500) };
    }
    return { status: res.status, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 502, body: { ok: false, error: "PBX ağ geçidine ulaşılamadı.", detail: message } };
  } finally {
    clearTimeout(timer);
  }
}

/** `/api/pbx/auth/login` → `/auth/login` */
export function mapPbxApiPathToGateway(apiPath: string): string {
  const suffix = apiPath.replace(/^\/pbx\/?/i, "").replace(/^\/+/, "");
  return suffix ? `/${suffix}` : "/health";
}
