-- HM köşe yazıları (news’ten ayrı tablo)
CREATE TABLE IF NOT EXISTS hm_makaleler (
  id serial PRIMARY KEY,
  site_id integer NOT NULL REFERENCES hm_news_sites (id) ON DELETE CASCADE,
  author_id integer REFERENCES authors (id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  spot text,
  content text,
  image_url text,
  status text NOT NULL DEFAULT 'draft',
  views integer NOT NULL DEFAULT 0,
  external_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hm_makaleler_site_id_slug_key UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS hm_makaleler_site_author_idx ON hm_makaleler (site_id, author_id)
  WHERE author_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS hm_makaleler_site_status_created_idx ON hm_makaleler (site_id, status, created_at DESC);

-- Editör havuzu: manuel eklenen haberler
ALTER TABLE news ADD COLUMN IF NOT EXISTS is_editor_manual boolean NOT NULL DEFAULT false;

-- RSS: Yekpare merkez akışa yazılsın mı (ayrı tik)
ALTER TABLE rss_campaigns ADD COLUMN IF NOT EXISTS include_yekpare_haber boolean NOT NULL DEFAULT false;

-- Eski davranış: yalnızca merkez hedefli kampanyalar merkeze yazıyordu (hm_site_ids boş)
UPDATE rss_campaigns
SET include_yekpare_haber = true
WHERE coalesce(cardinality(hm_site_ids), 0) = 0;
