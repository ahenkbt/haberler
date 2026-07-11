-- Mağaza blogu: ayarlar, yazılar, yorumlar

CREATE TABLE IF NOT EXISTS vendor_blog_settings (
  vendor_id INTEGER PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_blog_posts (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  content_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vendor_blog_posts_vendor_slug UNIQUE (vendor_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_vendor_blog_posts_vendor_pub
  ON vendor_blog_posts (vendor_id, published, published_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS vendor_blog_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES vendor_blog_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_blog_comments_post
  ON vendor_blog_comments (post_id, created_at DESC);
