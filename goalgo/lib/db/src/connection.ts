import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";
import { requireDatabaseUrl } from "./databaseUrl";
import { applyHostingerIpv4First, isNeonServerlessUrl, pgPoolConfig } from "./pgPoolOptions";

const { Pool } = pg;

const databaseUrl = requireDatabaseUrl();
applyHostingerIpv4First(databaseUrl);

function poolInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const isProd = process.env.NODE_ENV === "production";
const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
const isNeon = isNeonServerlessUrl(databaseUrl) || Boolean(process.env.NEON_PROJECT_ID);

export const pool = new Pool(
  pgPoolConfig(databaseUrl, {
    // Neon: düşük pool (compute limit); aksi halde prod'da daha geniş
    max: poolInt("PG_POOL_MAX", isNeon || isRender ? 5 : isProd ? 20 : 10),
    idleTimeoutMillis: poolInt("PG_POOL_IDLE_TIMEOUT_MS", 30_000),
    connectionTimeoutMillis: poolInt("PG_POOL_CONNECTION_TIMEOUT_MS", 10_000),
  }),
);
export const db = drizzle(pool, { schema });

export type PingDatabaseResult = { ok: true } | { ok: false; error: "timeout" | "reset" | "refused" | "dns" | "error" };

function classifyPingError(err: unknown): PingDatabaseResult {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code ?? "") : "";
  const msg = err instanceof Error ? err.message : String(err);
  if (code === "ETIMEDOUT" || /timeout/i.test(msg)) return { ok: false, error: "timeout" };
  if (code === "ECONNRESET" || /closed the connection|ECONNRESET/i.test(msg)) return { ok: false, error: "reset" };
  if (code === "ECONNREFUSED" || /ECONNREFUSED/i.test(msg)) return { ok: false, error: "refused" };
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return { ok: false, error: "dns" };
  return { ok: false, error: "error" };
}

/** Healthcheck / readiness — SELECT 1 (zaman aşımında false; health endpoint takılmaz). */
export async function pingDatabaseDetailed(timeoutMs = 8_000): Promise<PingDatabaseResult> {
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("ping timeout")), timeoutMs);
        timer.unref?.();
      }),
    ]);
    return { ok: true };
  } catch (err) {
    return classifyPingError(err);
  }
}

export async function pingDatabase(timeoutMs = 8_000): Promise<boolean> {
  const result = await pingDatabaseDetailed(timeoutMs);
  return result.ok;
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
