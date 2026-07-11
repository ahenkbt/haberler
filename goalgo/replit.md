# AhenkPress

Turkish news portal — a WordPress-style news site (`/`) with a full admin panel (`/admin`). Recreated from the user's reference screenshots and feature spec.

## Stack
- pnpm monorepo (Replit pnpm-workspace template)
- Frontend: React + Vite + wouter + TanStack Query + shadcn/ui + lucide-react
- Backend: Express 5 + Drizzle ORM + PostgreSQL + Zod (generated from OpenAPI)
- API contract: `lib/api-spec/openapi.yaml` → orval codegen → `lib/api-zod` (server) + `lib/api-client-react` (client hooks)

## Artifacts
- `artifacts/ahenkpress` — public site + admin (slug `ahenkpress`, served at `/`)
- `artifacts/api-server` — Express API (auto-mounted at `/api`)
- `artifacts/mockup-sandbox` — design canvas (template default)

## Public Pages
- `/` — **Yeni Süper Anasayfa**: Hero arama (ne+nerede→Keşfet), Popüler Şehirler (10 şehir), Öne Çıkan Haberler (manşet), Öne Çıkan İşletmeler (4 tab: Yiyecek&İçecek/Yapılacaklar/Alışveriş/Hizmetler), Hızlı Bağlantılar. Nav: Haberler|Keşfet|Alışveriş|Video|Ansiklopedi
- `/haberler` — Haber listesi (TumHaberler bileşeni, /tum-haberler ile aynı)
- `/haber/:id` — Haber detay sayfası
- `/kategori/:slug` — Kategori haberleri (full header: logo, kırmızı nav, SON DAKİKA ticker, footer)
- `/canli-tv` — Video TV (karanlık tema, CANLI YAYINLAR bölümü, kategoriler, youtube embed)
- `/magaza` — E-ticaret mağaza (kategori kenar çubuğu, ürün ızgarası, sepet drawer, kargoya git)
- `/odeme` — Checkout sayfası (teslimat bilgileri, kredi kartı formu, üye giriş/kayıt)
- `/siparis-takip/:code` — Halka açık sipariş takip. Tahmini teslimat süresi, işletme notu, işletme/kurye telefon numaraları, chat paneli, iptal butonu (pending/confirmed durumda). Sadece delivery (yemek/sipariş) siparişleri desteklenir.
- `/hesabim` — Müşteri hesabı (giriş yapma, sipariş geçmişi, profil düzenleme)
- `/sari-sayfalar` — Eski URL; `/seri-ilanlar` adresine yönlendirir
- `/seri-ilanlar` — Seri İlanlar: vasıta, iş ilanları, ikinci el, hizmet vb. kategoriler; üye ilan verebilir
- `/siparis` — Sipariş sayfası: üstte Öne Çıkan İşletmeler horizontal scroll (superCategory=siparis)
- `/alisveris` — Alışveriş Merkezi: üstte Öne Çıkan İşletmeler horizontal scroll (superCategory=alisveris)

## Keşfet / Harita
- `/kesfet` — Ultra-premium map: frosted glass search bar, indigo category chips, glassmorphism BizCards (selected=deep-indigo-gradient, premium=gold-shimmer), premium detail panel with:
  - Hero photo (gradient overlay, dot+thumbnail strip navigation, prev/next controls)
  - Business name header with rating pill, category, open status badge
  - Action buttons (navigate, save, share, call, web, detay)
  - Premium tab pills (Genel / Yorumlar / Bilgiler) with indigo gradient active
  - Review cards with source badge (Google/AhenkPress), avatar gradient initials
  - Bilgiler tab: icon cards per field, çalışma saatleri premium card with today highlighted in indigo
- `/kesfet/isletme/:id` — İşletme detay sayfası (products, campaigns, reservations, online orders). Premium + storeType → Mağazaya Git butonları (Sipariş/Alışveriş/Hizmet)
- `/isletme-basvuru` — 3-adım premium başvuru formu (işletme bilgileri → yetkili bilgileri → plan & ödeme: Stripe veya havale)
- `/isletme-giris` — İşletme sahibi giriş/kayıt (email+şifre JWT auth, dark glassmorphism)
- `/isletme-paneli/:id` — İşletme yönetim paneli (ürünler, kampanyalar, rezervasyonlar, siparişler)

## Business Owner Auth
- JWT-based email/password auth for business owners (separate from admin and Firebase user auth)
- POST /api/map/owner/register — kayıt
- POST /api/map/owner/login — giriş → JWT + işletme listesi
- GET /api/map/owner/me — token ile profil
- map_users table reused (provider="email", passwordHash set)

