import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { resolveNewsDatabaseUrl } from "./databaseUrl";
import { pgAppName, pgPoolConfig } from "./pgPoolOptions";

const { Pool } = pg;

function poolInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const newsDatabaseUrl = resolveNewsDatabaseUrl();

/** Ayrı haber Postgres bağlantısı tanımlı mı? */
export const isNewsDatabaseConfigured = Boolean(newsDatabaseUrl);

/** NEWS_DATABASE_URL yoksa null — newsCluster ana DB'ye düşer. */
export const newsPool: pg.Pool | null = newsDatabaseUrl
  ? new Pool(
      pgPoolConfig(newsDatabaseUrl, {
        max: poolInt("NEWS_PG_POOL_MAX", 4),
        idleTimeoutMillis: poolInt("PG_POOL_IDLE_TIMEOUT_MS", 30_000),
        connectionTimeoutMillis: poolInt("PG_POOL_CONNECTION_TIMEOUT_MS", 5_000),
        application_name: pgAppName("news"),
      }),
    )
  : null;

export const newsDb = newsPool ? drizzle(newsPool, { schema }) : null;

export function newsPoolStats(): { max: number; total: number; idle: number; waiting: number } | null {
  if (!newsPool) return null;
  return {
    max: Number(newsPool.options.max ?? 0),
    total: newsPool.totalCount,
    idle: newsPool.idleCount,
    waiting: newsPool.waitingCount,
  };
}
