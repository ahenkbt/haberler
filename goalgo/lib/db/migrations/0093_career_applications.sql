CREATE TABLE IF NOT EXISTS career_applications (
  id SERIAL PRIMARY KEY,
  position_slug TEXT NOT NULL DEFAULT 'cagri-merkezi-satis',
  position_title TEXT NOT NULL DEFAULT 'Çağrı Merkezi Satış Temsilcileri',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  experience_years TEXT,
  cover_letter TEXT NOT NULL,
  cv_url TEXT,
  cv_file_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS career_applications_created_at_idx
  ON career_applications (created_at DESC);

CREATE INDEX IF NOT EXISTS career_applications_is_read_idx
  ON career_applications (is_read, created_at DESC);
