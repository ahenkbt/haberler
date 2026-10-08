-- Yeni PHP tema haber siteleri canlı HM kaydı (sehitgazi.org.tr, yerel.net.tr, turksav.org, dunyasaglik.org, yesilvatan.gen.tr).
-- Ad/açıklama/künye/logo/preset tema DB'sinden (231/232/233/236/237), RSS satırları tema importer feed'leri, modüller ve RSS
-- revizyonları ASG (site 3, haber "esen" teması). ASG editör hesapları kopyalanmaz.
-- Her sitenin (5 yeni + 6 mevcut PHP tema sitesi) bilgi@<alan> editörü vardır: kullanıcı adı = e-posta = şifre.
-- Şifre bcryptjs cost 10 ($2b$); /hm/editor/login bcrypt.compare ile doğrulanır. Aktif hm_site_editors satırı tam editör yetkisidir (ayrı rol sütunu yok).
-- Mevcut editör satırlarına dokunulmaz; bilgi@ varsa yalnızca o satırın hash'i güncellenir ve aktif edilir. Site 7'de sehitgazi.org.tr varsa kaldırılır.
-- İdempotent; hata olursa WARNING verip hiçbir satırı değiştirmez (container açılışını engellemez).
-- Yedek: hm_news_sites_bak_20261004_newsites, hm_site_editors_bak_20261004_newsites.
DO $newsites$
DECLARE
  v_src integer;
  v_base jsonb := '{}'::jsonb;
  v_seq text;
  v_default text;
  v_has_username boolean;
  v_id integer;
  v_slug text;
  v_dom text;
  v_login text;
  v_hash text;
  v_editor_id integer;
  v_site_name text;
  v_set_username boolean;
  r record;
  ed record;
