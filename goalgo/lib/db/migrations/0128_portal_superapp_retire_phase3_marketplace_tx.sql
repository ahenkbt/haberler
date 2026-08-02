-- Faz 3: Sipariş / ödeme işlem verisi — tabloları düşürmeden arşivle ve temizle.
-- vendors, map_businesses, map_cities, global_map_news_feeds, tr_* korunur (Newsmap + HM uyumu).

SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'order_messages');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'delivery_order_status_events');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'driver_locations');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'delivery_orders');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'vendor_reviews');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'vendor_couriers');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'coupon_codes');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'customer_favorites');

SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'stripe_webhook_events');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'orders');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'products');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'product_categories');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'shop_users');

SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'vendor_menu_items');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'vendor_menu_categories');

-- Harita pazaryeri işlemleri (işletme kayıtları kalır — boş vitrin)
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_orders');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_reservations');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_premium_payments');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_campaigns');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_products');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_contact_messages');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_user_reviews');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_feature_promotion_requests');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_reviews');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_favorites');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_ownership_claims');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_business_applications');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_business_images');

-- İşletme vitrin kayıtları (portal süper app); şema kalır, API boş liste döner.
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'map_businesses');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'vendors');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'vendor_categories');
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'partner_applications');

-- Pazaryeri vitrin modülleri (anasayfa işletme ızgarası)
SELECT portal_superapp_archive_and_clear('phase3_marketplace_tx', 'homepage_modules');

INSERT INTO homepage_modules (key, name, enabled, position)
VALUES
  ('hero_search', 'Arama', true, 0),
  ('featured_news', 'Öne çıkan haberler', true, 1)
ON CONFLICT (key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  position = EXCLUDED.position;
