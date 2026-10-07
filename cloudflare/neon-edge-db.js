import { neon } from "@neondatabase/serverless";
import {
  isNeonReadOnlyRoleUrl,
  isNeonServerlessUrl,
  preferNeonDirectWriteUrl,
} from "./neon-edge-url.js";

export {
  isNeonReadOnlyRoleUrl,
  isNeonServerlessUrl,
  neonUrlUser,
  preferNeonDirectWriteUrl,
} from "./neon-edge-url.js";

function neonClientFromUrl(dbUrl) {
  const writeUrl = preferNeonDirectWriteUrl(dbUrl);
  if (!writeUrl || !isNeonServerlessUrl(writeUrl)) return null;
  return neon(writeUrl);
}

/** Panel primary Neon (DATABASE_URL / bitter-mouse) — yazılabilir owner URL beklenir. */
export function neonSqlClient(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl || !isNeonServerlessUrl(dbUrl)) return null;
  return neonClientFromUrl(dbUrl);
}

/** PHP tema / haber cluster (NEWS_DATABASE_URL) — Worker ana Neon'dan ayrı proje. */
export function neonNewsSqlClient(env) {
  const dbUrl = String(env?.NEWS_DATABASE_URL || "").trim();
  if (!dbUrl || !isNeonServerlessUrl(dbUrl)) return null;
  if (isNeonReadOnlyRoleUrl(dbUrl)) {
    console.warn(
      "[neon-news] NEWS_DATABASE_URL read-only role — kenar dual-write atlandı (php_theme_ro / *_ro).",
    );
    return null;
  }
  return neonClientFromUrl(dbUrl);
}

/** dual | news: kenar ikinci yazımı aç; main: kapalı (yalnızca Container köprüsü). */
export function shouldEdgeDualWriteNewsDb(env) {
  if (!env || !String(env.NEWS_DATABASE_URL || "").trim()) return false;
  if (isNeonReadOnlyRoleUrl(env.NEWS_DATABASE_URL)) return false;
  const mode = String(env.NEWS_DB_WRITE || "dual")
    .trim()
    .toLowerCase();
  return mode !== "main";
}
