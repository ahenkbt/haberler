-- 0102: RSS öğelerini birleştirilen kategori alias'larına göre yeniden etiketle
-- + yetim/eski kategori satırlarını temizle. Hepsi savunmacı ve idempotent.

-- 1) portal_rss_items.category_slug: alias'lanan eski slug'ları (kara/hava/deniz vb.)
--    hedef kategori slug'una (savunma-sanayi vb.) taşı → birleştirilen haberler
--    hedef kategoride yüzeye çıkar.
UPDATE portal_rss_items p
SET category_slug = c.slug
FROM category_aliases a
JOIN categories c ON c.id = a.to_category_id
WHERE lower(p.category_slug) = lower(a.from_slug)
  AND lower(p.category_slug) <> lower(c.slug);

-- 2) Yetim kategori satırlarını temizle: var olmayan siteye bağlı VE hiç haberi
--    olmayan kategoriler (editör panelinde fantom kategori olarak görünürler).
DELETE FROM categories cat
WHERE cat.exclusive_site_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM hm_news_sites s WHERE s.id = cat.exclusive_site_id)
  AND NOT EXISTS (SELECT 1 FROM news n WHERE n.category_id = cat.id);