BEGIN
 BEGIN
  -- Backups of every row this block can touch (kept; drop by hand once verified).
  IF to_regclass('public.hm_news_sites_bak_20261004_newsites') IS NULL THEN
    CREATE TABLE hm_news_sites_bak_20261004_newsites AS
      SELECT now() AS backed_up_at, s.* FROM hm_news_sites s
      WHERE s.id IN (3, 7) OR s.slug IN ('asg', 'vkd', 'yerelnet', 'sehitgazi', 'turksav', 'yesilvatan', 'dunyasaglik')
         OR lower(trim(coalesce(s.domain, ''))) IN ('yerel.net.tr', 'sehitgazi.org.tr', 'turksav.org', 'yesilvatan.gen.tr', 'dunyasaglik.org', 'www.yerel.net.tr', 'www.sehitgazi.org.tr', 'www.turksav.org', 'www.yesilvatan.gen.tr', 'www.dunyasaglik.org')
         OR lower(trim(coalesce(s.domain2, ''))) IN ('yerel.net.tr', 'sehitgazi.org.tr', 'turksav.org', 'yesilvatan.gen.tr', 'dunyasaglik.org', 'www.yerel.net.tr', 'www.sehitgazi.org.tr', 'www.turksav.org', 'www.yesilvatan.gen.tr', 'www.dunyasaglik.org')
         OR lower(trim(coalesce(s.domain3, ''))) IN ('yerel.net.tr', 'sehitgazi.org.tr', 'turksav.org', 'yesilvatan.gen.tr', 'dunyasaglik.org', 'www.yerel.net.tr', 'www.sehitgazi.org.tr', 'www.turksav.org', 'www.yesilvatan.gen.tr', 'www.dunyasaglik.org');
  END IF;
  IF to_regclass('public.hm_site_editors_bak_20261004_newsites') IS NULL THEN
    CREATE TABLE hm_site_editors_bak_20261004_newsites AS
      SELECT now() AS backed_up_at, e.* FROM hm_site_editors e
      WHERE e.site_id IN (SELECT id FROM hm_news_sites WHERE id = 3 OR slug = 'asg'
                          OR lower(trim(coalesce(domain, ''))) IN ('yerel.net.tr', 'sehitgazi.org.tr', 'turksav.org', 'yesilvatan.gen.tr', 'dunyasaglik.org', 'www.yerel.net.tr', 'www.sehitgazi.org.tr', 'www.turksav.org', 'www.yesilvatan.gen.tr', 'www.dunyasaglik.org', 'turkatahaber.com', 'ankarasehirgazetesi.com', 'ankarahabergundemi.com', 'kirsehirhaber.org', 'vatanhaber.net', 'suhaber.net', 'www.turkatahaber.com', 'www.ankarasehirgazetesi.com', 'www.ankarahabergundemi.com', 'www.kirsehirhaber.org', 'www.vatanhaber.net', 'www.suhaber.net')
                          OR lower(trim(coalesce(domain2, ''))) IN ('yerel.net.tr', 'sehitgazi.org.tr', 'turksav.org', 'yesilvatan.gen.tr', 'dunyasaglik.org', 'www.yerel.net.tr', 'www.sehitgazi.org.tr', 'www.turksav.org', 'www.yesilvatan.gen.tr', 'www.dunyasaglik.org', 'turkatahaber.com', 'ankarasehirgazetesi.com', 'ankarahabergundemi.com', 'kirsehirhaber.org', 'vatanhaber.net', 'suhaber.net', 'www.turkatahaber.com', 'www.ankarasehirgazetesi.com', 'www.ankarahabergundemi.com', 'www.kirsehirhaber.org', 'www.vatanhaber.net', 'www.suhaber.net')
                          OR lower(trim(coalesce(domain3, ''))) IN ('yerel.net.tr', 'sehitgazi.org.tr', 'turksav.org', 'yesilvatan.gen.tr', 'dunyasaglik.org', 'www.yerel.net.tr', 'www.sehitgazi.org.tr', 'www.turksav.org', 'www.yesilvatan.gen.tr', 'www.dunyasaglik.org', 'turkatahaber.com', 'ankarasehirgazetesi.com', 'ankarahabergundemi.com', 'kirsehirhaber.org', 'vatanhaber.net', 'suhaber.net', 'www.turkatahaber.com', 'www.ankarasehirgazetesi.com', 'www.ankarahabergundemi.com', 'www.kirsehirhaber.org', 'www.vatanhaber.net', 'www.suhaber.net'));
  END IF;

  -- Site 7 (VKD): drop sehitgazi.org.tr if it is listed as one of its domains (no-op otherwise).
  UPDATE hm_news_sites SET domain = NULL, updated_at = now()
    WHERE id = 7 AND lower(trim(coalesce(domain, ''))) IN ('sehitgazi.org.tr', 'www.sehitgazi.org.tr');
  UPDATE hm_news_sites SET domain2 = NULL, updated_at = now()
    WHERE id = 7 AND lower(trim(coalesce(domain2, ''))) IN ('sehitgazi.org.tr', 'www.sehitgazi.org.tr');
  UPDATE hm_news_sites SET domain3 = NULL, updated_at = now()
    WHERE id = 7 AND lower(trim(coalesce(domain3, ''))) IN ('sehitgazi.org.tr', 'www.sehitgazi.org.tr');

  -- Template = Ankara Şehir Gazetesi (news, esen): same modules/RSS revs; its own branding, ads, pages and category picks removed.
  SELECT id INTO v_src FROM hm_news_sites WHERE slug = 'asg' AND active ORDER BY (id = 3) DESC, updated_at DESC LIMIT 1;
  BEGIN
    SELECT coalesce(layout_json::jsonb, '{}'::jsonb) INTO v_base FROM hm_news_sites
      WHERE id = v_src AND slug = 'asg' ORDER BY updated_at DESC LIMIT 1;
  EXCEPTION WHEN others THEN
    v_base := '{}'::jsonb;
  END;
  v_base := coalesce(v_base, '{}'::jsonb) - ARRAY['logoUrl', 'faviconUrl', 'hmFooterAboutHtml', 'hmAdSlots', 'hmAsgHomeModulesRev', 'hmHiddenPoolNewsIds', 'hmCorporateMenuItems', 'hmCorporateDonation', 'hmExtraPages', 'hmNewsFooterMenuItems', 'hmNewsBreakingRssLabels', 'hmCategorySortSlugs', 'hmClassicAraMansetCategorySlugs', 'hmNewsFeaturedCategoryStripSlugs', 'hmNewsHomeModuleCategorySlugs', 'hmYekpareKategorilerKutusuSlugs', 'hmActivatedCategorySlugs', 'hmNavHiddenCategorySlugs', 'hmNewsHomeModuleGalleryVideoTvRefs', 'corporateSliderItems', 'mansetCategorySlug', 'hmCorporatePageHtml', 'hmFooterSocial', 'hmFooterWhatsappIhbar', 'hmHeaderRightBannerUrl', 'hmHeaderRightSlot', 'hmSecondaryColor', 'hmColorPalette', 'hmCategoryColors', 'hmNewsOfferCategories', 'hmNewsSiteRssFeedRows', 'hmRssSourcePacks', 'hmNewsRssSources', 'hmNewsYsMansetLayout', 'hmNewsYsMansetVariant', 'hmNewsExtraCategories', 'hmNavOnlyCategorySlugs', 'hmNewsHomeModuleItemCounts', 'hmNewsWhiteLabel', 'tepe_position', 'hmPrimaryColor']::text[];

  SELECT column_default INTO v_default FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hm_news_sites' AND column_name = 'id';
  v_seq := pg_get_serial_sequence('public.hm_news_sites', 'id');
  IF v_seq IS NULL AND v_default LIKE 'nextval(%' THEN
    v_seq := substring(v_default from $re$nextval\('([^']+)'$re$);
  END IF;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'hm_site_editors' AND column_name = 'username') INTO v_has_username;

  FOR r IN SELECT * FROM (VALUES
      ($q$yerelnet$q$, $q$yerel.net.tr$q$, $q$Yerel Haber$q$, $q$Türkiye'nin yerel haber ağı: il, ilçe ve yerel yönetim haberleri$q$, $q${"phone": "0532 229 18 92", "email": "bilgi@yerel.net.tr", "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"}$q$, $q${"hmPrimaryColor": "#0b6e4f", "tepe_position": "above_manset", "hmNewsYsMansetLayout": "mynet", "hmNewsYsMansetVariant": "ayna", "hmNewsExtraCategories": [["yerel-yonetimler", "Yerel Yönetimler"]], "hmNavOnlyCategorySlugs": ["yerel", "yerel-yonetimler", "ankara", "gundem", "ekonomi", "egitim", "saglik", "yasam"], "hmNewsHomeModuleItemCounts": {"ysAuthors": 13}, "hmNewsWhiteLabel": true, "hmVitrinTheme": "esen", "showPlatformNav": false, "hmFooterAboutHtml": "Türkiye&#x27;nin yerel haber ağı: il, ilçe ve yerel yönetim haberleri", "hmCorporatePageHtml": {"kunye": "<div class=\"hm-kunye\"><table class=\"hm-kunye-table\"><tbody><tr><th>İmtiyaz Sahibi</th><td>Türkoğlu Teknoloji</td></tr><tr><th>Genel Müdür</th><td>Mustafa Özdemir</td></tr><tr><th>Genel Yayın Yönetmeni</th><td>Nail Türkoğlu</td></tr><tr><th>Yazı İşleri Müdürü</th><td>Melek Acar</td></tr><tr><th>Adres</th><td>Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara</td></tr><tr><th>Telefon</th><td>0532 229 18 92</td></tr><tr><th>E-posta</th><td>bilgi@yerel.net.tr</td></tr></tbody></table></div>"}, "hmNewsSiteRssFeedRows": [{"id": "yerel-yonetimler-1", "url": "https://cumha.com.tr/rss/category/yerel-yonetimler", "label": "Cumha – Yerel Yönetimler", "categoryKey": "yerel-yonetimler"}, {"id": "yerel-1", "url": "https://cumha.com.tr/rss/category/buyuksehir-ve-iller", "label": "Cumha – Büyükşehir ve İller", "categoryKey": "yerel"}, {"id": "yerel-2", "url": "https://cumha.com.tr/rss/category/ilceler", "label": "Cumha – İlçeler", "categoryKey": "yerel"}, {"id": "yerel-3", "url": "https://rss.haberler.com/RssNew.aspx?kategori=yerel", "label": "Haberler.com – Yerel", "categoryKey": "yerel"}, {"id": "yerel-4", "url": "https://www.birgun.net/rss/kategori/yerel-38", "label": "BirGün – Yerel", "categoryKey": "yerel"}, {"id": "yerel-5", "url": "https://sehirhaberajansi.com.tr/rss.php?kategori=yerel", "label": "Şehir Haber Ajansı – Yerel", "categoryKey": "yerel"}, {"id": "ankara-1", "url": "https://www.bizimankara.com.tr/rss/ankara", "label": "Bizim Ankara", "categoryKey": "ankara"}, {"id": "ankara-2", "url": "https://www.ticarihayat.com/rss/ankara", "label": "Ticari Hayat – Ankara", "categoryKey": "ankara"}, {"id": "ankara-3", "url": "https://www.baskentgazete.com.tr/rss/gundem", "label": "Başkent Gazete – Gündem", "categoryKey": "ankara"}, {"id": "yerel-6", "url": "https://www.kirsehirhaber40.com/rss/gundem", "label": "Kırşehir Haber 40", "categoryKey": "yerel"}, {"id": "yerel-7", "url": "https://www.ozgunkocaeli.com.tr/rss/gundem", "label": "Özgün Kocaeli", "categoryKey": "yerel"}, {"id": "yerel-8", "url": "https://www.egedesonsoz.com/rss/yerel-yonetimler", "label": "Ege'de Son Söz – Yerel Yönetimler", "categoryKey": "yerel"}, {"id": "yerel-yonetimler-2", "url": "https://www.haberekspres.com.tr/rss/belediyeler", "label": "Haber Ekspres – Belediyeler", "categoryKey": "yerel-yonetimler"}, {"id": "yerel-9", "url": "https://www.konyayenigun.com/rss/konya", "label": "Konya Yenigün", "categoryKey": "yerel"}, {"id": "yerel-10", "url": "https://www.hatayalem.com/rss/hatay-haberleri", "label": "Hatay Alem", "categoryKey": "yerel"}, {"id": "yerel-11", "url": "https://www.samsunhaber.com/rss/samsun-haber", "label": "Samsun Haber", "categoryKey": "yerel"}, {"id": "yerel-12", "url": "https://www.afyonhaber.com/rss/afyon-haber", "label": "Afyon Haber", "categoryKey": "yerel"}, {"id": "yerel-13", "url": "https://www.eskisehirhaber26.com/rss", "label": "Eskişehir Haber 26", "categoryKey": "yerel"}, {"id": "yerel-14", "url": "https://www.nehaber24.com/rss/erzincan", "label": "Ne Haber 24 – Erzincan", "categoryKey": "yerel"}, {"id": "yerel-15", "url": "https://www.yozgatmedya.com.tr/rss/yozgat", "label": "Yozgat Medya", "categoryKey": "yerel"}, {"id": "yerel-16", "url": "https://www.haber46.com.tr/rss/guncel", "label": "Haber46 (Kahramanmaraş)", "categoryKey": "yerel"}, {"id": "yerel-17", "url": "https://www.ilerigazetesi.com.tr/rss/gundem", "label": "İleri Gazetesi", "categoryKey": "yerel"}, {"id": "yerel-18", "url": "https://www.sonsoz.com.tr/rss", "label": "Sonsöz", "categoryKey": "yerel"}, {"id": "yerel-19", "url": "https://www.pervasiz.com.tr/rss", "label": "Pervasız", "categoryKey": "yerel"}, {"id": "yerel-20", "url": "https://www.sonhaber.eu/rss", "label": "Son Haber EU", "categoryKey": "yerel"}, {"id": "yerel-21", "url": "https://www.wanhaber.com/rss/guncel", "label": "Wan Haber (Van)", "categoryKey": "yerel"}], "hybridRssEnabled": true, "hmRssIntegrationMode": "live", "hmRssSourcePacks": {"ntv": false, "dirilis": false, "birgun": false, "yerel": false, "karmaCek": false}, "hmRssKarmaDefaultsRev": "rss-karma-default-v1", "hmSiteRssDefaultsRev": "20260727site1"}$q$),
      ($q$sehitgazi$q$, $q$sehitgazi.org.tr$q$, $q$Şehit Gazi$q$, $q$Şehitlerimiz, gazilerimiz ve Türk Silahlı Kuvvetleri haberleri$q$, $q${"phone": "0532 229 18 92", "email": "bilgi@sehitgazi.org.tr", "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"}$q$, $q${"hmPrimaryColor": "#a50e1e", "tepe_position": "above_manset", "hmNewsYsMansetLayout": "sabah", "hmNewsYsMansetVariant": "ayna", "hmNewsExtraCategories": [["tsk", "TSK"], ["sehit-gazi", "Şehit & Gazi"]], "hmNavOnlyCategorySlugs": ["sehit-gazi", "tsk", "gundem", "savunma-sanayi"], "hmNewsHomeModuleItemCounts": {"ysAuthors": 13}, "hmVitrinTheme": "esen", "showPlatformNav": false, "hmFooterAboutHtml": "Şehitlerimiz, gazilerimiz ve Türk Silahlı Kuvvetleri haberleri", "hmCorporatePageHtml": {"kunye": "<div class=\"hm-kunye\"><table class=\"hm-kunye-table\"><tbody><tr><th>İmtiyaz Sahibi</th><td>Vatan Kahramanları Savunma Hizmetleri Ltd. Şti.</td></tr><tr><th>Genel Müdür</th><td>Mustafa Özdemir</td></tr><tr><th>Genel Yayın Yönetmeni</th><td>Nail Türkoğlu</td></tr><tr><th>Yazı İşleri Müdürü</th><td>Melek Acar</td></tr><tr><th>Adres</th><td>Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara</td></tr><tr><th>Telefon</th><td>0532 229 18 92</td></tr><tr><th>E-posta</th><td>bilgi@sehitgazi.org.tr</td></tr></tbody></table></div>"}, "hmNewsSiteRssFeedRows": [{"id": "sehit-gazi-1", "url": "https://rss.haberler.com/RssNew.aspx?kategori=%C5%9Fehit", "label": "Haberler.com – Şehit", "categoryKey": "sehit-gazi"}, {"id": "sehit-gazi-2", "url": "https://rss.haberler.com/RssNew.aspx?kategori=gazi", "label": "Haberler.com – Gazi", "categoryKey": "sehit-gazi"}, {"id": "sehit-gazi-3", "url": "https://rss.haberler.com/RssNew.aspx?kategori=15%20Temmuz", "label": "Haberler.com – 15 Temmuz", "categoryKey": "sehit-gazi"}, {"id": "tsk-1", "url": "https://rss.haberler.com/RssNew.aspx?kategori=asker", "label": "Haberler.com – Asker", "categoryKey": "tsk"}, {"id": "tsk-2", "url": "https://rss.haberler.com/RssNew.aspx?kategori=tsk", "label": "Haberler.com – TSK", "categoryKey": "tsk"}, {"id": "tsk-3", "url": "https://rss.haberler.com/RssNew.aspx?kategori=MSB", "label": "Haberler.com – MSB", "categoryKey": "tsk"}, {"id": "tsk-4", "url": "https://rss.haberler.com/RssNew.aspx?kategori=Mehmet%C3%A7ik", "label": "Haberler.com – Mehmetçik", "categoryKey": "tsk"}, {"id": "tsk-5", "url": "https://rss.haberler.com/RssNew.aspx?kategori=jandarma", "label": "Haberler.com – Jandarma", "categoryKey": "tsk"}, {"id": "tsk-6", "url": "https://rss.haberler.com/RssNew.aspx?kategori=ter%C3%B6r", "label": "Haberler.com – Terör", "categoryKey": "tsk"}, {"id": "gundem-1", "url": "https://www.trthaber.com/gundem_articles.rss", "label": "TRT Haber – Gündem", "categoryKey": "gundem"}, {"id": "gundem-2", "url": "https://www.trthaber.com/turkiye_articles.rss", "label": "TRT Haber – Türkiye", "categoryKey": "gundem"}, {"id": "gundem-3", "url": "https://www.trthaber.com/manset_articles.rss", "label": "TRT Haber – Manşet", "categoryKey": "gundem"}, {"id": "gundem-4", "url": "https://www.ntv.com.tr/turkiye.rss", "label": "NTV – Türkiye", "categoryKey": "gundem"}, {"id": "gundem-5", "url": "https://www.hurriyet.com.tr/rss/gundem", "label": "Hürriyet – Gündem", "categoryKey": "gundem"}, {"id": "gundem-6", "url": "https://www.milliyet.com.tr/rss/rssnew/gundemrss.xml", "label": "Milliyet – Gündem", "categoryKey": "gundem"}, {"id": "gundem-7", "url": "https://www.haberturk.com/rss/kategori/gundem.xml", "label": "Habertürk – Gündem", "categoryKey": "gundem"}, {"id": "tsk-7", "url": "https://www.dirilispostasi.com/rss/savunma-sanayi", "label": "Diriliş Postası – Savunma Sanayi", "categoryKey": "tsk"}, {"id": "tsk-8", "url": "https://www.savunmasanayist.com/category/haberler/feed/", "label": "SavunmaSanayiST – Haberler", "categoryKey": "tsk"}, {"id": "gundem-8", "url": "https://www.sabah.com.tr/rss/gundem.xml", "label": "Sabah – Gündem", "categoryKey": "gundem"}, {"id": "gundem-9", "url": "https://www.yenisafak.com/rss?xml=gundem", "label": "Yeni Şafak – Gündem", "categoryKey": "gundem"}], "hybridRssEnabled": true, "hmRssIntegrationMode": "live", "hmRssSourcePacks": {"ntv": false, "dirilis": false, "birgun": false, "yerel": false, "karmaCek": false}, "hmRssKarmaDefaultsRev": "rss-karma-default-v1", "hmSiteRssDefaultsRev": "20260727site1","logoUrl":"/sehitgazi/sehitgazi-logo.png","faviconUrl":"/sehitgazi/sehitgazi-logo.png"}$q$),
      ($q$turksav$q$, $q$turksav.org$q$, $q$TürkSav$q$, $q$Türk savunma sanayii, TSK ve dünya savunma haberleri$q$, $q${"phone": "0532 229 18 92", "email": "bilgi@turksav.org", "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"}$q$, $q${"hmPrimaryColor": "#1f3b63", "tepe_position": "above_manset", "hmNewsYsMansetLayout": "nefes", "hmNewsYsMansetVariant": "ayna", "hmNewsExtraCategories": [["dunya-savunma", "Dünya Savunma"]], "hmNavOnlyCategorySlugs": ["savunma-sanayi", "teknoloji"], "hmNewsHomeModuleItemCounts": {"ysAuthors": 13}, "hmVitrinTheme": "esen", "showPlatformNav": false, "hmFooterAboutHtml": "Türk savunma sanayii, TSK ve dünya savunma haberleri", "hmCorporatePageHtml": {"kunye": "<div class=\"hm-kunye\"><table class=\"hm-kunye-table\"><tbody><tr><th>İmtiyaz Sahibi</th><td>Vatan Kahramanları Savunma Hizmetleri Ltd. Şti.</td></tr><tr><th>Genel Müdür</th><td>Mustafa Özdemir</td></tr><tr><th>Genel Yayın Yönetmeni</th><td>Nail Türkoğlu</td></tr><tr><th>Yazı İşleri Müdürü</th><td>Melek Acar</td></tr><tr><th>Adres</th><td>Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara</td></tr><tr><th>Telefon</th><td>0532 229 18 92</td></tr><tr><th>E-posta</th><td>bilgi@turksav.org</td></tr></tbody></table></div>"}, "hmNewsSiteRssFeedRows": [{"id": "savunma-sanayi-1", "url": "https://www.savunmasanayist.com/category/haberler/feed/", "label": "SavunmaSanayiST – Haberler", "categoryKey": "savunma-sanayi"}, {"id": "savunma-sanayi-2", "url": "https://www.dirilispostasi.com/rss/savunma-sanayi", "label": "Diriliş Postası – Savunma Sanayi", "categoryKey": "savunma-sanayi"}, {"id": "savunma-sanayi-3", "url": "https://rss.haberler.com/RssNew.aspx?kategori=savunma", "label": "Haberler.com – Savunma", "categoryKey": "savunma-sanayi"}, {"id": "savunma-sanayi-4", "url": "https://rss.haberler.com/RssNew.aspx?kategori=roketsan", "label": "Haberler.com – ROKETSAN", "categoryKey": "savunma-sanayi"}, {"id": "savunma-sanayi-5", "url": "https://www.sabah.com.tr/rss/savunma-sanayi.xml", "label": "Sabah – Savunma Sanayi", "categoryKey": "savunma-sanayi"}, {"id": "teknoloji-1", "url": "https://www.trthaber.com/bilim_teknoloji_articles.rss", "label": "TRT Haber – Bilim Teknoloji", "categoryKey": "teknoloji"}], "hybridRssEnabled": true, "hmRssIntegrationMode": "live", "hmRssSourcePacks": {"ntv": false, "dirilis": false, "birgun": false, "yerel": false, "karmaCek": false}, "hmRssKarmaDefaultsRev": "rss-karma-default-v1", "hmSiteRssDefaultsRev": "20260727site1"}$q$),
      ($q$yesilvatan$q$, $q$yesilvatan.gen.tr$q$, $q$Yeşil Vatan$q$, $q$Çevre, orman, iklim ve ağaçlandırma haberleri — Yeşil Vatan Türkiye Ağaçlandırma Merkezi$q$, $q${"phone": "0532 229 18 92", "email": "bilgi@yesilvatan.gen.tr", "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"}$q$, $q${"hmPrimaryColor": "#2e7d32", "tepe_position": "above_manset", "hmNewsYsMansetLayout": "takvim", "hmNewsYsMansetVariant": "ayna", "hmNewsExtraCategories": [["cevre", "Çevre"], ["iklim", "İklim"], ["ormancilik", "Orman"], ["doga", "Doğa"], ["tarim", "Tarım"]], "hmNavOnlyCategorySlugs": ["cevre", "ormancilik", "iklim", "doga", "ekoloji", "tarim"], "hmNewsHomeModuleItemCounts": {"ysAuthors": 13}, "hmVitrinTheme": "esen", "showPlatformNav": false, "hmFooterAboutHtml": "Çevre, orman, iklim ve ağaçlandırma haberleri — Yeşil Vatan Türkiye Ağaçlandırma Merkezi", "hmCorporatePageHtml": {"kunye": "<div class=\"hm-kunye\"><table class=\"hm-kunye-table\"><tbody><tr><th>İmtiyaz Sahibi</th><td>Yeşil Vatan Türkiye Ağaçlandırma Merkezi</td></tr><tr><th>Genel Müdür</th><td>Mustafa Özdemir</td></tr><tr><th>Genel Yayın Yönetmeni</th><td>Nail Türkoğlu</td></tr><tr><th>Yazı İşleri Müdürü</th><td>Melek Acar</td></tr><tr><th>Adres</th><td>Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara</td></tr><tr><th>Telefon</th><td>0532 229 18 92</td></tr><tr><th>E-posta</th><td>bilgi@yesilvatan.gen.tr</td></tr></tbody></table></div>"}, "hmNewsSiteRssFeedRows": [{"id": "cevre-1", "url": "https://www.birgun.net/rss/kategori/cevre-15", "label": "BirGün – Çevre", "categoryKey": "cevre"}, {"id": "ekoloji-1", "url": "https://www.ekogazete.com/category/ekoloji/feed/", "label": "Eko Gazete – Ekoloji", "categoryKey": "ekoloji"}, {"id": "ekoloji-2", "url": "https://yesildirenis.com/feed/", "label": "Yeşil Direniş", "categoryKey": "ekoloji"}, {"id": "iklim-1", "url": "https://www.iklimhaber.org/feed/", "label": "İklim Haber", "categoryKey": "iklim"}, {"id": "cevre-2", "url": "https://rss.haberler.com/RssNew.aspx?kategori=%C3%A7evre", "label": "Haberler.com – Çevre", "categoryKey": "cevre"}, {"id": "doga-1", "url": "https://rss.haberler.com/RssNew.aspx?kategori=do%C4%9Fa", "label": "Haberler.com – Doğa", "categoryKey": "doga"}, {"id": "iklim-2", "url": "https://rss.haberler.com/RssNew.aspx?kategori=iklim%20de%C4%9Fi%C5%9Fikli%C4%9Fi", "label": "Haberler.com – İklim Değişikliği", "categoryKey": "iklim"}, {"id": "ormancilik-1", "url": "https://rss.haberler.com/RssNew.aspx?kategori=orman%20yang%C4%B1n%C4%B1", "label": "Haberler.com – Orman Yangını", "categoryKey": "ormancilik"}, {"id": "ormancilik-2", "url": "https://rss.haberler.com/RssNew.aspx?kategori=Orman%20Genel%20M%C3%BCd%C3%BCrl%C3%BC%C4%9F%C3%BC", "label": "Haberler.com – Orman Genel Müdürlüğü", "categoryKey": "ormancilik"}, {"id": "tarim-1", "url": "https://rss.haberler.com/RssNew.aspx?kategori=tar%C4%B1m", "label": "Haberler.com – Tarım", "categoryKey": "tarim"}, {"id": "ormancilik-3", "url": "https://rss.haberler.com/RssNew.aspx?kategori=yang%C4%B1n", "label": "Haberler.com – Yangın", "categoryKey": "ormancilik"}], "hybridRssEnabled": true, "hmRssIntegrationMode": "live", "hmRssSourcePacks": {"ntv": false, "dirilis": false, "birgun": false, "yerel": false, "karmaCek": false}, "hmRssKarmaDefaultsRev": "rss-karma-default-v1", "hmSiteRssDefaultsRev": "20260727site1"}$q$),
      ($q$dunyasaglik$q$, $q$dunyasaglik.org$q$, $q$Dünya Sağlık$q$, $q$Sağlık haberleri, hastalıklar, tedavi ve sağlık politikaları$q$, $q${"phone": "0532 229 18 92", "email": "bilgi@dunyasaglik.org", "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"}$q$, $q${"hmPrimaryColor": "#0a7ea4", "tepe_position": "above_manset", "hmNewsYsMansetLayout": "odatv", "hmNewsYsMansetVariant": "ayna", "hmNewsExtraCategories": [["saglik-gundem", "Sağlık Gündemi"], ["hastaliklar", "Hastalıklar"]], "hmNavOnlyCategorySlugs": ["saglik", "saglik-gundem", "hastaliklar", "yasam"], "hmNewsHomeModuleItemCounts": {"ysAuthors": 13}, "hmVitrinTheme": "esen", "showPlatformNav": false, "hmFooterAboutHtml": "Sağlık haberleri, hastalıklar, tedavi ve sağlık politikaları", "hmCorporatePageHtml": {"kunye": "<div class=\"hm-kunye\"><table class=\"hm-kunye-table\"><tbody><tr><th>İmtiyaz Sahibi</th><td>Dünya Sağlık Vakfı</td></tr><tr><th>Genel Müdür</th><td>Mustafa Özdemir</td></tr><tr><th>Genel Yayın Yönetmeni</th><td>Nail Türkoğlu</td></tr><tr><th>Yazı İşleri Müdürü</th><td>Melek Acar</td></tr><tr><th>Adres</th><td>Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara</td></tr><tr><th>Telefon</th><td>0532 229 18 92</td></tr><tr><th>E-posta</th><td>bilgi@dunyasaglik.org</td></tr></tbody></table></div>"}, "hmNewsSiteRssFeedRows": [{"id": "saglik-1", "url": "https://www.ntv.com.tr/saglik.rss", "label": "NTV – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-2", "url": "https://www.dirilispostasi.com/rss/saglik", "label": "Diriliş Postası – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-3", "url": "https://www.birgun.net/rss/kategori/saglik-27", "label": "BirGün – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-4", "url": "https://www.trthaber.com/saglik_articles.rss", "label": "TRT Haber – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-5", "url": "https://www.haberturk.com/rss/kategori/saglik.xml", "label": "Habertürk – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-6", "url": "https://www.sozcu.com.tr/feeds-rss-category-saglik", "label": "Sözcü – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-7", "url": "https://www.sabah.com.tr/rss/saglik.xml", "label": "Sabah – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-8", "url": "https://www.yenisafak.com/rss?xml=saglik", "label": "Yeni Şafak – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-9", "url": "https://www.takvim.com.tr/rss/saglik.xml", "label": "Takvim – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-10", "url": "https://www.star.com.tr/rss/saglik.xml", "label": "Star – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-gundem-1", "url": "https://www.medikalakademi.com.tr/feed/", "label": "Medikal Akademi", "categoryKey": "saglik-gundem"}, {"id": "saglik-11", "url": "https://www.saglikaktuel.com/rss", "label": "Sağlık Aktüel", "categoryKey": "saglik"}, {"id": "saglik-12", "url": "https://rss.haberler.com/RssNew.aspx?kategori=sa%C4%9Fl%C4%B1k", "label": "Haberler.com – Sağlık", "categoryKey": "saglik"}, {"id": "saglik-gundem-2", "url": "https://rss.haberler.com/RssNew.aspx?kategori=sa%C4%9Fl%C4%B1k%20bakanl%C4%B1%C4%9F%C4%B1", "label": "Haberler.com – Sağlık Bakanlığı", "categoryKey": "saglik-gundem"}, {"id": "saglik-13", "url": "https://rss.haberler.com/RssNew.aspx?kategori=hastane", "label": "Haberler.com – Hastane", "categoryKey": "saglik"}, {"id": "hastaliklar-1", "url": "https://rss.haberler.com/RssNew.aspx?kategori=kanser", "label": "Haberler.com – Kanser", "categoryKey": "hastaliklar"}], "hybridRssEnabled": true, "hmRssIntegrationMode": "live", "hmRssSourcePacks": {"ntv": false, "dirilis": false, "birgun": false, "yerel": false, "karmaCek": false}, "hmRssKarmaDefaultsRev": "rss-karma-default-v1", "hmSiteRssDefaultsRev": "20260727site1"}$q$)
    ) AS t(slug, domain, display_name, description, contact_json, overlay)
  LOOP
    v_id := NULL;
    v_slug := r.slug;
    v_dom := lower(r.domain);
    -- 1) a row already claiming the domain (any of domain/domain2/domain3, with or without www.)
    SELECT id INTO v_id FROM hm_news_sites
      WHERE lower(trim(coalesce(domain, ''))) IN (v_dom, 'www.' || v_dom)
         OR lower(trim(coalesce(domain2, ''))) IN (v_dom, 'www.' || v_dom)
         OR lower(trim(coalesce(domain3, ''))) IN (v_dom, 'www.' || v_dom)
      ORDER BY active DESC, id LIMIT 1;
    -- 2) a domainless row with our slug
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM hm_news_sites WHERE slug = r.slug AND coalesce(trim(domain), '') = '' ORDER BY id LIMIT 1;
      IF v_id IS NOT NULL THEN
        UPDATE hm_news_sites SET domain = r.domain WHERE id = v_id;
      ELSIF EXISTS (SELECT 1 FROM hm_news_sites WHERE slug = r.slug) THEN
        v_slug := r.slug || '-haber';   -- slug taken by another domain: never hijack it
      END IF;
    END IF;
    IF v_id IS NULL THEN
      IF v_seq IS NOT NULL THEN
        v_id := nextval(v_seq);
        WHILE EXISTS (SELECT 1 FROM hm_news_sites WHERE id = v_id) LOOP
          v_id := nextval(v_seq);       -- live table has no PK: never reuse an id
        END LOOP;
      ELSE
        SELECT coalesce(max(id), 0) + 1 INTO v_id FROM hm_news_sites;
      END IF;
      INSERT INTO hm_news_sites (id, slug, domain, display_name, description, contact_json, layout_json, active, created_at, updated_at)
      VALUES (v_id, v_slug, r.domain, r.display_name, r.description, r.contact_json, (v_base || r.overlay::jsonb)::text, true, now(), now());
      RAISE NOTICE 'newsites: created % id=% slug=%', r.domain, v_id, v_slug;
    ELSE
      UPDATE hm_news_sites
        SET display_name = r.display_name,
            description = r.description,
            contact_json = r.contact_json,
            layout_json = (v_base || coalesce(nullif(trim(layout_json), '')::jsonb, '{}'::jsonb) - ARRAY['hmCorporateMenuItems']::text[] || r.overlay::jsonb)::text,
            active = true,
            updated_at = now()
        WHERE id = v_id;
      RAISE NOTICE 'newsites: updated % id=%', r.domain, v_id;
    END IF;
  END LOOP;

  -- bilgi@<domain> editor for the 5 new sites and the 6 existing PHP theme sites.
  -- Lookup is by domain/domain2/domain3 (apex or www), never by a fixed site id.
  -- Other editor rows are left untouched. If bilgi@ already exists, refresh its hash and mark it active.
  FOR ed IN SELECT * FROM (VALUES
      ('yerel.net.tr', '$2b$10$ocrBRuPewOwUULRCMtdDg.R2tLgI3ec/AKx.MQZ37pjUT7pzlNI3.'),
      ('sehitgazi.org.tr', '$2b$10$SShDX/4MVS1gyrrIgV2DUuxWdDyi5UdMWILVsL2atTOjmWiUUcmZe'),
      ('turksav.org', '$2b$10$iVhVrqq0WYCZA7qbcq4xkO1nd841rBGcdMVnqI/JtjrzZ.QIuJG5i'),
      ('yesilvatan.gen.tr', '$2b$10$pyv8raN657u/pU8SDqjCMub4pgWiLIm1QztjTK7cxgH9qGCKTrxK6'),
      ('dunyasaglik.org', '$2b$10$azQ4T3eyCsGOP8lFiWLqr.mq8JPO6QUVv8CLDKfrUkzTYWU3nP5Tq'),
      ('turkatahaber.com', '$2b$10$t63EmkC51F9aAq5J9wCNp.cJeq8gj6S8wnL66m/GOLZW1.URBcac6'),
      ('ankarasehirgazetesi.com', '$2b$10$jexrll7lr24r7t5KFhTrEej5hZ1Okqa37Q.xXQy9wuWjNRv1Y9Ngy'),
      ('ankarahabergundemi.com', '$2b$10$dKBa8rot7RY1fI3lsSTPh.H4BkmPJjxl.r9ETnxTQpkCE1sOuf3IW'),
      ('kirsehirhaber.org', '$2b$10$p8ELn.jbIs4DNUbzvxjVu.peZdmst1pTcQyyiib1H5SspRXyCp1mS'),
      ('vatanhaber.net', '$2b$10$WcUWqTIg4ua6UuRzcK/7Fes6JQgMLb.F3usmN1LbPLakQdMb9Ahji'),
      ('suhaber.net', '$2b$10$hIg5DcsA3ygjrkhW8SUTfOyqFiAYLy6v5w9XjLaVLciTXICcug2O2')
    ) AS t(domain, password_hash)
  LOOP
    v_dom := lower(ed.domain);
    v_login := 'bilgi@' || v_dom;
    v_hash := ed.password_hash;
    v_id := NULL;
    v_site_name := NULL;
    v_editor_id := NULL;
    SELECT s.id, s.display_name INTO v_id, v_site_name
      FROM hm_news_sites s
      WHERE lower(trim(coalesce(s.domain, ''))) IN (v_dom, 'www.' || v_dom)
         OR lower(trim(coalesce(s.domain2, ''))) IN (v_dom, 'www.' || v_dom)
         OR lower(trim(coalesce(s.domain3, ''))) IN (v_dom, 'www.' || v_dom)
      ORDER BY s.active DESC, s.id
      LIMIT 1;
    IF v_id IS NULL THEN
      RAISE NOTICE 'newsites editor: no hm_news_sites row for %', v_dom;
      CONTINUE;
    END IF;

    SELECT id INTO v_editor_id FROM hm_site_editors
      WHERE site_id = v_id AND lower(trim(email)) = v_login
      ORDER BY id
      LIMIT 1;

    v_set_username := false;
    IF v_has_username THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM hm_site_editors x
        WHERE x.site_id = v_id
          AND lower(trim(coalesce(x.username, ''))) = v_login
          AND (v_editor_id IS NULL OR x.id <> v_editor_id)
      ) INTO v_set_username;
    END IF;

    IF v_editor_id IS NULL THEN
      IF v_has_username AND v_set_username THEN
        INSERT INTO hm_site_editors (site_id, email, username, password_hash, display_name, is_active, created_at, updated_at)
        VALUES (v_id, v_login, v_login, v_hash, v_site_name, true, now(), now());
      ELSIF v_has_username THEN
        INSERT INTO hm_site_editors (site_id, email, password_hash, display_name, is_active, created_at, updated_at)
        VALUES (v_id, v_login, v_hash, v_site_name, true, now(), now());
        RAISE NOTICE 'newsites editor: % username left empty; another editor already has it', v_login;
      ELSE
        INSERT INTO hm_site_editors (site_id, email, password_hash, display_name, is_active, created_at, updated_at)
        VALUES (v_id, v_login, v_hash, v_site_name, true, now(), now());
      END IF;
      RAISE NOTICE 'newsites editor: created % on site %', v_login, v_id;
    ELSE
      IF v_has_username AND v_set_username THEN
        UPDATE hm_site_editors
          SET email = v_login,
              username = v_login,
              password_hash = v_hash,
              is_active = true,
              updated_at = now()
          WHERE id = v_editor_id;
      ELSE
        UPDATE hm_site_editors
          SET email = v_login,
              password_hash = v_hash,
              is_active = true,
              updated_at = now()
          WHERE id = v_editor_id;
        IF v_has_username AND NOT v_set_username THEN
          RAISE NOTICE 'newsites editor: % password refreshed; username kept because another editor owns it', v_login;
        END IF;
      END IF;
      RAISE NOTICE 'newsites editor: updated % on site %', v_login, v_id;
    END IF;
  END LOOP;
 EXCEPTION WHEN others THEN
  -- Never block container start (db-migrate failure = API down): log and leave the rows untouched.
  RAISE WARNING 'newsites migration skipped: %', SQLERRM;
 END;
END
$newsites$;
