function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^wss?:\/\//i, "")
    .replace(/^sip:/i, "")
    .replace(/\/+$/, "")
    .split(":")[0]
    .split("/")[0]
    .trim();
}

/** Let's Encrypt CN on this FreePBX box; IPv4-only (hstgr hostname has AAAA). */
export const FREEPBX_PUBLIC_WSS_HOST = "santral.aiaddin.net";

/** Hostinger VPS IPv4 — cert/hostname alias, not a generic “any IP” rewrite. */
export const HOSTINGER_PBX_IPV4 = "187.127.82.106";

export function isHostingerPbxAlias(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return /hstgr\.cloud$|hostinger/i.test(host) || host === HOSTINGER_PBX_IPV4;
}

/** WSS/SIP host that matches the Asterisk TLS certificate. */
export function canonicalFreePbxHost(hostname: string): string {
  const host = hostname.trim();
  if (!host) return host;
  return isHostingerPbxAlias(host) ? FREEPBX_PUBLIC_WSS_HOST : host;
}

function isFreePbxWssHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    /hstgr\.cloud$|hostinger|aiaddin\.net$/i.test(host) ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
  );
}

/** FreePBX/Asterisk HTTP: varsayılan WSS `wss://host:8089/ws`. Verimor/3CX URL'lerine dokunma. */
export function normalizeLocalWssUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  if (/bulutsantralim\.com/i.test(trimmed)) return trimmed;
  try {
    const withProto = /^wss?:\/\//i.test(trimmed) || /^https?:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;
    const u = new URL(withProto);
    if (u.protocol !== "wss:" && u.protocol !== "ws:") return trimmed;
    if (isHostingerPbxAlias(u.hostname)) {
      u.hostname = FREEPBX_PUBLIC_WSS_HOST;
    }
    if (isFreePbxWssHost(u.hostname)) {
      if (!u.port) u.port = "8089";
      if (!u.pathname || u.pathname === "/") u.pathname = "/ws";
    }
    return u.toString();
  } catch {
    return trimmed;
  }
}

export function hostFromSipUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const withProto = /^wss?:\/\//i.test(trimmed) || /^https?:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;
    return canonicalFreePbxHost(normalizeDomain(new URL(withProto).hostname));
  } catch {
    return canonicalFreePbxHost(normalizeDomain(trimmed));
  }
}
