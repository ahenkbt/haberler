/**
 * Worker kenarı @neondatabase/serverless yalnızca Neon HTTP/WS konuşur.
 * Hostinger / klasik TCP Postgres URL'sinde neon() çağırma — Container'a düş.
 */
export function isNeonServerlessUrl(url) {
  return /neon\.tech/i.test(String(url || "").trim());
}
