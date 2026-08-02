-- turk.eco: süper app modülleri kapat; anasayfa işletme/pazar yeri bloklarını devre dışı bırak.
-- Tablo düşürme (turizm, pbx, ödeme vb.) sonraki aşamada — paylaşımlı şema HM özel alanları etkilemesin diye.

UPDATE site_settings
SET
  modules_enabled_json = '{"haberler":true,"yektube":true,"haritalar":true,"ansiklopedi":true,"iletisim":true,"turizm":false,"firmaRehberi":false,"kesfet":false}',
  main_nav_json = '{"v":1,"items":[{"type":"module","key":"haberler"},{"type":"module","key":"yektube"},{"type":"link","id":"newsmap","label":"Newsmap","href":"/newsmap"},{"type":"link","id":"habermerkezi","label":"Haber Merkezi","href":"/habermerkezi"}]}',
  footer_nav_json = '["haberler","yektube","haritalar","iletisim"]',
  home_sections_json = '[{"id":"hero_search","enabled":true},{"id":"featured_news","enabled":true},{"id":"popular_cities","enabled":false},{"id":"featured_businesses","enabled":false},{"id":"recent_businesses","enabled":false},{"id":"services_grid","enabled":false},{"id":"quick_links","enabled":false}]',
  footer_text = 'Türk Ekosistemi; haber, video, Newsmap ve Haber Merkezi ile Türkiye''nin dijital haber vitrinidir.'
WHERE id IS NOT NULL;
