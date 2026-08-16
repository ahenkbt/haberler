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

export function pgPoolConfig(connectionString: string, extra: PoolConfig = {}): PoolConfig {
  const ssl = pgSslOption(connectionString);
  return {
    connectionString,
    ...extra,
    ...(ssl === undefined ? {} : { ssl }),
    ...(shouldForceIpv4(connectionString) ? { lookup: ipv4Lookup } : {}),
  } as PoolConfig;
}
