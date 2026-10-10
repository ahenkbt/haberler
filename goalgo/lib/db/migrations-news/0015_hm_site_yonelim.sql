-- Site yönelimi (sag | sol | karma) ve RSS kaynak yönelimi.
-- Mevcut siteler karma kalır. Dolu ve geçerli yonelim ezilmez.
-- Diğer sütunlar, haber satırları ve RSS besleme adresleri değişmez.
-- Yedek: yalnız id / slug / yonelim. Tekrar çalıştırma ilk yedeği korur.
-- Geri alma (elle): UPDATE hm_news_sites s SET yonelim = b.yonelim
--   FROM hm_news_sites_bak_20261010_yonelim b WHERE b.id = s.id AND b.yonelim IS NOT NULL;
-- Sütunu kaldırmak mevcut siteleri bozmaz ama bu dosya bunu yapmaz.

DO $yonelim$
DECLARE
  v_has boolean;
BEGIN
  IF to_regclass('hm_news_sites') IS NULL THEN
    RAISE NOTICE 'hm_news_sites yok; yonelim atlandı';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS hm_news_sites_bak_20261010_yonelim (
    backed_up_at timestamptz NOT NULL DEFAULT now(),
    id integer NOT NULL,
    slug text,
    yonelim text
  );

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'hm_news_sites'
      AND column_name = 'yonelim'
  ) INTO v_has;

  IF NOT v_has THEN
    INSERT INTO hm_news_sites_bak_20261010_yonelim (backed_up_at, id, slug, yonelim)
    SELECT now(), s.id, s.slug, NULL
    FROM hm_news_sites s
    WHERE NOT EXISTS (
      SELECT 1 FROM hm_news_sites_bak_20261010_yonelim b WHERE b.id = s.id
    );
    ALTER TABLE hm_news_sites ADD COLUMN IF NOT EXISTS yonelim text;
  ELSE
    EXECUTE $bak$
      INSERT INTO hm_news_sites_bak_20261010_yonelim (backed_up_at, id, slug, yonelim)
      SELECT now(), s.id, s.slug, s.yonelim
      FROM hm_news_sites s
      WHERE NOT EXISTS (
        SELECT 1 FROM hm_news_sites_bak_20261010_yonelim b WHERE b.id = s.id
      )
    $bak$;
  END IF;

  EXECUTE $fill$
    UPDATE hm_news_sites
    SET yonelim = 'karma'
    WHERE yonelim IS NULL
       OR btrim(yonelim) = ''
       OR lower(btrim(yonelim)) NOT IN ('sag', 'sol', 'karma')
  $fill$;

  BEGIN
    ALTER TABLE hm_news_sites ALTER COLUMN yonelim SET DEFAULT 'karma';
  EXCEPTION WHEN others THEN
    RAISE WARNING 'yonelim default atlandı: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE hm_news_sites ALTER COLUMN yonelim SET NOT NULL;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'yonelim NOT NULL atlandı: %', SQLERRM;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hm_news_sites_yonelim_check'
  ) THEN
    BEGIN
      ALTER TABLE hm_news_sites
        ADD CONSTRAINT hm_news_sites_yonelim_check
        CHECK (yonelim IN ('sag', 'sol', 'karma'));
    EXCEPTION WHEN others THEN
      RAISE WARNING 'yonelim check atlandı: %', SQLERRM;
    END;
  END IF;
END
$yonelim$;

--> statement-breakpoint

-- rss_campaigns.kaynak_yonelim: NULL = işaretsiz, mevcut hedef listesi durur.
-- Yalnız tüm beslemeleri muhalif olan kampanyalar sol işaretlenir.
-- feeds, hm_site_ids, active ve diğer sütunlar yazılmaz.

DO $kaynak$
BEGIN
  IF to_regclass('rss_campaigns') IS NULL THEN
    RAISE NOTICE 'rss_campaigns yok; kaynak_yonelim atlandı';
    RETURN;
  END IF;

  ALTER TABLE rss_campaigns ADD COLUMN IF NOT EXISTS kaynak_yonelim text;

  EXECUTE $mark$
    UPDATE rss_campaigns c
    SET kaynak_yonelim = 'sol'
    WHERE c.kaynak_yonelim IS NULL
      AND c.feeds IS NOT NULL
      AND cardinality(c.feeds) > 0
      AND EXISTS (
        SELECT 1
        FROM unnest(c.feeds) AS f(url)
        WHERE btrim(coalesce(url, '')) <> ''
      )
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(c.feeds) AS f(url)
        WHERE btrim(coalesce(url, '')) <> ''
          AND lower(url) !~ '^https?://([^/]*\.)?(birgun\.net|evrensel\.net|diken\.com\.tr|medyascope\.tv|bianet\.org|artigercek\.com(\.tr)?|karar\.com(\.tr)?|sol\.org\.tr|kronos36\.(news|com)|kronoshaber\.(com|tr)|cumhuriyet\.com\.tr)(:\d+)?(/|$)'
      )
  $mark$;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rss_campaigns_kaynak_yonelim_check'
  ) THEN
    BEGIN
      ALTER TABLE rss_campaigns
        ADD CONSTRAINT rss_campaigns_kaynak_yonelim_check
        CHECK (kaynak_yonelim IS NULL OR kaynak_yonelim IN ('sag', 'sol', 'karma'));
    EXCEPTION WHEN others THEN
      RAISE WARNING 'kaynak_yonelim check atlandı: %', SQLERRM;
    END;
  END IF;
END
$kaynak$;
