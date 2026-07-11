import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";
import { requireDatabaseUrl } from "./databaseUrl";

const { Pool } = pg;

const databaseUrl = requireDatabaseUrl();

function poolInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const isProd = process.env.NODE_ENV === "production";
const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);

export const pool = new Pool({
  connectionString: databaseUrl,
  max: poolInt("PG_POOL_MAX", isRender ? 5 : isProd ? 20 : 10),
  idleTimeoutMillis: poolInt("PG_POOL_IDLE_TIMEOUT_MS", 30_000),
  connectionTimeoutMillis: poolInt("PG_POOL_CONNECTION_TIMEOUT_MS", isRender ? 5_000 : 10_000),
});
export const db = drizzle(pool, { schema });

/** Healthcheck / readiness — SELECT 1 (zaman aşımında false; health endpoint takılmaz). */
export async function pingDatabase(timeoutMs = 4_000): Promise<boolean> {
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("ping timeout")), timeoutMs);
        timer.unref?.();
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

let hmNewsSiteSeoColumnsPromise: Promise<void> | null = null;

/** Backfills optional HM site SEO columns for servers that deployed code before running migration 0048. */
export function ensureHmNewsSiteSeoColumns(): Promise<void> {
  if (hmNewsSiteSeoColumnsPromise) return hmNewsSiteSeoColumnsPromise;
  hmNewsSiteSeoColumnsPromise = db
    .execute(sql`
      ALTER TABLE hm_news_sites
        ADD COLUMN IF NOT EXISTS description text,
        ADD COLUMN IF NOT EXISTS verification_json text;
    `)
    .then(() => undefined)
    .catch((e) => {
      hmNewsSiteSeoColumnsPromise = null;
      throw e;
    });
  return hmNewsSiteSeoColumnsPromise;
}
