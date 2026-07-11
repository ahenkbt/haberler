# Yekpare — Süper app yol haritası ve MVP (onaylı)

Bu dosya, sohbette onaylanan planın **özet kaydıdır**. İş sırası ve MVP kapsamı buradan yürütülür.  
Referans paketler (`yenidosyalar/1.8.20 - fix-1`, eMart, Foodbank waiter, Karenderia): **iş kuralı / ekran ilhamı**; kod doğrudan merge edilmez — **Goalgo: Node + Postgres + React**.

---

## Prensipler

1. Tek ürün, **modüler domainler** (mevcut haber / video / harita çekirdeği korunur).
2. Sipariş, turizm, alışveriş, ulaşım, ödeme: **ortak kimlik + bildirim + ortam ayarları** ile bağlanır.
3. Her faz: **migration + API + admin + (mümkünse) müşteri yüzü**; canlıda ölçülebilir parça.

---

## Omurga (Faz 0 ile birlikte)

| Parça | Amaç |
|--------|------|
| Hizmet / talep tipi kataloğu | Sipariş, tur rezervasyonu, e-ticaret kalemi, ulaşım talebi tek sözlükte tanımlanabilir olsun. |
| Sipariş / talep soyut modeli | `id`, kullanıcı, satıcı, durum, tutar, ödeme durumu, zaman çizelgesi. |
| Durum makinesi + olay günlüğü | Her dikey kendi geçişleri; ortak API deseni. |
| Bildirim | Durum değişiminde tek servis (mevcut kanallar + DB bildirimi). |
| Ödeme yüzeyi | Intent + webhook + idempotency; cüzdan sonra. |
| Admin özellik bayrakları | Modülleri kademeli açma. |

---

## Fazlar (sıra)

### Faz 0 — Omurga (2–4 hafta, takıma göre)

- Soyut şema / mevcut `transport` & `delivery` ile uyum.
- Sipariş **durum makinesi** pilotu (en az bir dikey).
- Bildirim hattı.
- **Ödeme webhook güvenliği** (imza, tekrar idempotency, audit log).

**Faz 0 — uygulama kabulü (2026-05-07):**

- `yekpare_service_types` + tohum veri; kamu API: `GET /api/settings/service-types`.
- `transport_request_status_events`: talep oluşturma, admin PATCH, sürücü kabul ve durum güncellemelerinde kayıt; `GET .../transport/requests/:id` ve `GET .../transport/track/:code` yanıtında `statusEvents`.
- `POST /api/premium/webhook`: ham JSON gövde (`express.json` öncesi), Stripe imza doğrulama, `stripe_webhook_events` ile idempotency + audit (`delivery` / `shop` ile aynı desen).
- Modül bayrakları: mevcut `site_settings.modules_enabled_json` + `PUT /api/settings` (değişiklik yok; Faz 0 kapsamında tanımlı).

### Faz 1 — Sipariş (dükkan / teslimat)

1. Onaylandı → hazırlanıyor → yolda → teslim (+ iptal dalları).  
2. İptal nedeni + SLA.  
3. Zaman penceresi, minimum sepet, servis ücreti.  
4. Canlı kurye haritası (müşteri takip).  

*İlham: 1.8.20 Order/Track, eMart, Karenderia cron.*

### Faz 2 — Masa / dine-in + garson (opsiyonel dikey)

- Masa/oturum, garson rolü, dine-in akışı.  

*İlham: Foodbank waiter addon.*

### Faz 3 — On-demand (tek çatı)

- Hizmet kataloğu (ulaşım + diğer hizmetler bir çatı).  
- Dinamik fiyat / mesafe / süre.  
- Sağlayıcı onayı + belge alanları.  

**Ulaşım kategorisi (uygulama hizası — 2026-05-02):**

- Müşteri: `/ulasim` — araç paylaşma, taksi, kurye, çekici, nakliyat, kargo, “Siparişlerim”; bağlantılı paneller (`/surucu-paneli`, `/kurye-paneli`, …).  
- Keşfet / harita: `ulasim` süper kategori; premium işletme türleri (`ulasim_taksi_sirketi`, `ulasim_kurye_sirketi`, …) ve bireysel araç paylaşımı `HaritalarYonetimi` + `Home` şeridinde.  
- **Sonraki (Faz 3 tam):** talep → sağlayıcı eşleme, dinamik ücret, belge doğrulama akışı; mevcut `transport` API’leri ile birleşik durum günlüğü.

*İlham: 1.8.20 Service / Driver / DocumentRequest.*

