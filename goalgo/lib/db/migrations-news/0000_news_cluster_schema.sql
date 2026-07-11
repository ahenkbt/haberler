-- Haber cluster: tüm haber/HM/RSS tabloları (idempotent, Faz 1)
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS hm_news_sites (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  domain2 text UNIQUE,
  domain3 text UNIQUE,
  display_name text NOT NULL,
  description text,
  contact_json text,
  layout_json text,
  verification_json text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS hm_news_sites_domain2_key ON hm_news_sites (domain2) WHERE domain2 IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS hm_news_sites_domain3_key ON hm_news_sites (domain3) WHERE domain3 IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#CC0000',
  exclusive_site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_categories_exclusive_site_id ON categories (exclusive_site_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_categories_exclusive_site_sort
  ON categories (exclusive_site_id, sort_order)
  WHERE exclusive_site_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS authors (
  id serial PRIMARY KEY,
  name text NOT NULL,
  title text,
  avatar_url text,
  bio text,
  hm_site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL,
  hm_sort_order integer,
  email text,
  password_hash text,
  pw_reset_token text,
  pw_reset_expires_at timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS authors_hm_site_id_idx ON authors (hm_site_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS authors_hm_site_email_lower_uidx
  ON authors (hm_site_id, lower(btrim(email)))
  WHERE hm_site_id IS NOT NULL AND email IS NOT NULL AND btrim(email) <> '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS authors_hm_site_normalized_name_unique
  ON authors (coalesce(hm_site_id, 0), lower(regexp_replace(btrim(name), '\s+', ' ', 'g')))
  WHERE btrim(coalesce(name, '')) <> '';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS news (
  id serial PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  spot text,
  content text,
  image_url text,
  category_id integer,
  author_id integer,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  is_breaking boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  is_ai_generated boolean NOT NULL DEFAULT false,
  site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL,
  rss_source_url text,
  is_editor_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS news_site_id_idx ON news (site_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS news_rss_source_site_unique
  ON news (coalesce(site_id, 0), rss_source_url)
  WHERE rss_source_url IS NOT NULL AND btrim(rss_source_url) <> '';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS hm_site_editors (
  id serial PRIMARY KEY,
  site_id integer NOT NULL REFERENCES hm_news_sites (id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, email)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hm_site_editors_site_id ON hm_site_editors (site_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hm_site_editors_email_lower ON hm_site_editors (lower(email));
--> statement-breakpoint
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS hm_makaleler_site_author_idx ON hm_makaleler (site_id, author_id) WHERE author_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS hm_makaleler_site_status_created_idx ON hm_makaleler (site_id, status, created_at DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS hm_makaleler_site_external_key_unique
  ON hm_makaleler (site_id, external_key)
  WHERE external_key IS NOT NULL AND btrim(external_key) <> '';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS hm_content_pool_items (
  id serial PRIMARY KEY,
  source_site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL,
  source_news_id integer REFERENCES news (id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'news',
  status text NOT NULL DEFAULT 'pending',
  payload_json text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hm_content_pool_status ON hm_content_pool_items (status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS hm_ai_jobs (
  id serial PRIMARY KEY,
  pool_item_id integer NOT NULL REFERENCES hm_content_pool_items (id) ON DELETE CASCADE,
  target_site_id integer NOT NULL REFERENCES hm_news_sites (id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'full_ai',
  post_status text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  result_news_id integer REFERENCES news (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hm_ai_jobs_status ON hm_ai_jobs (status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hm_ai_jobs_pool ON hm_ai_jobs (pool_item_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hm_ai_jobs_result_news_id ON hm_ai_jobs (result_news_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS video_sources (
  id serial PRIMARY KEY,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'youtube',
  source_type text NOT NULL DEFAULT 'channel',
  channel_id text NOT NULL,
  url text,
  logo_url text,
  category_slug text NOT NULL DEFAULT 'haberler',
  active boolean NOT NULL DEFAULT true,
  is_live boolean NOT NULL DEFAULT false,
  video_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_video_sources_active ON video_sources (active);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_video_sources_category ON video_sources (category_slug);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS videos (
  id serial PRIMARY KEY,
  source_id integer,
  platform text NOT NULL DEFAULT 'youtube',
  video_id text NOT NULL,
  title text NOT NULL,
  description text,
  thumbnail text,
  channel_name text,
  channel_id text,
  published_at text,
  duration text,
  category_slug text NOT NULL DEFAULT 'haberler',
  is_featured boolean NOT NULL DEFAULT false,
  is_headline boolean NOT NULL DEFAULT false,
  is_story boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_videos_source_id ON videos (source_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_videos_active_category ON videos (active, category_slug);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS videos_source_video_unique
  ON videos (coalesce(source_id, 0), video_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS wiki_settings (
  id integer PRIMARY KEY DEFAULT 1,
  wiki_featured jsonb NOT NULL DEFAULT '[]'::jsonb,
  wiki_encyclopedia_ui jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO wiki_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS rss_campaigns (
  id serial PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  post_type text NOT NULL DEFAULT 'news',
  category_slug text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  feeds text[] NOT NULL DEFAULT '{}',
  source_type text NOT NULL DEFAULT 'rss',
  interval_minutes integer NOT NULL DEFAULT 30,
  days_window integer NOT NULL DEFAULT 0,
  daily_limit integer NOT NULL DEFAULT 0,
  download_images boolean NOT NULL DEFAULT false,
  headline boolean NOT NULL DEFAULT false,
  breaking_keywords text[] NOT NULL DEFAULT '{}',
  min_words integer NOT NULL DEFAULT 0,
  translate_enabled boolean NOT NULL DEFAULT false,
  source_lang text,
  target_lang text,
  translate_engine text,
  hm_site_ids integer[] NOT NULL DEFAULT '{}',
  include_yekpare_haber boolean NOT NULL DEFAULT false,
  haberler_filter_by_tags boolean NOT NULL DEFAULT false,
  added_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS rss_logs (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL,
  level text NOT NULL DEFAULT 'info',
  action text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_settings (
  id serial PRIMARY KEY,
  openai_api_key text NOT NULL DEFAULT '',
  openai_model text NOT NULL DEFAULT 'gpt-4o-mini',
  language text NOT NULL DEFAULT 'tr',
  auto_uniquify boolean NOT NULL DEFAULT false,
  word_count integer NOT NULL DEFAULT 600,
  post_status text NOT NULL DEFAULT 'draft',
  rss_urls text NOT NULL DEFAULT '',
  max_per_source integer NOT NULL DEFAULT 5,
  interval_hours integer NOT NULL DEFAULT 24,
  auto_run_enabled boolean NOT NULL DEFAULT false,
  next_run_at timestamp,
  last_run_at timestamp,
  total_ai_runs integer NOT NULL DEFAULT 0,
  preferred_provider text NOT NULL DEFAULT 'auto',
  updated_at timestamp DEFAULT now()
);