## Business Applications (map_business_applications)
- POST /api/map/business/apply — başvuru gönder (stripe veya wire)
- GET/PUT /api/admin/business-applications — admin listesi, onay/red
- Onay: işletme oluşturulur, owner hesabı oluşturulur, premium aktif edilir
- Admin panel: "📝 Premium Başvurular" sekmesi (approve/reject buttons)

## Scraper & Data Enrichment
- POST /api/map/scrape-gmaps — Google Maps scraper (autoImport=true → DB) — saves photos to map_business_images + scrapedPhotos JSONB + scrapedReviews JSONB
- POST /api/map/scrape-gmaps-full — enrichAll mode, detailed scrape with reviews/photos
- POST /api/map/businesses/:id/enrich — re-scrape single business from Google Maps (admin only); saves up to 12 photos + 10 reviews + hours
- map_businesses.scraped_photos JSONB — array of photo URLs from Google Maps
- map_businesses.scraped_reviews JSONB — array of {authorName, rating, text, relativeTime, profilePhoto} from Google Maps
- GET /api/map/businesses/:id/google-details — returns photos from map_business_images + scrapedPhotos + photoUrl/coverPhotoUrl; reviews from mapReviewsTable (platform, "AhenkPress" badge) + scrapedReviews (Google badge)
- Admin panel: "🔍 Zenginleştir" button per business row — triggers re-scrape

## Admin Panel (`/admin/*`)
- `ProtectedRoute` — admin login via `POST /api/members/admin-panel-session`; protected routes verify `/api/members/admin-panel-status` before rendering.
- Sidebar: **İÇERİK** / **GALERİ & İLANLAR** / **SİPARİŞ YÖNETİMİ** / **ALIŞVERİŞ YÖNETİMİ** / **SARI SAYFALAR** / **AI ROBOT** / **TEMA** / **ULAŞIM & BİLDİRİM** / **DÜZENLE**

### İÇERİK
- `Kontrol Paneli` — dashboard stats
- `Haberler`, `Blog Yazıları`, `Sayfalar`, `Köşe Yazarları`, `Medya`

### GALERİ & İLANLAR
- `Foto Galeri`, `Video Galeri`
- `Seri İlanlar` — ilan CRUD + KYC doğrulama (bireysel/kurumsal, belge URL, kycStatus: pending/approved/rejected)
- `Resmi İlanlar`

### SİPARİŞ YÖNETİMİ
- `/admin/siparis-isletmeleri` — Delivery/teslimat işletme CRUD (vendorType=delivery); toggle aktif/pasif, öne çıkan, WhatsApp alanı
- `/admin/siparis-kategoriler` — Teslimat kategorileri (emoji ikon + sıralama)
- `/admin/siparis-menu-items` — Tüm vendor menü ürünleri listesi + filtre + CRUD

## Servis Sağlayıcı Paneli (`/servis-saglayici-paneli`)
- Provider login: `/servis-saglayici-giris` (email → magic auth, stored as `providerSession` JSON in localStorage)
- Backend auth: `x-vendor-id` + `x-vendor-email` headers; `verifyVendor()` helper in providers.ts
- Tabs: **Başvuru Durumu** | **İşletme Profili** | **Menü/Ürünler** (delivery/shop types only) | **Siparişler** (delivery only)
- **Menü/Ürün CRUD**: Category chips filter, add/edit/delete categories, full product form (name, price, sale_price, description, imageUrl, category, stock, isPopular, isVegan, isSpicy), glassmorphism modal
- **Sipariş Yönetimi**: Status filter tabs (Tümü/Bekliyor/Onaylandı/Hazırlanıyor/Hazır/Teslim/İptal), action buttons per status, color-coded cards (amber=new, green=delivered, red=cancelled), phone/address/notes display, JSON items display, inline status update
- **Sipariş Durumu Geçişleri** (backend enforced): pending→confirmed|cancelled, confirmed→preparing|cancelled, preparing→ready|cancelled, ready→delivered
- **Yeni Sipariş Uyarısı**: Auto-poll every 30s, amber sticky banner with bounce bell if new pending orders detected
- WhatsApp notifications on approval/rejection (admin) + new application (admin)

