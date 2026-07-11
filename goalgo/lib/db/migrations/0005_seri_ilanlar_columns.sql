-- seri_ilanlar: kod şemasındaki KYC ve sahip alanları (eski kurulumlarda yoksa GET /api/seri-ilanlar 500 veriyordu)
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "owner_id" integer;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "owner_name" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "owner_email" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "condition" text DEFAULT 'used';
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "views" integer DEFAULT 0;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "ilan_sahibi_tipi" text DEFAULT 'bireysel';
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "tc_no" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "ilan_sahibi_adi" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "ilan_sahibi_adres" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "ilan_sahibi_tel" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "kimlik_belgesi_url" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "vergi_levhasi_url" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "imza_sirkuleri_url" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "kyc_status" text;
ALTER TABLE "seri_ilanlar" ADD COLUMN IF NOT EXISTS "kyc_notes" text;
