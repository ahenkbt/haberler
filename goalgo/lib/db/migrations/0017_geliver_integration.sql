-- Geliver kargo pazaryeri: işletme başına API anahtarı, gönderici adresi; sipariş bazında gönderi özeti
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_api_token TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_address_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_sender_zip TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_auto_ship_on_order BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_postal_code TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_shipment_id TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_tracking_number TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_label_url TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_transaction_id TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_status TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS geliver_last_error TEXT;