## Provider Panel Backend Routes (`/api/providers/*`)
- `GET /providers/me` — vendor profil bilgisi + istatistikler
- `PUT /providers/profile` — profil güncelleme
- `POST /providers/login` — email tabanlı giriş
- `GET /providers/products` — kategoriler + ürün listesi (vendor'a özgü)
- `POST /providers/products` — yeni ürün ekle
- `PUT /providers/products/:id` — ürün düzenle
- `DELETE /providers/products/:id` — ürün sil
- `GET /providers/categories` — menü kategorileri
- `POST /providers/categories` — yeni kategori ekle
- `DELETE /providers/categories/:id` — kategori sil
- `GET /providers/orders` — sipariş listesi (son 100, DESC)
- `PATCH /providers/orders/:id/status` — sipariş durum güncelleme (geçiş kuralları uygulanır)

### ALIŞVERİŞ YÖNETİMİ
- `/admin/alisveris-isletmeleri` — E-ticaret mağazaları (vendorType=ecommerce) CRUD
- `Ürünler` — e-ticaret ürün CRUD
- `Ürün Kategorileri`, `Toplu İçe Aktar`, `Siparişler`, `Ödeme Ayarları`, `Mağaza Yönetimi`

### SARI SAYFALAR
- `/admin/sari-sayfalar-isletmeleri` — Harita işletmeleri (map_businesses) CRUD; filtre, premium toggle, kategori seçimi, sosyal medya alanları
- `Harita & Kategoriler` → `/admin/haritalar-yonetimi`

### DİĞER
- `AI İçerik Robotu`, `RSS Kampanyaları`, `Video TV`
- `Tema Ayarları`, `Manşet Yönetimi`, `Anasayfa Modülleri`, `Bant Yönetimi`, `Reklam Alanları`, `Hızlı Kurulum`
- `Ulaşım Yönetimi`, `WhatsApp Bildirimleri`
- `Genel Ayarlar`, `Lisans & Hakkında`

### KYC (Seri İlanlar)
- Kullanıcı ilan verirken 2 adımlı form: Step 1 ilan bilgileri, Step 2 kimlik doğrulama
- Bireysel: ad soyad, TC no, adres, telefon, kimlik belgesi URL
- Kurumsal: şirket adı, telefon, vergi levhası URL, imza sirküleri URL
- `kycStatus` alanı: pending | approved | rejected (admin editten değiştirilebilir)
- DB: `ilan_sahibi_tipi`, `tc_no`, `ilan_sahibi_adi`, `ilan_sahibi_adres`, `ilan_sahibi_tel`, `kimlik_belgesi_url`, `vergi_levhasi_url`, `imza_sirkuleri_url`, `kyc_status`, `kyc_notes`

## Backend Routes (`/api`)
- `/healthz`, `/dashboard/summary`
- `/news` CRUD + `/featured|breaking|popular|by-category/:slug`
- `/categories`, `/authors`
- `/rss/campaigns` CRUD + `/toggle` + `/run` + `/direct-import` (gerçek RSS fetch + regex parse)
- `/rss/logs`
- `/video/sources` CRUD + `/toggle`, `/video/presets`
- `/modules` GET/PUT, `/ads` GET/PUT, `/finance`, `/settings`
- `/ai/settings` GET/PUT, `/ai/test`, `/ai/generate`, `/ai/uniquify`, `/ai/columnist`, `/ai/duplicates`, `/ai/stats`, `/ai/vendor-content` (mağaza içerik üretimi)
- `/map/contact-request` POST — Sarı Sayfalar kayıt başvurusu (map_contact_messages tablosuna kaydedilir)
- `/shop/products` CRUD, `/shop/categories` CRUD, `/shop/orders` GET/POST/PUT, `/shop/payment-settings` GET/PUT
- `/shop/auth/register` POST, `/shop/auth/login` POST, `/shop/auth/me` GET/PUT — müşteri JWT auth
- `/shop/checkout/intent` POST (Stripe), `/shop/checkout/order` POST, `/shop/checkout/stripe-key` GET
- `/shop/track/:code` GET — halka açık sipariş takip
- `/shop/my-orders` GET — üye sipariş geçmişi (Bearer token)

## E-commerce DB Schema (`lib/db/src/schema/ecommerce.ts`)
- `products` — id, name, slug, description, price(×1.56 markup), salePrice, stock, imageUrl, categoryId, featured, active
- `product_categories` — id, name, slug, description, 17 categories + 254 products seeded
- `orders` — id, orderNumber, trackingCode, userId, customerName/Email/Phone/Address/City/District/Postal, billingName/Address/City/TaxId, subtotal, taxAmount, totalAmount, status, paymentMethod, paymentStatus, stripePaymentIntentId, cargoCompany, cargoTrackingNumber, cargoTrackingUrl, shippedAt, deliveredAt, estimatedDelivery, notes, adminNote, items (JSON)
- `shop_users` — id, email, passwordHash, name, phone, address, city, district, postal
- `payment_settings` — stripe_enabled/key, bank info, taxRate (default 20%), currency
- `shop_settings` — store info, return policy, shipping info, contact details

## Customer Auth (`artifacts/ahenkpress/src/hooks/useShopAuth.ts`)
- JWT-based (Bearer token in Authorization header), 30 day expiry
- Stored in localStorage, `shopFetch()` helper auto-injects token
- useShopAuth() hook: user, loading, login, register, logout

## Price Structure
- Products priced at wholesale × 1.56 = 30% margin + 20% KDV
- Tax calculated separately (subtotal → taxAmount → totalAmount)
- All 254 seeded products updated with ×1.56 markup

## Delivery Order Confirmation Flow (Vendor Panel)
- "✓ Onayla" butonu bir modal açar: 30/60/90/120 dk preset + manuel giriş + müşteriye not alanı
- Modal onayında `PATCH /api/providers/orders/:id/status` body'sine `estimatedTime` + `vendorNote` gönderilir
- DB'de `estimated_time` (integer dk) + `vendor_note` (text) alanları `delivery_orders`'a eklendi
- Müşteri `/siparis-takip/:code` sayfasında tahmini süre ve notu görür, uzun bulursa iptal edebilir (pending/confirmed)

## Order Messaging (Chat)
- `order_messages` tablosu: id, order_id, sender_type (vendor/courier/customer), sender_name, message, created_at
- Endpoints: GET/POST `/api/delivery/orders/:orderNum/messages` (müşteri), GET/POST `/api/providers/orders/:id/messages` (vendor), GET/POST `/api/courier/orders/:id/messages` (kurye)
- Vendor Panel'de her sipariş kartında "💬 Chat" butonu → slide-up modal
- KuryePaneli'nde aktif siparişlerde "💬 Chat" butonu
- SiparisDetay'da "İşletme ile İletişim" butonu → chat modal

## Kasiyer (POS) Sistemi
- `/kasiyer` — Tam ekran dokunmatik POS: giriş → ürün grid + sepet + ödeme
- Giriş: kasiyer rolü staff (telefon+şifre) veya işletme sahibi (e-posta+şifre)
- POS: sol=kategori tabs+ürün grid, sağ=sepet panel, masada/paket mod
- Ödeme: nakit (üstü hesaplama, hızlı tutar butonları) / kart / havale
- Günlük sipariş listesi + nakit/kart ciro özeti
- API: `POST /api/cashier/orders`, `GET /api/cashier/orders?vendorId=X&date=YYYY-MM-DD`
- staff.ts'te tanımlı; order_source='cashier', status='delivered' olarak kaydedilir

## Sipariş Alarmı (ChatBubble)
- `Yekpare:newOrder` eventi → güçlü tekrar eden "bip-bip-bip-bip" alarmı (her 2.5 sn)
- `Yekpare:orderClear` eventi (ServisSaglayiciPaneli'nden, pending=0 olunca) → alarmı durdur
- Alarm aktifken bubble turuncu/kırmızıya döner, yukarısında zıplayan "🔔 YENİ SİPARİŞ!" banner görünür
- Butona veya bannera tıklamak alarmı keser ve chat panelini açar

## Vendor Panel — Atama (Kaydet Butonu)
- Kurye ve usta atama artık `onChange`'de değil, select+Kaydet butonu kombinasyonuyla çalışır
- `selectedCourier: Record<number, string>` ve `selectedUsta: Record<number, string>` state'leri
- "Kaydet" butonuna basılınca API çağrısı yapılır, state sıfırlanır
- Kasiyer rol seçeneği eklendi (Ekip Yönetimi → 🖥️ Kasiyer)

## Turizm & Seyahat Modülü (`/turizm`)
BookingCore 4.0 veri modelinden esinlenilerek Express+PostgreSQL+React ile sıfırdan inşa edildi.

### Kategoriler
- `hotel` — Otel (gecelik fiyat, oda tipleri, yıldız)
- `car` — Rent a Car (günlük fiyat)
- `villa` — Villa & Ev (gecelik fiyat, kapasite)
- `tour` — Tur (kişi başı fiyat, süre)
- `boat` — Yat & Tekne (günlük fiyat, kapasite)

### DB Tabloları
- `tourism_listings` — unified tüm türler (type CHECK hotel|car|villa|tour|boat), price, sale_price, price_unit, amenities (JSONB), gallery (JSONB), features, extra_info
- `tourism_rooms` — otel odaları (beds, adults, children, size_sqm, price, count)
- `tourism_availability` — müsaitlik & blocked tarihler (start_date, end_date, price_override, blocked)
- `tourism_bookings` — rezervasyonlar (booking_ref TR+nanoid, check_in, check_out, guests, nights, total_price, status)

### Public Frontend Sayfaları
- `/turizm` — Hero arama, 5 kategori kartı, öne çıkan ilanlar, işletme başvuru CTA
- `/turizm/:type` — Kategori liste sayfası (filtrele, şehir seç, maks fiyat, infinite load)
- `/turizm/liste` — Tüm türler arama sayfası
- `/turizm/:type/:slug` — İlan detay + galerі + rezervasyon formu (tarih seçici, kişi sayısı, not alanı, WhatsApp CTA)

### Admin Sayfaları
- `/admin/turizm-ilanlar` — Tüm ilanlar (tür/durum filtre, öne çıkar, aktif/pasif toggle, görüntüle)
- `/admin/turizm-rezervasyonlar` — Tüm rezervasyonlar (expand→detay, durum güncelle: pending/confirmed/completed/cancelled)

### API Endpoint'leri (`/api/tourism/*`)
- `GET /tourism/listings` — ?type, city, page, limit, featured
- `GET /tourism/listings/:slug` — detay (hotel→rooms dahil), view_count artırır
- `GET /tourism/listings/:id/availability` — müsaitlik + çakışan rezervasyonlar
- `POST /tourism/bookings` — rezervasyon oluştur → booking_ref döner
- `GET /tourism/bookings/:ref` — rezervasyon sorgula
- Vendor: `GET|POST|PUT|DELETE /tourism/vendor/listings`, `GET|POST /tourism/vendor/listings/:id/rooms`, `DELETE /tourism/vendor/rooms/:id`, `GET|PATCH /tourism/vendor/bookings`
- Admin: `GET|PATCH|DELETE /tourism/admin/listings`, `GET|PATCH /tourism/admin/bookings`

### Vendor Panel Entegrasyonu
- `provider_type = "turizm"` → `isTourism` flag → "✈️ İlanlarım" + "📅 Rezervasyonlar" sekmeleri görünür
- `TurizmIlanlarTab`: İlan CRUD (modal form, tür seçici, fiyat, şehir, kapasite, görsel URL)
- `TurizmRezervasyonTab`: Rezervasyon listesi (durum filtre, onayla/iptal/tamamlandı butonları)

### Servis Başvurusu Entegrasyonu
- `IsletmeBasvuru.tsx` — "✈️ Turizm & Seyahat" servis tipi + 5 alt tür (otel, arac, villa, tur, yat)
- `providers.ts` — PROVIDER_TYPE_LABELS'e `turizm` eklendi, PROVIDER_SUBTYPE_LABELS'e otel/arac/villa/tur/yat eklendi

### Navigasyon
- `AppNav.tsx` — "Turizm" nav linki (Plane icon) `/turizm`'e yönlendirir
- `AdminLayout.tsx` — "TURİZM & SEYAHAT" sidebar bölümü (İlanlar + Rezervasyonlar)

## Key Patterns
- `useListNews()` returns `{items: News[], total: number}` — NEVER treat as array directly
- AI uniquify: `POST /api/ai/uniquify` expects `{title, content, spot}`, returns `{title, content, spot, tags}`
- Site settings: `useGetSiteSettings` / `useUpdateSiteSettings` hooks
- Breaking news: `useListBreakingNews` hook
- Categories: `useListCategories` hook
- DB schema under `lib/db/src/schema/` (split per domain)

## Auth
- Server-side admin gate: set `ADMIN_PANEL_USERNAMES` and `ADMIN_PANEL_PASSWORD` on the API service; the SPA never embeds admin passwords or maintenance secrets.
- Login route: `/admin/giris`; all `/admin/*` routes call `/api/members/admin-panel-status` before rendering.

## Conventions
- Server uses Zod schemas (`@workspace/api-zod`) for validation
- Client hooks from `@workspace/api-client-react`
- No emojis in UI; lucide-react icons throughout
- Turkish locale throughout (dates, labels, error messages)

## Development Commands
- `pnpm --filter @workspace/api-spec run codegen` — regenerate Zod + React hooks after editing `openapi.yaml`
- `pnpm --filter @workspace/db run push` — push Drizzle schema to DB
- `pnpm --filter @workspace/api-server exec tsx src/seed.ts` — seed demo data (idempotent)
- `pnpm run typecheck:libs` — typecheck shared libs
