import pg from "pg";
import { pool } from "@workspace/db";

/**
 * Tek replica cron — PostgreSQL advisory lock (P1.2).
 * The lock lives on its own connection, not a pool slot: jobs (portal RSS, AI RSS...) run for minutes
 * and each held one of the 15 request slots for the whole run (2026-10-09 pool exhaustion).
 */
export async function withPgAdvisoryLock<T>(lockId: number, fn: () => Promise<T>): Promise<T | undefined> {
  const client = new pg.Client(pool.options as pg.ClientConfig);
  client.on("error", () => {
    /* lock connection dropped: the session lock is gone with it */
  });
  await client.connect();
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
    await client.end().catch(() => {});
  }
}

export const PG_ADVISORY_LOCKS = {
  AI_RSS: 740_001,
  PORTAL_RSS: 740_002,
  KESFET_NIGHT_SCRAPER: 740_003,
  PORTAL_RSS_AI_META: 740_004,
  YEKTUBE_VIDEO_DAILY: 740_005,
  /** main’de üretimde kullanılıyor — id değişmesin */
  HM_TEPE_MANSET_DAILY: 740_006,
  /** SHA + Vatanhaber Ankara 00:00 TR — tepe manşetten ayrı kilit */
  HM_RSS_MIDNIGHT: 740_007,
} as const;
