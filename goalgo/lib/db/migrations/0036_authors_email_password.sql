-- Köşe yazarı portal girişi (HM sitesi) için isteğe bağlı e-posta + şifre özeti
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "authors" ADD COLUMN IF NOT EXISTS "password_hash" text;

CREATE UNIQUE INDEX IF NOT EXISTS "authors_hm_site_email_lower_uidx"
  ON "authors" ("hm_site_id", lower(btrim("email")))
  WHERE "hm_site_id" IS NOT NULL
    AND "email" IS NOT NULL
    AND btrim("email") <> '';
