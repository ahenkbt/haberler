-- ONE-OFF: Hostinger YEKTUBE Postgres üzerinde panel admin tohumu.
-- Düz metin şifreyi asla git'e yazmayın. Hash'i yerelde üretin:
--
--   python3 -c "import bcrypt; print(bcrypt.hashpw(b'YOUR_PANEL_PASSWORD', bcrypt.gensalt(rounds=10)).decode())"
--
-- veya Node:  node -e "require('bcryptjs').hash('YOUR_PANEL_PASSWORD',10).then(console.log)"
--
-- Sonra YEKTUBE_DATABASE_URL ile bağlanıp çalıştırın (hash'i yapıştırın):

CREATE TABLE IF NOT EXISTS panel_admin_users (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid()::text) NOT NULL,
  username text NOT NULL UNIQUE,
  email text,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE panel_admin_users
  ADD COLUMN IF NOT EXISTS permissions_json TEXT;

INSERT INTO panel_admin_users (username, email, password_hash, is_active)
VALUES (
  'ahenkbt',
  'ahenkbt@gmail.com',
  '<PASTE_BCRYPT_HASH_HERE>',
  true
)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    is_active = true,
    updated_at = now();
