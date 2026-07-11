-- PayTR / iyzico: abonelik gelir modelindeki işletmeler kendi hesaplarına tahsilat (API anahtarları satıcıda)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_key TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_merchant_salt TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paytr_test_mode BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_api_key TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_secret_key TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS iyzico_sandbox BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS preferred_tr_gateway TEXT;

ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS tr_checkout_token TEXT;
CREATE INDEX IF NOT EXISTS delivery_orders_tr_checkout_token_idx ON delivery_orders (tr_checkout_token);
