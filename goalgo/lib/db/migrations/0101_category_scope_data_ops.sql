-- Kategori model veri işlemleri (kesinleşmiş model).
-- Hepsi savunmacı ve idempotent: eşleşme yoksa no-op.

-- 1) ankarasehirgazetesi.com "Ankara" kategorisini GENEL (shared) yap.
DO $$
DECLARE
  v_site_id integer;
  v_cat_id integer;
  v_global_exists integer;
BEGIN
  SELECT id INTO v_site_id FROM hm_news_sites
    WHERE lower(coalesce(domain, '')) LIKE '%ankarasehirgazetesi%'
       OR lower(coalesce(slug, '')) LIKE '%ankarasehirgazetesi%'
    LIMIT 1;
  IF v_site_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_cat_id FROM categories
    WHERE exclusive_site_id = v_site_id
      AND (lower(slug) = 'ankara' OR lower(slug) LIKE '%ankara%' OR lower(name) = 'ankara')
    ORDER BY (lower(slug) = 'ankara') DESC, id ASC
    LIMIT 1;
  IF v_cat_id IS NULL THEN RETURN; END IF;

  -- Başka bir GENEL 'ankara' zaten varsa çakışmayı önle (o zaman promote etme).
  SELECT count(*) INTO v_global_exists FROM categories
    WHERE exclusive_site_id IS NULL AND lower(slug) = 'ankara' AND id <> v_cat_id;
  IF v_global_exists > 0 THEN RETURN; END IF;

  UPDATE categories SET exclusive_site_id = NULL WHERE id = v_cat_id;
END $$;

-- 2) vatankahramanlari.org: kara/hava/deniz -> "Savunma Sanayi" (GENEL) birleştir; sehit-gazi GENEL yap.
DO $$
DECLARE
  v_site_id integer;
  v_target_id integer;
  v_src_ids integer[];
BEGIN
  SELECT id INTO v_site_id FROM hm_news_sites
    WHERE lower(coalesce(domain, '')) LIKE '%vatankahramanlari%'
       OR lower(coalesce(slug, '')) LIKE '%vatankahramanlari%'
    LIMIT 1;
  IF v_site_id IS NULL THEN RETURN; END IF;

  -- Hedef GENEL kategori: mevcut 'savunma-sanayi' varsa kullan, yoksa oluştur.
  SELECT id INTO v_target_id FROM categories
    WHERE lower(slug) = 'savunma-sanayi' AND exclusive_site_id IS NULL
    LIMIT 1;
  IF v_target_id IS NULL THEN
    INSERT INTO categories (name, slug, color, exclusive_site_id, sort_order)
    VALUES ('Savunma Sanayi', 'savunma-sanayi', '#1f6f43', NULL, 0)
    RETURNING id INTO v_target_id;
  END IF;

  -- Birleştirilecek kaynak kategoriler (bu siteye özel kara/hava/deniz).
  SELECT array_agg(id) INTO v_src_ids FROM categories
    WHERE exclusive_site_id = v_site_id
      AND (
        lower(slug) IN ('kara', 'hava', 'deniz', 'kara-kuvvetleri', 'hava-kuvvetleri', 'deniz-kuvvetleri')
        OR lower(name) IN ('kara', 'hava', 'deniz')
      );

  IF v_src_ids IS NOT NULL AND array_length(v_src_ids, 1) > 0 THEN
    -- Haberleri hedefe taşı.
    UPDATE news SET category_id = v_target_id WHERE category_id = ANY(v_src_ids);

    -- Eski slug'ları hedefe alias'la (linkler kırılmasın).
    INSERT INTO category_aliases (from_slug, to_category_id, site_id)
    SELECT lower(slug), v_target_id, v_site_id FROM categories WHERE id = ANY(v_src_ids)
    ON CONFLICT (from_slug) DO NOTHING;

    -- Kaynak kategorileri sil.
    DELETE FROM categories WHERE id = ANY(v_src_ids);
  END IF;

  -- sehit-gazi kategorisini GENEL yap.
  UPDATE categories SET exclusive_site_id = NULL
    WHERE exclusive_site_id = v_site_id
      AND (lower(slug) IN ('sehit-gazi', 'sehit-ve-gazi', 'sehitler-gaziler') OR lower(name) LIKE '%şehit%')
      AND NOT EXISTS (
        SELECT 1 FROM categories c2
        WHERE c2.exclusive_site_id IS NULL AND lower(c2.slug) = lower(categories.slug) AND c2.id <> categories.id
      );
END $$;
