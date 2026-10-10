-- Yeni haber sitesi AI editör kaydı için ek kolonlar.
-- Yalnız şema: ADD COLUMN IF NOT EXISTS. Mevcut satırlara UPDATE/DELETE yok.
-- PG 11+ sabit DEFAULT metadata-only eklenir (tablo yeniden yazılmaz).
-- Yedek gerekmez: veri silinmez, satır içeriği bu betikle değiştirilmez.
-- content_mode varsayılanı 'curate' (kaynak haber + link). Yeniden yazım yalnız 'generate'.
-- auto_created varsayılanı false: bu betik hiçbir siteyi otomatik kayıt saymaz.
DO $ai_editor_cols$
BEGIN
  IF to_regclass('public.hm_ai_editor_sites') IS NULL AND to_regclass('hm_ai_editor_sites') IS NULL THEN
    RAISE NOTICE 'hm_ai_editor_sites yok; concept_prompt / content_mode / auto_created atlandı';
    RETURN;
  END IF;

  ALTER TABLE hm_ai_editor_sites ADD COLUMN IF NOT EXISTS concept_prompt text;
  ALTER TABLE hm_ai_editor_sites ADD COLUMN IF NOT EXISTS content_mode text NOT NULL DEFAULT 'curate';
  ALTER TABLE hm_ai_editor_sites ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hm_ai_editor_sites_content_mode_chk'
  ) THEN
    ALTER TABLE hm_ai_editor_sites
      ADD CONSTRAINT hm_ai_editor_sites_content_mode_chk
      CHECK (content_mode IN ('curate', 'generate'));
  END IF;
END
$ai_editor_cols$;