### Faz 4 — Ödeme ve finans

- Cüzdan + ledger.  
- Çekim / hakediş talebi.  
- Çok ödeme yöntemi (Stripe öncelik).  
- İade / chargeback kaydı.  

*İlham: 1.8.20 Wallet/Payout, eMart.*

### Faz 5 — Alışveriş (e-ticaret)

- Varyant + stok.  
- Flash / kampanya.  
- Toplu içe aktarma.  
- Çok satıcı mutabakat (Faz 4 ile).  

*İlham: 1.8.20 Product/FlashSale, eMart.*

### Faz 6 — Turizm

- Müsaitlik takvimi.  
- Kapora / ön ödeme.  
- İptal politikası, paket / voucher.  

*İlham: 1.8.20 booking kavramı, eMart.*

### Faz 7 — Büyüme

- Çok dil / döviz gösterimi.  
- Puan / sadakat.  
- İleri: native/Flutter (1.8.20 Apps referans).

---

## MVP (ilk teslim — onaylı)

**Hedef:** Müşteri sipariş durumunu uçtan uca görür; işletme admin’den yönetir; ödeme olayı güvenle loglanır.

| # | Madde |
|---|--------|
| M1 | Sipariş **durum makinesi** (≥5 anlamlı durum + iptal). |
| M2 | Durum değişiminde **bildirim** (DB + e-posta veya mevcut kanal). |
| M3 | Müşteri **takip / durum** sayfası (`/takip` benzeri genişletme). |
| M4 | **Webhook / ödeme** idempotency + audit log — mağaza Stripe: `stripe_webhook_events`, `POST /api/shop/checkout/stripe-webhook`, `payment_settings.stripe_webhook_secret`. |
| M5 | **Admin sipariş operasyon** ekranı (liste + durum güncelle). |

**MVP sonrası bilerek ertelenenler:** dine-in garson, tam cüzdan, turizm kapora, flash satış, sadakat.

---

## Uygulama günlüğü (kod)

