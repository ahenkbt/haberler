import { neon } from "@neondatabase/serverless";
import { isNeonServerlessUrl } from "./neon-edge-url.js";

export { isNeonServerlessUrl };

export function neonSqlClient(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl || !isNeonServerlessUrl(dbUrl)) return null;
  return neon(dbUrl);
}

/** PHP tema / haber cluster (NEWS_DATABASE_URL) — Worker ana Neon'dan ayrı proje. */
export function neonNewsSqlClient(env) {
  const dbUrl = String(env?.NEWS_DATABASE_URL || "").trim();
  if (!dbUrl || !isNeonServerlessUrl(dbUrl)) return null;
  return neon(dbUrl);
}

/** dual | news: kenar ikinci yazımı aç; main: kapalı (yalnızca Container köprüsü). */
export function shouldEdgeDualWriteNewsDb(env) {
  if (!env || !String(env.NEWS_DATABASE_URL || "").trim()) return false;
  const mode = String(env.NEWS_DB_WRITE || "dual")
    .trim()
    .toLowerCase();
  return mode !== "main";
}
