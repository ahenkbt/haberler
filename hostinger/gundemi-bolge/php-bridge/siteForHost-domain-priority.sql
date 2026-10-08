-- HM siteForHost(): primary domain wins over another row's domain2/domain3.
-- Apply in Yenişafak PHP Repository::siteForHost (VPS php-theme-yenisafak /app/src/Repository.php).

SELECT id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json
 FROM hm_news_sites
 WHERE active = true
   AND (
     lower(domain) = :host OR lower(domain) = :bare
     OR lower(coalesce(domain2, '')) = :host OR lower(coalesce(domain2, '')) = :bare
     OR lower(coalesce(domain3, '')) = :host OR lower(coalesce(domain3, '')) = :bare
   )
 ORDER BY
   CASE
     WHEN lower(domain) = :host OR lower(domain) = :bare THEN 0
     WHEN lower(coalesce(domain2, '')) = :host OR lower(coalesce(domain2, '')) = :bare THEN 1
     WHEN lower(coalesce(domain3, '')) = :host OR lower(coalesce(domain3, '')) = :bare THEN 2
     ELSE 3
   END,
   id ASC
 LIMIT 1
