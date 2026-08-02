-- Portal süper app veri emekliliği: önce arşiv, sonra silme / tablo düşürme.
-- Haber (news), HM (hm_*), video, portal_rss, global_map_news_feeds, tr_* adres, site_settings korunur.

CREATE TABLE IF NOT EXISTS portal_superapp_archive_batch (
  id BIGSERIAL PRIMARY KEY,
  phase TEXT NOT NULL,
  source_table TEXT NOT NULL,
  row_count BIGINT NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS portal_superapp_archive_rows (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES portal_superapp_archive_batch(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_pk TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portal_superapp_archive_rows_table_idx
  ON portal_superapp_archive_rows (source_table);

CREATE INDEX IF NOT EXISTS portal_superapp_archive_batch_phase_idx
  ON portal_superapp_archive_batch (phase, archived_at DESC);

CREATE OR REPLACE FUNCTION portal_superapp_archive_and_clear(p_phase text, p_table text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id bigint;
  v_count bigint;
  v_reg regclass;
BEGIN
  v_reg := to_regclass('public.' || quote_ident(p_table));
  IF v_reg IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO portal_superapp_archive_batch (phase, source_table, row_count, notes)
  VALUES (p_phase, p_table, 0, 'archive+clear')
  RETURNING id INTO v_batch_id;

  EXECUTE format(
    'INSERT INTO portal_superapp_archive_rows (batch_id, source_table, source_pk, payload)
     SELECT $1, $2, md5(to_jsonb(t)::text), to_jsonb(t) FROM %I t',
    p_table
  )
  USING v_batch_id, p_table;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  EXECUTE format('DELETE FROM %I', p_table);

  UPDATE portal_superapp_archive_batch SET row_count = v_count WHERE id = v_batch_id;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION portal_superapp_drop_if_exists(p_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass('public.' || quote_ident(p_table)) IS NOT NULL THEN
    EXECUTE format('DROP TABLE %I CASCADE', p_table);
  END IF;
END;
$$;
