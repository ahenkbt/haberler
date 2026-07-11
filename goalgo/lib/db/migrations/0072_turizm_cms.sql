-- Turizm kategori CMS: intro kartları, banner reklamları, blog yazıları

CREATE TABLE IF NOT EXISTS turizm_intro_cards (
  id SERIAL PRIMARY KEY,
  category_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  placement TEXT NOT NULL DEFAULT 'main' CHECK (placement IN ('main', 'sidebar')),
  section_title TEXT,
  section_description TEXT,
  filter_json JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  blog_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turizm_intro_cards_category
  ON turizm_intro_cards (category_slug, placement, sort_order ASC);

CREATE TABLE IF NOT EXISTS turizm_category_banners (
  id SERIAL PRIMARY KEY,
  category_slug TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turizm_category_banners_category
  ON turizm_category_banners (category_slug, sort_order ASC);

CREATE TABLE IF NOT EXISTS turizm_blog_posts (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  excerpt TEXT,
  body_html TEXT,
  cover_image_url TEXT,
  category_slug TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turizm_blog_posts_published
  ON turizm_blog_posts (is_published, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_turizm_blog_posts_featured
  ON turizm_blog_posts (category_slug, is_featured, is_published)
  WHERE is_featured = true AND is_published = true;