| Tarih | Bölüm | Özet |
|--------|--------|------|
| 2026-05-02 | Teslimat MVP (M1–M3, M5) | `delivery_order_status_events` + admin durum geçiş kuralları + WhatsApp `order_status` + müşteri `SiparisDetay` / `Siparislerim` hizalama + admin toast. |
| 2026-05-02 | M4 (mağaza ödeme) | Stripe webhook: ham gövde + imza, `stripe_webhook_events` ile idempotency + audit; `payment_intent.succeeded` → `orders` ödeme güncelleme. |
| 2026-05-02 | Faz 1 (kısmi) | Admin iptal: `cancelReason` + olay notu + WhatsApp; onayda `estimatedTime` (API); müşteri takipte onay + SLA hedef bandı. |
| 2026-05-02 | Operasyon | Şema: API `start` öncesi `db-migrate.mjs` otomatik. Yedek DDL: `POST /api/delivery/migrate` (Stripe audit tablosu dahil). Admin: bekleyen → onayda tahmini dk penceresi. |
| 2026-05-02 | SLA / mağaza | Müşteri takipte süre aşımı uyarısı; admin listede tahmin dk + gecikme işareti; onaylı siparişte süre düzeltme (PUT); Stripe metadata `checkout_source`. |
| 2026-05-02 | Panel hizası | İşletme `PATCH .../providers/orders/:id/status` ve kurye `PATCH .../courier/orders/:id/status` → `delivery_order_status_events` (`vendor_panel`, `courier_panel`). Takip sayfası ~40s sessiz yenileme + kaynak etiketleri. |
| 2026-05-02 | Usta | `POST .../staff/usta/orders/:id/ready-notify` → `ready` geçişi `delivery_order_status_events` (`staff_usta`); takip etiketi “Usta”. |
| 2026-05-02 | Refaktör | `delivery-status-transitions.ts`: admin + işletme paneli geçiş kuralları tek dosya; işletme `on_the_way` → `delivered/iptal`. Stripe webhook audit `detail` içinde `checkout_source`. |
| 2026-05-02 | Seri ilanlar + Haritalar | Üye zorunlu `POST /seri-ilanlar` (`site_member_id`); `GET /seri-ilanlar/:id` + ilgili ilanlar; `/seri-ilanlar/:id` sayfası; haritada yalnızca `premiumOnly=1`, ana servis sekmeleri (`homepage_super_category`), popüler lokasyon + şehir rehberi; panel premium modalda işletme türü seçimi. |
| 2026-05-02 | Mekan & Dükkan / panel konum | `Siparis`: ilk yüklemede tüm Türkiye listesi; bölge filtresi yalnızca kullanıcı GPS veya manuel il/ilçe/mahalle ile; `yekpare_siparis_location_v4` + “Tümünü göster”. API patch’te `lat`/`lng` virgül→nokta. Admin işletme: adres debounce ile otomatik geocode, “Koordinat bul (adres)”, `GeofillAddressButton` ile GPS koordinat; şema/API: `vendors.password_hash` + güvenli `set-password` (500 düzeltmesi). Nominatim ters geocode zoom 19. |
| 2026-05-02 | TR adres (il–ilçe–mahalle–sokak) | `tr_il` / `tr_ilce` / `tr_mahalle` / `tr_sokak` (migration 0009); `GET /api/tr-address/provinces|districts|neighborhoods|streets|stats`; `pnpm import:tr-address` (repo `data/` yolu); `TrAddressFields` — `Siparis` manuel konum, admin sipariş işletmesi & seri ilan, `Hesabim`, `SeriIlanlarPublic` + KYC, turizm ilanı ve işletme profili (`ServisSaglayiciPaneli`). |
| 2026-05-02 | Ulaşım (roadmap hizası) | Faz 3 altında müşteri `/ulasim` + harita `ulasim` süper kategori / mağaza türleri netleştirildi (`YEKPARE-SUPER-APP-ROADMAP.md`). |
| 2026-05-06 | Emlak modülü kaldırıldı | Çok satıcılı emlak (`/emlak`, admin, `emlak_listings`, `/api/emlak/*`) üründen çıkarıldı; eski URL’ler ana sayfaya yönlendirilir. |
| 2026-05-05 | Harita GIS MVP (Keşfet) | `Kesfet` içinde katman paneli: temel/hava/gece/topografik/siyasi/fiziki taban haritalar + deprem (USGS), hava durumu (Open-Meteo), nüfus/elevation/raster overlay, jeodezik grid. |
| 2026-05-05 | Parsel sorgu entegrasyonu | `GET /api/map/parcel-query-link` endpoint + `Kesfet` katman panelinde ada/pafta/parsel formu, TKGM yönlendirme, otomatik harita odak markerı, marker temizleme, son 5 sorgu geçmişi. |
| 2026-05-05 | Haritalar GIS hizalama | `Haritalar` sayfasına katman paneli taşındı; temel harita stil değişimi + deprem/hava katmanları eklendi. |
| 2026-05-05 | Katman katalog altyapısı | Ortak `src/lib/mapLayers.ts` ile taban/overlay katman tanımları config tabanlı hale getirildi; `Kesfet` ve `Haritalar` aynı katalogdan besleniyor. |
| 2026-05-05 | GIS ileri katmanlar | Resmi kaynak health-check rozetleri (60sn yenileme), tooltip ile HTTP+latency, gelişmiş WMS/WMTS katmanları (NASA true-color/gece) ve overlay opacity + legend desteği eklendi. |
| 2026-05-07 | Seri ilan + sarı sayfalar kalıcı temizlik | `/seri-ilanlar` API uçları 410'a alındı; admin/public rota ve menü girişleri temizlendi; sitemap linki kaldırıldı; `seri_ilanlar` tablo drop migration'ları eklendi. Harita public listeleri yalnız aktif servis sağlayıcı bağlantısı olan işletmeleri döndürecek şekilde daraltıldı. |
| 2026-05-07 | Legacy/emlak artık temizliği | `map_feature_placement_pricing` içindeki `seri_ilanlar` placement kaldırıldı, `map_notifications` + `map_otps` + `emlak_listings` drop migration'a alındı; emlak vendor bağları koparılarak temizlik akışına dahil edildi. |
| 2026-05-07 | Keşfet mobil UX | Sol çekmece ~yarım genişlik (`min(max(50vw,280px),440px)`), sağda harita; AFAD/MGM çip → yalnız harita katmanı (liste çekmecede kısa bilgi); navigasyon & güzergah formları mobilde dikey, kart görünümü iyileştirildi; OpenSky paneli mobilde dikey. |
| 2026-05-07 | Sipariş konum UI | `Siparis`: üstte doğrudan `GoogleTrAddressQuickFill` (Konumu yazın / GPS / GETİR + il–ilçe–mahalle); eski “Manuel Gir” şeridi kaldırıldı. |
| 2026-05-07 | Keşfet navigasyon — Google Routes | `POST /api/map/routes/google` (Routes API v2: DRIVE trafik duyarlı, WALK, TRANSIT). `startNavigation` önce Google; `success: false` / kota / ağ → mevcut OSRM + Leaflet Routing Machine. Katman: `navGoogleLayerRef`. |
| 2026-05-07 | Roadmap senkron | MVP M1–M5 özet tablosu; M3 canlı takip `SiparisDetay` ile hizalandı. Sonraki sprint: ödeme genişleme → Faz 3 ulaşım talebi → map/vendor tek kaynak. |
| 2026-05-08 | İletişim & vitrin | Migration 0025: site/mağaza posta kutusu (`mailbox_messages`), IMAP senkron, SMTP gönderim; mağaza + site anasayfa duyuruları; toplu müşteri mesajı (şablon + WA/e-posta). Admin `Posta & anasayfa duyuru` sayfası; servis sağlayıcı Posta & Duyurular sekmeleri; `Home` duyuru şeridi. |
| 2026-05-08 | Mağaza blog & API anahtarları | Migration 0026: `vendor_blog_*` (ayar, yazı, yorum); herkese açık `/siparis/satici/:slug/blog` rotaları; panelde Blog sekmesi (bloklu içerik: paragraf, görsel, galeri, YouTube) + vitrinde blog linki. Sağlayıcı entegrasyonlarda Gemini / Google AI / DeepSeek; Places/Maps yalnız admin Harita. Google AI bilgi kartı daraltılabilir. Admin gelen kutusu: `PATCH /api/site/admin/mailbox/:id/read`. |
| 2026-05-08 | Üyelik & vitrin metni (gece oturumu) | Migration 0027/0028 ile sağlayıcı üyelik USD alanları + `about_html`; API’de vendor oluşturmada site OpenAI/Gemini ile Türkçe “Hakkımızda” üretimi; `PUT /providers/profile` + harita `linkedVendor`; sipariş/alışveriş/Keşfet işletme vitrininde `aboutHtml`. Push: `55528d5`, `3299122`, `a4d36e2`, `ca86899`, `e25669c`. |
| 2026-05-08 | Site posta (IMAP) | Admin gelen kutusu: IMAP şablon/placeholder temizliği, SMTP’den `imap.gmail.com` tahmini, boş IMAP kullanıcı/şifrede SMTP yedeği; sunucuda yalnız `SMTP_*` env varsa IMAP senkronu (`ca86899`). |
| 2026-05-08 | IMAP istemci | `imap-inbox`: sunucunun `NO`/`BAD` metnini (`responseText`) kullanıcıya iletme; `SEARCH` yerine son N mesaj için sekans aralığı `start:*`; 993/995 implicit TLS, SNI, zaman aşımı (`e25669c`). |
| 2026-05-08 | İletişim e-postası | Kamu künye / iletişim / KVKK metni + seed varsayılanı: `yekparenet@gmail.com` (`a4d36e2`). Canlı DB’deki `site_settings.email` manuel senkron gerekebilir. |

