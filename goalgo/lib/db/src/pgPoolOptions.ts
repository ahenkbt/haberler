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

export function pgPoolConfig(connectionString: string, extra: PoolConfig = {}): PoolConfig {
  const ssl = pgSslOption(connectionString);
  return {
    connectionString,
    ...extra,
    ...(ssl === undefined ? {} : { ssl }),
  };
}
