import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { resolveYektubeDatabaseUrl } from "./databaseUrl";

const { Pool } = pg;

function poolInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const yektubeDatabaseUrl = resolveYektubeDatabaseUrl();

/** Ayrı Yektube Postgres bağlantısı tanımlı mı? */
export const isYektubeDatabaseConfigured = Boolean(yektubeDatabaseUrl);

/** YEKTUBE_DATABASE_URL yoksa null — yektubeCluster ana DB'ye düşer. */
export const yektubePool: pg.Pool | null = yektubeDatabaseUrl
  ? new Pool({
      connectionString: yektubeDatabaseUrl,
      max: poolInt("YEKTUBE_PG_POOL_MAX", 3),
      idleTimeoutMillis: poolInt("PG_POOL_IDLE_TIMEOUT_MS", 30_000),
      connectionTimeoutMillis: poolInt("PG_POOL_CONNECTION_TIMEOUT_MS", 5_000),
    })
  : null;

export const yektubeDb = yektubePool ? drizzle(yektubePool, { schema }) : null;