---

## Oturum raporu — yapılan / eksik / ertelenen (2026-05-08 gece)

Bu bölüm, aynı gün verilen komutlarla **tamamlanan**, **kısmen yapılan** veya **henüz yapılmayan / operasyona bırakılan** işleri özetler. Yarın buradan devam etmek için yeterlidir.

### Tamamlanan (kod + push)

- `pnpm run typecheck` yeşil; üyelik katmanları + ilgili migration / admin / panel / demo ulaşım tohumu ana hatta.
- Site **Posta & duyurular** IMAP: genel ayarlarda şablon host, SMTP ile aynı hesap, ortam değişkeni SMTP yedeği.
- **Gelen kutusu hata mesajları:** “Command failed” yerine Gmail/sunucunun gerçek cevabı; FETCH stratejisi ve port/TLS iyileştirmesi.
- **İşletme Hakkımızda:** `vendors.about_html`, oluşturmada AI, vitrin sayfaları ve panel kaydı (sipariş satıcı, e-ticaret mağaza, Keşfet bağlantılı işletme).
- **Site iletişim adresi** `yekparenet@gmail.com` (statik sayfalar + seed; canlı veritabanı alanı ayrıca güncellenmeli).

### Eksik veya kısmen kalan

| Konu | Durum |
|------|--------|
| **`/is-ortagi` fiyatlandırma vitrini** | Paket kartında hâlâ sabit **₺499/ay**. Admin’de tanımlı **USD ücret + `usd_try_rate`** ile kamu sayfasında canlı TRY (ve istenirse USD etiketi) gösterimi **yapılmadı**. |
| **Mağaza paneli IMAP** (`/providers/me/mailbox/sync-imap`) | Site admin’deki gibi SMTP’den IMAP host / kullanıcı / şifre **otomatik yedek yok**; satıcı yalnız `vendor_mail_settings` IMAP doldurduysa senkron çalışır. |
| **“Tüm servis sağlayıcılar” Hakkımızda** | Sipariş / alışveriş / Keşfet–vendor bağlantılı akışlar kapsandı. **Turizm veya ulaşım** gibi yalnız harita/işletme kaydı olup **`vendors` satırı olmayan** modeller için aynı AI + vitrin standardı **henüz tek tip tamamlanmadı**. |
| **Canlı veritabanı** | Migration **0027** (üyelik) ve **0028** (`about_html`) prod’da uygulanması ve regresyon kontrolü **operasyon adımı**; repoda otomatik değil. |
| **Google Places “anlamlı metin”** | Places hâlâ tür etiketleri döndürür; iş **AI ile açıklama üretimi** tarafında çözüldü. Ayrıca Places’tan zengin editorial metin çekmek ayrı bir ürün kararı. |

