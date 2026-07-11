-- Yabancı bölge pin RSS (Hindistan vb.) dünya etiketiyle kalmış; global kategoriye taşı.
UPDATE portal_rss_items pri
SET category_slug = 'global'
FROM global_map_news_feeds gmf
WHERE pri.feed_id = ('gmn-' || gmf.id::text)
  AND lower(trim(pri.category_slug)) = 'dunya'
  AND NOT (
    COALESCE(upper(trim(gmf.country_code)), '') IN ('TR', 'CY')
    OR lower(trim(COALESCE(gmf.region_key, ''))) LIKE 'tr-%'
    OR lower(trim(COALESCE(gmf.region_key, ''))) LIKE 'cy-%'
    OR lower(trim(COALESCE(gmf.region_key, ''))) = 'global-dunya'
  );
--> statement-breakpoint
UPDATE news n
SET category_id = gc.id
FROM categories gc,
     categories dc,
     portal_rss_items pri,
     global_map_news_feeds gmf
WHERE gc.slug = 'global'
  AND dc.slug = 'dunya'
  AND n.category_id = dc.id
  AND n.rss_source_url IS NOT NULL
  AND btrim(n.rss_source_url) <> ''
  AND lower(btrim(n.rss_source_url)) = lower(btrim(pri.link))
  AND pri.feed_id = ('gmn-' || gmf.id::text)
  AND lower(trim(pri.category_slug)) = 'global'
  AND NOT (
    COALESCE(upper(trim(gmf.country_code)), '') IN ('TR', 'CY')
    OR lower(trim(COALESCE(gmf.region_key, ''))) LIKE 'tr-%'
    OR lower(trim(COALESCE(gmf.region_key, ''))) LIKE 'cy-%'
    OR lower(trim(COALESCE(gmf.region_key, ''))) = 'global-dunya'
  );
