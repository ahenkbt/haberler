-- Faz 2: Keşfet, turizm CMS, ulaşım, yat/VIP, etkinlik, otomotiv, sigorta (haber şeması dışı).

SELECT portal_superapp_archive_and_clear('phase2_verticals', 'kesfet_discover_subcategories');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'kesfet_discover_groups');

SELECT portal_superapp_archive_and_clear('phase2_verticals', 'turizm_blog_posts');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'turizm_category_banners');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'turizm_intro_cards');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'tourism_google_hotel_links');

SELECT portal_superapp_archive_and_clear('phase2_verticals', 'transport_notifications');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'transport_request_status_events');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'transport_requests');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'ride_bookings');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'ride_offers');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'transport_vehicles');

SELECT portal_superapp_archive_and_clear('phase2_verticals', 'yacht_listing_extras');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'vip_service_vehicles');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'etkinlik_event_cache');

SELECT portal_superapp_archive_and_clear('phase2_verticals', 'sigorta_leads');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'sigorta_policies');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'sigorta_agents');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'sigorta_platform_config');

SELECT portal_superapp_archive_and_clear('phase2_verticals', 'otomotiv_listings');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'otomotiv_businesses');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'otomotiv_service_categories');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'otomotiv_categories');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'vehicle_models');
SELECT portal_superapp_archive_and_clear('phase2_verticals', 'vehicle_brands');

SELECT portal_superapp_drop_if_exists('kesfet_discover_subcategories');
SELECT portal_superapp_drop_if_exists('kesfet_discover_groups');

SELECT portal_superapp_drop_if_exists('turizm_blog_posts');
SELECT portal_superapp_drop_if_exists('turizm_category_banners');
SELECT portal_superapp_drop_if_exists('turizm_intro_cards');
SELECT portal_superapp_drop_if_exists('tourism_google_hotel_links');

SELECT portal_superapp_drop_if_exists('transport_notifications');
SELECT portal_superapp_drop_if_exists('transport_request_status_events');
SELECT portal_superapp_drop_if_exists('transport_requests');
SELECT portal_superapp_drop_if_exists('ride_bookings');
SELECT portal_superapp_drop_if_exists('ride_offers');
SELECT portal_superapp_drop_if_exists('transport_vehicles');

SELECT portal_superapp_drop_if_exists('yacht_listing_extras');
SELECT portal_superapp_drop_if_exists('vip_service_vehicles');
SELECT portal_superapp_drop_if_exists('etkinlik_event_cache');

SELECT portal_superapp_drop_if_exists('sigorta_leads');
SELECT portal_superapp_drop_if_exists('sigorta_policies');
SELECT portal_superapp_drop_if_exists('sigorta_agents');
SELECT portal_superapp_drop_if_exists('sigorta_platform_config');

SELECT portal_superapp_drop_if_exists('otomotiv_listings');
SELECT portal_superapp_drop_if_exists('otomotiv_businesses');
SELECT portal_superapp_drop_if_exists('otomotiv_service_categories');
SELECT portal_superapp_drop_if_exists('otomotiv_categories');
SELECT portal_superapp_drop_if_exists('vehicle_models');
SELECT portal_superapp_drop_if_exists('vehicle_brands');
