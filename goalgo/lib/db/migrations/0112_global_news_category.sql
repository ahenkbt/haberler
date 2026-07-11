-- Global (İngilizce / uluslararası küresel RSS) kategorisi — haber haritası varsayılan, haber sitesi opt-in.
INSERT INTO categories (name, slug, color, sort_order)
SELECT 'Global', 'global', '#0ea5e9', 95
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(trim(slug)) = 'global');
--> statement-breakpoint
UPDATE portal_rss_items pri
SET category_slug = 'global'
FROM global_map_news_feeds gmf
WHERE pri.feed_id = ('gmn-' || gmf.id::text)
  AND (gmf.region_key IS NULL OR btrim(gmf.region_key) = '')
  AND lower(trim(pri.category_slug)) = 'dunya';
--> statement-breakpoint
UPDATE news n
SET category_id = gc.id
FROM categories gc,
     categories dc,
     portal_rss_items pri
WHERE gc.slug = 'global'
  AND dc.slug = 'dunya'
  AND n.category_id = dc.id
  AND n.rss_source_url IS NOT NULL
  AND btrim(n.rss_source_url) <> ''
  AND lower(btrim(n.rss_source_url)) = lower(btrim(pri.link))
  AND pri.feed_id LIKE 'gmn-%'
  AND lower(trim(pri.category_slug)) = 'global';
