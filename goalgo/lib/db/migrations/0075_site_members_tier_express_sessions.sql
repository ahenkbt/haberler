-- site_members: Drizzle şemasında vardı; CREATE TABLE migrasyonu eksikti (0075 yalnızca ALTER yapıyordu → 42P01)
CREATE TABLE IF NOT EXISTS site_members (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid()::text) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  account_type text NOT NULL DEFAULT 'individual',
  business_premium boolean NOT NULL DEFAULT false,
  business_premium_expires_at timestamp,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Eski/kısmi tablolar için kolon yamaları
ALTER TABLE site_members ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual';
--> statement-breakpoint
ALTER TABLE site_members ADD COLUMN IF NOT EXISTS business_premium BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE site_members ADD COLUMN IF NOT EXISTS business_premium_expires_at TIMESTAMP;
--> statement-breakpoint
-- Admin panel express-session kalıcı deposu (connect-pg-simple)
CREATE TABLE IF NOT EXISTS express_sessions (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS IDX_express_sessions_expire ON express_sessions (expire);
