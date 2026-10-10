-- Yönelim yalnız açıkça atanan (yeni) sitelerde çalışır. Mevcut siteler yonelim_aktif=false:
-- süzgeç ve kampanya kısıtı yok, davranış PR #533 öncesi ile aynı.
-- Haber satırları, RSS adresleri, yonelim değerleri değişmez.
DO $aktif$
BEGIN
  IF to_regclass('hm_news_sites') IS NULL THEN
    RAISE NOTICE 'hm_news_sites yok; yonelim_aktif atlandı';
    RETURN;
  END IF;
  ALTER TABLE hm_news_sites ADD COLUMN IF NOT EXISTS yonelim_aktif boolean NOT NULL DEFAULT false;
END
$aktif$;
