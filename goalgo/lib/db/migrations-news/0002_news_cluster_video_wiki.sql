-- Haber cluster: Yektube ve Ansiklopi kalıcı verileri
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
