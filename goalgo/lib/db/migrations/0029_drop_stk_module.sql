-- STK vitrin modülü kaldırıldı: haber tablosundaki STK satırları, indeks ve STK tabloları.

-- Fresh DB: stk_organization_id kolonu hiç oluşmamış olabilir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'stk_organization_id'
  ) THEN
    DELETE FROM news WHERE stk_organization_id IS NOT NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS news_stk_org_kind_idx;

ALTER TABLE news DROP COLUMN IF EXISTS stk_route_slug;
ALTER TABLE news DROP COLUMN IF EXISTS stk_content_kind;
ALTER TABLE news DROP COLUMN IF EXISTS stk_organization_id;

DROP TABLE IF EXISTS stk_donation_logs CASCADE;
DROP TABLE IF EXISTS stk_pos_credentials CASCADE;
DROP TABLE IF EXISTS stk_contact_messages CASCADE;
DROP TABLE IF EXISTS stk_faaliyet_posts CASCADE;
DROP TABLE IF EXISTS stk_organizations CASCADE;
