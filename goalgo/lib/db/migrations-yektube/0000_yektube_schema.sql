-- Yektube ayrı veritabanı — tam şema
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
  use_youtube_api boolean NOT NULL DEFAULT true,
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
  embed_allowed boolean NOT NULL DEFAULT true,
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
CREATE TABLE IF NOT EXISTS yektube_member_subscriptions (
  id serial PRIMARY KEY,
  member_id text NOT NULL,
  source_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, source_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_yektube_subs_member ON yektube_member_subscriptions (member_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS yektube_watch_history (
  id serial PRIMARY KEY,
  member_id text NOT NULL,
  video_id integer NOT NULL,
  source_id integer,
  youtube_video_id text NOT NULL,
  watched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, video_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_yektube_history_member ON yektube_watch_history (member_id, watched_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS yektube_playlists (
  id serial PRIMARY KEY,
  member_id text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_yektube_playlists_member ON yektube_playlists (member_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS yektube_playlist_items (
  id serial PRIMARY KEY,
  playlist_id integer NOT NULL REFERENCES yektube_playlists(id) ON DELETE CASCADE,
  video_id integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, video_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS yektube_member_prefs (
  member_id text PRIMARY KEY,
  notify_new_videos boolean NOT NULL DEFAULT true,
  notify_shorts boolean NOT NULL DEFAULT true,
  notify_live boolean NOT NULL DEFAULT false,
  save_history boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
