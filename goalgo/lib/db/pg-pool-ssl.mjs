/** node-postgres ssl — db-migrate / smoke (TS pgPoolOptions ile aynı kural). */

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

export function pgPoolConfig(connectionString, extra = {}) {
  const ssl = pgSslOption(connectionString);
  return {
    connectionString,
    ...extra,
    ...(ssl === undefined ? {} : { ssl }),
  };
}
