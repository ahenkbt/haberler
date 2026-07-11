CREATE TABLE IF NOT EXISTS yektube_member_subscriptions (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_yektube_subs_member ON yektube_member_subscriptions (member_id);

CREATE TABLE IF NOT EXISTS yektube_watch_history (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL,
  video_id INTEGER NOT NULL,
  source_id INTEGER,
  youtube_video_id TEXT NOT NULL,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_yektube_history_member ON yektube_watch_history (member_id, watched_at DESC);

CREATE TABLE IF NOT EXISTS yektube_playlists (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yektube_playlists_member ON yektube_playlists (member_id);

CREATE TABLE IF NOT EXISTS yektube_playlist_items (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES yektube_playlists(id) ON DELETE CASCADE,
  video_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (playlist_id, video_id)
);

CREATE TABLE IF NOT EXISTS yektube_member_prefs (
  member_id TEXT PRIMARY KEY,
  notify_new_videos BOOLEAN NOT NULL DEFAULT true,
  notify_shorts BOOLEAN NOT NULL DEFAULT true,
  notify_live BOOLEAN NOT NULL DEFAULT false,
  save_history BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
