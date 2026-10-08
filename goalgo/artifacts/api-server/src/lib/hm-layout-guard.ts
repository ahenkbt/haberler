/**
 * Layout guard (2026-10-08, redo of #445): automatic jobs (seed/ensure/repair/sync, Worker per-request
 * ensures, GitHub workflows) must never overwrite what a person saved in the panel — logos, menus or any
 * other layout_json value.
 *
 * How:
 *  - Panel save paths stamp layout_json with `_hmUserSavedAt` (markHmLayoutUserSave).
 *  - A BEFORE UPDATE trigger on hm_news_sites (main DB + PHP/news DB) lets a write through unchanged only
 *    when `_hmUserSavedAt` is new. Any other write is "fill-only": keys that already hold a non-empty value
 *    keep it; new keys and empty keys may be filled. Blocked keys are logged to hm_layout_guard_log.
 *  - Operators doing an intentional repair: `SET LOCAL hm.layout_guard = 'off'` inside their transaction.
 *  - Rollback without code: HM_LAYOUT_GUARD=0 drops the trigger at the next container start.
 */
import { sql } from "drizzle-orm";

export const HM_LAYOUT_USER_SAVED_AT_KEY = "_hmUserSavedAt";

/** Keys automation may still change (admin toggles that are not user content). */
export const HM_LAYOUT_GUARD_UNPROTECTED_KEYS = Object.freeze(["hmPublicSuspended"]);

/** Stamp a panel save so the DB guard lets it through. Non-object / invalid JSON is returned unchanged. */
export function markHmLayoutUserSave(raw: string, now: Date = new Date()): string {
  const text = String(raw ?? "");
  if (!text.trim()) return text;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return text;
    return JSON.stringify({ ...(parsed as Record<string, unknown>), [HM_LAYOUT_USER_SAVED_AT_KEY]: now.toISOString() });
  } catch {
    return text;
  }
}

/** Pure JS twin of the trigger (tests + dry runs). */
export function applyHmLayoutGuard(
  oldLayout: Record<string, unknown> | null | undefined,
  newLayout: Record<string, unknown> | null | undefined,
): { layout: Record<string, unknown>; blocked: string[] } {
  const prev = oldLayout && typeof oldLayout === "object" && !Array.isArray(oldLayout) ? oldLayout : {};
  const next = newLayout && typeof newLayout === "object" && !Array.isArray(newLayout) ? { ...newLayout } : {};
  const prevStamp = prev[HM_LAYOUT_USER_SAVED_AT_KEY];
  const nextStamp = next[HM_LAYOUT_USER_SAVED_AT_KEY];
  if (nextStamp != null && String(nextStamp) !== String(prevStamp ?? "")) {
    return { layout: next, blocked: [] };
  }
  const blocked: string[] = [];
  for (const [k, v] of Object.entries(prev)) {
    if (k.startsWith("_") || HM_LAYOUT_GUARD_UNPROTECTED_KEYS.includes(k)) continue;
    if (isEmptyLayoutValue(v)) continue;
    if (JSON.stringify(next[k]) !== JSON.stringify(v)) {
      next[k] = v;
      blocked.push(k);
    }
  }
  if (prevStamp != null) next[HM_LAYOUT_USER_SAVED_AT_KEY] = prevStamp;
  return { layout: next, blocked };
}

function isEmptyLayoutValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

const UNPROTECTED_SQL = HM_LAYOUT_GUARD_UNPROTECTED_KEYS.map((k) => `'${k}'`).join(", ");

