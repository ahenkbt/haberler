import { Router, type IRouter, type Request, type Response } from "express";
import { newDedicatedClient } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";

/**
 * Admin-only, read-only view of the API's main DB activity (2026-10-09 pool queue diagnosis).
 * Runs on its own connection (not a pool slot) in a READ ONLY transaction with a 4 s statement
 * timeout. Only SELECTs on pg_stat_activity / pg_locks / pg_stat_statements; query text is
 * truncated, no parameters.
 */
const router: IRouter = Router();

router.get("/hm/admin/db-activity", async (req: Request, res: Response): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const client = newDedicatedClient();
  client.on("error", () => {});
  const out: Record<string, unknown> = {};
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '4s'");
    const q = async (key: string, text: string) => {
      try {
        out[key] = (await client.query(text)).rows;
      } catch (err) {
        out[key] = { error: (err instanceof Error ? err.message : String(err)).slice(0, 200) };
        await client.query("ROLLBACK").catch(() => {});
        await client.query("BEGIN READ ONLY").catch(() => {});
        await client.query("SET LOCAL statement_timeout = '4s'").catch(() => {});
      }
    };
    await q(
      "settings",
      `SELECT current_setting('max_connections') AS max_connections,
              (SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend') AS client_backends`,
    );
    await q(
      "byApp",
      `SELECT coalesce(nullif(application_name, ''), '-') AS app, usename, state,
              coalesce(wait_event_type, '') AS wait, count(*)::int AS n,
              max(now() - query_start) FILTER (WHERE state <> 'idle')::text AS max_age,
              max(now() - xact_start) FILTER (WHERE state LIKE 'idle in transaction%')::text AS max_idle_xact
         FROM pg_stat_activity WHERE backend_type = 'client backend'
        GROUP BY 1, 2, 3, 4 ORDER BY n DESC LIMIT 30`,
    );
    await q(
      "active",
      `SELECT pid, coalesce(nullif(application_name, ''), '-') AS app, state,
              coalesce(wait_event_type || ':' || wait_event, '') AS wait,
              (now() - query_start)::text AS age,
              left(regexp_replace(query, '\\s+', ' ', 'g'), 200) AS query
         FROM pg_stat_activity
        WHERE backend_type = 'client backend' AND state <> 'idle' AND pid <> pg_backend_pid()
        ORDER BY query_start ASC NULLS LAST LIMIT 25`,
    );
    await q(
      "blocked",
      `SELECT a.pid, pg_blocking_pids(a.pid) AS blocked_by, (now() - a.query_start)::text AS age,
              left(regexp_replace(a.query, '\\s+', ' ', 'g'), 160) AS query
         FROM pg_stat_activity a WHERE cardinality(pg_blocking_pids(a.pid)) > 0 LIMIT 20`,
    );
    await q(
      "topStatements",
      `SELECT calls, round(total_exec_time)::bigint AS total_ms, round(mean_exec_time::numeric, 1) AS mean_ms,
              rows, left(regexp_replace(query, '\\s+', ' ', 'g'), 200) AS query
         FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 15`,
    );
    await client.query("ROLLBACK").catch(() => {});
  } catch (err) {
    out.error = (err instanceof Error ? err.message : String(err)).slice(0, 200);
  } finally {
    await client.end().catch(() => {});
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(out);
});

export default router;
