-- Başka HM sitelerinden otomatik sızan köşe yazarları / dağıtım kopyalarını temizle.
-- Idempotent: eşleşme yoksa no-op.
-- Kural: Yazar yalnızca panelden (veya admin atamasıyla) eklenir; sayfa yüklemesi kopyalamaz.

-- A) Tüm siteler: başka siteye ait yazar id'sine bağlı makaleleri sil.
DELETE FROM hm_makaleler m
USING authors a
WHERE m.author_id = a.id
  AND a.hm_site_id IS NOT NULL
  AND a.hm_site_id <> m.site_id;

-- B) Tüm siteler: otomatik dağıtım kopyaları (external_key makale:/dist:/news:).
--    Panel «havuzdan ekle» external_key bırakmaz — o kayıtlar korunur.
DELETE FROM hm_makaleler
WHERE coalesce(external_key, '') ~ '^(makale:|dist:|news:)';

-- C) Tüm siteler: yabancı yazar bağını haberlerden kopar.
UPDATE news n
SET author_id = NULL
FROM authors a
WHERE n.site_id IS NOT NULL
  AND n.author_id = a.id
  AND a.hm_site_id IS NOT NULL
  AND a.hm_site_id <> n.site_id;

-- D) Ankara siteleri: vatanhaber ile aynı adlı lokal kopyaları tamamen kaldır.
DO $$
DECLARE
  v_target_ids integer[];
  v_vatan_ids integer[];
BEGIN
  SELECT array_agg(id) INTO v_target_ids
  FROM hm_news_sites
  WHERE lower(coalesce(domain, '')) LIKE '%ankarahabergundemi%'
     OR lower(coalesce(slug, '')) LIKE '%ankarahabergundemi%'
     OR lower(coalesce(domain, '')) LIKE '%ankarasehirgazetesi%'
     OR lower(coalesce(slug, '')) LIKE '%ankarasehirgazetesi%';

  IF v_target_ids IS NULL OR array_length(v_target_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(id) INTO v_vatan_ids
  FROM hm_news_sites
  WHERE lower(coalesce(domain, '')) LIKE '%vatanhaber%'
     OR lower(coalesce(slug, '')) LIKE '%vatanhaber%';

  IF v_vatan_ids IS NULL OR array_length(v_vatan_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  UPDATE news n
  SET author_id = NULL
  FROM authors a
  WHERE n.site_id = ANY(v_target_ids)
    AND n.author_id = a.id
    AND a.hm_site_id = ANY(v_target_ids)
    AND EXISTS (
      SELECT 1 FROM authors v
      WHERE v.hm_site_id = ANY(v_vatan_ids)
        AND lower(regexp_replace(btrim(v.name), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(a.name), '\s+', ' ', 'g'))
    );

  DELETE FROM hm_makaleler m
  USING authors a
  WHERE m.site_id = ANY(v_target_ids)
    AND m.author_id = a.id
    AND a.hm_site_id = ANY(v_target_ids)
    AND EXISTS (
      SELECT 1 FROM authors v
      WHERE v.hm_site_id = ANY(v_vatan_ids)
        AND lower(regexp_replace(btrim(v.name), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(a.name), '\s+', ' ', 'g'))
    );

  DELETE FROM authors a
  WHERE a.hm_site_id = ANY(v_target_ids)
    AND EXISTS (
      SELECT 1 FROM authors v
      WHERE v.hm_site_id = ANY(v_vatan_ids)
        AND lower(regexp_replace(btrim(v.name), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(a.name), '\s+', ' ', 'g'))
    );
END $$;

-- E) Makalesi/haberi kalmayan, başka sitedeki yazarla aynı adlı otomatik kopyaları sil.
DELETE FROM authors a
WHERE a.hm_site_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM hm_makaleler m
    WHERE m.author_id = a.id AND m.site_id = a.hm_site_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM news n
    WHERE n.author_id = a.id AND n.site_id = a.hm_site_id
  )
  AND EXISTS (
    SELECT 1 FROM authors b
    WHERE b.hm_site_id IS NOT NULL
      AND b.hm_site_id <> a.hm_site_id
      AND lower(regexp_replace(btrim(b.name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(a.name), '\s+', ' ', 'g'))
  );
