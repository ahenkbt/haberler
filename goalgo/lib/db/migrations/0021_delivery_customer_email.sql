-- Müşteri sipariş bildirimi (e-posta) ve takip için
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