### Ertelenen / yarın için not

- Ödeme genişleme, Faz 3 ulaşım talep akışı, map–vendor tek kaynak: mevcut “Sonraki kod adımı” sırası geçerli.
- Aşağıdaki **smoke checklist** canlı deploy sonrası bir kez işlensin.

### Deploy sonrası smoke (kısa checklist)

1. **DB:** `0027`, `0028` migration’ları canlıda uygulandı mı (`about_html` kolonu var mı)?
2. **Genel ayarlar:** SMTP dolu; IMAP boş veya Gmail ise senkron; gerekirse `SMTP_*` env.
3. **Admin → Posta:** “IMAP senkron” → hata yok; gelen iletiler listeleniyor mu?
4. **Yeni vendor oluştur** (site’te OpenAI veya Gemini anahtarı varken): DB’de `about_html` dolu mu; `/siparis/satici/:slug` ve `/alisveris/magaza/:slug` üzerinde **Hakkımızda** görünüyor mu?
5. **İş ortağı fiyatı:** Admin USD / kur değişince vitrin beklentisi varsa — **henüz kod yok**; yarın `IsOrtagi.tsx` + `GET /api/settings` (veya mevcut public settings) ile bağlanacak.

---

## Kullanıcı geri bildirimi — bildirim, toplu mesaj, blog (net teknik öz, 2026-05-08)

Aşağıdaki madde **yanlış beklenti / eksik ürün ayrımı** nedeniyle “yapıldı sanılıp görünmeyen” davranışları açıklar. Geliver sonrası son 2–3 saatteki kod hattı bu başlıklarla örtüşür; Geliver’e özel **yeni** bir API değişikliği bu pencerede ayrı listelenmemişse burada yoktur (panelde Geliver ayarları önceki işlerde mevcut).

### 1) “Tüm mağazalara bildirim” ile admin **Posta → Toplu müşteri** aynı şey değil

| Özellik | Kod yolu | Veritabanı / kayıt | Kim görür? |
|--------|-----------|-------------------|-------------|
| **Toplu müşteri** | `POST /api/site/admin/marketing/bulk-customers` (`AdminPostaVeDuyurular` sekmesi) | Gönderilen her mesaj için **kalıcı “gönderim günlüğü” tablosu yok**; yalnızca yanıtta `whatsappSent` / `emailSent` sayıları | Hedef: **`shop_users`** (alışverişe kayıtlı **müşteri** telefon/e-posta; `customers-export` bu tablodan). **İşletme (`vendors`) listesi değil**; işletme panelinde “gelen mesaj” veya deneme kopyası **yok**. |
| **Platform duyurusu** (işletme kitlesi) | Admin `PlatformDuyurular` → `POST /api/site/admin/broadcasts` (`broadcasts.ts`) | `platform_broadcasts` + isteğe bağlı WA; okundu: `platform_broadcast_reads` | İşletme oturumu: `GET /api/site/my-broadcasts` — panelde **üstte şerit** (`PlatformBroadcastStrip`), yalnızca **okunmamış** kayıtlar. **Ayrı bir “Bildirimler” sekmesi veya geçmiş gelen kutusu yok.** |

**Sonuç:** “Toplu müşteri” ile attığınız deneme, işletme panellerinde **hiçbir gelen kutusuna yazılmaz**; admin Posta ekranında da **gönderilen metnin arşivi yok** (sadece anlık sonuç metni). Tüm işletmelere metnin görünmesi için **`platform_broadcasts`** akışı (audience `vendors` / `all`) ve ardından panelde şerit kullanılmalı; şerit kapatılınca kayıt “okundu” sayılır ve listeden düşer.

