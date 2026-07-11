/**
 * 3CX V20 Configuration API (XAPI) — OAuth2 client credentials.
 * Docs: https://www.3cx.com/docs/configuration-rest-api/
 *
 * Requires 8SC+ license with "3CX Configuration API Access" scope on the service principal.
 */

export type ThreeCxConfig = {
  fqdn: string;
  clientId: string;
  clientSecret: string;
};

export type ThreeCxExtensionRow = {
  id: number;
  number: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
};

type TokenCache = { token: string; expiresAt: number };
const tokenCache = new Map<string, TokenCache>();

function normalizeFqdn(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function normalizeThreeCxFqdn(raw: string): string {
  return normalizeFqdn(raw);
}

/** Cloud/on-prem WebRTC WSS endpoint from FQDN. */
export function defaultThreeCxWssUrl(fqdn: string): string {
  const host = normalizeFqdn(fqdn);
  if (!host) return "";
  return `wss://${host}:443/ws`;
}

export function normalizeThreeCxWssUrl(raw: string, fqdn?: string): string {
  const trimmed = raw.trim();
  if (!trimmed && fqdn) return defaultThreeCxWssUrl(fqdn);
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "wss:" && u.protocol !== "ws:") return trimmed;
    if (!u.pathname || u.pathname === "/") u.pathname = "/ws";
    if (!u.port) u.port = "443";
    return u.toString();
  } catch {
    return trimmed;
  }
}

function cacheKey(config: ThreeCxConfig): string {
  return `${normalizeFqdn(config.fqdn)}:${config.clientId}`;
}

async function fetchAccessToken(config: ThreeCxConfig): Promise<{ ok: boolean; token?: string; error?: string }> {
  const key = cacheKey(config);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return { ok: true, token: cached.token };
  }

  const fqdn = normalizeFqdn(config.fqdn);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
  });

  let res: Response;
  try {
    res = await fetch(`https://${fqdn}/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "3CX sunucusuna bağlanılamadı" };
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "Kimlik doğrulama başarısız. 3CX Admin → Integrations → API: Client ID, API key ve Configuration API scope kontrol edin. 8SC+ lisans gerekebilir.",
      };
    }
    return { ok: false, error: text || `HTTP ${res.status}` };
  }

  let data: { access_token?: string; expires_in?: number };
  try {
    data = JSON.parse(text) as { access_token?: string; expires_in?: number };
  } catch {
    return { ok: false, error: "Token yanıtı okunamadı" };
  }

  const token = String(data.access_token ?? "").trim();
  if (!token) return { ok: false, error: "access_token alınamadı" };

  const expiresIn = Number(data.expires_in ?? 3600);
  tokenCache.set(key, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return { ok: true, token };
}

async function xapiFetch<T>(
  config: ThreeCxConfig,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const auth = await fetchAccessToken(config);
  if (!auth.ok || !auth.token) {
    return { ok: false, status: 401, data: null, error: auth.error ?? "Token alınamadı" };
  }

  const fqdn = normalizeFqdn(config.fqdn);
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${auth.token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(`https://${fqdn}${path}`, { ...init, headers });
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e instanceof Error ? e.message : "Bağlantı hatası" };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, data: null, error: text || `HTTP ${res.status}` };
  }
  if (!text) return { ok: true, status: res.status, data: null };
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return { ok: true, status: res.status, data: text as unknown as T };
  }
}

/** Quick test — GET /xapi/v1/Defs?$select=Id */
export async function testThreeCxConnection(
  config: ThreeCxConfig,
): Promise<{ ok: boolean; message: string; userCount?: number }> {
  const defs = await xapiFetch<{ value?: unknown[] }>(config, "/xapi/v1/Defs?$select=Id");
  if (!defs.ok) {
    return { ok: false, message: defs.error ?? "3CX bağlantısı başarısız" };
  }

  const users = await listThreeCxExtensions(config);
  if (users.error) {
    return {
      ok: true,
      message: `3CX kimlik doğrulama başarılı (FQDN: ${normalizeFqdn(config.fqdn)}). Kullanıcı listesi alınamadı: ${users.error}`,
    };
  }

  return {
    ok: true,
    message: `3CX bağlantısı başarılı. ${users.extensions.length} kullanıcı/dahili bulundu.`,
    userCount: users.extensions.length,
  };
}

export async function listThreeCxExtensions(
  config: ThreeCxConfig,
): Promise<{ extensions: ThreeCxExtensionRow[]; error?: string }> {
  const result = await xapiFetch<{ value?: Array<Record<string, unknown>> }>(
    config,
    "/xapi/v1/Users?$select=Id,Number,FirstName,LastName,EmailAddress&$orderby=Number",
  );
  if (!result.ok) {
    return { extensions: [], error: result.error ?? "Kullanıcı listesi alınamadı" };
  }
  const rows = Array.isArray(result.data?.value) ? result.data!.value! : [];
  const extensions = rows
    .map((r) => ({
      id: Number(r.Id ?? 0),
      number: String(r.Number ?? "").trim(),
      firstName: String(r.FirstName ?? "").trim(),
      lastName: String(r.LastName ?? "").trim(),
      emailAddress: String(r.EmailAddress ?? "").trim(),
    }))
    .filter((r) => r.number);
  return { extensions };
}

export async function findThreeCxExtensionByNumber(
  config: ThreeCxConfig,
  number: string,
): Promise<ThreeCxExtensionRow | null> {
  const num = number.trim();
  const { extensions } = await listThreeCxExtensions(config);
  return extensions.find((e) => e.number === num) ?? null;
}

export async function createThreeCxExtension(
  config: ThreeCxConfig,
  input: {
    number: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    accessPassword: string;
  },
): Promise<{ ok: boolean; userId?: number; error?: string; alreadyExists?: boolean }> {
  const number = input.number.trim();
  if (!number) return { ok: false, error: "Dahili numarası zorunludur." };

  const existing = await findThreeCxExtensionByNumber(config, number);
  if (existing) {
    return { ok: true, userId: existing.id, alreadyExists: true };
  }

  const payload = {
    Id: 0,
    Number: number,
    FirstName: input.firstName.trim() || "Agent",
    LastName: input.lastName.trim() || number,
    EmailAddress: input.emailAddress.trim() || `${number}@${normalizeFqdn(config.fqdn)}`,
    AccessPassword: input.accessPassword,
    Language: "EN",
    Require2FA: false,
    SendEmailMissedCalls: false,
    VMEmailOptions: "None",
  };

  const result = await xapiFetch<Record<string, unknown>>(config, "/xapi/v1/Users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "OData-Version": "4.0",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!result.ok) {
    const err = result.error ?? "Kullanıcı oluşturulamadı";
    if (/license|8sc|not authorized|forbidden/i.test(err)) {
      return {
        ok: false,
        error:
          "3CX API kullanıcı oluşturma reddedildi. 8SC+ lisans ve Configuration API scope gerekir; manuel dahili oluşturup Yekpare'de şifreyi girin.",
      };
    }
    return { ok: false, error: err };
  }

  const userId = Number(result.data?.Id ?? 0) || undefined;
  return { ok: true, userId };
}
