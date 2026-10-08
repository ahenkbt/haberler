import {
  WORKER_TO_PHP_SITE_ID as SHARED_WORKER_TO_PHP_SITE_ID,
  phpSiteIdFromWorker as sharedPhpSiteIdFromWorker,
} from "@workspace/db";

/** Re-export shared map (cloudflare dual-write keeps a JS copy). */
export const WORKER_TO_PHP_SITE_ID = SHARED_WORKER_TO_PHP_SITE_ID;
export const phpSiteIdFromWorker = sharedPhpSiteIdFromWorker;

const PHP_TO_WORKER_SITE_ID: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(WORKER_TO_PHP_SITE_ID)
      .map(([worker, php]) => [Number(php), Number(worker)] as const)
      .filter(([php, worker]) => php !== worker),
  ),
);

/**
 * Campaign/target ids may still hold legacy PHP ids (230) after panel rebind (1132).
 * Expand to the panel id so NEWS_DB_READ=news target checks and writes stay consistent.
 */
export function expandHmSiteIdAliases(siteIds: readonly number[]): number[] {
  const out = new Set<number>();
  for (const raw of siteIds) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) continue;
    out.add(Math.trunc(id));
    const worker = PHP_TO_WORKER_SITE_ID[id];
    if (worker) out.add(worker);
    const php = WORKER_TO_PHP_SITE_ID[id];
    if (php) out.add(php);
  }
  return [...out];
}

/** Prefer panel/worker id when a PHP alias is present. */
export function preferWorkerSiteId(siteId: number | null | undefined): number | null {
  const id = Number(siteId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return PHP_TO_WORKER_SITE_ID[id] ?? Math.trunc(id);
}