**Yapılmayan (ürün açığı):** İşletme panelinde **“Bildirimler” menü öğesi + tüm yayınlanan duyuruların geçmişi**; admin toplu gönderim için **gönderim günlüğü / taslak kopyası**; toplu müşteri ile platform duyurusunun tek ekranda birleştirilmesi.

### 2) Servis sağlayıcıda “Bildirimler” ve “gelen mesaj”

- Panelde sekmeler: **“Posta & Bildirim”** = mağazanın **kendi** SMTP/IMAP posta kutusu + müşteriye toplu mesaj (`VendorPostaHub`); **“Duyurular”** = vitrin/anasayfa için **işletmenin kendi** `vendor_public_announcements` içeriği.
- **Yekpare’nin işletmeye gönderdiği** merkezi ileti: yalnızca **`PlatformBroadcastStrip`** (üst şerit) ve sadece `my-broadcasts` ile eşleşen `platform_broadcasts` kayıtları için.
- **Eksik:** Kullanıcının aradığı anlamda **“Bildirimler” sekmesi**, okunmuş duyuru geçmişi, admin deneme mesajının işletmede kalıcı görünmesi.

### 3) Alışveriş mağaza sayfasında blog yok — tasarım olarak route farklı

- Blog kamu rotaları yalnız: **`/siparis/satici/:slug/blog`** ve yazı detayı ( `App.tsx` ).
- **`/alisveris/magaza/:slug`** (`EcomSatici.tsx`) içinde blog linki / blog bölümü **tanımlı değil**; bu yüzden e-ticaret vitrininde “Blog” görünmez.
- Panelde blog yazıları yine de oluşturulabilir; müşteri yolu sipariş satıcı URL’si ile sınırlı.

**Yapılmayan:** `EcomSatici` (ve gerekirse footer) üzerinden aynı vendor blog API’sine bağlanmak veya `/alisveris/magaza/:slug/blog` rotası eklemek.

### 4) Önceki oturum raporu tablosu (özet — yukarıdakilere ek)

| Konu | Durum |
|------|--------|
| **`/is-ortagi` TRY vitrin** | Admin USD + kur ile senkron **yok** (sabit ₺499). |
| **Mağaza IMAP yedeği** | Site admin kadar SMTP→IMAP otomatiği **yok**. |
| **Hakkımızda / vendors dışı tipler** | Harita–vendor bağlantısı olmayan dikeyler **tam kapsanmadı**. |

### Yarın için önerilen kod sırası (bu geri bildirime göre)

1. `EcomSatici` + route: alışveriş mağazasında blog vitrin bağlantısı (veya paylaşılan blog path).  
2. İşletme paneli: **Bildirimler** sekmesi — `GET /api/site/my-broadcasts` okunmuş + okunmamış (ayrı endpoint veya query parametresi).  
3. Admin: toplu müşteri gönderiminden sonra **audit satırı** (opsiyonel tablo) veya en azından son gönderinin özeti `mailbox_messages` scope `site_outbound_marketing` gibi.  
4. `/is-ortagi` dinamik fiyat.  
5. Mağaza `sync-imap` SMTP yedekleri (site ile aynı mantık).

---

## Sohbet transkripti — kullanıcı talep envanteri (geriye tarama)

**Kaynak:** Cursor agent transkripti [goalgo-yekpare-sohbet](e742ecb3-8785-436e-bfd9-c438cf41434d) (`e742ecb3-8785-436e-bfd9-c438cf41434d.jsonl`, ~687 kullanıcı mesajı; Mayıs 2026).  
**Not:** Aynı makinede başka sohbetlerde geçen **TKGM 81 il haritası indir** ([cc71701c-7b4e-443e-9d83-3041b45b2543](cc71701c-7b4e-443e-9d83-3041b45b2543)) ve **PHP `ahnekportal` / AI WordPress eklentisi** ([ce594a29-524f-44c0-ba08-1f3cb7c2c9c6](ce594a29-524f-44c0-ba08-1f3cb7c2c9c6)) **bu Goalgo repo kapsamı dışındadır**; aşağıdaki tablo yalnız **goalgo / yekpare.net** ile ilgili talepleri listeler.

**Genel tercih (tekrarlayan):** “Her değişiklikten sonra **push**” — bazı turarda agent birden fazla düzeltmeyi tek commit’te topladı; istek ayrı mesajlarda tekrarlandı.

