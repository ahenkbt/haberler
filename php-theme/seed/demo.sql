-- Local demo only. Does not run against production.
-- Schema matches the existing haberler tables; the PHP app never writes.

CREATE TABLE IF NOT EXISTS hm_news_sites (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  domain2 text UNIQUE,
  domain3 text UNIQUE,
  display_name text NOT NULL,
  description text,
  contact_json text,
  layout_json text,
  verification_json text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#CC0000',
  exclusive_site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS authors (
  id serial PRIMARY KEY,
  name text NOT NULL,
  title text,
  avatar_url text,
  bio text,
  hm_site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL,
  hm_sort_order integer,
  email text,
  password_hash text
);

CREATE TABLE IF NOT EXISTS news (
  id serial PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  spot text,
  content text,
  image_url text,
  category_id integer,
  author_id integer,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  is_breaking boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  is_ai_generated boolean NOT NULL DEFAULT false,
  site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL,
  rss_source_url text,
  is_editor_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_site_overrides (
  id serial PRIMARY KEY,
  article_id integer NOT NULL,
  site_id integer NOT NULL,
  title text,
  spot text,
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hm_makaleler (
  id serial PRIMARY KEY,
  site_id integer NOT NULL REFERENCES hm_news_sites (id) ON DELETE CASCADE,
  author_id integer REFERENCES authors (id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  spot text,
  content text,
  image_url text,
  status text NOT NULL DEFAULT 'draft',
  views integer NOT NULL DEFAULT 0,
  external_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE TABLE IF NOT EXISTS portal_rss_items (
  id serial PRIMARY KEY,
  feed_id text NOT NULL,
  site_id integer,
  category_slug text NOT NULL,
  item_key text NOT NULL,
  dedupe_key text NOT NULL,
  title text NOT NULL,
  title_key text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  spot text,
  content_html text,
  image_url text,
  source_name text,
  lang text NOT NULL DEFAULT 'tr',
  published_at timestamptz NOT NULL DEFAULT now(),
  cached_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_rss_items_feed_dedupe_unique
  ON portal_rss_items (feed_id, dedupe_key);

CREATE TABLE IF NOT EXISTS videos (
  id serial PRIMARY KEY,
  source_id integer,
  platform text NOT NULL DEFAULT 'youtube',
  video_id text NOT NULL,
  title text NOT NULL,
  description text,
  thumbnail text,
  channel_name text,
  channel_id text,
  published_at text,
  duration text,
  category_slug text NOT NULL DEFAULT 'haberler',
  is_featured boolean NOT NULL DEFAULT false,
  is_headline boolean NOT NULL DEFAULT false,
  is_story boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO hm_news_sites (slug, domain, display_name, description, contact_json, layout_json)
VALUES (
  'turkatahaber',
  'turkatahaber.com',
  'TÜRKATA HABER AJANSI',
  'TÜRKATA HABER AJANSI (THA), Türk Kültürünü Araştırma ve Tanıtma Vakfı bünyesinde 1998’den bu yana yayın yapan haber ajansıdır.',
  '{"phone":"0532 229 18 92","email":"bilgi@turkatahaber.com","address":"Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"}',
  $layout${
    "hmVitrinTheme":"yenisafak",
    "hmPrimaryColor":"#c8102e",
    "hmNewsBreakingBandEnabled":true,
    "hmNewsSliderEnabled":true,
    "hmNewsLeadListSidebarEnabled":true,
    "hmNewsCategorySectionsEnabled":true,
    "hmNewsRecentVideosSidebarEnabled":true,
    "hmNewsAuthorsEnabled":true,
    "hmNewsAhenkPopulerHaberlerEnabled":true,
    "hmNewsMediaDarkBlockEnabled":true,
    "hmNewsHomeModuleOrder":["breakingBand","hero","leadListSidebar","yekpareKategorilerKutusu","recentVideosSidebar","authorsStrip","ahenkPopulerHaberler","mediaDarkBlock"],
    "hmNewsHomeModuleCategorySlugs":{"breakingBand":"gundem","hero":"gundem","leadListSidebar":"gundem","ahenkPopulerHaberler":"gundem","mediaDarkBlock":"kultur-sanat"},
    "hmNewsHomeModuleItemCounts":{"breakingBand":8,"hero":5,"leadListSidebar":4,"yekpareKategorilerKutusu":3,"recentVideosSidebar":6,"authorsStrip":4,"ahenkPopulerHaberler":5,"mediaDarkBlock":4}
  }$layout$
)
ON CONFLICT (slug) DO UPDATE SET
  domain = EXCLUDED.domain,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  contact_json = EXCLUDED.contact_json,
  layout_json = EXCLUDED.layout_json,
  active = true;

INSERT INTO categories (name, slug, color, sort_order) VALUES
  ('Gündem','gundem','#c8102e',1),
  ('Ekonomi','ekonomi','#c8102e',2),
  ('Dünya','dunya','#c8102e',3),
  ('Politika','politika','#c8102e',4),
  ('Spor','spor','#c8102e',5),
  ('Teknoloji','teknoloji','#c8102e',6),
  ('Kültür-Sanat','kultur-sanat','#c8102e',7),
  ('Sağlık','saglik','#c8102e',8),
  ('Yaşam','yasam','#c8102e',9),
  ('Eğitim','egitim','#c8102e',10),
  ('Yerel','yerel','#c8102e',11),
  ('Ankara','ankara','#c8102e',12)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO portal_rss_items (feed_id, site_id, category_slug, item_key, dedupe_key, title, title_key, link, spot, image_url, source_name, published_at)
SELECT
  'demo-' || v.category_slug,
  s.id,
  v.category_slug,
  v.item_key,
  v.item_key,
  v.title,
  v.item_key,
  'https://example.org/kaynak/' || v.item_key,
  v.spot,
  '/media/ph.svg',
  v.source_name,
  now() - (v.hours || ' hours')::interval
FROM hm_news_sites s
JOIN (VALUES
  ('gundem','g1',1,'Belediye meclisi yeni otobüs saatini görüşmeye aldı','Toplu taşımada sabah seferlerinin öne çekilmesi önerildi.','AA Gündem'),
  ('gundem','g2',2,'Sağlık ocağı hafta sonu nöbet listesini duyurdu','Nöbetçi birimler ilçe bazında yayımlandı.','TRT Haber'),
  ('gundem','g3',3,'Kent meydanında kitap günleri takvimi açıklandı','Üç gün sürecek etkinliğin programı belli oldu.','Diriliş'),
  ('ekonomi','e1',4,'Hal fiyatlarında sebze grubu geriledi','Pazar esnafı arzın arttığını söyledi.','AA Ekonomi'),
  ('ekonomi','e2',5,'Küçük esnaf için yeni destek duyurusu yapıldı','Başvuru penceresi bu ay sonuna kadar açık.','TRT Haber'),
  ('ekonomi','e3',6,'İlçe pazar yerinde tartı denetimi tamamlandı','Eksik tartı kullanan iki tezgah uyarıldı.','NTV'),
  ('dunya','d1',2,'Komşu ülkede sınır kapısı saatleri güncellendi','Yeni çizelge pazartesi yürürlüğe girecek.','AA Dünya'),
  ('dunya','d2',6,'Bölgesel tren seferleri bakım nedeniyle seyreldi','Yolculara alternatif otobüs konuldu.','TRT Haber'),
  ('dunya','d3',8,'Kıyı kentinde fırtına uyarısı yükseltildi','Balıkçılar bir gün limanda kalacak.','Birgün'),
  ('politika','p1',3,'Komisyon, yerel seçim takvimini masaya yatırdı','Taslak metin önümüzdeki hafta görüşülecek.','AA Politika'),
  ('politika','p2',7,'Meclis grubu imar başlığını erteledi','Görüşme salı gününe alındı.','Diriliş'),
  ('politika','p3',9,'İl başkanlığı üyelik başvurularını uzattı','Son tarih cuma akşamı.','Birgün'),
  ('spor','s1',1,'U19 takımı deplasmandan bir puanla döndü','Karşılaşma son dakikada eşitlendi.','AA Spor'),
  ('spor','s2',4,'İl atletizm pisti bakıma alınıyor','Antrenmanlar salon pistine taşındı.','TRT Haber'),
  ('spor','s3',5,'Amatör ligde haftanın programı belli oldu','Üç maç aynı gün oynanacak.','Diriliş'),
  ('teknoloji','t1',2,'Belediye ücretsiz kablosuz ağı iki mahalleye genişletti','Bağlantı noktaları duraklara kuruldu.','Diriliş'),
  ('teknoloji','t2',6,'Okul laboratuvarına yeni robot seti geldi','Öğrenciler ders dışı atölyede deneyecek.','Birgün'),
  ('teknoloji','t3',8,'Açık veri portalına otobüs konumları eklendi','Arayüz belediye sitesinden açılıyor.','NTV'),
  ('kultur-sanat','k1',3,'Kent tiyatrosu yeni sezon perdesini açtı','İlk oyun yerel bir hikâyeden uyarlandı.','Diriliş'),
  ('kultur-sanat','k2',7,'Müze, okul gruplarına sabah turu tanımladı','Kayıtlar müze gişesinden yapılıyor.','Birgün'),
  ('kultur-sanat','k3',10,'Sokak sergisi bu hafta sonu kurulacak','İşler çarşı meydanında duracak.','Diriliş'),
  ('saglik','h1',4,'Aile hekimliği randevu saati ona çekildi','Sabah dilimi genişletildi.','AA Sağlık'),
  ('saglik','h2',9,'Eczaneler nöbet çizelgesini yeniledi','Liste kaymakamlık sitesinde.','TRT Haber'),
  ('saglik','h3',11,'Kan bağışı çadırı cuma günü kurulacak','Randevusuz kabul edilecek.','Diriliş'),
  ('yasam','y1',5,'Parkta çocuk oyun grubu yenilendi','Zemin kauçuk kaplama ile değiştirildi.','AA Yaşam'),
  ('yasam','y2',8,'Semt pazarında atölye günü düzenleniyor','Katılım ücretsiz.','TRT Haber'),
  ('yasam','y3',12,'Bisiklet yolu çizgileri tazelendi','Sürücüler bir gün tek şerit kullanacak.','NTV'),
  ('egitim','ed1',3,'Halk eğitim yeni dönem kayıtlarını açtı','Kurs listesi ilçe müdürlüğünde.','AA Eğitim'),
  ('egitim','ed2',6,'Kütüphane akşam saatlerinde açık kalacak','Hafta içi kapanış ona uzatıldı.','TRT Haber'),
  ('egitim','ed3',9,'Okul servislerinde denetim raporu yayımlandı','Eksikler bir haftada giderilecek.','Birgün'),
  ('yerel','l1',4,'Muhtarlık, mahalle fırını için imza topluyor','Dilekçe cuma günü iletilecek.','Diriliş'),
  ('yerel','l2',7,'Köy yolunda asfalt yaması tamamlandı','Ulaşım akşam saatlerinde normale döndü.','Birgün'),
  ('yerel','l3',13,'Sulama kooperatifi genel kurul gününü duyurdu','Toplantı köy odasında.','Diriliş'),
  ('ankara','a1',2,'Çankaya''da pazar yeri yerleşimi değişti','Tezgâhlar yeni çizgiye alındı.','Ticari Hayat'),
  ('ankara','a2',5,'Başkentte metro istasyonu asansörü bakıma girdi','Yürüyen merdiven açık.','Bizim Ankara'),
  ('ankara','a3',8,'Ankara garında peron anonsu yenilendi','Ses sistemi denendi.','Ticari Hayat')
) AS v(category_slug, item_key, hours, title, spot, source_name) ON true
WHERE s.slug = 'turkatahaber'
ON CONFLICT (feed_id, dedupe_key) DO NOTHING;

INSERT INTO news (title, slug, spot, content, image_url, category_id, status, is_featured, is_breaking, views, site_id, is_editor_manual)
SELECT
  v.title,
  v.slug,
  v.spot,
  v.body,
  '/media/ph.svg',
  c.id,
  'published',
  true,
  v.breaking,
  v.views,
  s.id,
  true
FROM hm_news_sites s
JOIN categories c ON c.slug = 'gundem'
JOIN (VALUES
  ('Ajans bürosu sabah toplantısının notunu yayımladı','editor-toplanti',240,'Editör masası günün izleyeceği başlıkları sabah kısa bir notla paylaştı.','<p>Bu metin ajans editörünün kendi notudur. Beslemeden kopyalanmış bir yazı değildir.</p><p>Günün planı yerel yönetim, kamu ve sivil toplum başlıklarından oluşur.</p>', true),
  ('Okur temsilcisi düzeltme köşesini açtı','editor-duzeltme',180,'Yanlış yazılan bir saat bilgisi aynı gün düzeltildi.','<p>Düzeltme: tören saati 11.00 değil 14.00 olarak güncellenmiştir.</p>', false)
) AS v(title, slug, views, spot, body, breaking) ON true
WHERE s.slug = 'turkatahaber'
  AND NOT EXISTS (SELECT 1 FROM news n WHERE n.slug = v.slug);

INSERT INTO authors (name, title, bio, hm_site_id, hm_sort_order)
SELECT v.name, v.title, v.bio, s.id, v.ord
FROM hm_news_sites s
JOIN (VALUES
  (1,'Ayşe Demir','Kent masası','Mahalle gündemini izler.'),
  (2,'Kemal Uçar','Ekonomi','Esnaf ve pazar notları yazar.'),
  (3,'Selin Aksoy','Kültür','Sahne ve sergi günlüğü tutar.'),
  (4,'Hakan Yıldız','Spor','Amatör ligi takip eder.')
) AS v(ord, name, title, bio) ON true
WHERE s.slug = 'turkatahaber'
  AND NOT EXISTS (
    SELECT 1 FROM authors a WHERE a.hm_site_id = s.id AND a.name = v.name
  );

INSERT INTO hm_makaleler (site_id, author_id, title, slug, spot, content, image_url, status, views)
SELECT s.id, a.id, a.name || ' bugünün notu', 'yazi-' || a.id::text,
       'Köşe yazısı ajans yazarının kendi metnidir.',
       '<p>Kısa bir günlük not. Dış siteden alınmış tam metin değildir.</p>',
       '/media/ph.svg', 'published', 12
FROM hm_news_sites s
JOIN authors a ON a.hm_site_id = s.id
WHERE s.slug = 'turkatahaber'
ON CONFLICT (site_id, slug) DO NOTHING;

INSERT INTO videos (source_id, platform, video_id, title, thumbnail, channel_name, duration, category_slug, active, is_story)
SELECT 41, 'yektube', v.video_id, v.title, '/media/ph.svg', 'YekTube Haber', '04:10', 'haberler', true, false
FROM (VALUES
  ('demo-bulten','Akşam bülteni: kent notları'),
  ('demo-spor','Amatör lig özeti'),
  ('demo-kultur','Sahne arkası kısa tur'),
  ('demo-ankara','Başkentten üç başlık'),
  ('demo-egitim','Atölye günü kaydı'),
  ('demo-saglik','Nöbetçi eczane anlatımı')
) AS v(video_id, title)
WHERE NOT EXISTS (SELECT 1 FROM videos existing WHERE existing.video_id = v.video_id);
