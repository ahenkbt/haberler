-- Haber Merkezi: çoklu haber sitesi, editör, içerik havuzu, AI iş kuyruğu
CREATE TABLE IF NOT EXISTS hm_news_sites (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  display_name text NOT NULL,
  contact_json text,
  layout_json text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hm_site_editors (
  id serial PRIMARY KEY,
  site_id integer NOT NULL REFERENCES hm_news_sites(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, email)
);

CREATE INDEX IF NOT EXISTS idx_hm_site_editors_site_id ON hm_site_editors(site_id);
CREATE INDEX IF NOT EXISTS idx_hm_site_editors_email_lower ON hm_site_editors(lower(email));

CREATE TABLE IF NOT EXISTS hm_content_pool_items (
  id serial PRIMARY KEY,
  source_site_id integer REFERENCES hm_news_sites(id) ON DELETE SET NULL,
  source_news_id integer REFERENCES news(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'news',
  status text NOT NULL DEFAULT 'pending',
  payload_json text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hm_content_pool_status ON hm_content_pool_items(status);

CREATE TABLE IF NOT EXISTS hm_ai_jobs (
  id serial PRIMARY KEY,
  pool_item_id integer NOT NULL REFERENCES hm_content_pool_items(id) ON DELETE CASCADE,
  target_site_id integer NOT NULL REFERENCES hm_news_sites(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'full_ai',
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hm_ai_jobs_status ON hm_ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_hm_ai_jobs_pool ON hm_ai_jobs(pool_item_id);
