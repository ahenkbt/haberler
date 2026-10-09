import dns from "node:dns";
import type { PoolConfig } from "pg";

export type DatabaseProvider = "neon" | "hostinger" | "postgres";

/** Neon HTTP/WS sürücüsü yalnızca neon.tech URL'lerinde çalışır. */
export function isNeonServerlessUrl(connectionString: string): boolean {
  return /neon\.tech/i.test(String(connectionString || "").trim());
}

export function databaseProvider(connectionString: string): DatabaseProvider {
  const url = String(connectionString || "");
  if (isNeonServerlessUrl(url)) return "neon";
  if (/hstgr|hostinger/i.test(url) || /@(\d{1,3}\.){3}\d{1,3}(?::|\/|\?|$)/.test(url)) {
    return "hostinger";
  }
  return "postgres";
}

/**
 * node-postgres ssl: Hostinger `sslmode=disable` ve ham IP hostlarda TLS kapalı.
 * Neon/Railway `sslmode=require` için self-signed kabul.
 */
export function pgSslOption(connectionString: string): PoolConfig["ssl"] {
  const url = String(connectionString || "");
  if (/sslmode=disable/i.test(url)) return false;
  if (
    /sslmode=(require|verify-ca|verify-full)/i.test(url) ||
    isNeonServerlessUrl(url) ||
    /railway\.app/i.test(url)
  ) {
    return { rejectUnauthorized: false };
  }
  if (/@(\d{1,3}\.){3}\d{1,3}(?::|\/|\?|$)/.test(url) || /hstgr|hostinger/i.test(url)) {
    return false;
  }
  return undefined;
}

export function shouldForceIpv4(connectionString: string): boolean {
  return databaseProvider(connectionString) === "hostinger";
}

/** Node 17+ AAAA tercih eder; Hostinger Postgres IPv6'da dinlemiyor. */
export function applyHostingerIpv4First(connectionString: string): void {
  if (shouldForceIpv4(connectionString)) {
    dns.setDefaultResultOrder("ipv4first");
  }
}

function ipv4Lookup(
  hostname: string,
  options: dns.LookupOneOptions | ((err: NodeJS.ErrnoException | null, address: string, family: number) => void),
  callback?: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
): void {
  const cb = typeof options === "function" ? options : callback;
  dns.lookup(hostname, { family: 4, all: false }, (err, address, family) => {
    cb?.(err, address, family);
  });
}

function envMs(name: string): number | undefined {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/** pg_stat_activity label for the API pools, e.g. "yk-api-main-1" (instance from YK_INSTANCE). */
export function pgAppName(kind: "main" | "news"): string {
  const inst = String(process.env.YK_INSTANCE ?? "").replace(/[^0-9a-z]/gi, "").slice(0, 8);
  return `yk-api-${kind}${inst ? `-${inst}` : ""}`;
}

/** Neon endpoint id (e.g. "ep-bitter-mouse-…" → "ep-bitter-mouse") or the host's first label; never credentials. */
export function dbEndpointLabel(connectionString: string): string | null {
  try {
    const host = new URL(connectionString).hostname;
    const ep = /^(ep-[a-z]+-[a-z]+)/.exec(host);
    return ep ? ep[1] : host.split(".")[0].slice(0, 24) || null;
  } catch {
    return null;
  }
}

export function pgPoolConfig(connectionString: string, extra: PoolConfig = {}): PoolConfig {
  const ssl = pgSslOption(connectionString);
  // 2026-10-09: on Cloudflare Containers one instance kept hanging on every DB-bound request
  // while /healthz/live answered. Idle pooled sockets were dropped silently on the path to Neon,
  // and pg waited on them forever. TCP keepalive detects dead sockets; PG_QUERY_TIMEOUT_MS makes
  // a query on a dead socket fail (and its client get discarded) instead of hanging.
  const queryTimeout = envMs("PG_QUERY_TIMEOUT_MS");
  return {
    connectionString,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    ...(queryTimeout ? { query_timeout: queryTimeout } : {}),
    ...extra,
    ...(ssl === undefined ? {} : { ssl }),
    ...(shouldForceIpv4(connectionString) ? { lookup: ipv4Lookup } : {}),
  } as PoolConfig;
}
