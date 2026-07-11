import { pool } from "@workspace/db";

/** Tek replica cron — PostgreSQL advisory lock (P1.2). */
export async function withPgAdvisoryLock<T>(lockId: number, fn: () => Promise<T>): Promise<T | undefined> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ ok: boolean }>("SELECT pg_try_advisory_lock($1::bigint) AS ok", [lockId]);
    if (!rows[0]?.ok) return undefined;
    return await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1::bigint)", [lockId]);
    } catch {
      /* başka oturum kilidi bıraktı */
    }
    client.release();
  }
}

export const PG_ADVISORY_LOCKS = {
  AI_RSS: 740_001,
  PORTAL_RSS: 740_002,
  KESFET_NIGHT_SCRAPER: 740_003,
  PORTAL_RSS_AI_META: 740_004,
} as const;
