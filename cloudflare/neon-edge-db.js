import { neon } from "@neondatabase/serverless";
import { isNeonServerlessUrl } from "./neon-edge-url.js";

export { isNeonServerlessUrl };

export function neonSqlClient(env) {
  const dbUrl = String(env?.DATABASE_URL || "").trim();
  if (!dbUrl || !isNeonServerlessUrl(dbUrl)) return null;
  return neon(dbUrl);
}
