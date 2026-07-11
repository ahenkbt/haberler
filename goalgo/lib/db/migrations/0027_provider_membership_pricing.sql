-- Servis sağlayıcı üyelik katmanı + site genelinde USD fiyatları ve USD/TRY kuru

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'gold';

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS provider_membership_standard_usd NUMERIC(10, 2) NOT NULL DEFAULT 10;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS provider_membership_gold_usd NUMERIC(10, 2) NOT NULL DEFAULT 20;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS provider_membership_premium_per_business_usd NUMERIC(10, 2) NOT NULL DEFAULT 10;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS usd_try_rate NUMERIC(14, 6);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS usd_try_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN vendors.membership_tier IS 'standard | gold | premium — servis sağlayıcı panel özellikleri';
COMMENT ON COLUMN site_settings.provider_membership_standard_usd IS 'Standart üyelik aylık USD';
COMMENT ON COLUMN site_settings.provider_membership_gold_usd IS 'Gold üyelik aylık USD';
COMMENT ON COLUMN site_settings.provider_membership_premium_per_business_usd IS 'Premium: işletme başına aylık USD (Gold dahil)';