### A) Git / GitHub / Cursor / Vercel / domain (Mayıs başı)

| Talep / bağlam | Durum (özet) |
|----------------|--------------|
| Replit → Cursor, gizli dosya, GitHub sürükle-bırak, `goalgo` repo oluşturma, terminal komutları | Rehber + `.gitignore` / ilk commit / push akışı işlendi. |
| GitHub’da “boş” görünme (`goalgo/` alt klasör) | Açıklama: kökte alt klasör; isteğe bağlı düz kök taşıma **ertelendi** (ürün kararı). |
| Lokal `pnpm dev`, Windows Rollup / Tailwind, `Home` runtime | Düzeltildi. |
| Vercel deploy, `yekpare.net` DNS, SSL, “under construction” IP çakışması | Adım adım yönlendirme (Vercel’in gösterdiği DNS değerine uyma). |

### B) Geliver (8 Mayıs akşamı — transkriptte yoğun blok)

| Talep | Durum |
|--------|--------|
| Panelde eskiden satın alınmış kargolar varken **Yekpare üzerinden satın alma çalışmıyor**, yalnızca teklif | Akış / API hata mesajları ve “API’den yenile” metinleri üzerinde iterasyon; **Geliver API uçları ve paneldeki eski kayıt durumu** kaynaklı sınırlar kullanıcıya iletildi. |
| `HTTP 500 · E1084 record not found` vb. | Sunucu/geçici hata ve yeniden deneme yönlendirmesi; kodda dayanıklılık denemeleri (oturum özeti). |
| “Seçtiğiniz teklif artık geçerli değil” / “teklif zaten kabul edilmiş…” | UI metinleri + yenileme akışı. |
| **Etiket satın alma** metninin yeri: teklif almadan sonra veya bilgilendirme; girişte gereksiz olmasın | Metin konumu kullanıcı isteğine göre düzenlendi (API ile etiket satın alma riskleri gerekçesi transkriptte geçiyor). |
| **Önce push** + “Getir öne / GPS arkaya” (sipariş–ödeme düzeni) | İlgili UI commit’leri ve push istekleri. |
| Admin / liste: **ID sütununda ad soyad**, **durumda il / ilçe / mahalle** | Talep; uygulanıp uygulanmadığı için kodda `grep`/sayfa kontrolü ayrı doğrulanmalı (**bu dokümana “yapıldı” yazılmadı** — yarın `SiparisIsletmeleri` veya ilgili admin grid doğrulanacak). |

### C) Genel UI

| Talep | Durum |
|--------|--------|
| **Anasayfadaki footer’ı diğer sayfaların altına ekle** | `PublicLayout` veya ilgili layout’ta işlendiği varsayılır; kalan sayfa varsa tek tek kontrol. |

### D) Destek + yasal sayfalar (yekpare.net)

| Talep | Durum |
|--------|--------|
| Üyeler + işletme sahipleri için **ticket / destek** sistemi | `support` API + `DestekTalepleri` admin + müşteri `/destek` hattı önceki işlerde; işletme oturumu ile tam kapanma **doğrulanmalı**. |
| **Mesafeli satış**, **ön bilgilendirme**, KVKK vb. zorunlu metin sayfaları | `legalPages` / rotalar genişletildi (özet); ödeme checkout’ta onay kutuları **ayrı doğrulama**. |
| “Yaptıklarını pushla” | Push talepleri tekrarlandı. |

### E) Admin entegrasyonlar — Gemini / Google AI

| Talep | Durum |
|--------|--------|
| Gemini API özellikleri (uzun ürün metni) | Dokümantasyon / UI metni. |
| Ekran görüntüsü: **“Gemini AI giriş yeri yok”** | `GenelAyarlar` / sağlayıcı entegrasyon bloklarında alanlar genişletildi; **hangi sekmede olduğu** kullanıcıya netleştirilmeli. |
| “Her yaptığından sonra push” | Süreç tercihi. |

### F) Servis sağlayıcı üyeliği (3 kademe)

| Talep | Durum |
|--------|--------|
| Standart / Gold / Premium, USD fiyat, **TRY kur ile güncelleme**, admin’den düzenleme, panel kısıtları, demo ulaşım seed | Migration **0027** + API + UI; kamu **`/is-ortagi` fiyatı hâlâ sabit ₺499** (yukarıdaki eksikler). |

### G) Posta, IMAP, iletişim, vitrin (görsel + metin paketi)

