import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { resolveNewsDatabaseUrl } from "./databaseUrl";

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
  ? new Pool({
      connectionString: newsDatabaseUrl,
      max: poolInt("NEWS_PG_POOL_MAX", 4),
      idleTimeoutMillis: poolInt("PG_POOL_IDLE_TIMEOUT_MS", 30_000),
      connectionTimeoutMillis: poolInt("PG_POOL_CONNECTION_TIMEOUT_MS", 5_000),
    })
  : null;

export const newsDb = newsPool ? drizzle(newsPool, { schema }) : null;
