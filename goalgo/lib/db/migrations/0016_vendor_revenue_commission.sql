-- Servis sağlayıcı: abonelik vs komisyon modeli + komisyon sipariş anlık görüntüsü

ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "revenue_model" text DEFAULT 'subscription' NOT NULL;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "commission_rate_pct" numeric(8, 4);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "payout_bank_holder" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "payout_bank_iban" text;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "payout_bank_branch" text;

ALTER TABLE "delivery_orders" ADD COLUMN IF NOT EXISTS "platform_commission_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "delivery_orders" ADD COLUMN IF NOT EXISTS "commission_base_amount" numeric(10, 2);
ALTER TABLE "delivery_orders" ADD COLUMN IF NOT EXISTS "commission_rate_pct_snapshot" numeric(8, 4);
ALTER TABLE "delivery_orders" ADD COLUMN IF NOT EXISTS "revenue_model_snapshot" text;
