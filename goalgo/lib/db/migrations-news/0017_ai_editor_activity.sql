-- AI editör olay günlüğü. Idempotent. Sırlar bu tabloya yazılmaz.
-- Panel ilk okumada da aynı DDL'i çalıştırır. VPS ai_editor.py kancası:
--   SELECT ai_editor_activity_write(...)
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_editor_activity (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL DEFAULT 'system',
  site_id integer,
  site_domain text,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'done',
  summary text NOT NULL DEFAULT '',
  target_ref text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  undo jsonb,
  undone_at timestamptz,
  provider text,
  source text NOT NULL DEFAULT 'hook'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_editor_activity_created_idx ON ai_editor_activity (created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_editor_activity_site_idx ON ai_editor_activity (site_id, created_at DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ai_editor_activity_write(
  p_action text,
  p_summary text,
  p_site_id integer DEFAULT NULL,
  p_site_domain text DEFAULT NULL,
  p_status text DEFAULT 'done',
  p_target_ref text DEFAULT NULL,
  p_detail jsonb DEFAULT '{}'::jsonb,
  p_actor text DEFAULT 'ai-editor',
  p_source text DEFAULT 'editor'
) RETURNS bigint
LANGUAGE plpgsql
AS $fn$
DECLARE
  new_id bigint;
BEGIN
  INSERT INTO ai_editor_activity (actor, site_id, site_domain, action, status, summary, target_ref, detail, source)
  VALUES (
    left(coalesce(p_actor, 'ai-editor'), 80),
    p_site_id,
    left(coalesce(p_site_domain, ''), 200),
    left(coalesce(p_action, 'skip'), 80),
    left(coalesce(p_status, 'done'), 40),
    left(coalesce(p_summary, ''), 500),
    left(coalesce(p_target_ref, ''), 300),
    coalesce(p_detail, '{}'::jsonb),
    left(coalesce(p_source, 'editor'), 40)
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$fn$;
