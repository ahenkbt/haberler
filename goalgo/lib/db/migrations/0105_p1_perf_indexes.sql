-- P1.1: harita geo + sipariş listeleme indeksleri

CREATE INDEX IF NOT EXISTS map_businesses_lat_lng_active_idx
  ON map_businesses (latitude, longitude)
  WHERE is_active = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS delivery_orders_vendor_id_status_idx
  ON delivery_orders (vendor_id, status);

CREATE INDEX IF NOT EXISTS delivery_orders_customer_phone_idx
  ON delivery_orders (customer_phone);

-- order_number zaten UNIQUE; tekrar btree gereksiz
