/** node-postgres ssl — db-migrate / smoke (TS pgPoolOptions ile aynı kural). */

import dns from "node:dns";

export function pgSslOption(connectionString) {
  const url = String(connectionString || "");
  if (/sslmode=disable/i.test(url)) return false;
  if (
    /sslmode=(require|verify-ca|verify-full)/i.test(url) ||
    /neon\.tech/i.test(url) ||
    /railway\.app/i.test(url)
  ) {
    return { rejectUnauthorized: false };
  }
  if (/@(\d{1,3}\.){3}\d{1,3}(?::|\/|\?|$)/.test(url) || /hstgr|hostinger/i.test(url)) {
    return false;
  }
  return undefined;
}

export function shouldForceIpv4(connectionString) {
  const url = String(connectionString || "");
  if (/neon\.tech/i.test(url)) return false;
  return /hstgr|hostinger/i.test(url) || /@(\d{1,3}\.){3}\d{1,3}(?::|\/|\?|$)/.test(url);
}

function ipv4Lookup(hostname, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  dns.lookup(hostname, { family: 4, all: false }, (err, address, family) => {
    cb?.(err, address, family);
  });
}

export function pgPoolConfig(connectionString, extra = {}) {
  const ssl = pgSslOption(connectionString);
  return {
    connectionString,
    ...extra,
    ...(ssl === undefined ? {} : { ssl }),
    ...(shouldForceIpv4(connectionString) ? { lookup: ipv4Lookup } : {}),
  };
}