| Talep | Durum |
|--------|--------|
| Genel ayarlarda IMAP “eksik” uyarısı | Site admin IMAP: SMTP tahmini, placeholder, **SMTP_* env** yedeği (`ca86899`). |
| IMAP açıkken “Command failed” | `imap-inbox` hata metni + FETCH/TLS (`e25669c`). |
| Site iletişim maili **yekparenet@gmail.com** | Statik sayfalar + seed (`a4d36e2`); **canlı `site_settings.email`** elle. |
| Google Places zayıf metin + **OpenAI/Gemini ile Hakkımızda** + tüm sağlayıcı vitrinleri | `about_html`, vendor create, Keşfet/ecom/sipariş; **vendors’sız tipler** kısmen. |
| `pnpm typecheck` + push + migration smoke önerisi | typecheck + push yapıldı; smoke **operasyon**. |

### H) Bildirim / blog / rapor (8 Mayıs gece)

| Talep | Durum |
|--------|--------|
| Toplu mesaj “mağazalara” gidiyor sanısı, panelde bildirim yok, deneme kopyası yok | **“Toplu müşteri” = `shop_users`**, arşiv yok; **platform duyurusu** ayrı ürün; şerit ≠ “Bildirimler” sekmesi — detay bu dosyada üst bölümde. |
| **Alışveriş mağaza sayfasında blog yok** | Route yalnız `/siparis/satici/.../blog`; **`EcomSatici` bağlanmadı**. |
| “Eksik rapor / Geliver sonrası 2–3 saat” | Bu bölüm + önceki “Kullanıcı geri bildirimi” ile genişletildi. |

---

## MVP durumu (özet)

| Madde | Durum |
|--------|--------|
| M1 Sipariş durum makinesi | Tamam (önceki günlük). |
| M2 Bildirim | Tamam (kanallar + olaylar). |
| M3 Müşteri takip | Tamam: `SiparisDetay` — durum zaman çizelgesi; `picked_up` / `on_the_way` iken `GET /api/delivery/orders/:orderNumber/driver-location` + Leaflet harita, ~10 sn yenileme; `driver_locations` ile uyumlu. |
| M4 Stripe webhook + audit | Tamam (mağaza). |
| M5 Admin sipariş operasyon | Tamam. |

**M3 iyileştirme fırsatları (isteğe bağlı):** teslimat adresine ikinci pin + basit rota çizgisi; daha sık yenileme (pil / kota dengesi); kurye uygulamasında konum gönderiminin her ortamda doğrulanması.

---

## Sonraki kod adımı (öncelik sırası — 2026-05)

1. **Ödeme genişleme:** Teslimat için PayTR (veya seçilen PSP) webhook + idempotency + audit (M4 / `stripe_webhook_events` deseninin uyarlanması).  
2. **Faz 3 — Ulaşım:** `/ulasim` talep oluşturma → sağlayıcı kabulü → ücret taslağı → `delivery_order_status_events` veya ortak talep günlüğü (tek durum makinesi deseni).  
3. **Map / Vendor tek kaynak:** Haritada görünürlük = `vendors.active` + işletme–harita bağlantısı; admin toplu göster/gizle ve liste API’lerinde aynı filtreyi zorunlu kıl.  
4. **Bakım:** Çok eski DB için bir kez `POST /api/delivery/migrate` (idempotent).  
5. **Refaktör (isteğe bağlı):** Kurye PATCH geçişleri tamamen `delivery-status-transitions` üzerinden tek giriş noktası.  
6. **M3+ (isteğe bağlı):** Müşteri haritasında işletme / teslimat adresi işaretçileri veya tahmini rota (Google Routes veya OSRM).

---

## Faz 3 — Ulaşım (bir sonraki büyük kod hizası)

- **Müşteri:** talep formu (kategori, konum, zaman, not) → `POST` → kayıt + bildirim.  
- **Sağlayıcı:** gelen talepler, kabul/red, durum güncellemesi (mevcut `providers` / `transport` ile birleştir).  
- **Ücret:** mesafe/zaman bazlı taslak (sonra Faz 4 ile gerçek ödeme).  
- **Günlük:** Her durum değişimi sipariş modülündeki gibi kayda bağlansın (denetim ve müşteri takibi).

---

*Son güncelleme: 2026-05-08 — Sohbet transkripti [goalgo-yekpare-sohbet](e742ecb3-8785-436e-bfd9-c438cf41434d) geriye taranıp talep envanteri (Geliver, footer, ticket/yasal, Gemini, üyelik, push, posta, blog) yol haritasına eklendi.*