export const HM_LAYOUT_GUARD_SQL = [
  `CREATE TABLE IF NOT EXISTS hm_layout_guard_log (
     id bigserial PRIMARY KEY,
     at timestamptz NOT NULL DEFAULT now(),
     site_id integer,
     slug text,
     blocked_keys text[],
     db_user text DEFAULT current_user,
     app_name text DEFAULT current_setting('application_name', true),
     query text DEFAULT left(current_query(), 1000)
   )`,
  `CREATE OR REPLACE FUNCTION hm_layout_guard_fn() RETURNS trigger LANGUAGE plpgsql AS $fn$
   DECLARE o jsonb; n jsonb; k text; v jsonb; blocked text[] := '{}';
   BEGIN
     IF coalesce(current_setting('hm.layout_guard', true), '') = 'off' THEN RETURN NEW; END IF;
     IF OLD.layout_json IS NULL OR btrim(OLD.layout_json::text) = '' THEN RETURN NEW; END IF;
     IF NEW.layout_json::text IS NOT DISTINCT FROM OLD.layout_json::text THEN RETURN NEW; END IF;
     BEGIN o := OLD.layout_json::text::jsonb; EXCEPTION WHEN others THEN RETURN NEW; END;
     IF jsonb_typeof(o) <> 'object' THEN RETURN NEW; END IF;
     BEGIN n := coalesce(nullif(btrim(coalesce(NEW.layout_json::text, '')), ''), '{}')::jsonb;
     EXCEPTION WHEN others THEN n := '{}'::jsonb; END;
     IF jsonb_typeof(n) <> 'object' THEN n := '{}'::jsonb; END IF;
     IF (n ? '${HM_LAYOUT_USER_SAVED_AT_KEY}') AND (n->>'${HM_LAYOUT_USER_SAVED_AT_KEY}') IS DISTINCT FROM (o->>'${HM_LAYOUT_USER_SAVED_AT_KEY}') THEN
       RETURN NEW;
     END IF;
     FOR k, v IN SELECT key, value FROM jsonb_each(o) LOOP
       CONTINUE WHEN left(k, 1) = '_' OR k IN (${UNPROTECTED_SQL});
       CONTINUE WHEN v IS NULL OR v = 'null'::jsonb OR v = '[]'::jsonb OR v = '{}'::jsonb
         OR (jsonb_typeof(v) = 'string' AND btrim(v #>> '{}') = '');
       IF (n -> k) IS DISTINCT FROM v THEN
         n := jsonb_set(n, ARRAY[k], v, true);
         blocked := blocked || k;
       END IF;
     END LOOP;
     IF o ? '${HM_LAYOUT_USER_SAVED_AT_KEY}' THEN
       n := jsonb_set(n, '{${HM_LAYOUT_USER_SAVED_AT_KEY}}', o -> '${HM_LAYOUT_USER_SAVED_AT_KEY}', true);
     END IF;
     IF coalesce(array_length(blocked, 1), 0) > 0 THEN
       NEW.layout_json := n::text;
       BEGIN
         INSERT INTO hm_layout_guard_log (site_id, slug, blocked_keys) VALUES (NEW.id, NEW.slug, blocked);
       EXCEPTION WHEN others THEN NULL;
       END;
     END IF;
     RETURN NEW;
   END
   $fn$`,
  `DROP TRIGGER IF EXISTS trg_hm_layout_guard ON hm_news_sites`,
  `CREATE TRIGGER trg_hm_layout_guard BEFORE UPDATE OF layout_json ON hm_news_sites
     FOR EACH ROW EXECUTE FUNCTION hm_layout_guard_fn()`,
] as const;

export const HM_LAYOUT_GUARD_DROP_SQL = `DROP TRIGGER IF EXISTS trg_hm_layout_guard ON hm_news_sites`;

type Executor = { execute: (q: ReturnType<typeof sql.raw>) => Promise<unknown> };

/** Install (or with HM_LAYOUT_GUARD=0 remove) the guard on each given DB. Idempotent. */
export async function ensureHmLayoutGuard(
  targets: Array<{ name: string; db: Executor | null | undefined }>,
  enabled: boolean,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const t of targets) {
    if (!t.db) continue;
    try {
      if (!enabled) {
        await t.db.execute(sql.raw(HM_LAYOUT_GUARD_DROP_SQL));
        out[t.name] = "dropped";
        continue;
      }
      for (const stmt of HM_LAYOUT_GUARD_SQL) {
        await t.db.execute(sql.raw(stmt));
      }
      out[t.name] = "installed";
    } catch (err) {
      out[t.name] = `error: ${(err instanceof Error ? err.message : String(err)).slice(0, 160)}`;
    }
  }
  return out;
}
