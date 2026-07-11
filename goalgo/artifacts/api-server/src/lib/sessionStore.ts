import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import type { Store } from "express-session";
import { pool } from "@workspace/db";
import { logger } from "./logger.js";

const PgSession = connectPgSimple(session);

let cachedStore: Store | undefined;
let tableReadyPromise: Promise<void> | null = null;

/**
 * PostgreSQL-backed express-session store.
 * MemoryStore loses sessions on Railway restart / multi-instance routing — admin panel kept logging out.
 */
export function getSessionStore(): Store {
  if (cachedStore) return cachedStore;
  cachedStore = new PgSession({
    pool,
    tableName: "express_sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15,
  });
  logger.info("express-session PostgreSQL store active (express_sessions)");
  return cachedStore;
}

/** Sunucu açılışında oturum tablosunun hazır olduğundan emin ol (migration + connect-pg-simple yedek). */
export function ensureSessionStoreTable(): Promise<void> {
  if (tableReadyPromise) return tableReadyPromise;
  tableReadyPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS express_sessions (
        sid varchar NOT NULL PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "IDX_express_sessions_expire" ON express_sessions (expire)`,
    );
    getSessionStore();
    logger.info("express_sessions tablosu hazır");
  })().catch((err) => {
    tableReadyPromise = null;
    throw err;
  });
  return tableReadyPromise;
}
