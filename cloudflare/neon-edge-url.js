/**
 * Worker kenarı @neondatabase/serverless yalnızca Neon HTTP/WS konuşur.
 * Hostinger / klasik TCP Postgres URL'sinde neon() çağırma — Container'a düş.
 */

export function isNeonServerlessUrl(url) {
  return /neon\.tech/i.test(String(url || "").trim());
}

/**
 * Neon `-pooler` uçları bazı rollerde/oturumlarda read-only kalabiliyor.
 * INSERT/UPDATE için doğrudan (non-pooler) host tercih et.
 */
export function preferNeonDirectWriteUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || !isNeonServerlessUrl(raw)) return raw;
  // ep-xxx-pooler.region.aws.neon.tech → ep-xxx.region.aws.neon.tech
  return raw.replace(/(@ep-[a-z0-9-]+)-pooler(\.)/i, "$1$2");
}

/** postgres(ql)://user:pass@host/... → user (yoksa ""). */
export function neonUrlUser(url) {
  const raw = String(url || "").trim();
  const m = raw.match(/^postgres(?:ql)?:\/\/([^:/@]+)[:@]/i);
  return m ? decodeURIComponent(m[1]) : "";
}

/**
 * Bilinen RO roller (php_theme_ro) veya *_ro kullanıcı adları — dual-write INSERT için uygun değil.
 */
export function isNeonReadOnlyRoleUrl(url) {
  const user = neonUrlUser(url).toLowerCase();
  if (!user) return false;
  if (user === "php_theme_ro") return true;
  if (user.endsWith("_ro") || user.endsWith("_readonly") || user.endsWith("_reader")) return true;
  return false;
}
