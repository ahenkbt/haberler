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

ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'kariyer';
ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS source_contact_id INTEGER;
