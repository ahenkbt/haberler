# Talimat Görevleri

Bu sayfa, canlıda görünmeyen değişiklikler ve yarım kalan işler için takip listesidir. Bir görev tam doğrulanmadan diğerine geçilmeyecek.

## Bilgi Ağacı ve Gezi Seyahat görsel revizyonu (12 Haziran 2026)

**Talimat:** `/ansiklopedi` Bilgi Ağacı sayfası bağımsız, premium gezi/keşif sitesi hissi verecek; public UI içinde başka tema/marka/teknik referans metni görünmeyecek. Yeni `/gezi-seyahat` sayfası Türkiye ve seçkin ülkeler/şehirler için editoryal keşif rotası olacak.

**Çözüm:**
- `/ansiklopedi`: `BilgiAgaciShell` marka kabuğu, büyük görsel hero, merkez arama, bağımsız mini nav/footer, 10 kategori için görsel yüzeyli büyük kartlar, net «Rotayı keşfet» / «Maddeyi keşfet» CTA'ları.
- Öneri kartları görsel+emoji üst yüzeyli kartlara taşındı; günlük akış ve detay infobox düzeni korunur.
- `/gezi-seyahat`: `GeziSeyahat` + `GeziSeyahatShell`; Türkiye şehirleri (`popularCities.ts`), Kapadokya/Pamukkale/Bodrum/Fethiye ve seçkin ülkeler/şehirler için görsel destinasyon kartları, filtreler, hero arama ve CTA bandı.
- Menü/link: `/gezi-seyahat` public route; Seyahat alt menüsü, turizm footer modülleri ve legacy Seyahat dropdown listesine eklendi. Ana menü kalabalıklaştırılmadı; `Bilgi Ağacı` ana menü linki korunur.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` ve `pnpm --filter @workspace/ahenkpress run build` başarılı.

### Terminoloji (zorunlu — tüm ajanlar)

| Terim | Anlamı | Kullanma |
|-------|--------|----------|
| **Yekpare header/footer** · **Yeni tema** · **Sade tema** | SixAmMart/Sade site kabuğu: beyaz header, yeşil Yekpare logosu, Yemek/Market/Keşfet nav, SixAmMart yasal footer — `/yemek`, `/siparis`, `/kesfet` ile aynı `SadePublicChrome` | — |
| **Eski tema** | Koyu mor Turinet `AppNav`, `PublicLayout` legacy header, eski `SiteFooter`, PWA Store bar, mor mega-nav; koyu `Home.tsx` / HM portal anasayfası | Tüm public rotalarda **yasak** (kaldırılacak) |
| **Mevcut tema renkleri** | Sade/SixAmMart paleti: `#039D55` yeşil vurgu, beyaz zemin, açık slate metin, yeşil CTA — §2 vitrinleriyle aynı | Eski mor Turinet, koyu HM kırmızı/mor haber teması **kullanılmaz** |

> **Not:** Talimatlarda «Yekpare header/footer» veya «site chrome» denince **Yeni Sade/SixAmMart tema** kastedilir — eski `PublicLayout` + mor `AppNav` + koyu `SiteFooter` **değil**. Turizm (`/turizm/*`) dahil tüm hedef rotalar bu yeni kabuğu kullanır; `TurizmRoute` → `SadeAwarePublicLayout` (`forceSade`) + `TurizmSubNavBar`.
>
> **Anasayfa ve Haberler (§4, §9):** Yalnızca **Yeni Sade tema chrome** (`SadePublicChrome`) içinde tasarlanır. Eski koyu anasayfa (`Home.tsx`, `HmCorporateHome`, mor `PublicLayout` sarmalayıcı) ve eski HM haber renkleri **referans alınmaz** — kabul kriterlerinde eski tema görünümü regresyon sayılır.

## Vercel middleware 502 spike (12 Haziran 2026)

**Sorun:** Vercel Observability `/middleware` üzerinde 502 artışı; External API Failures Railway (`goalgo-production.up.railway.app`) Pre-fetching; loglarda `[vendors]` ve benzeri etiketler.

**Kök neden:** Vercel Edge `/api/*` isteklerini `RAILWAY_API_ORIGIN` üzerinden vekiller. Railway geçici 502/503/504 veya bağlantı hatası verdiğinde middleware aynı 502’yi istemciye yansıtıyordu; prefetch (`Purpose: prefetch`) sırasında SEO/OG için ek Railway çağrıları spike’ı büyütüyordu. Vitrin uçları (`/api/delivery/vendors`, `/api/settings`, `/api/map/homepage-businesses` vb.) sayfa için zorunlu değil.

**Çözüm:**
- `middleware-api-degrade.js`: isteğe bağlı public GET uçlarında upstream 502/503/504 veya fetch hatasında boş JSON + `x-yekpare-api-degraded: 1` ile 200.
- Prefetch isteklerinde SEO doğrulama / OG HTML için Railway fetch atlanır.
- `HomeOrderTabs`: `r.ok` kontrolü ile 502 JSON parse hatası önlenir.
- Admin POST/PUT ve kritik kayıtlar etkilenmez (yalnızca listelenen GET uçları).

**Dosyalar:** `goalgo/middleware-api-degrade.js`, `goalgo/middleware.js`, `middleware.js`, `HomeOrderTabs.tsx`

**Doğrulama:** `pnpm run typecheck` (ahenkpress); canlı `/api/healthz` 200. Railway kesintisinde vitrin boş liste ile açılmalı; admin kayıtları gerçek hatayı göstermeye devam eder.

**Ortam:** Vercel Production `RAILWAY_API_ORIGIN` güncel Railway public URL olmalı; kalıcı 502 sürerse Railway deploy/log kontrol edilmeli.

## Mobil PWA yükleme istemi (12 Haziran 2026)

**Sorun:** Mobilde site girişinde hem tarayıcının üst mini-infobar’ı hem alttaki özel PWA Store kartı (`PWAInstallBanner`) birlikte görünüyordu.

**Kök neden:** `PWAInstallBanner` `beforeinstallprompt` olayını engellemiyordu; `usePWAInstall` yalnızca `/uygulamayi-indir` ve HM footer’da mount oluyordu. Banner altta sabitlenmişti ve «Aç» ile `/pwastore`’a gidiyordu.

**Çözüm:**
- `usePWAInstall`: modül yüklenir yüklenmez singleton köprü — `beforeinstallprompt` → `preventDefault()`, ertelenmiş prompt saklanır; `useSyncExternalStore` ile paylaşılır.
- `PWAInstallBanner`: yalnızca mobil (`md:hidden`), üstte sabit (`top-0`, safe-area); «Yükle» → native prompt veya `/uygulamayi-indir`; kapatma `pwa_banner_dismissed_v6`.
- Masaüstü etkilenmez; PWA standalone ve `/pwastore` / `/uygulamayi-indir` rotalarında banner gizli kalır (`App.tsx`).

**Dosyalar:** `usePWAInstall.ts`, `PWAInstallBanner.tsx`, `App.tsx` (mevcut görünürlük kuralları)

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` ve `build`; mobil Chrome’da tek üst banner, çift istem yok.

## Sade footer menü güncellemesi (12 Haziran 2026)

**Talimat:** Yekstra sütun başlığı korunacak; PWA link metni «Uygulama mağazası» olacak; Yekpare sütununa en başa «Tüm hizmetler» eklenecek.

**Çözüm:**
- `SadePublicFooter.tsx`: sütun başlığı **Yekstra** (değişmez); ilk link **Uygulama mağazası** → `/pwastore` (Haber Merkezi, AI Call Center, Haritalar, Navigasyon, Bilgi Ağacı korunur).
- **Yekpare** sütunu: ilk madde **Tüm hizmetler** → `/servisler`.

**Dosyalar:** `goalgo/artifacts/ahenkpress/src/themes/sixammart/SadePublicFooter.tsx`

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` ve `build`; footer’da «Yekstra» başlığı + «Uygulama mağazası» linki canlıda kontrol.

## Servisler tanıtım, sağlayıcı giriş ve üst menü (12 Haziran 2026)

**Sorunlar:**
- `/ulasim-saglayici-giris` ve `/turizm-saglayici-giris` rotaları tanımlı değildi → beyaz ekran (wouter eşleşme yok).
- `/servisler` ve alt sayfalarda CTA buton metinleri Sade CSS kalıtımıyla kontrast kaybediyordu.
- Haber Merkezi detayında `/habermerkezi` ve `/editor/giris` bağlantıları eksikti.
- AI Çağrı Merkezi için `https://call.yekpare.net/` ve `/ai-cagri-merkezi` bağlantıları net değildi.
- Üst ana menüde «Servisler» sekmesi kaldırılacaktı (footer «Tüm hizmetler» kalır).

**Çözüm:**
- `App.tsx`: `/ulasim-saglayici-giris` ve `/turizm-saglayici-giris` → modüle özel başlıklı `ServisSaglayiciGiris` (aynı login API, panel yönlendirmesi korunur).
- `SixAmMartTheme.tsx`: üst nav’dan «Servisler» linki kaldırıldı.
- `servicesMarketingData.ts`, `ServicesMarketingOverview.tsx`, `ServiceMarketingDetail.tsx`: profesyonel tanıtım içeriği, kullanım senaryoları, ek CTA grupları.
- Haber Merkezi: `Haber Merkezi'ni aç` → `/habermerkezi`, `Editör girişi` → `/editor/giris`.
- AI Çağrı Merkezi: tanıtım `/ai-cagri-merkezi`, canlı platform `https://call.yekpare.net/`.
- `ServiceMarketingCta.tsx`, `yekpareSadeTheme.ts`, `index.css`: `sade-btn-primary`, `services-cta-on-teal`, `bg-[#0f766e]` kontrast kuralları.

**Dosyalar:** `App.tsx`, `ServisSaglayiciGiris.tsx`, `SixAmMartTheme.tsx`, `servicesMarketingData.ts`, `ServicesMarketingOverview.tsx`, `ServiceMarketingDetail.tsx`, `ServiceMarketingCta.tsx`, `yekpareSadeTheme.ts`, `index.css`

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` ve `build`; canlıda sağlayıcı giriş URL’leri, `/servisler/haber-merkezi` linkleri, üst menüde Servisler yok.

## Ulaşım talep formu hata mesajları (12 Haziran 2026)

**Sorun:** `/ulasim` teklif formu sağlayıcı yokken veya API hata verince «Sunucu hatası» gösteriyordu.

**Çözüm:**
- `ulasimTransportErrors.ts`: servis tipine göre müsaitlik mesajları (`taxi`, `tow`, `courier`, `cargo`, `rideshare`, `moving`); `mapTransportRequestError` — `no_provider` ve 5xx için kullanıcı dostu metin; «Sunucu hatası» gösterilmez.
- `SixAmMartTheme.tsx` (`submitTransportRequest`): gönderim öncesi `/api/transport/vehicles` veya `/api/transport/rides` ile müsaitlik kontrolü; başarılı yanıtta takip kodu akışı korunur.
- `transport.ts` (`POST /api/transport/request`): aktif araç/sefer yoksa `503` + `{ error: "no_provider", requestType }`; gerçek sunucu hatası için genel mesaj istemci tarafında eşlenir.

**Dosyalar:** `ulasimTransportErrors.ts`, `SixAmMartTheme.tsx`, `goalgo/artifacts/api-server/src/routes/transport.ts`

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build`; `pnpm --filter @workspace/api-server run build`.

## 1. Canlıya Yansımama Hatası

Durum: Tamamlandı.

Loglardan görülen ana bulgu:

- Railway build başarılı.
- Healthcheck başarılı.
- Container çalışıyor.
- Ancak Docker build adımı sadece `pnpm --filter @workspace/api-server run build` çalıştırıyor.
- Frontend/Sade tema build çıktısının canlıya taşınmama ihtimali yüksek.

Kabul kriterleri:

- Docker/deploy akışı frontend değişikliklerini de build eder.
- Canlı `yekpare.net` üzerinde son committeki frontend değişiklikleri görünür.
- `/yemek`, `/market`, `/isletmeler` doğrudan canlıda erişilebilir ve eski `/siparis/category=...` görüntüsüne düşmez.
- Ana menüde `Parça` görünmez.
- Ana menüde `Yemek`, `Market`, `Yakındaki İşletmeler` görünür.

Son log doğrulaması:

- Yeni Railway build içinde `pnpm --filter @workspace/ahenkpress run build` çalıştı.
- `dist/public/index.html` ve yeni Vite asset dosyaları üretildi.
- API build ve healthcheck başarılı.

## 1.1. Runtime Log Hataları

Durum: Tamamlandı.

Loglardan görülen hatalar:

- `/api/map/places/photo` istekleri 502 dönüyor.
- `tr-address-auto-import` sırasında bazı mahalle/sokak kayıtlarında `adi` null geldiği için hata yazılıyor.

Kabul kriterleri:

- Google/harita işletme fotoğrafları 502 üretmez; fotoğraf yoksa düzgün fallback döner.
- TR adres import null `adi` kayıtlarını hata basmadan atlar veya güvenli şekilde normalize eder.
- Bu düzeltme sadece runtime hata düzeltmesi olarak yapılır; tema/modül tasarımına geçilmez.

Son doğrulama:

- `/api/map/places/photo` eksik/geçersiz fotoğraf girdilerinde artık 5xx/502 yerine boş 204 veya cachelenebilir 404 döner; çalışan Google fotoğrafları proxy edilmeye devam eder.
- TR adres importu null mahalle adlarını köy/bileşen adından normalize eder; adı gerçekten olmayan sokak kayıtlarını sayarak atlar.
- `pnpm --filter @workspace/api-server run build` başarılı.

## 1.2. Vercel Canlı Deploy Blokeri (yekpare.net eski kalıyordu)

Durum: Tamamlandı.

Kök neden:

- Vercel build ortamında `NODE_ENV=production` set edildiği için `pnpm install --frozen-lockfile` devDependencies kurulumunu atlıyordu (`devDependencies: skipped because NODE_ENV is set to production`).
- `vite`, `@workspace/ahenkpress` paketinin devDependency'si olduğundan kurulmuyor; build `sh: line 1: vite: command not found` + `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` ile düşüyordu.
- Bu yüzden her yeni git push deployment'ı FAIL oluyor, yekpare.net eski asset'i (`index-HQ8p3S0f.js`) göstermeye devam ediyordu.

Yapılan düzeltme (main üzerinde):

- `goalgo/vercel.json` installCommand'a `--prod=false` eklendi (commit `1c085758`), böylece `NODE_ENV=production` olsa bile devDependencies kuruluyor.
- HTML yanıtlarına `Cache-Control: no-store` ve `X-Yekpare-Frontend: ahenkpress-vercel` header'ları rewrite tabanlı uygulandı (commit `ed6d681e`, `5b4bfec5`).
- Yerel simülasyon doğrulandı: `NODE_ENV=production` + `pnpm install --frozen-lockfile --prod=false` devDeps kuruyor; `pnpm run build:web` ve sitemap script'i başarıyla çalışıyor.

Canlı doğrulama (10 Haziran 2026, 21:57):

- Son production deployment `dpl_FzQxjmoJM4AN2UQMk1hoVHKwmi1B` (goalgo-jayz1qgu7) Ready ve `yekpare.net` + `www.yekpare.net` alias'ları bu deployment'ı gösteriyor.
- `https://yekpare.net/` taze asset `assets/index-D3Jv-rAE.js` referans ediyor (eski `index-HQ8p3S0f.js` değil).
- Canlı JS bundle içinde `Yemek`, `Market`, `Yakındaki İşletmeler`, `/yemek`, `/market`, `/isletmeler` mevcut; üst seviye `Parça` yok.
- HTML header'ları: `Cache-Control: no-store, max-age=0, must-revalidate` ve `X-Yekpare-Frontend: ahenkpress-vercel` dönüyor.
- Sonraki git deployment'lar da artık başarılı (son ~20 dakikadaki production deploy'lar Ready).

Not: Kalıcı temizlik için Vercel proje ayarlarındaki `NODE_ENV=production` environment variable'ı silinebilir; `--prod=false` düzeltmesi bu değişken dursa da çalışır.

## 2. Sipariş İşletmelerini Üç Modüle Bölme

Durum: Tamamlandı (6amMart yapısına göre vitrinler yeniden yazıldı, 10 Haziran 2026).

Kabul kriterleri:

- `Yemek`: restoran, cafe, pastane, simit, börek gibi sadece yemek kategorileri.
- `Market`: market, manav, kuruyemiş, aktar, tavuk, kasap, şarküteri, fırın, yufka, su, içecek, balıkçı.
- `Yakındaki İşletmeler`: yedek parça, yapı market, elektronik, giyim, moda, petshop, kozmetik, hediyelik, bijuteri, çiçekçi, ayakkabıcı, nalburiye.
- Her modül ana menüde ve hizmet kartlarında ayrı görünür.
- Admin Sipariş bölümünde bu üç grup görünür filtre/kategori olarak yönetilebilir.
- Uygulanan sayfalar 6amMart modül anasayfalarının (food / grocery / pharmacy) bölüm akışını birebir izler.

Son doğrulama:

- `/yemek`, `/market`, `/isletmeler` artık `SiparisModulVitrin` ile 6amMart açık temasında (beyaz zemin, #039D55 yeşil vurgu) render edilir: yeşil üst banner + arama/konum kartı, yuvarlak kategori rayı, önerilen işletme rayı, indirimli/popüler ürün rayları, kampanya ve tanıtım bannerları, uygulama bannerı, sekmeli (Tümü / Yeni Katılanlar / Popüler / En Çok Puanlanan) tam işletme listesi.
- Bölüm sırası kaynak 6amMart koduyla eşleştirildi: yemek `food/index.js`, market `Grocery.js`, işletmeler `Pharmacy.js` akışından port edildi.
- `/siparis` üç vitrine açıkça yönlendiren genel bakış sayfasına dönüştürüldü (üç vitrin kartı + modül başına öne çıkan işletme rayları).
- API: `/delivery/vendors?module=...` artık kategori atanmamış işletmeleri ad/etiket sınıflandırmasıyla doğru modüle dağıtır (canlıdaki işletmelerde `categoryId` null olduğu için modül filtresi boş dönüyordu — kök neden düzeltildi). Yeni `/delivery/module-items` ucu modül bazlı ürün raylarını besler.
- Kategori sızıntısı çift katmanlı engellenir: API sınıflandırması + istemci tarafı `deliveryModuleGroups` kontrolü.
- Boş veri durumunda kategori rayı (gerekirse modülün standart kategori listesiyle) ve banner bölümleri render edilmeye devam eder; işletme listesi `Filtreleri Temizle` / `Tüm Şehirleri Göster` / `İşletmeni Ekle` aksiyonlu boş durum kartı gösterir.
- Yerel doğrulama: typecheck + vite build + api-server build başarılı; sayfalar yerel önizlemede gezilip bölüm akışı ve görünüm doğrulandı (ekran görüntüsü alındı).
- Admin Sipariş İşletmeleri ekranında `Sipariş grubu` filtre çipleri (Tümü/Yemek/Market/Yakındaki İşletmeler + adetler), Sipariş Kategorileri ekranında üç modül başlığı altında gruplanmış tablolar mevcut.

Canlı görünürlük kontrolü:

- `6460f163` ve runtime düzeltmesi `e1c1261c`, `origin/main` üzerinde mevcut; yerel `main` geride kaldığı için temiz `origin/main` worktree üzerinde kontrol edildi.
- Railway logu frontend build aldığını ve `dist/public/assets/index-DwzK9OM9.js` ürettiğini gösteriyor.
- Ancak `https://yekpare.net/` canlı yanıtı Railway container değil Vercel static host üzerinden geliyor; HTML `Server: Vercel` ve eski `/assets/index-HQ8p3S0f.js` dosyasını servis ediyor.
- Eski canlı JS içinde `Yemek`, `Market`, `Yakındaki İşletmeler` etiketleri yok; değişikliğin görünmemesinin nedeni task #2 kodu değil, canlı domainin stale Vercel asset/deploy path göstermesi.
- Vercel SPA HTML yanıtlarına `no-store` cache ve `X-Yekpare-Frontend: ahenkpress-vercel` headerı eklendi; yeni deploy sonrası canlı HTML yeni hashli assete geçmeli.
- 2026-06-10 kontrolünde `origin/main`, `4775f6f8`, `6460f163`, `e1c1261c` ve `8fd56c39` commitlerini içeriyor.
- 2026-06-10 canlı yanıtı hâlâ root Vercel ayarındaki `public, max-age=60, s-maxage=300` cache davranışını ve eski `/assets/index-HQ8p3S0f.js` assetini gösterdi; `X-Yekpare-Frontend` headerı yoktu.
- Kök `vercel.json` dosyasına da SPA HTML için `no-store` ve `X-Yekpare-Frontend: ahenkpress-vercel` headerları eklendi; çünkü Vercel projesi repo kökünden deploy ediliyorsa `goalgo/vercel.json` tek başına uygulanmıyor.
- Vercel CLI deploy denemesinde proje kökünün `goalgo` olduğu doğrulandı; remote build `NODE_ENV=production` altında pnpm devDependencies kurmadığı için `vite: command not found` hatasıyla düştü.
- Kök ve `goalgo/vercel.json` install komutları `pnpm install --frozen-lockfile --prod=false` olacak şekilde güncellendi; Vercel build için gerekli Vite/devDependency paketleri production deploy sırasında da kurulmalı.
- Canlı yeni Vercel assete geçtikten sonra bundle içinde kalan eski `Parça` metninin iki frontend sabitinden geldiği görüldü; public modül etiketi/href değeri `Yakındaki İşletmeler` ve `/isletmeler` olarak düzeltildi.
- Canlı HTML yeni assete geçmesine rağmen `Cache-Control` ve `X-Yekpare-Frontend` headerları uygulanmadığı için legacy `routes` fallback'i modern `rewrites` fallback'i ile değiştirildi; top-level Vercel header kuralları böylece HTML yanıtlarına uygulanmalı.
- `X-Yekpare-Frontend` uygulanınca kalan `Cache-Control: public, max-age=60, s-maxage=300` değerinin `middleware-seo-verification.js` içindeki HTML response yolundan geldiği doğrulandı; bu middleware HTML yanıtları da `no-store, max-age=0, must-revalidate` ve marker header ile güncellendi.

## 2.2. Google İşletme Fotoğrafları (Sipariş vitrinleri)

Durum: Tamamlandı (11 Haziran 2026 — canlı doğrulama bekleniyor).

Kök neden:

- `/yemek` ve `/isletmeler` kartlarında Google `photo_reference` URL'leri bayatlayınca `/api/map/places/photo` 404 dönüyordu; `onError` görseli gizleyip gri `bg-gray-100` alan bırakıyordu.

Yapılan:

- `place-photo-refresh.ts`: legacy ref 404 olunca Places API (New) ile taze foto çekilir, `map_businesses` + `vendors` güncellenir.
- `GET /api/map/places/photo`: stale ref 404 sonrası otomatik refresh dener; başarılıysa 200 `image/jpeg` döner.
- `POST /api/map/admin/refresh-stale-place-photos?limit=50`: admin toplu yenileme (legacy ref içeren kayıtlar).
- `SiparisModulVitrin` `StoreCard`: hata durumunda 🏪 fallback (gri boş alan yok).
- Yerel doğrulama: typecheck + build:web + api-server build + security:check başarılı.

Canlı doğrulama:

- Railway deploy sonrası stale ref istekleri 200 dönmeli; `/isletmeler` kartlarında gerçek Google/vendor fotoğrafları görünmeli (🏪 fallback başarı sayılmaz).

### Google otel detay görselleri (turizm)

Durum: **Düzeltildi** (11 Haziran 2026).

Kök neden:

- `map_businesses` otel detayında `gallery` SQL'de `'[]'::jsonb` sabitlenmişti; yalnızca boş `map_business_images` tablosu okunuyordu. `scraped_photos`, `cover_photo_url` / `photo_url` (bayat `photo_reference`) ve canlı Places API fotoğrafları kullanılmıyordu.

Yapılan:

- `tourism-map-gallery.ts`: DB görselleri + `scraped_photos` + proxy URL normalizasyonu + `google_place_id` ile canlı Places `photos` → `/api/map/places/photo` vekili.
- `GET /tourism/listings/:slug` (Google otel fallback): zenginleştirilmiş `gallery` + yerel `/assets/turizm-bc/hotel/` fallback.
- `BookingCoreDetailLayout`: galeri `onError` → yerel turizm görseli (gri boş alan yok).

Doğrulama: `/turizm/konaklama/grand-nora-hotel` galeri ana görsel + küçük resimler.

## 3. Keşfet / ListingHub Geçişi

Durum: Kısmen tamamlandı (11 Haziran 2026 — ListingHub home-2 + single-listing-01 native port; şehir/Popüler Aramalar güncellemesi aynı gün; **§3.1** bölge mozaik küçük kart bekliyor).

Yapılan:

- `/kesfet` ListingHub **home-2** işlev düzeni korunur; **üst hero (11 Haz 2026):** koyu restoran foto bloğu kaldırıldı → Yekpare Sade açık yeşil/beyaz panel (`lh-hero-panel`), yeşil arama CTA (`#0f766e`), popüler etiket chip’leri + hero kategori chip grid’i, arama/konum/kategori formu; PopularListingTwo tarzı işletme grid’i; bölge mozaik anasayfada. «Tüm hizmetler» ve «Yekpare platform hizmetleri» kutuları `/servisler` en altına taşındı; `/kesfet` arama/liste odağında kalır. `listinghubKesfet.css` + `data-page="kesfet-listing-hub"`; içerik `max-width: 1440px`.
- **Bölgelere göre keşfet:** 7 bölge mozaik kartı (Marmara/Ege/Akdeniz/İç Anadolu/Karadeniz/Doğu/Güneydoğu) — orantılı bento düzen, bölge temsil görseli, şehir chip’leri; altında «Tüm şehirler» 81 il kaydırmalı chip. (Doğu/Güneydoğu geniş kart → küçük kart: **§3.1**, commit `ce9e5fd6`.)
- **Popüler Aramalar:** Sağlık / Ev / Hizmetler / **Eğitim** / Eğlence / Seyahat sekmeli premium pill düzeni; Aile Sağlığı Merkezleri ve Sağlık Ocakları kaldırıldı; Eğitim altında 17 özel eğitim alt kategorisi (`/api/map/discover-categories`, `syncKesfetDiscoverCategories` ile canlı DB senkronu).
- **Hero arama:** Orta alan düzenlenebilir konum girişi («Konumunuzu yazın»); alt tekrarlayan konum kutusu kaldırıldı; Konumum / Harita görünümü / İşletmeni ekle tek satırda.
- **Hero kategori:** Dropdown + üst bölümde kompakt kategori chip grid’i (8 kategori); tam sayfa kategori kart grid’i yok — Popüler Aramalar ayrı bölümde.
- **Popüler işletmeler (12 Haz 2026):** İşletme grid’inin üstünde «Tüm şehirler» yatay chip satırı (81 il + «Türkiye geneli»); seçim `?city=` ile URL’de kalır, başlık `Popüler işletmeler — {şehir}` güncellenir. Sonsuz kaydırma: `IntersectionObserver` + `/api/map/businesses?limit=12&offset=…` (sayfa sonu spinner, liste sonu mesajı); arama/kategori/şehir değişince sayfalama sıfırlanır.
- **Erişilebilirlik:** Hero «İşletmeni ekle» ve arama CTA yeşil kontrast (`lh-hero-action-*`, `lh-btn-primary`).
- **Admin Haritalar:** Kategoriler sekmesinde «Keşfet kategorileri» grubu; Veri Kazıyıcı’da Keşfet alt kategori seçici (OSM / GMaps bot / Places alanlarını doldurur).
- `/kesfet/:slug` (`IsletmeDetay`) ListingHub **single-listing-01** düzeninde: tam genişlik kapak foto hero, logo/puan/konum/kategori overlay, yatay bölüm menüsü (Genel Bakış, Ürünler, Özellikler, Galeri, Haritalar, Yorumlar), ana içerik + sağ iletişim/rezervasyon/çalışma saatleri kartları, ürün sepet çekmecesi (UI kabuğu, gerçek ödeme yok).
- Google fotoğraf proxy/fallback (`resolveClientMediaSrc`, Places refresh) korunur; eksik görselde 🏪 fallback.
- «Konuma git» dahili `/haritalar?nav=…&lat=…&lng=…` (Google Maps dış link yok).
- `/haritalar` tam `Kesfet` harita deneyimini açar; harita üst bar, kategori chip’leri, güzergah/navigasyon panelleri ve alt kontroller **Yekpare Sade** yeşil-beyaz paletinde (`Kesfet.tsx`, `kesfetHaritaSade.css`) — mor/kırmızı/turuncu harita chrome regresyonu yasak (11 Haz 2026).
- Yalnızca Türkçe Yekpare markalama; ListingHub logosu/isim yok.
- Yerel doğrulama: `pnpm run typecheck`, `pnpm run build:web`, `pnpm run security:check` başarılı.

Kabul kriterleri:

- `/kesfet` üst bölüm Yekpare Sade ile uyumlu: açık yeşil/beyaz hero panel, yeşil arama CTA; koyu tam ekran foto hero ve kırmızı ListingHub vurgusu üst bölümde yok. İşletme grid’i ve detay sayfası ListingHub home-2 / single-listing-01 işlevini korur.
- `/kesfet/:slug` single-listing-01 hero + sekme + sidebar düzeninde.
- İşletme kartları ve detay linkleri çalışır.
- `/kesfet` «Popüler işletmeler» bölümünde şehir chip’leri görünür; şehir seçimi listeyi filtreler; aşağı kaydırınca ek işletmeler yüklenir.
- Konum Yekpare Haritalar üzerinden açılır.
- Canlı deploy sonrası `/kesfet` (30 şehir kartı, Popüler Aramalar sekmeleri, görünür hero butonları), `/kesfet/merve-pide-1992-2`, `/haritalar` (yeşil-beyaz üst bar + güzergah paneli, mor/turuncu chrome yok) tarayıcı testi; admin `/admin/haritalar` → Kategoriler → Keşfet kategorileri.

### 3.1. Bölge mozaik — Doğu Anadolu ve Güneydoğu Anadolu küçük kart

Durum: Bekliyor.

İlgili commit: `ce9e5fd6` (bölge mozaik yerel landmark görselleri + görünür şehir chip’leri — §3 «Bölgelere göre keşfet»).

Sorun:

- `/kesfet` bölge mozaik ızgarasında Marmara (büyük), Ege (orta), Akdeniz / İç Anadolu / Karadeniz (küçük) orantılı; **Doğu Anadolu** ve **Güneydoğu Anadolu** alt satırda geniş kart olarak kalıyor — alt satırı domine ediyor, asimetrik mozaik dengesi bozuluyor.

Yapılacak:

- Doğu Anadolu ve Güneydoğu Anadolu bölge kartlarını **küçük kart** boyutuna indir (Akdeniz, İç Anadolu, Karadeniz ile aynı oran).
- Bölge temsil **landmark görselleri** (`public/assets/kesfet-regions/dogu-anadolu.jpg`, `guneydogu.jpg`) korunur; kırpma/clipping olmadan okunaklı kalır.
- Alt şehir **chip’leri** tam görünür; metin kesilmez veya taşmaz.
- Asimetrik mozaik ızgara dengeli kalır — alt satırda iki geniş kart yerine küçük kartlarla uyumlu düzen.

Dosyalar:

- `goalgo/artifacts/ahenkpress/src/lib/kesfetRegions.ts` — bölge kart boyutu / grid rolü (`size`, `gridArea` veya eşdeğeri)
- `goalgo/artifacts/ahenkpress/src/pages/public/KesfetListingHub.tsx` — mozaik bölümü kabuğu
- `goalgo/artifacts/ahenkpress/src/components/kesfet-listinghub/KesfetRegionMosaic.tsx` — kart render
- `goalgo/artifacts/ahenkpress/src/styles/listinghubKesfet.css` — `.lh-kesfet-region-mosaic` grid alanları ve küçük kart ölçüleri

Kabul kriterleri:

- Canlı `/kesfet` sayfasında Doğu Anadolu ve Güneydoğu Anadolu **küçük, orantılı** kartlar olarak görünür (Akdeniz / Karadeniz / İç Anadolu ile aynı boyut sınıfı).
- Her iki kartta bölge adı, temsil şehir adı ve şehir chip’leri **tam okunur**; chip metinleri kesilmez.
- Landmark arka plan görselleri kart içinde anlamlı kadrajda kalır (boş/gri alan veya aşırı zoom yok).
- Mobil ve masaüstünde alt satır iki geniş kartla domine edilmez; mozaik genel dengesi korunur.
- `ce9e5fd6` ile gelen görsel/chip iyileştirmelerinde regresyon yok.

## 9. Footer yasal + Anasayfa (SixAmMart)

Durum: **Kısmen tamamlandı** — footer yasal linkler tamam; anasayfa service rails + platform modül grid genişletildi (11 Haziran 2026).

Yapılan:

- `SixAmMartTheme` Shell footer'a yasal linkler eklendi (mesafeli satış, KVKK, SSS, künye vb. — `parseFooterLegalLinksJson` varsayılanları).
- Sade tema aktifken `/` → `YekpareSadeHome` → `SixAmMartHomePage` kabuğu render edilir (hero, modül seçici, öne çıkan işletmeler, haber grid'i).
- **Header nav:** Haritalar (`/haritalar`) `PUBLIC_LINKS` içinde.
- **Service rails (`HOME_SERVICE_RAILS`):** Yemek, Market, Yakınımdakiler, Turizm, Ulaşım, Mağaza, Keşfet, Haritalar, Haberler, YekTube, Haber Merkezi, AI Çağrı — `yekpareServiceNav.ts` tek kaynak.
- **Platform grid (`YEKPARE_PLATFORM_MODULES`):** Keşfet, Haritalar, Haberler, YekTube, Haber Merkezi, AI Çağrı Merkezi kartları.
- **Modül sayfaları sırası:** `/yemek`, `/siparis`, `/turizm`, `/ulasim` — `SadePublicChrome` nav + aktif durum yol üzerinden (`resolveSixAmMartActiveFromPath`); Turizm alt nav: Turizm, Turlar, Otel, Villa/Ev, Araç Kiralama, Yat Turları.
- **YekTube tema uyumu:** `/yektube` ve kanal sayfaları Sade yeşil/teal paleti ile hizalandı (11 Haziran 2026).

Kalan:

- **§9.1** — 6amMart referansına tam pixel-parite (promo carousel, mobil app banner, kategori çipleri derinliği).
- **YekTube:** Anasayfa service rail / platform grid kartında YekTube vurgu rengi hâlâ kırmızı (`#dc2626`); sayfa gövdesi yeşil — isteğe bağlı rail rengi hizalaması.
- `SiteFooter` (koyu tema) ile sade tema footer metinlerinin panelden tek kaynak yönetimi.

### 9.1. Anasayfa — 6amMart / Sade Tema Yeniden Tasarım

Durum: **Kısmen tamamlandı** — `/servisler` servis odaklı tutuldu; haber manşeti, Türkiye Şehirleri ve Bilgi Ağacı kutuları servis vitrininden kaldırıldı. Türkiye Şehirleri + Bilgi Ağacı `/haberler` akışına taşındı; `/haberler` ana manşeti kendi sayfasında korunur (12 Haziran 2026).

**Son commit:** `feat(news): align homepage and news headlines with editorial modules` — paylaşımlı `SadeNewsHeadlineGrid`, hero `object-cover` yükseklik düzeltmesi, piyasa/hava şeridi, bülten CTA.

**Görev hatırlatması:** Anasayfa 6amMart temasına uygun olarak yeniden dizayn edilecek; haberler kısmı (manşet, köşe yazarları, modüller) §4 kapsamında mevcut tema renklerinde eklenecek.

Kök gereksinim:

- Ana landing (`/`) **6amMart / Sade SixAmMart tema fidelitesi** ile yeniden tasarlanır — ekran görüntüsündeki eski koyu anasayfa (`Home.tsx`, `HmCorporateHome`, mor `PublicLayout` sarmalayıcı) **hedef değildir** ve kabul edilmez.
- Sayfa **Yeni Sade tema chrome** içinde kalır: beyaz header, yeşil Yekpare logosu, Yemek/Market/Keşfet nav — `/yemek`, `/siparis`, `/kesfet` ile aynı `SadePublicChrome` (terminoloji tablosu; eski tema **yasak**).
- Public tema tek seçenek: **Yekpare Sade**; admin «Public modül teması» seçici ve `yekpare-renkli` kaldırıldı (12 Haziran 2026). Tüm portal ziyaretçileri `YekpareSadeHome` görür.

Referans kaynaklar:

| Kaynak | Konum | Kullanım |
|--------|-------|----------|
| 6amMart React user website | `6ammart-react-user-website/` (yerel) | Bölüm akışı, kart düzeni, renk/token referansı |
| Mevcut port | `SixAmMartHomePage` — `goalgo/artifacts/ahenkpress/src/themes/sixammart/SixAmMartTheme.tsx` | Başlangıç noktası; tam fidelite için genişletilecek |
| Rota girişi | `YekpareSadeHome.tsx`, `PortalHomeRoute` — `App.tsx` | Sade tema → yeni anasayfa |
| Sipariş vitrinleri (renk/tokens) | §2 — `#039D55` yeşil, beyaz zemin | Anasayfa renk tutarlılığı |

Hedef bölümler (6amMart-style, Yeni Sade chrome içinde):

- **Hero:** Konum/arama kartı, büyük başlık, birincil CTA (Siparişe başla / Keşfet)
- **Hizmet rayları (service rails):** Yemek, Market, Yakındaki İşletmeler, Keşfet, Turizm modül girişleri — yuvarlak ikon + etiket
- **Kategori çipleri:** Hızlı kategori/konum filtreleri
- **Öne çıkan işletmeler:** Kart grid'i (`StoreCard` `dense` — §2 ile uyumlu); **mobil (<640px) 2 sütun** (`grid-cols-2`, satır başına iki işletme, kompakt kart); tablet/desktop `lg:grid-cols-4`; **işletme açıklaması gösterilmez** (görsel, ad, puan, konum)
- **Günün fırsatları (ürünler):** `HomeShoppingShowcase` — **Alışveriş** tek vitrin rayı, üstte kategori chip linkleri (§3); sekmeler kaldırıldı; eski 2 sütun grid kaldırıldı
- **Promos / kampanyalar:** Banner veya promo kartları
- **Bölgelere göre keşfet:** `KesfetRegionsExploreBlock` — bölge mozaik bloğu (Sipariş sekmelerinin altında)
- **Seyahat sekmeleri:** `HomeTravelTabs` — Otel / Villa & Ev / Tur / Araç / Yat & Tekne vitrin rayları
- **Türkiye Şehirleri bandı:** `SadeHomeCitiesBandCompact` — `/haberler` editoryal akışında; 30 büyükşehir yatay scroll. `/servisler` üzerinde görünmez.
- **Haberler bloğu:** §4 — manşet özeti (`SadeNewsHeadlineGrid`, **Hızlı erişim** sağ sütunda) yalnızca `/haberler` sayfasının kendi ana manşeti olarak kalır; `/servisler` haber manşeti göstermez.
- **Bilgi Ağacı günlük bandı:** `SadeBilgiAgaciDailyBand` — `/haberler` editoryal akışında Türkiye Şehirleri ile birlikte; `/servisler` üzerinde görünmez.
- **Hizmet / platform grid:** «Tüm hizmetler» ve «Yekpare platform hizmetleri» bölümleri `/servisler` sayfasının en altında, footer öncesi kapanış alanında; `/kesfet` arama/liste odağında kalır.
- **Mobil uygulama banner'ı** (varsa site ayarlarından)

Uygulama hedefleri:

- `goalgo/artifacts/ahenkpress/src/themes/sixammart/SixAmMartTheme.tsx` — `SixAmMartHomePage` genişletme/yeniden yazım
- `goalgo/artifacts/ahenkpress/src/pages/public/YekpareSadeHome.tsx` — ince sarmalayıcı (değişmeden kalabilir)
- `6ammart-react-user-website/` — `HomePageComponents.js`, modül vitrin bileşenleri referans

Çapraz referanslar:

- **§4:** Haber manşeti, Türkiye Şehirleri bandı, Bilgi Ağacı bandı, köşe yazarları ve diğer editoryal modüller `/haberler` sayfasında; `/servisler` yalnızca servis vitrini kalır.
- **§2:** Öne çıkan işletme/ürün kartları sipariş vitrinleriyle aynı görsel dil.
- **§6:** Eski koyu anasayfa ve mor nav anasayfada görünmez.
- **Terminoloji:** Yalnızca Yeni Sade chrome; eski tema yasak.

Kabul kriterleri:

- Canlı `/` (Sade tema) açıldığında **beyaz header + yeşil logo** görünür; mor Turinet `AppNav` veya koyu arka planlı eski anasayfa **görünmez**.
- Hero, hizmet rayları, kategori çipleri, öne çıkan işletmeler ve promo bölümleri 6amMart referansına **görsel olarak yakın** (profesyonel, açık zemin, `#039D55` yeşil vurgu) render edilir.
- `/servisler` bölüm sırası (12 Haziran 2026): Hero → service rails → promos → öne çıkan işletmeler → **Alışveriş** (`HomeShoppingShowcase`) → **Sipariş** (`HomeOrderTabs`) → **Bölgelere göre keşfet** → **Seyahat** (`HomeTravelTabs`) → **Tüm hizmetler** → **Yekpare platform hizmetleri** (footer öncesi son kutular). Haber manşeti, Türkiye Şehirleri ve Bilgi Ağacı bu rotada görünmez.
- Haber bloğu §4 kriterlerini `/haberler` üzerinde karşılar: **manşet özeti** (`SadeNewsHeadlineGrid`, sol ~2/3 hero + sağ ~1/3 **2×2 yan kart grid** + **Hızlı erişim** 🔴 Son dakika · 📰 Tüm haberler · ✍️ Yazarlar · ✨ Keşfet); Türkiye Şehirleri ve Bilgi Ağacı aynı sayfada editoryal akışta yer alır.
- «Tüm hizmetler» ve «Yekpare platform hizmetleri» grid'leri `/servisler` en altında görünür; `/kesfet` içinde bu kutular görünmez. Şehir chip tıklamaları `/kesfet?city=…` rotasını korur.
- Tüm CTA/linkler çalışır (`/yemek`, `/market`, `/isletmeler`, `/kesfet`, `/haberler` vb.); boş veya `#` link kalmaz.
- Mobil ve masaüstünde responsive; kart/grid taşması veya kesik metin yok.
- **Mobil anasayfa (12 Haziran 2026, günc.):** Öne çıkan işletmeler mobilde **satır başına 2 kart** (`grid-cols-2`, `StoreCard dense`: `aspect-[4/3]` görsel, `line-clamp-2` başlık, puan görünür, **açıklama yok**, taşma yok); **Alışveriş** bölümü `HomeShoppingShowcase` yatay ürün rayı + üstte yatay kaydırmalı kategori chip linkleri (mobilde kompakt kart, `sm`+ genişletilmiş); Haberler yan kartları `<640px` viewport'ta **2 sütun** (`mobileTwoColumn`); tablet/desktop (`sm`+) mevcut düzen korunur.
- **Sipariş / Seyahat / Alışveriş vitrinleri (12 Haziran 2026):** Anasayfada **Sipariş** bölümü `HomeOrderTabs` ile yenilendi — **Yemek | Market | Yakınımdakiler** sekmeleri; her sekmede yatay **kategori rayı** (emoji chip, `?kategori=` veya `/kesfet?q=` linkleri) ve **popüler vitrin rayı** (`/api/delivery/module-items`, işletme kartları); **Tümünü Gör** → `/yemek`, `/market`, `/kesfet`. **Alışveriş** bölümü `HomeShoppingShowcase` ile öne çıkan işletmelerden hemen sonra — **sekme yok**; üstte **Tüm ürünler | Elektronik | Moda | Ev & Yaşam | Oto & Aksesuar | Sağlık & Wellness** kategori chip linkleri (`/magaza` veya `?kategori=` slug); altta tek **Öne çıkan ürünler** yatay rayı — tüm kategorilerden karma ürün (`/api/delivery/marketplace?randomize=1` + kategori başına paralel çekim, istemci karıştırma; her yüklemede farklı sıra); API boşsa karışık statik rota kartları; **Tümünü Gör** → `/magaza`. **Seyahat** bölümü `HomeTravelTabs` — **Otel | Villa & Ev | Tur | Araç | Yat & Tekne** sekmeleri; her sekmede kategori rayı (`?city=` / `?q=` veya destinasyon linkleri) ve popüler ilan rayı (`/api/tourism/listings`, API boşsa statik rota kartları); **Tümünü Gör** → `/turizm/konaklama`, `/turizm/villa-ev`, `/turizm/turlar`, `/turizm/arac-kiralama`, `/turizm/yat-turlari`. Hemen altında **Türkiye Şehirleri** bandı; ardından **Haberler** manşet bloğu; **Bilgi Ağacı** günlük bandı en altta. `/siparis` ve `/turizm` vitrin sayfalarında `HomeServiceTabs` korunur.
- **Güncel not (12 Haziran 2026):** Bu vitrin akışında Türkiye Şehirleri, Haberler manşeti ve Bilgi Ağacı artık `/servisler` üzerinde görünmez; Türkiye Şehirleri ve Bilgi Ağacı `/haberler` editoryal akışına taşındı.
- `SixAmMartHomePage` dışındaki eski `Home.tsx` koyu anasayfa varsayılan portal rotasında **birincil yüzey olmaz**.
- Yerel smoke: `pnpm run typecheck` + `build:web` başarılı; tarayıcıda `/` bölüm akışı ve renk tutarlılığı doğrulanır.

## 4. Haberler

Durum: **Kısmen tamamlandı** — `/haberler` sadeleştirildi; HM→Yekpare editör haber senkronu eklendi (11 Haziran 2026).

### 4.1. HM editör siteleri → Yekpare merkez haber senkronu

Durum: **Tamamlandı** (11 Haziran 2026) — köşe yazarı ad eşlemesi + haber detay düzeni güncellendi.

**Kök neden (ilk):** Admin panelinde köşe yazarı / manuel haber yalnızca HM `site_id` ile kaydediliyordu; Yekpare `/haberler` ve `/yazarlar` `siteScope=portal` (`news.site_id IS NULL`) filtrelediği için editör içerikleri merkez vitrinde görünmüyordu.

**Kök neden (köşe yazarı boş liste — 1):** Senkron yalnızca `isEditorManual` veya siteye özel kategorili `news` kayıtlarını alıyordu; blog/köşe kategorili veya yazar bağlı HM `news` + AHB `hm_makaleler` içe aktarımı sonrası tetiklenmeyen senkron nedeniyle yazar profili oluşurken merkez `news.author_id` boş/eksik kalıyordu.

**Kök neden (köşe yazarı boş liste — 2, 11 Haziran 2026):** Kaynak sitede yazar adı kısaltmalı (`Harika H. SAYKINCI`), portal profili tam adla (`Harika Hayriye Saykıncı`) kayıtlıydı. `normalizeAuthorName` yalnızca birebir eşleşme yaptığından senkron ayrı portal yazar kaydı oluşturuyor, makaleler farklı `author_id` ile kalıyordu; `/yazar/:id` sorgusu eşleşmeyen kayıtları bulamıyordu.

**Yapılan:**

- `hm-yekpare-news-sync.ts`: idempotent upsert (`rss_source_url` = `yekpare-hm-sync:{siteId}:{kind}:{id}`); manuel haber + siteye özel kategorili haber + `hm_makaleler` köşe yazıları → merkez `news`; yazarlar `hm_site_id NULL` profiline eşlenir; eksik kategoriler portalda oluşturulur (`{siteSlug}-{catSlug}`); içerik altına kaynak notu: «Bu haber, Yekpare Haber Merkezi sitesi, {site adı} sitesi tarafından eklenmiştir» + link.
- **Köşe backfill (11 Haziran 2026):** `shouldSyncEditorNews` — yazar bağlı ve blog/köşe kategorili HM `news` de senkronlanır; `resolveCentralAuthorId` portal yazarlarını (`hm_site_id NULL`) tanır; `repairCentralAuthorLinks` eksik/yanlış merkez `author_id` bağlarını kaynak HM kaydından düzeltir; startup her açılışta idempotent backfill (`SKIP_HM_YEKPARE_SYNC=1` ile kapalı).
- **Yazar adı eşlemesi (11 Haziran 2026):** `hm-sync-source.ts` — `authorsRepresentSamePerson` / `authorMatchKey` (ad+soyad, orta ad/baş harf, Türkçe I/İ/ı/i katlama); senkron, `/api/news?authorId&siteScope=portal`, `/api/authors` peer sorguları ve `consolidatePortalAuthors` birleştirmesi bu mantığı kullanır.
- **Haber detay düzeni (11 Haziran 2026; günc. 12 Haziran 2026):** Yekpare portal `/haber/:slug` (`SixAmMartNewsDetailPage`) + HM partner `/tr/:slug/haber/:id` (`HaberDetay.tsx`) — editör haber sitesi düzeni: breadcrumb → ana sütunda **kategori → başlık → tarih/yazar meta → tam görsel (`object-contain`, max-height, slate zemin) → özet/spot kutusu → gövde**; köşe/makale detayında da görsel varsa aynı sıra; özet yoksa `spot` → `summary` → `description` → içerikten ilk cümle; paylaşılan `EditorialNewsDetailHeader`; sağ `HmNewsDetailSidebar`; gövde `yekpare-rich-content` + `yekpare-news-body`.
- **Hero + alt menü hizası (12 Haziran 2026; günc. 12 Haziran 2026 — YekTube/Haberler/Turizm):** `/haberler`, `/yektube`, `/turizm` (Seyahat hub) — krem-yeşil hero gradient **ana menünün hemen altından** başlar; kategori/alt nav cam (`backdrop-blur`) yüzeyle gradient içinde; çift hero bandı yok (`SadePublicChrome`/`Shell` varsayılan hero eklemez). **`/yektube` anasayfa:** hoşgeldin başlık bloğu (logo, kanal sayıları, CTA) kaldırıldı — yalnızca kısa gradient + alt menü bandı (`sade-public-hero-surface--subnav-only`); içerik (sidebar, canlı yayınlar, videolar) hemen altında, boşluk yok. **`/haberler`:** piyasa/hava, manşet ve tüm editoryal modüller **beyaz gövdede**; gradient yalnızca kategori alt menüsü altında ince geçiş bandı (yeşil Manşet arkasına taşmaz). **`/turizm`:** BookingCore hub hero içindeki «Merhaba!» / «Nereye gitmek istersiniz?» metinleri kaldırıldı; arama/rezervasyon formu alt menüye yakın, kısa hero bandı içinde kalır; gradient/fade korunur. Public zemin **beyaz** (`SADE_PUBLIC_PAGE_BG_WHITE`, fade hedefi `#ffffff`).
- **Yazar yazı listesi:** `YekparePortalYazarYazilari` + `KoseArticleTextCard` kart aralığı/padding iyileştirildi.
- AHB köşe içe aktarma (`import-ahb-kose`) ve köşe yazar self-service `news` oluşturma/güncelleme sonrası arka plan senkron tetiklenir.
- `POST /api/hm/admin/sync-yekpare` + `/admin/yekpare-haberler` «HM → Yekpare haber senkronu» düğmesi (sayım/JSON sonuç; `authorLinksRepaired`, `authorsMerged` alanları).
- Editör `news` / `makale` / `authors` oluşturma-güncelleme sonrası arka plan senkron tetiklenir.
- Portal `/yazar/:id` (Yekpare host) merkez yazar yazıları; `/api/authors` global liste `articleCount` + `latestArticle`.

**Kalan:**

- Canlı smoke: deploy sonrası **bir kez** admin «HM → Yekpare haber senkronu» veya API restart (startup backfill) — mevcut duplicate yazarları birleştirip `author_id` bağlarını onarır.
- Silinen kaynak haberin merkez kopyasının otomatik kaldırılması (şu an yalnızca upsert; stale delete yok).
- `dryRun` önizleme sayımı (şu an yalnızca site taraması, yazma yok).

Durum (önceki): **Tamamlandı** — `/haberler` sadeleştirildi; anasayfa 30 büyükşehir bandı; Atatürk bandı tek satır (11 Haziran 2026).

**Son commit:** `fix(news): simplify editorial bands and expand cities` — clutter bantlar varsayılan kapalı; Atatürk beyaz/yeşil tint; 30 büyükşehir yatay scroll.

**Yapılan (11 Haziran 2026 — bant sadeleştirme):**

- **Kaldırılan / varsayılan kapalı bantlar** (`/haberler` ve anasayfa): Son dakika haber bandı (`breakingBand`), RSS son dakika kart bandı (`googleNewsBand`), namaz/günün sözü kamu kartları (`publicInfo`), son gelişmeler zaman çizgisi (`timeline`). Admin toggle'ları korunur; `defaultNewsSiteLayoutPrefs` + `isSadeNewsPortalModuleEnabled` varsayılan **kapalı**; modül sırasında listenin sonuna alındı.
- **Manşet korundu:** `headlineGrid` / `SadeNewsHeadlineGrid` varsayılan açık; `/` ve `/haberler` aynı kaynak.
- **Atatürk bandı:** Koyu gradyan + alıntı/aksiyon iki satır kaldırıldı → tek yatay kart satırı (`SadeAtaturkBand`); beyaz zemin + hafif yeşil şeffaf tint; portre + «Tümü» linki; `ATATURK_CORNER_LINKS` bağlantıları çalışır.
- **Türkiye Şehirleri (anasayfa):** `METROPOLITAN_CITIES` — 30 büyükşehir belediyesi; `SadeHomeCitiesBandCompact` yatay scroll + ok düğmeleri; dev grid yok.
- **Admin:** `/admin/yekpare-haberler` açıklama metni güncellendi; clutter modül switch'leri varsayılan kapalı davranışı yansıtır.

**Yapılan (11 Haziran 2026 — RSS Son Dakika kart bandı):**

- **Kök neden:** Admin panelinde «RSS son dakika kart bandı» (`googleNewsBand` / `hmNewsGoogleNewsBandEnabled`) açık görünüyordu ancak Yekpare `/haberler` modül sırasında (`SADE_NEWS_PORTAL_MODULE_ORDER`) bu anahtar yoktu; `SixAmMartNewsPage` yalnızca dahili `/api/news/breaking` bandını (`breakingBand`) render ediyordu — legacy `HmRssBreakingBand` + `/api/hm/rss-breaking` hiç çağrılmıyordu.
- **`googleNewsBand`** `SADE_NEWS_PORTAL_MODULE_ORDER` içinde (listenin sonunda); admin toggle `hmNewsGoogleNewsBandEnabled` varsayılan **kapalı** — panelden açılabilir.
- **`SadeRssBreakingBand`** (`SadeNewsModules.tsx`): legacy `HmRssBreakingBand` + NTV varsayılan RSS satırları; başlık «Haber Bandı», kategori pill’leri, 5 sütun kart ızgarası (görsel, rozet, özet, saat).
- **Yedek:** RSS boş/hata veya kaynak tanımsızsa portal `/api/news/breaking` + son haberler API ile kart bandı gösterilir; yükleme/hata durumları graceful.
- **Admin:** `/admin/yekpare-haberler` → «Yekpare /haberler (Sade) modülleri» listesinde «RSS son dakika kart bandı»; RSS satırları aynı panelde.

**Yapılan (11 Haziran 2026 — bant birleştirme + anasayfa şehirler):**

- **Savaşlar + Millî Günler** tek bandda birleştirildi: `historyNationalDaysBand` → «⚔️ Tarih ve Millî Günler»; savaş ve millî gün kartları emoji ikonlu, yatay scroll.
- **Kültür bandı** `/haberler` sayfasından kaldırıldı (`cultureBand` legacy; varsayılan kapalı).
- **Türkiye Şehirleri** `/haberler`'den anasayfaya taşındı — manşet bloğunun hemen altında kompakt `SadeHomeCitiesBandCompact` (🗺️ emoji, 30 büyükşehir, yatay scroll, Bilgi Ağacı linkleri).
- **Admin:** `sadeNewsHistoryNationalDaysBandEnabled` (varsayılan açık), `sadeNewsCitiesBandEnabled` artık anasayfa bandını yönetir; `/admin/yekpare-haberler` modül listesi güncellendi.

**Yapılan (11 Haziran 2026 — Yekpare Bilgi Ağacı / `/ansiklopedi`):**

- **Kök neden:** Vikipedi çözümleyici «Osmanlı İmparatorluğu» ve «Cumhuriyet Bayramı» aramalarında alt maddeye (ör. arması) kayıyordu; öne çıkan konu linkleri doğrudan başlık slug’ı kullanıyordu.
- **Düzeltme:** `wiki.ts` slug/sorgu alias’ları (`osmanli_imparatorlugu`, `cumhuriyet_bayrami` → `29 Ekim Cumhuriyet Bayramı`), drift kelimeleri (`armasi`); millî gün sidebar’ı `nationalDayEncyclopediaPath`; öne çıkan konularda `wikiTitle`.
- **UI:** Kullanıcıya görünen ad **Yekpare Bilgi Ağacı** (rota `/ansiklopedi` sabit); Wikipedia kaynak/disclaimer metinleri kaldırıldı; landing + detay **1440px** (`yekpare-page-container`), yeşil kart hero, Sade chrome (`SadeAwarePublicLayout`).

**Yapılan (11 Haziran 2026 — Bilgi Ağacı okunabilirlik / zengin içerik düzeni):**

- **Kök neden:** Vikipedi HTML’inde infobox + wikitable tablolarının tamamına `float: right` uygulanıyordu; Osmanlı İmparatorluğu gibi uzun maddelerde metin dar sol sütuna sıkışıyordu.
- **Düzeltme:** `.yekpare-rich-content` — yalnızca `table.infobox` sağa float; `wikitable`/veri tabloları tam genişlik; `h2`/`h3` `clear: both`; mobilde infobox stack. `AnsiklopediDetay`, `HaberDetay`, SixAmMart haber gövdesi ve kurumsal HTML sayfalarına uygulandı.

**Yapılan (11 Haziran 2026 — Bilgi Ağacı Wikipedia düzeni + günlük anasayfa):**

- **Kök neden:** Önceki genişletme (370372af) `.wiki-article` için tüm float'ları kapatıp infobox/görselleri tam genişlik blok yaptı; detay sayfasında hero + galeri + gövde görselleri üst üste biniyordu.
- **Detay düzeni:** Wikipedia benzeri akış — infobox sağ float, küçük görseller sağ sütun, wikitable tam genişlik; `İçindekiler` (h2/h3); Yekpare sidebar 260px (xl altında altta). Hero banner ve tekrarlayan galeri kaldırıldı.
- **Günlük akış:** `GET /api/wiki/homepage` — `tr.wikipedia.org/wiki/Anasayfa` günde bir cache; günün seçilmiş maddesi, tarihte bugün, biliniyor muydunuz, kaliteli madde, günün görseli. `/ansiklopedi` landing «Günlük bilgi akışı» kartları (yeşil/beyaz tema).
- **Test:** `/ansiklopedi`, `/ansiklopedi/Osmanlı_İmparatorluğu`, `/api/wiki/homepage`.

**Yapılan (11 Haziran 2026 — Bilgi Ağacı detay + günlük grid düzeni):**

- **Kök neden:** Sol sticky TOC sütunu makale genişliğini daraltıyordu; sağ float infobox/görseller `clear:right` ile uzun dikey şerit oluşturuyordu; günlük kartlar 3 sütunlu grid’de dağınık görünüyordu.
- **Detay:** Sol TOC kaldırıldı — bölüm başlıkları makale üstünde yatay pill navigasyon; infobox/görsel max genişlik-yükseklik; 3+ görsel grid satırı; Yekpare sidebar 240px.
- **Anasayfa:** «Günün Seçilmiş İçerikleri» — seçilmiş madde tam geniş üst kart; diğer günlük bloklar altında 2 sütun (mobilde 1).

**Yapılan (11 Haziran 2026 — Bilgi Ağacı anasayfa oran + bölüm sırası):**

- **Kök neden:** İç içe `yekpare-page-container` sayfayı daraltıyordu; günlük seçilmiş kartta `originalimage` geniş şerit + uzun HTML özeti boş/tall kart oluşturuyordu; «Önerilen konular» günlük blokların altındaydı.
- **Oran:** Tek container genişliği (1440px); günlük kartlarda `aspect-ratio` + `object-fit: cover`; özet `seoPlainSnippet` / backend `trimWikiCardExtract` (280 karakter); ikincil kartlar 2 sütun grid.
- **Sıra:** Hero → arama → **Önerilen konular** (arama kartı içinde, kompakt grid) → Günün Seçilmiş İçerikleri.

**Yapılan (12 Haziran 2026 — Bilgi Ağacı önerilen konular + anasayfa günlük bandı):**

- **Önerilen konular:** «Yapay zekâ» yanına **Bilim** ve **Teknoloji** eklendi; `normalizeFeaturedGrid` ile 3 sütunlu grid son satırı orantılı (DB'de 10 konu olsa bile doldurulur). Paylaşımlı `wikiFeaturedTopics.ts`.
- **Anasayfa (`/`):** `SadeBilgiAgaciDailyBand` — Haberler bloğunun altında (en alt, footer öncesi); sekmeler: Günün Seçilmiş İçeriği, Tarihte Bugün, Bunları biliyor musunuz?; veri `GET /api/wiki/homepage` (`wikiHomepageFeed.ts`); CTA `/ansiklopedi` (Yekpare Bilgi Ağacı). Yeşil-beyaz Sade tema, responsive.
- **Test:** `/`, `/ansiklopedi`, `pnpm --filter @workspace/ahenkpress run build`.

**Yapılan (12 Haziran 2026 — Bilgi Ağacı anasayfa günlük band sekmeleri):**

- **Günün Seçilmiş İçeriği sekmesi:** Yalnızca seçilmiş madde kartı; altında ayrı «Günün kaliteli maddesi» / «Günün görseli» kutuları kaldırıldı.
- **Sekme menüsü:** Kaliteli madde ve günün görseli ayrı sekmeler olarak eklendi (veri yoksa sekme gizlenir); Tarihte Bugün ve Bunları biliyor musunuz? kendi içeriklerini korur. `/ansiklopedi` landing değişmedi.
- **Test:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build`.

**Yapılan (12 Haziran 2026 — Bilgi Ağacı Travlla redesign):**

- **Marka adı:** Public görünür ad **Bilgi Ağacı** oldu; legacy `Yekpare Bilgi Ağacı` ayarları API tarafında otomatik `Bilgi Ağacı` olarak normalize edilir.
- **Travlla esini:** `HeroBanner4` / `TourPackageBanner` büyük renkli hero + merkez arama formu; `Destination2Card` görsel üst yüzey + başlık kartı; `DestinationSlider7` section başlığı ve büyük rotalar yaklaşımı `/ansiklopedi` landing'e uyarlandı.
- **Landing:** Full-width renkli hero içinde ortalanmış büyük arama, 10 konu kategorisi (Bilim, Tarih, Coğrafya, Doğa, Teknoloji, Kültür, Sanat, Sağlık, Ekonomi, Spor), kategori örnek konu linkleri ve görsel/gradient öneri kartları eklendi. `?topic=` seçimi sayfada kategori odağı gösterir; madde linkleri mevcut `/ansiklopedi/:slug` akışını korur.
- **Menü:** Sade/SixAmMart ana menüsünün en sonuna `Bilgi Ağacı` (`/ansiklopedi`) eklendi; footer Yekstra etiketi de güncellendi.
- **Test:** `pnpm --filter @workspace/ahenkpress run typecheck` + `pnpm --filter @workspace/ahenkpress run build`.

**Yapılan (11 Haziran 2026 — Bilgi Ağacı makale detay genişlik / görsel şeridi):**

- **Kök neden:** `SadePublicChrome` + `AnsiklopediDetay` iç içe `yekpare-page-container`; xl’de `wiki-detail-shell` 240px Yekpare yan paneli makaleyi daraltıyordu; CSS’te `figure.wiki-figure` ve `p img` sağa `float` ile dikey görsel şeridi oluşturup metni ~200px sol sütuna sıkıştırıyordu; `prose` sınıfı çakışma riski.
- **Düzeltme:** Portal `/ansiklopedi/*` rotaları `fullBleed` (tek 1440px container); Yekpare yan paneli makalenin altına 2–3 sütun grid; yalnızca `table.infobox` sağ float (max 300px); gövde görselleri float yok, blok/grid; bölüm pill navigasyonu korundu.
- **Çapraz site:** Aynı `AnsiklopediDetay.tsx` + `index.css` — portal `/ansiklopedi/:slug`, HM `/tr/:slug/ansiklopedi/:wikiSlug`, özel alan `HmAnsiklopediPublicWrap` yönlendirmesi.
- **Test:** `/ansiklopedi/Adana`, `/ansiklopedi/Ankara`, `/ansiklopedi/Osmanlı_İmparatorluğu`, HM örnek `/tr/{siteSlug}/ansiklopedi/Adana`.

**Yapılan (12 Haziran 2026 — /haberler hero sıkılaştırma):**

- **`/haberler` manşet başlığı:** Hero alanındaki görünür «Manşet» `Section` etiketi kaldırıldı; `SadeNewsHeadlineGrid` karuseli/grid'i korunur (yalnızca üst bölüm).
- **Piyasa · Hava bandı:** `SadeFinanceWeatherStrip` dikey padding `py-2.5` → `py-1.5`; hero uzantı sarmalayıcısı `space-y-3 py-3` → `space-y-1.5 py-1`; Shell hero içerik bandı `pb-8 pt-2 space-y-5` → `pb-3 pt-1 space-y-2` — gradient ve tam genişlik korunur.
- **Dosyalar:** `SixAmMartTheme.tsx`, `SadeNewsModules.tsx`.
- **Test:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Yapılan (12 Haziran 2026 — /haberler Piyasa üst boşluk):**

- **Kök neden:** Hero uzantısı standart `sade-public-hero-inner` padding'ini (`padding-block: clamp(2rem, 4vw, 2.5rem)`) kullanıyordu — kategori nav ile Piyasa · Hava bandı arasında ~32–40px üst boşluk.
- **Düzeltme:** `sade-public-hero-inner--compact` (`padding-top: 0`, `min-height: 0`); `SADE_PUBLIC_HERO_CONTENT_COMPACT_CLASS` token'ı; Shell hero uzantısı `pt-0` + compact sınıf; `newsHeroExtension` `pt-0 pb-0.5` — kategori nav altında band neredeyse bitişik.
- **Dosyalar:** `index.css`, `yekpareSadeTheme.ts`, `SixAmMartTheme.tsx`.
- **Test:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Yapılan (12 Haziran 2026 — servisler / haberler bölüm sırası):**

- **`/servisler`:** haber manşeti, Türkiye Şehirleri ve Bilgi Ağacı kutuları kaldırıldı; servis akışı Sipariş → Bölgelere göre keşfet → Seyahat odağında kalır.
- **`/haberler`:** Türkiye Şehirleri bandı (`SadeHomeCitiesBandCompact`) ve Bilgi Ağacı günlük bandı (`SadeBilgiAgaciDailyBand`) editoryal akışa taşındı.
- **`/haberler` manşeti:** Sayfanın kendi `SadeNewsHeadlineGrid` ana manşeti ve **Hızlı erişim** davranışı korunur; yalnızca `/servisler` haber manşeti kaldırıldı.
- **Dosya:** `SixAmMartTheme.tsx` (`SixAmMartHomePage`); `pnpm run typecheck` + `build` başarılı.

**Yapılan (12 Haziran 2026 — Türkiye Şehirleri meşhur sembol emoji):**

- **Kök neden:** Anasayfa `SadeHomeCitiesBandCompact` bandında 30 büyükşehirden yalnızca 10 tanesi emoji alıyordu; geri kalanı genel 📍 pin ikonuydu.
- **Düzeltme:** `popularCities.ts` → `CITY_FAMOUS_SYMBOLS` (81 il); örnekler: Denizli 🐓 horozu, Diyarbakır 🍉 karpuzu, Eskişehir 🥟 çiböreği, Tekirdağ 🥩 köftesi, Gaziantep 🍯 baklavası, Hatay 🧁 künefesi; bilinmeyen iller 📍 yedek.
- **Erişilebilirlik:** Kartlarda `title` / `aria-label` (`cityAccessibilityLabel` — ör. «Denizli horozu»); emoji kırpılmasın diye sabit yükseklikli ikon kutusu.
- **Dosyalar:** `popularCities.ts`, `SadeNewsModules.tsx`, `HmPopularCitiesSection.tsx`.
- **Test:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Yapılan (12 Haziran 2026 — manşet oranı + Hızlı erişim):**

- **`SadeNewsHeadlineGrid`:** Masaüstü grid `2fr / 1fr` (~2/3 manşet, ~1/3 sağ sütun); sağda **2×2 kompakt yan kart** (`aspect-[16/10]` görsel + başlık) + altında **Hızlı erişim** chip kartları.
- **Hızlı erişim linkleri:** 🔴 Son dakika → `/kategori/son-dakika` · 📰 Tüm haberler → `/haberler` · ✍️ Yazarlar → `/yazarlar` · ✨ Keşfet → `/kesfet`.
- **Anasayfa (`/`):** `showQuickAccess` varsayılan açık; mobilde manşet → 2 sütun yan kartlar → Hızlı erişim sırası.
- **Hero yükseklik:** `lg:min-h-0` + `fillHeight` ile sol/sağ sütun hizası; boş kart alanı azaltıldı.

**Yapılan (11 Haziran 2026 — bant rotaları + legacy veri):**

- **Kök neden:** Sade bant kartları `/ataturk`, `/kultur-portali`, `/savaslar`, `/milli-gunler` yollarına link veriyordu; bu rotalar yalnızca `/tr/:slug/...` altında tanımlıydı — portal `/haberler` için 404. Yalnızca `/ansiklopedi` (Şehirler bandı) çalışıyordu.
- **Portal rotaları** (`App.tsx`): `/ataturk`, `/ataturk/:pageSlug`, `/kultur-portali`, `/savaslar`, `/savaslar/:warSlug`, `/milli-gunler` — `SadeAwarePublicLayout` + legacy sayfa bileşenleri (`HmAtaturkCornerPage`, `HmCorporateCulturePortalPage`, `HmCorporateWarsPage`, `HmCorporateNationalDaysPage`).
- **Sade bantlar** (`SadeNewsModules.tsx`): legacy HM veri kaynaklarına bağlandı — `HmAtaturkCornerBand` / `ATATURK_CORNER_LINKS`, `NewsCulturePortalSection` / `CULTURE_PORTAL_ITEMS`, `HmPopularCitiesSection` / `POPULAR_CITIES`, `NewsHeritageInfoSection` / `HM_WAR_PAGES`, millî günler / `NATIONAL_DAY_HIGHLIGHTS` + `nationalDayEncyclopediaPath`; Son Dakika ticker + kart şeridi (`HaberAnasayfasi` `SonDakikaTicker` mantığı).
- **Görsel:** Yatay scroll kartlar, accent gradyan başlık, hover, görsel önizleme (son dakika), Sade yeşil vurgu.

**Önceki (11 Haziran 2026 — editoryal bantlar):**

- **`/haberler`:** Haber bloğu paylaşımlı `SadeNewsHeadlineGrid` manşeti sayfanın kendi üst manşeti olarak korunur; **Türkiye Şehirleri** bandı (`SadeHomeCitiesBandCompact`) ve **Bilgi Ağacı** günlük bandı (`SadeBilgiAgaciDailyBand`) editoryal akışta yer alır. `/servisler` haber manşeti ve bu iki kutuyu göstermez.
- **`/haberler`:** «Gündem ve son dakika» hero + arama kutusu kaldırıldı; kategori sekmeleri doğrudan Yekpare üst menüsü altında (`Shell` `subHeader`).
- **Yeni Sade editoryal bantlar** (`SadeNewsModules.tsx`): Son Dakika, Atatürk, **Tarih ve Millî Günler** (savaş + millî gün birleşik) — yatay kart/ticker stili, emoji ikonlar, tema renkleri.
- **Admin:** `/admin/yekpare-haberler` → «Yekpare /haberler (Sade) modülleri» — yeni bantlar için aç/kapa + sıra; varsayılan açık (`sadeNews*BandEnabled`).
- **`newsSiteLayout.ts`:** `SADE_NEWS_PORTAL_MODULE_ORDER` — `historyNationalDaysBand`; Kültür/Şehirler/Savaşlar/Millî Günler ayrı modülleri kaldırıldı (legacy alias ile migrate).

**Önceki (11 Haziran 2026):**

- `SadeNewsModules.tsx` — paylaşımlı `useSadeFeaturedHeadlines`, `SadeNewsHeadlineGrid`, hero slider (`object-cover`, kart yüksekliği eşleşmesi).
- `/` (`SixAmMartHomePage`) ve `/haberler` (`SixAmMartNewsPage`) aynı `useListFeaturedNews` kaynağından manşet; yan kart grid'i ortak.
- Editoryal modüller: piyasa/hava şeridi (`/api/finance` + hava stub), son dakika bandı, köşe yazarları, kategori modülleri, popüler sidebar, son gelişmeler timeline, namaz/günün sözü kartları, bülten CTA.
- Hero görsel oranı: `aspect-ratio` + `max-h` kaldırıldı; `min-h` + `object-cover object-center` + grid `items-stretch`.
- **`/haberler` rotası:** `SadeThemeRoute` / legacy `HaberAnasayfasi` kaldırıldı — portal haber sayfası **her zaman** `SixAmMartNewsPage` (eski HM mor tema regresyonu engellendi).
- **Modül sırası + görünürlük:** `newsSiteLayout.ts` → `SADE_NEWS_PORTAL_MODULE_ORDER`, `isSadeNewsPortalModuleEnabled`, `usePortalNewsLayoutPrefs`; `/haberler` admin kaydını okur.
- **Admin:** `/admin/yekpare-haberler` → «Yekpare /haberler (Sade) modülleri» accordion — her modül için aç/kapa + sıra; `newsLayoutJson` API'ye persist.

**Kalan:**

- Canlı smoke: `yekpare.net/haberler` deploy sonrası tarayıcı doğrulaması.
- Namaz vakitleri / hava canlı API (şu an deterministik stub).
- Anasayfa (`/`) haber bloğunun admin modül anahtarlarına bağlanması (isteğe bağlı).

**Görev hatırlatması:** Haberler kısmında **manşet**, **köşe yazarları** ve **modüller** mevcut Sade/SixAmMart tema renklerinde eklenecek / geri getirilecek.

Kök gereksinim:

- Haber yüzeyleri **Yeni Sade tema chrome** içinde kalır (`SadePublicChrome` — §6, terminoloji tablosu); eski mor Turinet header/footer ve koyu HM portal kabuğu **yasak**.
- Renk paleti **mevcut tema renkleri**: `#039D55` yeşil vurgu, beyaz kart/zemin, açık slate metin — §2 sipariş vitrinleri ve §9 anasayfa ile tutarlı. Eski mor Turinet veya koyu HM kırmızı/mor haber teması kullanılmaz.
- Haber yüzeyi `/haberler` üzerinde tamamlanır:
  1. **Tam haber merkezi** (`/haberler`) — manşet, Türkiye Şehirleri, Bilgi Ağacı, köşe yazarları, editoryal bantlar (Atatürk, Tarih ve Millî Günler), kategori modülleri, popüler sidebar
  2. **Servis vitrini** (`/servisler`) — haber manşeti ve editoryal kutular olmadan servis modüllerini gösterir

Bileşenler (HM / haber API ile):

| Bileşen | Açıklama | Referans |
|---------|----------|----------|
| **Manşet** | Üst bölümde büyük görsel + başlık karuseli / banner; otomatik geçiş, ok navigasyonu | `HaberAnasayfasi.tsx` manşet mantığı; `useListFeaturedNews` |
| **Köşe yazarları** | Yazar avatar + ad + son yazı; yatay kaydırma veya grid | `HmAuthorsStrip`, `resolveHmCorporateAuthorsEnabled` |
| **Modüller** | Haber bandı, son dakika, kategori widget'ları, RSS bandı vb. — panelden sıralanabilir | `HM_NEWS_HOME_MODULE_ORDER`, `HmRssBreakingBand`, `HmRssNewsBand`, `FinanceWeatherTicker` |

API / veri kaynağı:

- Gerçek HM/haber API uçları kullanılır; statik placeholder veya boş bölüm kabul edilmez (veri yoksa anlamlı boş durum + admin yönlendirmesi).
- `useListFeaturedNews`, `/api/news/*`, HM site layout prefs (`newsSiteLayout.ts`, `useNewsSiteLayoutPrefs`) mevcut uçlarla bağlanır.
- Köşe yazarları: HM kurumsal yazar ayarları (`resolveHmCorporateAuthorsEnabled`) açıksa API'den; kapalıysa bölüm gizlenir.

Uygulama hedefleri:

- `goalgo/artifacts/ahenkpress/src/pages/public/HaberAnasayfasi.tsx` — tam haber anasayfası (manşet + modüller)
- `goalgo/artifacts/ahenkpress/src/components/HmAuthorsStrip.tsx` — köşe yazarları şeridi
- `goalgo/artifacts/ahenkpress/src/lib/newsSiteLayout.ts` — modül sırası ve layout prefs
- `goalgo/artifacts/ahenkpress/src/themes/sixammart/SixAmMartTheme.tsx` — anasayfa haber bloğu (`SixAmMartHomePage`, §9.1 ile birlikte)

Çapraz referanslar:

- **§9.1:** Haber manşeti ve taşınan editoryal kutular `/haberler` yüzeyine aittir; `/servisler` servis odaklı kalır.
- **§6:** Tüm haber rotalarında Yeni Sade chrome; eski `PublicLayout`/`AppNav` yasak.
- **Terminoloji:** «Mevcut tema renkleri» = Sade/SixAmMart yeşil-beyaz; eski tema yasak.

Kabul kriterleri:

- `/` anasayfasında (Sade tema aktifken) haber bölümünde **manşet özeti** ve hemen altında **Türkiye Şehirleri** kompakt bandı (30 büyükşehir, yatay scroll) görünür; renkler `#039D55` yeşil + beyaz zemin ile uyumludur.
- `/haberler` tam **manşet karuseli**, **köşe yazarları**, **Atatürk** (tek satır, beyaz/yeşil) ve **Tarih ve Millî Günler** bantları, kategori modülleri ve popüler sidebar içerir; Son Dakika RSS, kamu kartları ve zaman çizgisi **varsayılan kapalı** (admin'den açılabilir); eski mor/koyu HM tema görünümü yoktur.
- Manşet tıklanınca ilgili haber detayına gider; 404 veya boş link kalmaz.
- Köşe yazarları kartları yazar profiline veya son yazısına link verir.
- Köşe makale detayında (`/haber/:slug`, HM `/tr/:slug/haber/:slug`) «Diğer haberler» görünmez; yazarın diğer yazıları ve diğer köşe yazarları yatay kaydırma bantlarında gösterilir; köşe kartlarında görsel yoktur.
- Modül sırası admin/HM layout ayarlarından değiştirilebilir; varsayılan sıra mantıklı ve boş modül regresyonu yaratmaz.
- Veri HM/news API'den gelir; canlıda en az bir manşet haberi ve bir modül içeriği smoke test ile doğrulanır.
- Mobil ve masaüstünde okunaklı kontrast; buton/metin renkleri §6 ile uyumlu.
- Eski tema (`PublicLayout` + mor nav) haber sayfalarında görünmez — regresyon sayılır.

## 5. Turizm ve Rent A Car

Durum: **Kısmen — YETERLİ DEĞİL** (11 Haziran 2026 — **Travlla İPTAL**; Turlar + Araç Kiralama → Booking Core; §5.2 tam parite bekliyor).

Commit: `36ea693d` (önceki: `a775c238`; demo seed: `bc-v4.0.2-tr-2`; chrome: `cc48064f`).

Yapılan (11 Haziran 2026 — turizm veri ayrımı + Google otel odaları):

- **`GET /api/tourism/listings?type=`** katı tip filtresi: `hotel` = yalnızca `map_businesses` (Google Places); `villa|tour|car|boat` = yalnızca `tourism_listings` (BC seed); çapraz karışım kaldırıldı.
- **Konaklama detay** (`/turizm/konaklama/:slug`): Google işletme + BC `tourism_rooms` birleşimi (`linked_map_slug` / `linked_map_business_id` / vendor bağlantısı).
- **BC seed `bc-v4.0.2-tr-2`:** 5 tur + 5 villa + 5 araç + 5 yat (Türkiye şehirleri); otel kayıtları `room_carrier` (katalogda görünmez, odalar Google otellere bağlanır).
- **Hub karuseller:** her bölüm yalnızca doğru `type` kartlarını gösterir; client fallback otellerden arındırıldı.
- **Admin `/admin/turizm-yonetimi`:** Google oteller + BC ilanlar birleşik liste (`includeGoogle=1`), oda sayısı rozeti, tip sekmeleri korunur.
- **Derleme:** `typecheck` + `api build` + `build:web` + `security:check` yeşil.

**Yön değişikliği (kullanıcı talimatı 11 Haziran 2026):**

- **Travlla teması İPTAL** — `/turizm/turlar` artık Travlla değil; **Booking Core Tour** modülü (konaklama/villa/yat hub ile aynı BC shell).
- **Araç Kiralama** artık **6amMart rental değil** — `/turizm/arac-kiralama` → **Booking Core Car** modülü.
- **Admin** `/admin/turizm-yonetimi` — firmalar, ilanlar (otel/villa/tur/araç/yat), odalar, rezervasyonlar sekmeleri; `/api/tourism/admin/*` uçlarına bağlı.
- **100% BC paritesi** hedefi §5.2'de güçlendirildi; kısmi port kabul edilmez.

Yapılan (11 Haziran 2026 — BC Tour + BC Car + admin rezervasyon):

- **`/turizm/turlar`** → `TurlarHome` (BC liste + tur tarihi/katılımcı filtreleri); `/turizm/tur/:slug` → `TurizmDetay` (BC rezervasyon formu).
- **`/turizm/arac-kiralama`** → `AracKiralamaHome` (BC Car liste + alış/iade tarih filtreleri); `/turizm/arac-kiralama/:slug` → `TurizmDetay`.
- Travlla rotaları kaldırıldı/redirect: `/turizm/turlar/liste`→`/turizm/turlar`, eski Travlla statik sayfalar (blog/galeri/sss/…) → hub veya turlar.
- Destinasyonlar → `BookingCoreDestinasyonlar` / `BookingCoreDestinasyonDetay` (BC shell, Sade chrome).
- Rezervasyon onayı → `BookingCoreRezervasyonOnay` (TravllaShell yok).
- Admin `TurizmYonetimi`: **Rezervasyonlar** sekmesi eklendi (`GET/PATCH /api/tourism/admin/bookings`).

Yapılan (önceki — korunur):

- **`/turizm` = Booking Core anasayfa:** hero, 8 sekmeli arama, karuseller, destinasyonlar, blog, CTA, testimonial.
- **Villa / Ev (BC Space):** `/turizm/villa-ev` liste + detay + rezervasyon.
- **Konaklama / Yat:** BC shell liste + detay.
- `TurizmRoute` → Yeni Sade header + `TurizmSubNavBar`; Travlla/6amMart turizm chrome **kullanılmaz**.
- Demo seed: `tourism-bc-seed.ts` — 5 tur + 5 araç dahil 25 listing.

- **Modüller (güncel):** `/turizm/turlar` **Booking Core Tour** · `/turizm/konaklama` BC Hotel · `/turizm/villa-ev` BC Space · `/turizm/arac-kiralama` **BC Car** · `/turizm/yat-turlari` BC Boat.
- Legacy redirect: `/turizm/hotel`→konaklama, `/turizm/car`→arac-kiralama, `/turizm/boat`→yat-turlari, `/turizm/villa`→villa-ev, `/turizm/liste`→turlar.

### Yapılmayanlar / Kalan (dürüst checklist)

**§5.2 Booking Core tam backend + frontend paritesi (KISMEN DEĞİL — §5.2 kontrol tablosu):**

- Oda tipleri DB şeması ve API uçları birebir BC v4.0.2 ile eşleşmiyor; çoğu ekran demo seed / statik veri kullanıyor.
- Müsaitlik sorgusu (tarih aralığı, oda bazlı kapasite) gerçek DB takvimi ile çalışmıyor.
- Rezervasyon → ödeme entegrasyon kancaları (Stripe/iyzico vb.) BC'deki gibi uçtan uca bağlı değil.
- Vendor / host paneli ve BC admin yüzeyleri (fiyat kuralları, sezonluk fiyat, inquiry) port edilmedi.
- Tur/Car detay: BC'deki itinerary, pickup location, ek hizmetler, sürücü bilgisi adımları eksik.
- Konaklama detay sayfası BC shell kabuğu; oda seçimi, galeri, harita, yorumlar BC demo seviyesinde değil.

**§5.2.1 Villa/Ev (BC Space) tam takvim UX:** *(değişmedi — bkz. §5.2.1)*

**§5.1 Header polish:** Sade chrome; TravllaSubnav **kaldırıldı** (turlar BC shell).

**§10 Site geneli Google konum arama:**

- Hub hero arama kısmen Places + `/api/location-suggest` destekli; tur/araç liste formları henüz tam Google autocomplete kullanmıyor.

**Travlla — İPTAL (11 Haziran 2026):**

- Travlla tema turlar rotalarından çıkarıldı; kaynak dosyalar repoda kalabilir ama **aktif rota yok**.
- Eski Travlla statik sayfalar redirect ile BC/hub'a yönlendirilir.

**6amMart rental — SUPerseded (11 Haziran 2026):**

- Araç kiralama artık BC Car modülü; 6amMart rental checkout parity **geçersiz** — hedef BC Car checkout paritesi (§5.2).

**Event / Flight / Bus stub → gerçek BC modülleri:** *(değişmedi)*

**§5.3 Footer MODÜLLER menüsü:** *(kısmen)*

**Diğer boşluklar:**

- Turizm API uçları CRUD var; tam BC v4.0.2 modül yüzeyi (Review, Coupon, iCal, multi-currency) yok.
- `/turizm-paneli` sağlayıcı paneli turizm modüllerine göre özelleştirilmedi.

Kabul kriterleri:

- `/turizm` Booking Core hub layout. *(evet)*
- `/turizm/villa-ev` Villa/Ev etiketi. *(evet)*
- `/turizm/arac-kiralama` **Booking Core Car** chrome (6amMart değil). *(evet — bu push)*
- `/turizm/turlar` **Booking Core Tour** chrome (Travlla değil). *(evet — bu push)*
- Tüm `/turizm/*` rotalarında **Sade header + footer**. *(evet)*
- Admin `/admin/turizm-yonetimi` Google oteller + BC listing türleri + rezervasyonlar. *(kısmen — birleşik otel listesi + tip sekmeleri; tam BC admin paritesi yok)*
- Hub/modül karusellerinde doğru tip kartları (otel≠villa≠araç≠yat≠tur). *(evet — bu push)*
- Konaklama listesi Google `map_businesses`; villa/tur/araç/yat BC `tourism_listings`. *(evet — bu push)*
- Footer **MODÜLLER** sütunu (**§5.3**).
- Konaklama / yat / villa kartlarında `map_business_fallback` (harita oteli) ilanlarında fiyat yoksa Booking Core tarzı CTA («Detayları gör», «İncele»); **«Google otel» veya veri kaynağı etiketi kullanıcı arayüzünde görünmez** — `map_businesses` / Places API yalnızca iç veri kaynağıdır.

## 5.1. Turizm — Sade Tema Chrome (SixAmMart Header + Footer)

Durum: Tamamlandı (11 Haziran 2026 — kullanıcı talimatı: turizm **Sade tema** kullanır; eski mor AppNav/SiteFooter **yasak**).

Kök gereksinim:

- Turizm rotalarında **Sade (SixAmMart) site chrome** kullanılır: beyaz header, yeşil logo, modül pill şeridi — `/yemek`, `/siparis`, `/kesfet` ile aynı `SadePublicChrome`.
- **Eski mor `AppNav` + koyu `SiteFooter` turizm sayfalarında kullanılmaz.**
- Turizm pill alt-nav (`TurizmSubNavBar`) Sade header'ın hemen altında kalır: Turizm, Turlar, Otel, Villa/Ev, Araç Kiralama, Yat Turları. **12 Haziran 2026:** `/turizm` hub'da alt nav `BookingCoreHome` hero gradient içinde (cam); diğer `/turizm/*` rotalarında sticky alt nav korunur.

Yapılan:

- `TurizmRoute` → `SadeAwarePublicLayout` (`forceSade`, `chrome`, `active="rental"`, `fullBleed`) + `TurizmSubNavBar` + `TurizmPageErrorBoundary`.
- BC/Booking Core tema içeriği sayfa gövdesinde; BC-only top bar, Travlla site header/footer ve modül switcher kaldırıldı.
- Turlar modülü **Booking Core shell** (`TurlarHome`, `TurizmDetay`); TravllaSubnav **kullanılmaz** (11 Haziran 2026 yön değişikliği).
- Runtime crash / flash-blank için `TurizmPageErrorBoundary` ve güvenli listing render.

Kabul kriterleri (terminoloji: **Yekpare header/footer = Yeni Sade/SixAmMart tema**; eski `PublicLayout`/`AppNav`/`SiteFooter` **yasak**):

- `/turizm` ve tüm alt rotalarda **beyaz Sade Yekpare header** görünür (mor Turinet mega-nav / eski `AppNav` yok). ✓
- **Yeni tema** SixAmMart footer (yasal bağlantılar); eski koyu `SiteFooter` yok. ✓
- `TurizmSubNavBar` pill alt-nav Yeni Sade header'ın hemen altında. ✓
- Sayfa mount sonrası görünür kalır; boş beyaz flash yok. ✓
- `/yemek`, `/siparis`, `/kesfet` Yeni Sade chrome regresyonu yok.

### 5.2.0 Otel liste fiyat + çok modüllü filtre (BC Hotel P0+)

Durum: **Kısmen tamamlandı** (11 Haziran 2026) — otel/villa/tur/araç/yat listeleme filtreleri + «Otel» etiket yeniden adlandırması; tam BC paritesi §5.2'de bekliyor.

Yapılan:

- **`GET /api/tourism/listings?type=hotel|villa|tour|car|boat`:** Tip bazlı filtreleme (tipler karışmaz). Ortak parametreler: `priceMin`, `priceMax`, `ratingMin`, `amenities`, `sort`. Ek: `stars` (otel), `capacityMin` (villa/yat), `features` (tur süre/kategori, araç vites/yakıt).
- **`GET /api/tourism/destinations/:slug`:** Oteller, turlar ve villalar sekmeleri aynı filtre parametrelerini destekler; sekme sayıları filtrelenmiş sonuç uzunluğunu yansıtır.
- **`/turizm/konaklama` → «Otel»:** Görünür nav/footer/breadcrumb etiketi «Otel»; rota `/turizm/konaklama` korunur.
- **`/turizm/villa-ev`, `/turizm/turlar`, `/turizm/arac-kiralama`, `/turizm/yat-turlari`:** Sol filtre paneli (mobil çekmece), fiyat aralığı (₺/gece, ₺/kişi, ₺/gün), puan, olanaklar/özellikler, kapasite (villa/yat), sıralama, uygula/sıfırla, sonuç sayısı.

Kalan BC paritesi (100% hedef):

- **Admin:** vendor takvim yönetimi, sezonluk fiyat, toplu oda fiyatı, kupon/indirim kuralları, Review moderasyonu, tam BC admin raporları.
- **Frontend ödeme:** Stripe/iyzico/offline checkout, cüzdan, kupon kodu checkout adımı.
- **Review modülü:** yorum listeleme/yazma, puan dağılımı, detay sekmesi tam BC seviyesi.
- **Harita arama:** liste harita görünümü (UI stub).
- **Event / Flight / Bus:** stub → gerçek modül portu (hero arama sekmelerinden kaldırıldı — §Turizm hero arama sekmeleri).
- **Villa/Ev:** iCal takvim, host paneli, tam müsaitlik UX (§5.2.1).
- **§10:** turizm arama formlarında tam Google Places autocomplete.

Kabul (bu alt görev):

- Tüm aktif turizm modül listelerinde filtreler API'ye gider; sonuç sayısı güncellenir; sıfırlama çalışır.
- «Konaklama» kullanıcı arayüzü etiketi «Otel» olarak görünür; URL değişmez.

## 5.2. Booking Core Tam Entegrasyon (Backend + Tema)

Durum: **Kısmen — ilerleme kaydedildi, tam parite yok** (11 Haziran 2026). `/turizm` BC hub + villa-ev/konaklama/tur detay kabuğu; destinasyonlar DB + gerçek sayım; Google otel slug → BC oda birleşimi (`linked_map_slug`, `bc-v4.0.2-tr-3`). Ödeme, Review, Event/Flight/Bus tam port **bekliyor**.

Kaynak referans:

- Kaynak ağacı: `turizm-ulaşım/Booking Core v4.0.2` (`bc-cms/modules/*`, `public_html`)
- Canlı demo: https://sandbox.bookingcore.co (Hotel, Space, Tour, Car, Boat, Event, Flight vb.)
- Demo seed commit: `b03357d3` — `seedTourismBcDemoIfNeeded`, `tourism-bc-demo.json` (`bc-v4.0.2-tr-1`)

Kök gereksinim:

- Booking Core backend'deki **tüm** çalışan özellikler Yekpare yazılımına (`goalgo/artifacts/ahenkpress` + `goalgo/artifacts/api-server`) **birebir (1:1)** entegre edilecek — kısmi port **kabul edilmez**.
- Hem **frontend** hem **backend** tam özellik seti ile çalışır olmalı.
- Konaklama, Yat Turları, **Villa / Ev (Space — §5.2.1)**, Event, Flight, Bus ve BC'deki diğer aktif modüller kapsanır.
- BC kaynak ağacındaki modüller envantere alınmıştır; Yekpare'de eksik olanların tamamı port edilecek.

BC v4.0.2 modül envanteri (`bc-cms/modules/`):

| BC modülü | Yekpare eşlemesi | Not |
|-----------|------------------|-----|
| Hotel | `/turizm/konaklama` | BC birebir |
| Space | `/turizm/villa-ev` (§5.2.1) | BC birebir; UI etiketi Villa/Ev |
| Tour | `/turizm/turlar` | **BC birebir** (Travlla İPTAL — 11 Haziran 2026) |
| Car | `/turizm/arac-kiralama` | **BC birebir** (6amMart rental superseded — 11 Haziran 2026) |
| Boat | `/turizm/yat-turlari` | BC birebir |
| Event | `/turizm/etkinlik` | Stub → tam port |
| Flight | `/turizm/ucus` | Stub → tam port |
| Bus | `/turizm/otobus` | Stub → tam port (hero sekmesi kaldırıldı) |
| Property, Visa, Course, Agency | — | BC'de var; Yekpare kapsamına alınacak mı karar bekliyor |
| Booking, Order, Coupon | Rezervasyon/ödeme | Uçtan uca port |
| Vendor, Dashboard, Report | `/turizm-paneli`, admin | Vendor/host + admin raporları |
| Review, Media, Location, Form | Detay/arama formları | Yorum, galeri, harita, inquiry |
| User, Api, Email, Sms, Social | Auth/iletişim | BC kullanıcı/vendor kayıt akışları |
| Language, Template, Theme, Layout | Tema altyapısı | Çoklu dil, şablon, layout blokları |
| News, Page, Popup, Contact, Tracking | CMS/iletişim | BC footer, bülten, statik sayfalar |

BC çapraz özellik envanteri (kaynak + sandbox):

- Arama ve filtreler (konum, tarih, misafir, fiyat, kategori, harita)
- Liste + grid + harita görünümü
- Detay sayfası (galeri, olanaklar, politika, harita, benzer ilanlar)
- Oda/tip seçimi, müsaitlik takvimi, tarih aralığı sorgusu
- Rezervasyon checkout (misafir bilgisi, ek hizmetler, fiyat dökümü)
- Ödeme entegrasyonları (Stripe, PayPal, offline, cüzdan — BC Order/PaymentTwoCheckout)
- Vendor/host paneli (ilan CRUD, oda/takvim, fiyat sezonları, rezervasyon yönetimi)
- Admin paneli (onay, raporlar, toplu işlem, ayarlar)
- Yorumlar ve puanlama (Review modülü)
- İstek listesi / favoriler (wishlist)
- Kupon/indirim kodu (Coupon modülü)
- iCal import/export (Space/Hotel müsaitlik)
- Çoklu para birimi (multi-currency)
- Çoklu dil kancaları (Language modülü)
- Inquiry / contact form (Form modülü)
- Vendor kayıt ve doğrulama
- Bülten/abonelik (Email/News — BC footer üst şerit)
- QR kod (etkinlik — BC Pro)
- SMS bildirimleri

Kapsam dışı / sabit kararlar:

- **Travlla teması İPTAL** (11 Haziran 2026) — turlar rotalarında kullanılmaz; hedef BC Tour modülü.
- **6amMart rental superseded** (11 Haziran 2026) — araç kiralama BC Car modülü ile.
- §5.1 ile uyumlu: turizm rotalarında **Yeni Sade Yekpare header/footer** (`TurizmRoute`); `BookingCoreShell` yalnızca modül gövdesi (banner + içerik).
- §10: tüm turizm arama formları Google Places/Location API kullanır.
- Demo seed (`bc-v4.0.2-tr-3`) villa/tur/araç/yat katalog + 8 destinasyon (`tourism_destinations`); oteller `room_carrier` (katalog dışı, odalar Google'a `linked_map_slug` ile bağlı). Görseller `/assets/turizm-bc/` (77 dosya). Kabul doğrulaması gerçek API + DB akışı ile yapılır.

### BC ↔ Yekpare özellik kontrol tablosu

| BC özelliği | Yekpare durumu | Frontend | Backend | Öncelik |
|-------------|----------------|----------|---------|---------|
| Hotel (Otel) arama/liste/detay | Kısmen — gecelik fiyat + liste filtreleri (§5.2.0) | `/turizm/konaklama` filtre paneli + «itibaren ₺/gece» kartlar | `map_businesses` + oda min fiyat zenginleştirme; filtre query params | P0 |
| Hotel oda tipleri + müsaitlik takvimi | Kısmen — odalar seed + link | Oda seçici + rezervasyon formu | `tourism_rooms` tüm otel carrier'larda; takvim stub | P0 |
| Destinasyonlar grid + detay | Kısmen — DB + sayım | `/turizm/destinasyonlar` BC görseller; detay otel/tur/villa sekmeleri | `tourism_destinations` + gerçek sayım API | P0 |
| Space (Villa/Ev) §5.2.1 | Kısmen — liste filtreleri (§5.2.0) | Liste/detay/rezervasyon + filtre paneli | Aynı tourism API | P0 |
| Space iCal + gün bloklama | Yok | — | — | P1 |
| Boat (Yat Turları) | Kısmen — liste filtreleri (§5.2.0) | BC shell + filtre paneli | BC seed 5× boat, katı `type=boat` | P0 |
| Tour (BC) | Kısmen — liste filtreleri (§5.2.0) | BC liste/detay/rezervasyon kabuğu | BC seed 5× tour + `/api/tourism/tours` | P0 |
| Car (BC) | Kısmen — liste filtreleri (§5.2.0) | BC liste/detay kabuğu | BC seed 5× car, katı `type=car` | P0 |
| Event modülü | Stub (`/turizm/etkinlik`) | Yakında sayfası | Yok | P1 |
| Flight modülü | Stub (`/turizm/ucus`) | Yakında sayfası | Yok | P2 |
| Bus modülü | Stub (`/turizm/otobus`) | Yakında sayfası | Yok | P2 |
| Rezervasyon checkout | Kısmen | Form var, ödeme yok | `POST /tourism/bookings` temel | P0 |
| Ödeme (Stripe/iyzico/offline) | Yok | — | Order/Payment port yok | P0 |
| Vendor paneli | Kısmen | `/turizm-paneli` özelleştirilmedi | Vendor CRUD uçları var | P0 |
| Admin turizm yönetimi | Kısmen — Google+BC+destinasyon | Oteller, villalar, turlar, araçlar, yatlar, destinasyonlar, rezervasyonlar sekmeleri | `/tourism/admin/*` CRUD | P1 |
| Yorumlar (Review) | Yok | — | — | P1 |
| Wishlist / favoriler | Yok | — | — | P2 |
| Kupon (Coupon) | Yok | — | — | P1 |
| Harita arama / filtre | Kısmen | Hub hero kısmen | Location API kısmen | P1 |
| Inquiry form | Yok | — | — | P2 |
| Vendor kayıt | Kısmen | Genel iş ortağı akışı | Tourism vendor API | P1 |
| Admin raporlar (Report) | Yok | — | — | P2 |
| Çoklu para birimi | Yok | — | — | P2 |
| Çoklu dil (Language) | Kısmen | TR odaklı | Hook yok | P2 |
| Bülten/abonelik (footer üst şerit) | Kısmen | BC home client-side | API bağlı değil | P1 |
| BC footer MODÜLLER sütunu | Kısmen | `TURIZM_FOOTER_MODULES` (§5.3) | — | P0 |
| Demo seed bc-v4.0.2-tr-3 | Tamamlandı | Görseller `/assets/turizm-bc/` (77 dosya) | idempotent seed + `tourism_destinations` | — |

Uygulama hedefleri (referans — bu görevde kod zorunlu değil):

- Frontend: `goalgo/artifacts/ahenkpress/src/themes/bookingcore/*`, `src/themes/turizm/turizmRoutes.ts`, `src/themes/sixammart/SixAmMartTheme.tsx` (Sade footer)
- Backend: `goalgo/artifacts/api-server/src/routes/tourism.ts`, `src/data/tourism-bc-seed.ts`
- Görseller: `node artifacts/api-server/scripts/copy-bc-tourism-images.mjs`

Kabul kriterleri:

- Otel arama, listeleme, detay sayfası, oda tipleri, müsaitlik sorgusu, rezervasyon akışı, ödeme entegrasyon kancaları ve Booking Core'da varsa vendor/admin panelleri — hepsi Yekpare DB/API'ye bağlı ve uçtan uca çalışır.
- Yat turları modülü için Booking Core'daki eşdeğer özellikler (arama, liste, detay, müsaitlik, rezervasyon vb.) birebir port edilmiştir.
- Event, Flight, Bus stub'ları gerçek BC modüllerine dönüştürülür (arama → liste → detay → rezervasyon).
- Demo/seed yalnızca geliştirme kolaylığı içindir; kabul doğrulaması gerçek API + DB akışı ile yapılır.
- **Turizm BC demo seed:** `bc-v4.0.2-tr-3` — `tourism-bc-seed.ts` + `tourism-bc-demo.json`; Railway startup'ta `seedTourismBcDemoIfNeeded` (idempotent). 8 destinasyon, 5 vendor, 25 listing, otel odaları + `googleHotelLinks` (ör. `wonne-boutique-hotel-spa`). Görseller `public/assets/turizm-bc/`.
- Eksik veya "yakın" port kabul edilmez; BC v4.0.2 kaynak ağacındaki tüm aktif modül, ekran ve API yüzeyi hedef alınır.
- Canlı smoke test: `/turizm/konaklama`, `/turizm/yat-turlari`, `/turizm/villa-ev` (**§5.2.1**) üzerinde arama → liste → detay → oda/tur seçimi → rezervasyon → ödeme adımları kesintisiz ilerler.
- **§5.1** site chrome + **§5.3** footer MODÜLLER + **§10** Google konum araması birlikte doğrulanır.

## 5.2.1. Booking Core Space → Villa / Ev Kiralama

Durum: Kısmen (11 Haziran 2026) — `/turizm/villa-ev` liste, detay, tarihli rezervasyon formu, hero sekmesi; tam BC müsaitlik takvimi + host paneli bekliyor.

**Görev notu:** https://sandbox.bookingcore.co/space kısmını villa ev olarak kullan; Booking Core tüm özellikleri eklenecek.

Kaynak referans / demo: https://sandbox.bookingcore.co/space

Eşleme:

- Booking Core **Space** modülü Yekpare **Villa / Ev** (tatil kiralama, apart, villa) olarak kullanılır.
- Kullanıcıya dönük etiketler İngilizce "Space" değil: **"Villa & Ev"** veya **"Villa / Ev Kiralama"**.

Rota önerisi:

- Birincil: `/turizm/villa-ev`
- Legacy/alias: `/turizm/uzay` → `/turizm/villa-ev` yönlendirmesi

Kapsam (birebir port — opsiyonel değil):

Booking Core Space demo'sundaki tüm özellikler §5.2 "Booking Core tüm özellikleri eklenecek" kapsamının parçasıdır; kısmi port kabul edilmez:

- Arama (konum, tarih, misafir vb.)
- Listeleme grid
- Detay sayfası
- Olanaklar (amenities)
- Müsaitlik takvimi
- Rezervasyon akışı
- Fiyatlandırma
- Booking Core'da varsa host/vendor paneli ve ilgili admin yüzeyleri

Çapraz referanslar:

- **§5.1:** Turizm rotalarında **Yeni Sade Yekpare header/footer**; tema içeriği gövdede kalır.
- **§5.3:** Footer MODÜLLER sütununda Villa/Ev bağlantısı `/turizm/villa-ev`.
- **§10:** Villa/Ev arama formlarındaki konum girişi Google Places/Location API kullanır (site geneli kural).
- **Demo seed `b03357d3`:** Villa/Ev listesinde demo ilanlar görünür.

Kabul kriterleri:

- `/turizm/villa-ev` üzerinde demo ile eşdeğer arama → liste → detay → müsaitlik → rezervasyon akışı uçtan uca çalışır.
- UI'da "Space" İngilizce etiketi görünmez; yalnızca Türkçe "Villa & Ev" / "Villa / Ev Kiralama" kullanılır.
- `/turizm/uzay` istekleri `/turizm/villa-ev`'e yönlendirilir.
- Eksik veya "yakın" port kabul edilmez; BC Space modülündeki tüm aktif ekran ve API yüzeyi hedef alınır.

## 5.3. Yekpare Footer — Turizm MODÜLLER Menüsü (BC tarzı)

Durum: Kısmen (11 Haziran 2026) — `TURIZM_FOOTER_MODULES` tanımlı; Yeni Sade footer'a MODÜLLER kolonu tam taşınmadı. BC ekran görüntüsündeki üst footer düzeni (bülten şeridi + YARDIM / ŞİRKET / DESTEK / MODÜLLER kolonları) tam eşleşmiyor. (Eski koyu `SiteFooter` turizmde kullanılmaz.)

Referans ekran görüntüsü (kullanıcı):

- Üst şerit: «🌴 Güncellemeler ve daha fazlasını alın» + e-posta alanı + **ABONE** butonu
- Alt kolonlar: **YARDIMA MI İHTİYACINIZ VAR?** · **ŞİRKET** · **DESTEK** · **MODÜLLER**
- **MODÜLLER** sütunu: Otel, Villa/Ev, Turlar, Araç, Yat Turları (BC footer ile aynı sıra ve etiketler)

Kök gereksinim:

- Yekpare site footer'ının **üst link alanında** turizm **MODÜLLER** bölümü BC ekran görüntüsüyle aynı yapıda görünür.
- `/turizm/*` rotalarında **§5.1** ile **Yeni Sade Yekpare footer** kullanılır; MODÜLLER sütunu bu footer içinde yer alır (BC-only footer değil).
- MODÜLLER bağlantıları çalışır durumda olmalı; stub modüller en azından «yakında» sayfasına gider, aktif modüller gerçek listeye gider.

MODÜLLER bağlantı eşlemesi:

| Footer etiketi | Yekpare rota | Durum |
|----------------|--------------|-------|
| Otel | `/turizm/konaklama` | Aktif (kısmi BC port) |
| Villa / Ev | `/turizm/villa-ev` | Aktif (§5.2.1) |
| Turlar | `/turizm/turlar` | Aktif (Travlla) |
| Araç | `/turizm/arac-kiralama` | Aktif (6amMart) |
| Yat Turları | `/turizm/yat-turlari` | Aktif (kısmi BC port) |

Uygulama hedefleri:

- `goalgo/artifacts/ahenkpress/src/themes/sixammart/SixAmMartTheme.tsx` — Sade footer MODÜLLER sütunu (`TURIZM_FOOTER_MODULES`)
- `goalgo/artifacts/ahenkpress/src/themes/turizm/turizmRoutes.ts` — `TURIZM_FOOTER_MODULES`, `TURIZM_NAV_SUBMENU`
- İsteğe bağlı: BC tarzı bülten şeridi (`bc-home-newsletter` CSS mevcut) Yeni Sade footer üstüne taşınır; gerçek abonelik API'si §5.2 bülten maddesi ile birlikte tamamlanır.

Çapraz referanslar:

- **§5.1:** Turizm sayfalarında **Yeni Sade Yekpare header+footer** (BC/Travlla kendi site footer'ı yok).
- **§5.2 / §5.2.1:** MODÜLLER linkleri BC modül paritesi tamamlandıkça gerçek arama/liste/detay akışına bağlanır.
- **§10:** Footer dışı turizm arama formları Google konum API kullanır.
- **Demo seed `b03357d3`:** MODÜLLER linklerinin hedef sayfalarında demo içerik görünür.

Kabul kriterleri:

- `/turizm` ve tüm `/turizm/*` alt rotalarında Yekpare footer görünür; **MODÜLLER** sütunu okunaklı ve BC ekran görüntüsüyle aynı beş bağlantıyı listeler.
- Her MODÜLLER linki 404 vermez; aktif modülde liste veya detay sayfası açılır.
- Turizm modülü kapalıysa (`modulesEnabledJson`) MODÜLLER sütunu gizlenir.
- Sipariş/Keşfet/Haber sayfalarında footer regresyonu yok; MODÜLLER yalnızca turizm modülü açıkken görünür.
- Canlı smoke: `/turizm`, `/turizm/konaklama`, `/turizm/villa-ev`, `/turizm/turlar`, `/turizm/arac-kiralama`, `/turizm/yat-turlari` — footer MODÜLLER linkleri tek tek tıklanır.

## 6. Genel Tema ve Formlar

Durum: **Kısmen tamamlandı** — 11 Haziran 2026 (`cursor/yekpare-chrome-legacy-pages`); **footer/kontrast birleştirmesi** 11 Haziran 2026.

**Terminoloji hatırlatması:** «Yekpare header/footer» = **Yeni Sade/SixAmMart tema** (`SadePublicChrome`). Eski mor `AppNav`, `PublicLayout`, koyu `SiteFooter` = **eski tema** — kaldırılacak; yeni işlerde referans verilmez. «Mevcut tema renkleri» = `#039D55` yeşil, beyaz zemin, açık slate — §2 vitrinleriyle aynı palet.

**Yapılan (11 Haz 2026):**

- `PublicLayout` her zaman `SadePublicChrome` kullanır; `yekpare-renkli` public tema seçici ve mor `AppNav`/`SiteFooter` fallback kaldırıldı (12 Haziran 2026).
- `/magaza/*` → `MagazaRoute`: Yekpare üst/alt chrome + Sellzy gövde (`SellzyMarketplaceLayout bodyOnly` — çift header yok).
- Hesap/sipariş/auth: `/hesabim`, `/siparislerim`, `/sifre-sifirla`, `/sifre-yenile` Sade chrome + yeşil form paleti.
- İşletme/sağlayıcı formları: `/isletme-giris`, `/isletme-basvuru`, `/servis-saglayici-giris` koyu mor/indigo tam ekran yerine beyaz kart + `#0f766e` CTA.
- Ana menü (`SadePublicChrome` nav): canonical sıra — Yemek, Market, Yakınımdakiler, Turizm, Ulaşım, Mağaza + Keşfet/Haritalar/Haberler/YekTube (`yekpareServiceNav.ts`); Turizm alt menüsünde **Otel** etiketi korunur.
- `/yemek`, `/siparis`, `/ulasim` aktif nav pill'leri yol ile eşleşir; `Yakınımdakiler` etiketi header ile uyumlu.
- Anasayfa service rails + «Yekpare platform hizmetleri» grid: canonical sıra ile hizalandı (11 Haziran 2026).
- **Anasayfa bölüm sırası (12 Haziran 2026):** «Hizmet seç» kart grid'i (`ModuleSelector`) üst ikon service rail'in (`ServiceRails`) üstüne alındı; ikon şeridi grid'in altında.
- **YekTube (`/yektube`, `/yektube/kanal/*`):** Sade yeşil-beyaz gövde — koyu YouTube-style iç nav, kırmızı hero ve siyah alt bar kaldırıldı; kanal/video rotaları ve API işlevleri korunur (`CanliTv.tsx`, `VideoTvChannel.tsx`, `yektubeTheme.ts`).
- **İçerik hizası (11 Haziran 2026):** Modül gövdeleri header ile aynı genişlikte — `max-width: 1440px` + `padding-inline: 1rem` (`.yekpare-page-container`, `yekpareLayout.ts`). Turizm BC/Travlla, Yemek vitrin, YekTube, Mağaza (`SellzyContainer`), Keşfet (`lh-container`) bu token ile hizalanır; full-bleed arka planlar korunur, içerik header container'a oturur.
- **Hero sadeleştirme (11 Haziran 2026):** `/magaza` üst bölüm — Sellzy tam ekran foto carousel + sarı alt şekil kaldırıldı; kompakt Yekpare yeşil/beyaz hero + ürün arama + hızlı linkler (`SellzyHero.tsx`). `/kesfet` üst bölüm — koyu foto hero → açık panel + yeşil CTA (`listinghubKesfet.css`, `KesfetListingHub.tsx`).
- **`/haritalar` harita chrome (11 Haziran 2026):** `Kesfet.tsx` tam ekran harita — üst arama/kategori şeridi, yüzen alt kontroller, güzergah (KGM) ve navigasyon panelleri `#0f766e` / `#039D55` / beyaz-açık yeşil tint; Leaflet zoom/LRM panel override'ları `kesfetHaritaSade.css`. Harita tile renkleri değiştirilmez; semantik AFAD/kapalı yol uyarıları korunur.
- **`/haritalar` masaüstü chrome + mobil UX (11 Haziran 2026):** Masaüstünde `HaritalarRoute` → `SadePublicChrome` (`mapEmbed`) ile site header/footer; mobil tam ekran harita korunur. Sohbet balonu `/haritalar` ve içerik sayfalarında kapalı; sipariş/ödeme/sağlayıcı panellerinde açık (`chatBubbleRoutes.ts`).
- **`/haritalar` genişlik + tam ekran sekme (11 Haziran 2026):** Masaüstü harita gövdesi header ile aynı `yekpare-page-container` (1440px) genişliğinde, `min-height: calc(100dvh - header)` ile yüksek harita alanı (`kesfetHaritaSade.css`, `SixAmMartTheme` `haritalar-map-shell`). Üst barda «Yeni sekmede aç» → `/haritalar/tam-ekran` (sorgu parametreleri korunur); tam ekran rotada Yekpare header/footer yok, `100dvh` harita (`HaritalarFullscreenRoute`, `Kesfet layout="fullscreen"`).
- **PWA markası (11 Haziran 2026):** `manifest.json`, `portalBrand.ts`, `index.html` apple-mobile-web-app-title → **Yekpare** (Turknet App kaldırıldı); tema rengi `#0f766e`, ikon `/icon-192.svg`.
- **Anasayfa mobil (11 Haziran 2026):** «Hizmet seç» grid `grid-cols-2`; üst «Adres / konum seç» pill mobilde gizli (`hidden md:inline-flex`). Masaüstünde pill tıklanabilir → `SadeLocationPickerModal` (adres arama, konumumu kullan, `publicLocation` localStorage).
- **Anasayfa hero konum (12 Haziran 2026):** Hero arama çubuğundaki «Adres / konum seç» alanı tıklanabilir → `SadeLocationPickerModal` (Google Places + geocode yedek, `publicLocation` localStorage). Altındaki yinelenen «Konumu yazın…» satırı (`GoogleTrAddressQuickFill`) kaldırıldı. Arama altındaki **Konumum / Harita görünümü / İşletmeni ekle** hızlı butonları kaldırıldı (üst konum seçici + ana arama korunur).
- **Anasayfa hero hızlı aksiyonlar (12 Haziran 2026):** Arama altındaki ayrı «Adres / konum seç» satırı (`locLabel` pill) kaldırıldı. Konum seçimi yalnızca cam hızlı aksiyon **📍 Konum** butonu ile (`SadeLocationPickerModal`). Arama altında mobil/masaüstü **3 sütun yan yana:** `📍 Konum` · `🔎 Keşfet` · `🗺️ Harita` — emoji + metin (`resolveLandingHeroQuickActionLabel`, admin JSON emoji içermese otomatik eklenir; yedek etiketler `Konum` / `Keşfet` / `Harita`). Dosyalar: `YekpareLandingHome.tsx`, `yekpareLandingDesign.ts`.

**Footer + kontrast (11 Haz 2026):**

- **`SadePublicFooter`** — tüm Yekpare Sade chrome rotalarında birleşik açık footer: beyaz zemin + hafif yeşil şeffaf tint, `#0f172a` metin, `#0f766e` / `#039D55` vurgu, okunaklı bülten şeridi (`sade-public-footer.css`).
- **Mobil footer link grid (11 Haziran 2026):** Hizmetler / Hesap (ve turizm MODÜLLER) sütunlarında linkler mobilde (`max-width: 1023px`) 2 sütun; masaüstünde tek sütun. **Yekpare menüsü (12 Haziran 2026, günc.):** tek sütun — `Yekpare nedir?`, `Keşfet`, `Haberler`, `YekTube`, `Destek` (konuya göre sıra); 5. boş/split sütun kaldırıldı. Masaüstü grid: marka + 4 menü sütunu (`Hizmetler`, `Hesap`, `Yekstra`, `Yekpare`). Hizmet etiketleri: Seyahat, Alışveriş (`YEKPARE_FOOTER_SERVICE_MODULES`).
- **Footer Yekstra menüsü (12 Haziran 2026):** Public footer'da `İşletme paneli` ve `Mağaza aç` bağlantıları `Hesap` altına taşındı. 4. menü başlığı `Yekstra`; altında `Haber Merkezi`, `AI Call Center`, `Haritalar`, `Navigasyon`, `Yekpare Bilgi Ağacı` bulunur.
- **`SixAmMartTheme` Shell:** koyu lacivert `#111827` footer kaldırıldı → `SadePublicFooter` (default / turizm varyantları).
- **`SiteFooter` (legacy):** yalnızca HM white-label bağlamlarında kalır; Yekpare public yüzeyde kullanılmaz.
- **`HmPublicSiteFooter`:** HM vitrin alt bilgisi açık zemin + koyu metin (haber kırmızı vurgu korundu).
- **`SellzyFooter`:** standalone kullanımda açık footer ( `/magaza` Sade chrome + `bodyOnly` akışı değişmedi).
- **Kontrast düzeltmeleri:** anasayfa hero hızlı erişim kartı, `SadeNewsletterCta`, `/habermerkezi` hero CTA + «Bizi tercih edenler» vitrin bandı; BC bülten butonu yeşil.

**Kırmızı/koyu temizlik (11 Haziran 2026 — `fix(theme)`):**

- Paylaşılan token dosyası: `yekpareSadeTheme.ts` (`resolveSadeAccent`, hero/CTA sınıfları) + `index.css` `.sade-public-hero` / `.sade-btn-primary` ve legacy koyu-kırmızı hero güvenlik override'ları.
- Portal public yüzeyler Sade yeşil-beyaz: `/yazarlar`, `/yazar/:id`, `/haberler`, `/habermerkezi`, `/site-haritalari`, `/ai-cagri-merkezi`, `/firma-rehberi/panel`, `/iletisim`, `/destek`, YekTube haber kategorisi rengi.
- Varsayılan portal accent `#e61e25` → `#039D55` / `#0f766e`; kart üst şerit, hero, CTA ve nav `accent` değişkeniyle hizalandı.
- **Koyu header/hero temizliği (11 Haziran 2026 — `feat/yekpare-sade-header-cleanup`):** Atatürk köşesi (`/ataturk/*`), kurumsal miras (`/savaslar`, `/milli-gunler`, `/kultur-portali`), şehit sayfaları, ansiklopedi hero, firma rehberi hero, anasayfa arama hero, iş ortağı landing, Atatürk bandı, kurumsal HTML kabuk ve Keşfet detay fallback hero — koyu lacivert/siyah gradient (`#0D1117`, `#111827`, `#0A0C0E`, `emerald-950`) → açık yeşil-beyaz panel (`yekpareSadeTheme.ts`: `SADE_EDITORIAL_*`, `SADE_PUBLIC_HERO_LIGHT_GRADIENT`); bordo `#8C1A2E` vurgu → `#0f766e`; altın `#C9A84C` yalnızca millî/Atatürk eyebrow'larında korunur.
- **Modül hero arka plan hizalama (12 Haziran 2026):** Tüm public modül hero/header yüzeyleri anasayfa ile aynı krem-yeşil gradient (`yekpareSadeTheme.ts`: `SADE_PUBLIC_HERO_GRADIENT`, `SADE_PUBLIC_HERO_SURFACE_CLASS` / `index.css` `.sade-public-hero-surface`); `SixAmMartTheme` Hero, `SiparisModulVitrin` (`/isletmeler`, `/yemek`, `/market`), `Siparis`, `BookingCoreHome` (`/turizm` — okyanus foto kaldırıldı), `KesfetListingHub`, `SellzyHero`, `YekpareSadeModuleShell`, haber/site haritası/firma paneli hero'ları güncellendi; koyu yeşil sipariş banner ve turizm foto overlay kaldırıldı; metin koyu (`text-slate-950` / `SADE_HERO_EYEBROW_CLASS`).
- **Modül hero yerleşim düzeltmesi (12 Haziran 2026):** Gradient hizalaması sonrası `SiparisModulVitrin` arama/konum kartı `-mt-14` ile hero üstüne taşmıyor — kart hero içinde (`/yemek`, `/market`, `/isletmeler`). `/kesfet` hero yüzeyi tam genişlik (`sade-public-hero-surface` + `listinghubKesfet.css`); dar ortalanmış panel kartı kaldırıldı; arama formu max 1440px içerik hizasında.
- **Modül hero tam genişlik + oran standardı (12 Haziran 2026):** `/kesfet` rotası `SadePublicChrome fullBleed` ile sarmalandı (önceki `yekpare-page-container` hero arka planını daraltıyordu). Paylaşılan token'lar: `SADE_PUBLIC_HERO_INNER_CLASS`, `SADE_PUBLIC_HERO_CONTENT_CLASS`, `SADE_PUBLIC_HERO_FULL_BLEED_CLASS` + `index.css` `.sade-public-hero-inner` (`min-height: clamp(240px, 28vw, 310px)`, `padding-block: clamp(2rem, 4vw, 2.5rem)`). Uygulanan sayfalar: `/kesfet`, anasayfa modül Hero, `/siparis`, `/yemek`/`/market`/`/isletmeler`, `/turizm`, `/magaza`, `YekpareSadeModuleShell`; alt fade (`::after`) `pointer-events: none` korunur.
- **Modül hero alt fade yumuşatma (12 Haziran 2026):** `::after` gradient 6 durak + daha uzun band (`clamp(88px, 34%, 240px)`); hero `border-b` kaldırıldı. `--sade-public-page-bg` rotaya göre: `/ulasim` ve anasayfa → `#fff` (alt beyaz bant); sipariş vitrinleri → `#FCFCFD`; `/kesfet`/chrome → `#f4f7f6`; `/turizm`/`/magaza` → `#fff`. `/ulasim` konum kartları `border-y` kaldırıldı — yeşil/gri çizgi yerine yumuşak geçiş.
- **Modül vitrin arama kompakt (12 Haziran 2026):** `/yemek`, `/market`, `/isletmeler` (Yakınımdakiler) hero arama kartı tek satır arama + **Ara**; ikinci satırda cam (glass) pill'ler: **Konumun** (`SadeLocationPickerModal` + `publicLocation`/`yekpare_siparis_location_v4` senkronu) + modüle özel 2 kısayol (yemek: Yakınımdaki restoranlar / Paket servis; market: Yakınımdaki marketler / Hızlı teslimat ≤45 dk; yakınımdakiler: Haritada göster → `/haritalar`, İşletme ekle → `/isletme-basvuru`). Eski `GoogleTrAddressQuickFill` satırı kaldırıldı (`SiparisModulVitrin.tsx`).
- **Köşe yazarı vitrin cilası (11 Haziran 2026):** `/yazarlar` kartlarında yalnızca avatar + ad + yazı sayısı + yeşil CTA (ünvan/bio gizli); köşe makale detayında başlık altında yazar avatar/adı; «Diğer haberler» yerine «Yazarın diğer yazıları» + «Diğer köşe yazarları» yatay bantlar (görselsiz metin kartları); HM `hm_makaleler` / Yekpare merkez senkronu korunur (`HmKoseCarouselBands`, `HaberDetay`, `SixAmMartNewsDetailPage`).

**Bilinçli kırmızı / koyu istisnalar (değiştirilmedi):**

- Form/API **hata** durumları: `border-red-*`, `bg-red-50`, `text-red-*`, `destructive` alert'ler (auth, destek, sipariş panelleri).
- HM **white-label** vitrin temaları (`ankara` kırmızı, `gold`, `corporate`) — `hmVitrinThemes.css` + partner `/tr/:slug/*`.
- `HmPublicSiteFooter` ve HM partner sitelerinde siteye özel haber kırmızısı (bilinçli marka rengi).
- Keşfet harita **semantik** katmanları (deprem/AFAD yüksek risk `#dc2626`, kapalı yol uyarıları).
- Mağaza **indirim** rozeti (`bg-red-500`), sepetten sil hover (`hover:text-red-600`).
- `Checkout`, `LisansAktivasyonu`, `UrunDetay` legacy Sellzy gövdesi (Sade chrome altında; ayrı §8 turu).
- Admin/editor panelleri ve operasyon dashboard'ları.

**Hâlâ legacy / açık:**

- HM partner rotaları (`/tr/:slug/*`, `HmPublicShell`) — bilinçli white-label; Yekpare chrome yok.
- Satıcı vitrinleri (`VendorThemeShell`, `/siparis/satici/*`, `/alisveris/magaza/*`) — kendi mağaza chrome'u; site üst nav yok (bilinçli).
- Operasyon panelleri: `/surucu-paneli`, `/kurye-paneli`, `/kasiyer`, provider panelleri (lazy) — admin chrome.
- `MagazaSaticiOl` koyu hero bandı (içerik bölümü; üst chrome Sade).
- `Checkout`, `LisansAktivasyonu`, `Destek`, yasal sayfalar — Sade chrome altında; içerik stilleri kısmen eski gri/mavi.

**Çapraz referanslar (eski tema yasak):**

- **§9.1 Anasayfa:** `/` yalnızca Yeni Sade chrome + 6amMart-style gövde (`YekpareSadeHome`); eski `Home.tsx` kaldırıldı.
- **§4 Haberler:** Manşet, köşe yazarları, modüller mevcut tema renklerinde; eski mor/koyu HM haber teması kullanılmaz.
- **§5.1 Turizm:** Tamamlandı — turizm rotalarında Sade chrome zorunlu; §6 regresyon kontrolünde doğrulanır.
- **§8 Mağaza / Sellzy:** `/magaza` yalnızca Yeni Sade chrome içinde; Sellzy gövdesi birebir port — eski tema ve «ilham alınmış» kısmi UI kabul edilmez.
- **Terminoloji tablosu:** «Eski tema» satırı — tüm yeni işlerde referans alınmaz.

Kabul kriterleri:

- Eski koyu Yekpare ekranları (eski tema) yeni tema aktifken görünmez — özellikle `/` (§9.1) ve `/haberler` (§4).
- Kayıt, giriş, başvuru, detay ve tanıtım sayfaları yeni temaya uyumludur.
- Butonlarda yazı rengi okunur; renk paleti Sade/SixAmMart (`#039D55` yeşil vurgu) ile tutarlıdır.
- Çalışmayan link ve buton kalmaz.
- §4 ve §9.1 tamamlandığında anasayfa + haber yüzeyleri eski mor Turinet chrome regresyonu göstermez.

## 7. Mobil Sohbet Balonu (Çevrimiçi İlişki ve Sipariş Bağlamı)

Durum: Tamamlandı (12 Haziran 2026).

Kabul kriterleri:

- Sohbet balonu mobil öncelikli çalışır; mobil görünümde ilgili mağaza/hizmet/sipariş bağlam sayfasında görünür ve açılabilir durumda olur.
- Balon yalnızca çevrimiçi olan üye veya işletme sohbet ilişkilerinde aktif/görünür olur; çevrimdışı taraflarda balon gösterilmez veya pasif kalır.
- Balon yalnızca kullanıcının ilgili işletmeyle geçerli bir ilişkisi varken tetiklenir: aktif veya geçmiş sipariş, alışveriş satın alımı veya hizmet/rezervasyon kaydı.
- Kullanıcı ilgili mağaza, hizmet veya sipariş bağlam sayfasına geldiğinde sohbet balonu açılır; bağlam dışı sayfalarda otomatik açılmaz.
- Oturum, kimlik doğrulama ve sohbet izinleri zorunlu uygulanır; kullanıcıya ilişkisiz işletme sohbetleri gösterilmez veya erişilemez.
- Masaüstünde isteğe bağlı desteklenebilir; ancak kabul kriterleri mobil deneyimi esas alır.

**Uygulama (12 Haziran 2026):**

- `ChatBubble` (sağ alt) yalnızca `isStoreTransactionRoute` eşleşen rotalarda: `/siparis/satici|isletme/:slug`, `/alisveris/magaza/:slug`, `/magaza/urun|magaza/:slug`, sepet/ödeme, sipariş takip, turizm detay/rezervasyon, sağlayıcı panelleri.
- **Kapalı:** anasayfa, `/servisler`, `/yemek`, `/market`, `/isletmeler`, `/siparis` hub, `/magaza` vitrin, `/alisveris`, `/turizm` hub, `/ulasim`, `/kesfet`, `/haritalar`, haber, YekTube, ansiklopedi vb.
- `floatingWidgetVisibility.ts` → `resolveFloatingWidgetVisibility()` tek kaynak; `App.tsx` buradan okur.
- **Yekpare AI** (sol alt) yalnızca `/` ve `/home` anasayfada; servis vitrinlerinde gizli.

## 8. Mağaza / Sellzy (Çok Satıcılı E-Ticaret Pazaryeri)

Durum: **Kısmi tamamlandı** — 11 Haziran 2026 derin Sellzy kaynak portu (sprint 2).

**Son sprint (11 Haziran 2026, sprint 2):** Codecanyon `apps/web` kaynağından ek gerçek bileşenler port edildi:

- `SellzyHomeExtraSections.tsx` ← `BestSellingProductsClient`, `TopSellingProductsClient`, `FeaturedProductCard`, `TopSellingHorizontalCard`, `HotDealsWeekClient`, `BottomPromoBanners`, `NewlyLaunchedProductsClient`, `BeautyProductsClient`
- `SellzyProductDetail.tsx` ← `ProductGallery`, `ProductInfo`, `ProductTabs`, `ProductReviews`, `RelatedProducts`, `product/[slug]/page.tsx`
- `MagazaHakkimizda.tsx` ← `(public)/about/page.tsx` (sadeleştirilmiş)
- `Magaza.tsx` bölüm sırası Sellzy `home-1` (`apps/web/src/app/[locale]/page.tsx`) ile hizalandı
- **Üst hero (11 Haz 2026):** `SellzyHero.tsx` — Sellzy tam ekran foto carousel yerine Yekpare Sade kompakt panel (yeşil CTA, ürün arama, promo slayt metni); alt bölümler (SupportInfo, BestSelling, …) Sellzy sırası korunur
- `/magaza/*` → **Yekpare SadePublicChrome** + Sellzy gövde (`SellzyMarketplaceLayout bodyOnly`; çift header yok)
- Ürün detayda satıcı adı + puan + `/magaza/magaza/:slug` bağlantısı
- API: `topSelling`, `bottomPromoBanners`, ürün detay `reviews/colors/sizes/sku`, `/api/delivery/marketplace/about`, pazaryeri `storefrontHref` → `/magaza/magaza/:slug`

Kaynak envanteri: `themes/sellzy/SOURCE.md`.

**Hâlâ tam Sellzy 1:1 parite DEĞİL** — aşağıdaki boşluklar açık:

Kök gereksinim (hedef değişmedi):

- `/magaza` ve tüm mağaza alt rotaları **Sellzy multivendor e-ticaret temasının birebir (1:1) kopyası** olacak — görsel düzen, bileşen hiyerarşisi, sayfa akışı ve özellik seti Sellzy referansıyla eşleşir.
- Hem **frontend** hem **backend**: Sellzy'deki çalışan tüm özellikler Yekpare'ye port edilir (pazaryeri ana sayfa, satıcı vitrinleri, ürün detay, sepet, ödeme, kategoriler, markalar, kampanyalar, blog, admin/vendor panelleri — kaynak envanterine göre).
- **Türkçe Yekpare markalama**; Sellzy logosu/isim/İngilizce UI etiketi görünmez.
- Site kabuğu: **`/magaza/*` → Yekpare SadePublicChrome** (Mağaza menüde aktif, Haritalar vb.) + **Sellzy gövde** (`MagazaRoute` → `SadeAwarePublicLayout` + `SellzyMarketplaceLayout bodyOnly`). Sellzy üst/alt chrome **gösterilmez** (çift nav yok). **Eski tema** (mor `AppNav`) mağaza rotalarında **yasak**.

Hedef rotalar (Sellzy ↔ Yekpare) — güncel durum:

| Sellzy yüzeyi | Yekpare rota | Durum (main, 11 Haz 2026 sprint 2) |
|---------------|--------------|---------------------------|
| Marketplace ana sayfa | `/magaza` | **İyileşti** — home-1 sırası: Hero, SupportInfo, BestSelling, ShopByCategory, TopSelling, OurProducts, HomePromo, NewlyLaunched, HotDealsWeek, Beauty, Blogs, BottomPromo |
| Hakkımızda | `/magaza/hakkimizda` | **Kısmi** — AboutHero/Features sadeleştirilmiş; Team/Testimonials API yok |
| Kategori listesi / filtre | `/magaza/kategoriler`, `/magaza/kategori/:slug` | Kısmi — liste + slug detay var; gelişmiş filtre yok |
| Ürün detay | `/magaza/urun/:slug` | **İyileşti** — Sellzy galeri, ProductInfo, satıcı adı/puan + mağaza linki, tabs, seed yorumlar, ilgili ürünler; canlı yorum gönderimi / zengin HTML tabs eksik |
| Satıcı vitrin | `/alisveris/magaza/:slug` | Kısmi — `sellzy-store` CSS kabuğu |
| Sepet | `/magaza/sepet` | **Stub** — local cart + API preview stub |
| Ödeme (checkout) | `/magaza/odeme` | **Stub** — form önizleme; gerçek ödeme yok |
| Markalar, kampanyalar, blog | `/magaza/markalar`, `/magaza/kampanyalar`, `/magaza/blog` | **Kısmi** — API + liste sayfaları; tam blog CMS / marka filtre yok |
| Vendor paneli | `/servis-saglayici-paneli` | Kısmi — Sellzy vendor modülleri port edilmedi |
| Admin (Sellzy admin) | Admin e-ticaret ekranları | Kısmi — abandoned cart, banner yönetimi vb. yok |

Kalan tam-parite boşlukları (açık):

- Sellzy `apps/web` bileşenlerinin pixel-perfect portu (dekoratif PNG asset pack, `motion/react` tam stagger)
- Gelişmiş arama/filtre (fiyat, marka, sıralama) — `shop/[...slug]` ShopLayoutEngine
- Ürün detay: canlı yorum API, zengin metin ProductTabs HTML parser, çoklu görsel DB alanı
- Çok satıcılı birleşik sepet + gerçek checkout (Stripe/iyzico, adres defteri)
- Sellzy admin: banner, kupon, abandoned cart, vendor onay akışları
- Sellzy vendor paneli: ürün CRUD, kazanç, sipariş yönetimi tam portu
- `/magaza/:vendorSlug` pazaryeri içi satıcı rotası (şu an `/alisveris/magaza/:slug`)

- Çok satıcılı pazaryeri ana sayfa (banner, kategori rayları, flash deal, öne çıkan ürünler, markalar)
- Gelişmiş arama ve filtre (fiyat, marka, kategori, sıralama)
- Ürün detay (galeri, varyant, stok, yorumlar, ilgili ürünler)
- Satıcı mağaza sayfası (satıcı profili, ürün grid'i, satıcı puanı)
- Sepet (çok satıcılı sepet birleştirme veya satıcı bazlı)
- Checkout (adres, kargo, ödeme, kupon)
- Kullanıcı hesabı (siparişler, istek listesi, adres defteri)
- Vendor paneli (ürün CRUD, sipariş yönetimi, kazanç)
- Admin paneli (satıcı onay, kategori, banner, kupon, raporlar)
- Blog, kampanya, abandoned cart (Sellzy admin'de mevcut)

Uygulama hedefleri:

- Frontend: `goalgo/artifacts/ahenkpress/src/pages/public/Magaza.tsx` ve alt rotalar — Sellzy `apps/web` birebir port
- Backend: `goalgo/artifacts/api-server` — Sellzy `apps/api` uçları (ürün, sepet, sipariş, vendor, kategori, ödeme)
- Vendor vitrin: `EcommerceThemeRenderer.tsx`, `vendor-storefront.ts` — Sellzy storefront bileşenleriyle değiştirilir/genişletilir
- Görseller/CSS: Sellzy `apps/web` asset'leri → `public/` veya tema paketi

Çapraz referanslar:

- **§6:** Mağaza rotalarında yalnızca Yeni Sade chrome; eski mor header/footer regresyonu sayılır.
- **§2:** Sipariş modülleri (`/yemek`, `/market`, `/isletmeler`) ayrı kalır; `/magaza` Sellzy e-ticaret pazaryeridir — karıştırılmaz.
- **§9.1:** Anasayfa hizmet rayında Mağaza girişi Sellzy pazaryerine link verir.
- **Terminoloji:** «Birebir» = Sellzy demo/codecanyon ekranlarıyla 1:1; «yakın» veya «Sellzy'den esinlenilmiş» kabul edilmez.

Kabul kriterleri:

- Canlı `/magaza` açıldığında Sellzy codecanyon demo'suyla **görsel ve işlevsel parite** (ana sayfa bölüm sırası, kart düzeni, Sellzy iç gövde bileşenleri) sağlanır; site kabuğu Yekpare Sade header/footer'dır.
- `/magaza` rotalarında **Yekpare SadePublicChrome** görünür (Mağaza aktif); Sellzy duplicate header/footer ve mor Turinet `AppNav` veya koyu `SiteFooter` görünmez.
- Pazaryeri, kategori, ürün detay, satıcı vitrin, sepet ve checkout akışları uçtan uca çalışır; 404 veya boş stub sayfa kalmaz.
- Backend API Sellzy eşdeğer uçlarla beslenir; statik placeholder veya yalnızca CSS kabuğu kabul edilmez.
- Türkçe Yekpare markalama; Sellzy/İngilizce etiket görünmez.
- `cursor/magaza-sellzy-themes` dalındaki kısmi iş birleştirilse bile nihai doğrulama Sellzy kaynak ağacına göre yapılır — dal commit'leri tek başına «tamamlandı» sayılmaz.
- Yerel smoke: `pnpm run typecheck` + `build:web` + api-server build başarılı; tarayıcıda `/magaza` → kategori → ürün → sepet → ödeme adımları kesintisiz.

## 10. Site Geneli Konum Arama — Google Places/Location API

Durum: Bekliyor.

Kök gereksinim:

- Sitedeki tüm "konum arama", adres ve lokasyon giriş kutuları Google Location/Places API kullanır (autocomplete, geocoding, place details).
- Kullanıcı konum seçimi beklediği yerde manuel yalnızca metin veya Google'sız TR-only adres girişi kabul edilmez.

Kapsam (site geneli, turizm dışı dahil):

- Header arama / konum alanları
- Sipariş vitrinleri (`/yemek`, `/market`, `/isletmeler`)
- Keşfet hero konum girişi
- Turizm modül arama formları (Konaklama, Yat Turları, Villa/Ev — **§5.2.1**, Travlla vb.) — **§5.3** footer MODÜLLER linkleri ile çapraz doğrulanır
- Benzeri tüm lokasyon/filtre girişleri

Ortam gereksinimleri:

- `GOOGLE_PLACES_API_KEY` ve ilgili Google Maps API'leri hem Railway (`api-server`) hem Vercel (frontend) üzerinde yapılandırılmış olmalı.

Kabul kriterleri:

- Lokasyon alanına yazıldığında Google Places autocomplete önerileri görünür.
- Kullanıcı bir öneri seçtiğinde lat/lng ve şehir (veya filtre için gerekli normalize alanlar) set edilir; arama/filtre istekleri bu koordinatlarla gider.
- Header, Sipariş, Keşfet hero, **`/haritalar` konum/arama alanları** ve en az bir Turizm arama formu tarayıcı smoke testi ile doğrulanır.
- API anahtarı eksik veya hatalıysa kullanıcıya anlaşılır hata veya güvenli fallback gösterilir; sessiz boş metin kutusu kalmaz.
- §5.1 ile uyumlu: konum alanları tema gövdesi içinde kalır; site chrome tek kaynaktan (**Yeni Sade Yekpare header/footer**).

## CI Düzeltmesi (GitHub Actions, 11 Haziran 2026)

Durum: Tamamlandı.

Kök neden:

- `Goalgo CI` workflow'u `03399687` (6amMart vitrin yeniden yazımı) sonrası kırmızıydı; başarısız adım `pnpm run security:check`.
- `scripts/security-regression-check.mjs`, `Siparis.tsx` içinde `sanitizeHtml(html)` çağrısını şart koşuyordu; ancak yeni `/siparis` sayfası artık reklam HTML'i hiç render etmediği için (dangerouslySetInnerHTML yok) bu assertion bayatlamıştı. Vercel/Railway bu script'i çalıştırmadığı için deploy'lar yeşil kalıyordu.

Yapılan:

- Bayat assertion, güvenlik niyetini koruyan `assertNotIncludes(Siparis.tsx, "dangerouslySetInnerHTML")` kontrolüyle değiştirildi; ayrıca script'in kendi kendini dışlama yolu Windows'ta da çalışacak şekilde ayraç-normalize edildi.
- Node 20 deprecation uyarıları için workflow action'ları güncellendi: `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6` (hepsi Node 24 runtime).
- Yerel doğrulama (temiz origin/main worktree): `pnpm install --frozen-lockfile`, `typecheck`, `security:check`, api-server ve ahenkpress build — hepsi başarılı.

## Anasayfa kartları ve Seyahat etiketi (11 Haziran 2026)

Durum: Tamamlandı (`fix/homepage-seyahat-nav`).

- Sade anasayfa hero yan kartları: **Sipariş** → **Alışveriş** (`/magaza` link), **Ulaşım** → **Seyahat** (`/turizm` link); kartlar `Link` + erişilebilirlik etiketi ile tıklanabilir.
- Görünür **Turizm** menü/ray etiketleri **Seyahat** olarak güncellendi; rota `/turizm` değişmedi (`yekpareServiceNav.ts`, `site-nav`, `AppNav`, `TurizmSubNavBar`, Keşfet/Haritalar/breadcrumb yüzeyleri).
- Görünür **Mağaza** menü/ray etiketleri **Alışveriş** olarak güncellendi; rota `/magaza` değişmedi (`yekpareServiceNav.ts`, `site-nav`, `AppNav`, service rails).

## SEO sitemap ve GEO optimizasyonu (12 Haziran 2026)

Durum: Tamamlandı.

Yapılan:

- `sitemap-static.xml`: `yekpare.net` kanonik kök; güncel modül rotaları (`/yemek`, `/market`, `/magaza`, `/turizm`, `/ulasim`, `/kesfet`, `/haritalar`, `/yektube`, `/ansiklopedi`, `/firma-rehberi`, `/ai-cagri-merkezi`, `/siparis-takip`, `/destek` vb.).
- API sitemap (`sitemap.ts`): turizm URL'leri `/turizm/konaklama|villa-ev|tur|…` ile hizalandı; `vendors-magaza.xml`, `authors.xml`, `ansiklopedi.xml` (81 il + öne çıkan konular) eklendi; mağaza blogları `/magaza/magaza/{slug}` kanonik yolu.
- `robots.txt`: `Sitemap: https://yekpare.net/sitemap.xml`; admin/üye/panel/sepet rotaları `Disallow`.
- GEO: `index.html` Organization/WebSite/Service JSON-LD (`areaServed: TR`); FAQPage yalnızca `/bilgi/*` (`pageSeo`); `geo.region` / `geo.placename` meta; `llms.txt` ve `pageSeo.ts` Yekpare terminolojisi.
- Build: `generate-public-sitemap.mjs` genişletilmiş fallback index; `scripts/ping-sitemap.mjs` (Google/Bing ping + GSC manuel URL'leri).

Kabul kriterleri:

- `https://yekpare.net/sitemap.xml` dizininde statik + dinamik alt sitemap'ler listelenir.
- `pnpm --filter @workspace/api-server run build` ve `pnpm --filter @workspace/ahenkpress run build` başarılı.

Manuel indeks gönderimi (ping yanıtı garanti değil):

- Google Search Console → Sitemaps → `https://yekpare.net/sitemap.xml`
- Bing Webmaster Tools → Sitemaps → `https://yekpare.net/sitemap.xml`

## GEO entity — «Yekpare nedir» marka sorguları (12 Haziran 2026)

Durum: Tamamlandı (12 Haziran 2026 — anasayfa GEO bloğu ayrı bilgi sayfasına taşındı).

Yapılan:

- **`/bilgi/yekpare-nedir`:** Genişletilmiş Türkçe entity içeriği; tüm modüller (yemek, market, alışveriş, seyahat, ulaşım/kurye/taksi/çekici, haritalar, Haber Merkezi, YekTube, AI, işletme mini web sitesi + özel domain, paneller); `YekpareGeoServiceIntro` (compact) 12 hizmet kartı bu sayfada.
- **Bilgi sayfaları (13+):** `/bilgi/alisveris-nedir`, `/bilgi/seyahat-nedir`, `/bilgi/haritalar-nedir`, `/bilgi/bilgi-agaci-nedir`, `/bilgi/ai-cagri-merkezi-nedir`, `/bilgi/isletme-sayfasi-ozel-domain`, `/bilgi/ulasim-kurye-taksi-cekici`, `/bilgi/haber-merkezi-nedir`, `/bilgi/yektube-nedir` vb.
- **`pageSeo.ts`:** `applyYekpareEntityGraph`, `buildYekpareOrganizationJsonLd`, `buildYekpareWebSiteJsonLd`, `buildYekpareServiceJsonLd`, `YEKPARE_CORE_SERVICE_SCHEMA`; Bilgi sayfalarında FAQPage + BreadcrumbList + AboutPage.
- **`index.html` + `pageSeo.ts`:** `@graph` Organization + WebSite + 12 Service (yemek, market, magaza, turizm, kesfet, haritalar, haberler, ansiklopedi, ulasim, AI, habermerkezi, yektube) + SoftwareApplication; **FAQPage yalnızca `/bilgi/*`** — anasayfada görünür SSS yok.
- **Anasayfa:** GEO/entity bloğu **kaldırıldı** — Hakkımızda tarzı içerik `/bilgi/yekpare-nedir` sayfasında; anasayfa yalnızca haber, keşfet, Bilgi Ağacı bandı vb. modül akışı.
- **Footer:** «Yekpare nedir?» → `/bilgi/yekpare-nedir` (görünür, küçük link).
- **`llms.txt` + `ai.txt`:** Marka entity özeti, hedef sorgular, bilgi sayfası URL'leri.
- **`sitemap-static.xml`:** Yeni bilgi sayfaları; `yekpare-nedir` priority 0.95.

Hedef sorgular (organik sıralama garanti değil; on-site sinyal):

- `yekpare`, `yekpare nedir`, `yekpare.net`
- `yekpare yemek siparişi`, `market siparişi`
- `yekpare alışveriş`, `yekpare seyahat`, `yekpare haritalar`
- `yekpare ulaşım`, `kurye`, `taksi`, `çekici`, `ortak yolculuk`
- `yekpare ai`, `ai çağrı merkezi`, `haber merkezi`
- `işletme özel domain`, `yekpare işletme web sitesi`
- `yekpare haberler`, `yektube`, `yekpare bilgi ağacı`

Manuel Google / GBP adımları (kod dışı — yapılmadı, operatör uygular):

1. **Google Search Console:** Mülk `yekpare.net` → URL Denetimi → `https://yekpare.net/bilgi/yekpare-nedir` → Dizine eklenmesini iste; Sitemaps → `sitemap.xml` yeniden gönder.
2. **Google Business Profile (varsa):** İşletme adı «Yekpare» veya resmi unvan; kategori «İnternet şirketi» / «Yazılım şirketi»; web sitesi `https://yekpare.net`; açıklamada süper uygulama + hizmet listesi; `yekpare.net/bilgi/yekpare-nedir` linki.
3. **Bing Webmaster:** Aynı entity URL için dizin isteği.
4. **Sosyal `sameAs`:** Yalnızca doğrulanmış resmi profil URL'leri schema'ya eklenmeli; uydurma profil eklenmedi.

Kabul kriterleri:

- `https://yekpare.net/bilgi/yekpare-nedir` canlıda entity metni + hizmet kartları + FAQ görünür.
- Anasayfa (`/`) altında büyük GEO/entity bloğu **görünmez**; footer'da «Yekpare nedir?» linki yeterli.
- `pnpm --filter @workspace/api-server run build` ve `pnpm --filter @workspace/ahenkpress run build` başarılı.

## Yekpare AI sohbet kutusu (12 Haziran 2026)

Durum: Tamamlandı — görünürlük daraltıldı (12 Haziran 2026).

Yapılan:

- Herkese açık **Yekpare AI** yüzen sohbet kutusu: sol alt köşe, Yekpare Sade (beyaz/yeşil), hızlı chip'ler (Yemek, Alışveriş, Seyahat, Haritalar, Haberler, Bilgi Ağacı).
- **Görünürlük (12 Haz):** Yalnızca anasayfa (`/`, `/home`); yemek/market/keşfet/haber vb. servis sayfalarında gizli — mobilde gereksiz çift balon regresyonu önlendi.
- Backend: `POST /api/yekpare-ai/chat`, `GET /api/yekpare-ai/status` — platform bilgisi `yekpareAiKnowledge.ts` ile her istekte Gemini/OpenAI/DeepSeek sistem istemine gönderilir.
- API anahtarları: **Genel Ayarlar → Entegrasyonlar → Google Gemini** (öncelikli); yedek OpenAI (AI İçerik Robotu + site) ve DeepSeek (site). Anahtar yoksa anahtar kelime tabanlı Türkçe rota önerisi (`yekpareAiFallback.ts`).
- Sipariş **ChatBubble** sağ altta kalır; Yekpare AI sol altta — yalnızca anasayfada birlikte görünür. Admin ve sağlayıcı panellerinde gizli.

## Portal giriş konum istemi (12 Haziran 2026)

Durum: Tamamlandı.

- `AppEntryLocationPrompt`: kayıtlı konum yoksa portal girişinde bir kez yumuşak modal («Konumumu kullan» / «Adres yazarak seç» / «Sonra hatırlat»).
- `navigator.geolocation` yalnızca kullanıcı onayıyla; `publicLocation` (`yekpare_public_location_v2`) + `SadeLocationPickerModal` ile entegre.
- `yekpare_geo_prompt_asked_v1` ile tekrar sorma engellenir; HM/haber vitrinlerinde atlanır (`shouldSkipSiteGeolocationWarmup`).
- `SiteGeolocationWarmup`: modal reddedildikten sonra sessiz tek deneme (izin zaten verilmişse).

Kabul kriterleri:

- `yekpare.net` vitrin sayfalarında «Yekpare AI» butonu görünür; panel açılır, soru sorulur, site içi link önerilir.
- API anahtarı yalnızca sunucuda; frontend'e sızmaz.
- `pnpm --filter @workspace/api-server run build` ve `pnpm --filter @workspace/ahenkpress run build` başarılı.

## Marka (yekpare.net), Yekpare AI düzeltmesi ve admin arama (12 Haziran 2026)

Durum: Tamamlandı.

Yapılan:

- **Varsayılan domain / marka:** `portalBrand.ts` (frontend + api-server), `pageSeo.ts`, `index.html`, seed/demo-reset, middleware — birincil kök `yekpare.net`; sekme başlığı ve site adı **Yekpare** (eski «Türknet Yekpare» DB değerleri `normalizePortalDisplayName` ile normalize edilir).
- **Yekpare AI:** İstemci `reply` alanı yoksa veya ağ hatasında yerel anahtar kelime yedek yanıtı; `/api/yekpare-ai/*` genel rate-limit muafiyeti; sohbet «bağlantı kurulamadı» döngüsüne düşmeden yönlendirme verir.
- **Gemini API görünürlüğü:** Genel Ayarlar → Entegrasyonlar → `#gemini-api-key` — «Yekpare AI için Gemini» rozeti, kayıtlı/maskeli durum göstergesi; admin aramada «Gemini» / «Yekpare AI» → `/admin/ayarlar?tab=entegrasyon#gemini-api-key`.
- **Admin global arama:** `AdminGlobalSearch` + `adminSearchIndex.ts` — kontrol paneli ve tüm admin sayfalarında üst çubukta; dashboard girişinde büyük arama kutusu; menü + entegrasyon/SEO kısayolları.

Kabul kriterleri:

- Tarayıcı sekmesi ve OG başlıkları «Yekpare» gösterir (canlı DB'de eski site adı kalsa bile).
- Yekpare AI anahtar olmadan da chip/soru ile sayfa linki önerir; Gemini anahtarı adminde bulunur.
- Admin arama «gemini», «haberler», «turizm», «sipariş» vb. ile ilgili sayfaya gider.
- `pnpm --filter @workspace/api-server run build` ve `pnpm --filter @workspace/ahenkpress run build` başarılı.

Test URL'leri:

- `https://yekpare.net/` — sekme başlığı Yekpare; sol altta Yekpare AI
- `https://yekpare.net/api/yekpare-ai/status` — yapılandırma özeti (anahtar sızmaz)
- `https://yekpare.net/admin` — hızlı arama + üst çubuk arama
- `https://yekpare.net/admin/ayarlar?tab=entegrasyon#gemini-api-key` — Gemini alanı

## Bilgi Ağacı anasayfa bandı — orantılı kart düzeni (12 Haziran 2026)

Durum: Tamamlandı.

Yapılan:

- Yekpare anasayfa `SadeBilgiAgaciDailyBand`: seçilmiş içerik, kaliteli madde ve günün görseli sekmeleri aynı yatay kart düzeninde — **küçük görsel solda, başlık/özet sağda** (yeşil çerçeveli panel içinde); mobilde görsel üstte.
- Görsel `wiki-daily-media-featured` boyutları (~200–280px, 16:10, `object-fit: cover`); kart taşması yok; başlık/özet `line-clamp`.
- Başlık, görsel ve «Maddeyi oku» CTA `/ansiklopedi/{slug}` ile ansiklopedi maddesine bağlanır (`wikiTitleToUrlSlug`).
- **Mobil (<768px):** kompakt başlık (kısa açıklama + «Keşfet» CTA); sekmeler yatay kaydırma (`flex-nowrap`, `yekpare-scrollbar` — ince beyaz-yeşil şeffaf çubuk); kart görseli 16:9, max ~170px; azaltılmış padding; Yekpare AI baloncuğu ile çakışmayı azaltmak için alt boşluk.

Kabul kriterleri:

- Kaliteli madde / günün görseli sekmelerinde banner taşması yok; seçilmiş içerik ile aynı oran.
- Mobilde sekme satırı çok satıra kırılmaz; kart metni viewport altında kesilmez.
- `pnpm --filter @workspace/ahenkpress run typecheck` ve `build` başarılı.

## Bilgi Ağacı `/ansiklopedi` landing — günlük kart düzeni (12 Haziran 2026)

Durum: Tamamlandı.

Yapılan:

- `/ansiklopedi` landing «Günün Seçilmiş İçerikleri»: «Günün kaliteli maddesi» ve «Günün görseli» kartları üst banner yerine seçilmiş madde ile aynı yatay düzen — **görsel solda (140–180px), metin sağda**; 2 sütunlu alt gridde eşit yükseklik, `line-clamp`, taşma yok.
- Görsel, başlık ve «Maddeyi oku» CTA `/ansiklopedi/{slug}` bağlantılı (`WikiDailyMediaCard`); «Tarihte bugün» / «Biliniyor muydunuz?» metin kartları aynı kaldı.
- Mobil: görsel üstte, metin altta (dikey stack).

Kabul kriterleri:

- Kaliteli madde ve günün görseli kartlarında üst banner görseli yok; seçilmiş madde ile orantılı yatay düzen.
- `pnpm --filter @workspace/ahenkpress run typecheck` ve `build` başarılı.

## Yekpare AI — samimi sohbet, Gemini ve kapsam kuralı (12 Haziran 2026)

Durum: Tamamlandı.

Yapılan:

- **Samimi sohbet:** Gemini sistem isteminde sıcak Türkçe ton; selam/teşekkür mesajlarına doğal yanıt; rota linkleri yalnızca gerektiğinde.
- **Kapsam:** yekpare.net dışı özel/genel konulara girmez; nazikçe reddeder ve sipariş, alışveriş, seyahat, haritalar, haberler, Bilgi Ağacı, destek vb. konularda yardım teklif eder. Kural hem Gemini isteminde hem `yekpareAiFallback.ts` yedek davranışında.
- **Gemini önceliği:** `site_settings.geminiApiKey` (+ isteğe bağlı `GEMINI_API_KEY` env yedek); anahtar varken Gemini önce denenir; başarısızlıkta tanı `diagnostic` alanı (gizli bilgi sızmaz). `/api/yekpare-ai/status` → `geminiKeySource`, `geminiKeyHint`, `scopeNote`.
- **Sohbet geçmişi:** Son 6 tur `history` ile API'ye gönderilir.
- **Frontend:** Bağlantı hatasında yalnızca sunucu yanıtı yoksa kısa yerel yedek; selam/konu dışı için rota listesi zorlamaz; link chip'leri yalnızca döndüğünde gösterilir.

Kabul kriterleri:

- «Merhaba» → samimi karşılama, rota listesi değil (Gemini veya yedek).
- «Bitcoin nedir?» / kişisel-genel soru → nazik red + yekpare.net yardım teklifi.
- «Yemek siparişi» → ilgili rota/link önerisi.
- Admin: **Genel Ayarlar → Entegrasyonlar → Google Gemini** (`#gemini-api-key`) anahtarı kayıtlı olmalı (canlıda Gemini için).
- `pnpm --filter @workspace/api-server run build` ve `pnpm --filter @workspace/ahenkpress run typecheck` / `build` başarılı.

Test URL'leri:

- `https://yekpare.net/api/yekpare-ai/status` — `geminiConfigured`, `scopeNote`
- `https://yekpare.net/` — Yekpare AI widget, «Merhaba» ve konu dışı soru davranışı

## Yekpare AI — site asistanı, konum ve niyet yönlendirmesi (12 Haziran 2026)

Durum: Tamamlandı.

Yapılan:

- **Konum + kategori niyeti:** `yekpareAiIntent.ts` — şehir (81 il), yemek kategorileri (gözleme, pide, kebap vb.), alternatif öneri; «Ankara'da gözlemeci var mı» gibi sorularda samimi yanıt + bağlamsal chip'ler.
- **Arama link kalıpları:** `/kesfet?q={terim}&city={şehir}`, `/yemek?sehir={şehir}`, `/haritalar?q={terim}`, `/turizm?city={şehir}`, `/siparis-takip`, `/siparislerim`, `/isletme-giris`, `/isletme-basvuru`, `/magaza/satici-ol`.
- **Fallback zenginleştirme:** Gemini yokken üyelik, giriş, sipariş takip, satıcı ol, konum/adres, turizm, alışveriş niyetleri asistan tonunda yanıtlanır (genel Yemek/Alışveriş/Seyahat listesi tekrarı azaltıldı).
- **Gemini istemi:** Konum bağlamı, etkileşimli örnekler, URL kalıpları ve takip sorusu kuralları `yekpareAiKnowledge.ts` içinde.
- **Frontend:** `locationContext` (city/district/label — koordinat yok) API'ye gönderilir; header'daki kayıtlı konum sohbet başlığında; chip'ler bağlama göre; yerel yedek gözleme/Ankara senaryosunu kapsar.

Kabul kriterleri:

- «ankarada gözlemeci varmi sitede» → Ankara gözleme araması + pide/yemek alternatif chip'leri (Gemini veya yedek).
- «sipariş takip» / «üyelik» / «satıcı olmak» → ilgili sayfa linkleri + kısa açıklama.
- Kayıtlı konum varsa «konumunuza göre» ifadesi kullanılabilir.
- Admin: **Genel Ayarlar → Entegrasyonlar → Google Gemini** (`#gemini-api-key`) — canlıda tam asistan için gerekli.
- `pnpm --filter @workspace/api-server run build` ve `pnpm --filter @workspace/ahenkpress run typecheck` / `build` başarılı.

Test URL'leri:

- `https://yekpare.net/api/yekpare-ai/status` — `assistantFeatures`, `geminiConfigured`
- `https://yekpare.net/` — Yekpare AI, konum seçiliyken başlıkta il/ilçe etiketi

## Yekpare yatay rail scrollbar — ince beyaz-yeşil (12 Haziran 2026)

Durum: Tamamlandı.

Yapılan:

- `index.css`: `.yekpare-scrollbar` — track `rgba(16,185,129,0.06)`, thumb beyaz→zümrüt gradient, 5px yükseklik, Firefox `scrollbar-width: thin`.
- Uygulandı: `Rail` (`SiparisModulVitrin`), anasayfa sipariş/alışveriş/seyahat vitrinleri, haber bantları (`SadeNewsModules`), şehir bandı, Bilgi Ağacı sekmeleri, header modül nav, köşe yazarları, keşfet şehir listesi (sade varyant).

Kabul: Sayfa dikey scrollbar'ı değişmez; yatay raylarda kaydırma görünür ama baskın değil; ok butonları çalışır.

## Haber makale gövdesi paragraf aralığı (12 Haziran 2026)

Durum: Tamamlandı.

**Kök neden:** Yekpare portal `/haber/:slug` (`SixAmMartNewsDetailPage`) ham `news.content` HTML'ini `normalizeAiNewsHtml` / `NewsArticleBody` olmadan tek blok olarak basıyordu; düz metin veya `<div>`/`<br>` gövdelerinde `<p>` etiketi oluşmadığı için `.yekpare-rich-content` paragraf boşlukları uygulanmıyordu. `HaberDetay.tsx` (HM partner) zaten normalize + `yekpare-news-body` kullanıyordu.

**Yapılan:**

- `SixAmMartNewsDetailPage`: `normalizeAiNewsHtml` + `NewsArticleBody` + `yekpare-news-body` sınıfları (`HaberDetay` ile aynı pipeline).
- `normalizeAiNewsHtml.ts` (ahenkpress + api-server): `<div>`/`<br>` gövdelerini paragraflara böler; uzun `<p>` bloklarını cümle kümesine ayırır; `yekpare-hm-attribution` kaynak notunu korur ve parçalamaz.
- `index.css`: `.yekpare-news-body` — `max-width: 68ch`, `line-height: 1.8`, paragraf/liste/blockquote aralığı; attribution notu üst border + `margin-top: 2rem`.
- `NewsArticleBody`: galeri parçaları `yekpare-news-body-chunk` (`display: contents`).

**Kabul:** Portal haber/köşe detayında metin yığma değil, paragraflar arası belirgin boşluk; HM kaynak notu gövdeden ayrık; HM white-label düzeni bozulmaz.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

## Sade public hero alt fade — sayfa ile bütünleşme (12 Haziran 2026)

Durum: Tamamlandı (standart hero stage — 12 Haziran 2026, ikinci tur).

**Standart pattern (turizm referansı):**

- `.sade-public-hero-stage` — alt menü / modül nav hemen altında tam viewport genişliği band.
- `.sade-public-hero-surface` — krem-yeşil gradient + `::before` blur + `::after` alt fade.
- `.sade-public-hero-content` (`SADE_PUBLIC_HERO_CONTENT_CLASS`) — max 1440px içerik kabuğu.
- Fade hedefi: `--sade-public-page-bg` (sayfa zemin rengi — `#f4f7f6`, `#FCFCFD`, `#fff` vb.); sabit beyaz değil.

**Yapılan (ikinci tur):**

- `Shell` `heroChrome`: header + kategori nav **beyaz sticky** (gradient dışında); hero stage yalnızca alt menü sonrası başlar.
- `/haberler`: hero stage = piyasa/hava + son dakika + RSS + **manşet**; köşe yazarları, kategori modülleri vb. sayfa zemininde (`#f4f7f6`).
- `/yektube`: hoşgeldin hero alt menü altında tam genişlik; iç içe `rounded-2xl` kart / beyaz şerit kaldırıldı.
- `/turizm`, `/kesfet`, `/siparis`, `/yemek`, `/market`, `/magaza`, modül vitrinleri: `sade-public-hero-stage` sarmalayıcı.

**Kabul:** Hero alt kenarı sayfa arka planına yumuşak geçer; sert beyaz çizgi/stripe yok; form/buton tıklanabilir kalır; admin/HM white-label dokunulmaz.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build`.

Test URL'leri: `/`, `/haberler`, `/yektube`, `/siparis`, `/kesfet`, `/turizm`, `/magaza`, `/ulasim`, `/yemek`, `/market`, `/isletmeler`.

## Hero genişletme geri alma — site geneli düzen (12 Haziran 2026)

Durum: Geri alındı (kullanıcı geri bildirimi: «tüm sayfalar bozuldu» / «tüm sayfalara çift hero renk atılmış»).

**Kök neden — çift hero bandı (`60a07b2d`):** `Shell` içinde `showHeroBand = !mapEmbed && !skipDefaultHeroBand` ile **her rotaya** boş varsayılan hero gradient bandı eklendi. Sayfaların kendi hero/header bölümü (ör. `/kesfet` arama paneli, `/market` vitrin hero) zaten gradient kullanıyordu; sonuç: ana menü altında **üst üste iki gradient şerit** — üstte içeriksiz boş band, altta gerçek hero. Ekran görüntüleri `/kesfet` ve `/market` bunu doğruladı.

**Ek değişiklikler (aynı commit):** alt menü hero gradient içine taşındı (`SADE_PUBLIC_SUBNAV_GLASS_CLASS`); sayfa zemini `#f4f7f6` → `#ffffff`; haber detay iki sütun; turizm/yektube `skipDefaultHeroBand` / `SadePublicHeroBand`.

**Düzeltme:** `git revert 60a07b2d` → `46bc86a8` durumu. Varsayılan hero enjeksiyonu kaldırıldı; yalnızca opt-in `heroChrome` + `heroExtension` (ör. `/haberler` editoryal vitrin) tek hero bandı üretir. Sayfa kendi hero'sunu korur; ikinci boş band yok.

**Ertelenen (ayrı PR / dar kapsam):**

- Site geneli beyaz zemin (`SADE_PUBLIC_PAGE_BG = #ffffff`) — sayfa bazında test edilmeden tekrar uygulanmayacak.
- ~~Haber detay masaüstü: görsel sol / başlık+özet sağ iki sütun~~ — **Tamamlandı (12 Haziran 2026):** `EditorialNewsDetailHeader` ile başlık üstte / görsel tam / özet altta editör düzeni.
- Ana menü altı zorunlu hero bandı + cam alt menü — yalnızca hedef rotalarda (`/haberler`, `/turizm` vb.) opt-in olarak planlanacak.

**Kabul:** `/kesfet`, `/market`, `/yemek`, `/isletmeler`, `/turizm`, `/yektube`, `/haberler` tek hero alanı gösterir; boş üst gradient şeridi yok; `46bc86a8` fade standardı korunur.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Yeniden kontrol URL'leri:** `/`, `/haberler`, `/haberler/:slug`, `/yektube`, `/turizm`, `/kesfet`, `/siparis`, `/yemek`, `/market`, `/isletmeler`, `/magaza`, `/ulasim`.

## Sade modül zemin + hero standardizasyonu (12 Haziran 2026, üçüncü tur)

Durum: Tamamlandı.

**Kök neden:** `.sade-public-page` yeşil radial gradient + `#f4f7f6` fade hedefi; `/haberler` editoryal modüller (piyasa, son dakika, manşet) hero gradient içinde; YekTube hoşgeldin bandı aşırı sıkıştırılmış; portal haber detayında sağ sidebar yoktu.

**Yapılan:**

- `index.css`: `.sade-public-page` / `--sade-public-page-bg` → `#ffffff`; `.sade-public-hero-surface--subnav-only` (cam alt menü kısa band); `.sade-public-hero-inner--yektube`; `.yekpare-news-body--column` (detay sütununda tam genişlik).
- `SixAmMartTheme.tsx` `Shell`: subnav-only hero sınıfı; `/haberler` hero = yalnızca kategori cam şeridi, vitrin modülleri beyaz gövdede; `/haber/:slug` (`SixAmMartNewsDetailPage`) editör tarzı `lg:grid-cols-3` + `HmNewsDetailSidebar`.
- `HaberDetay.tsx`: gövde `--column` genişliği.
- `CanliTv.tsx`: YekTube hoşgeldin standart hero yüksekliği; sidebar zemin beyaz.
- `KesfetListingHub.tsx`, `listinghubKesfet.css`, `SellzyMarketplaceLayout.tsx` (`bodyOnly`), `YekpareSadeModuleShell.tsx`: sayfa zeminleri beyaz, hero fade `#fff`.
- `yekpareSadeTheme.ts`: paylaşılan hero token sınıfları.

**Kabul:** Seyahat, alışveriş, keşfet, haberler, YekTube gövdesi beyaz; tek gradient hero (nav altı); Haberler gradient kısa; YekTube bandı okunaklı; haber detay makale+sidebar; çift hero yok.

**Doğrulama:** `pnpm --dir goalgo exec tsc -p artifacts/ahenkpress/tsconfig.json --noEmit` + `pnpm --filter @workspace/ahenkpress run build`.

**Test URL'leri:** `/haberler`, `/haber/:slug`, `/yektube`, `/turizm`, `/kesfet`, `/kesfet/:slug`, `/magaza`, `/magaza/urun/:slug`.

## Haber/makale detay editör düzeni (12 Haziran 2026, dördüncü tur)

Durum: Tamamlandı.

**Kök neden:** `80f9ce9a` haber detayında masaüstü iki sütun (görsel sol / başlık+özet sağ) ve `object-cover` kırpması kullanıcı geri bildiriminde yüz/logo kesiyordu; köşe makalelerinde portal görseli gizleniyordu.

**Yapılan:**

- `EditorialNewsDetailHeader.tsx`: paylaşılan üst blok — kategori → başlık → yazar/tarih meta → `object-contain` tam görsel (`max-h-[min(70vh,560px)]`, slate kart) → özet kutusu.
- `resolveNewsExcerpt.ts`: spot/summary/description fallback tek yerde.
- `HaberDetay.tsx` (`/haber/:slug` legacy + `/tr/:site/haber/:slug`): iki sütunlu hero kaldırıldı; HM ve portal aynı editör sırası.
- `SixAmMartTheme.tsx` `SixAmMartNewsDetailPage` (`/haber/:slug` Sade): aynı header; köşe/makale detayında `imageUrl` varsa görsel gösterilir.

**Kabul:** Başlık görselin üstünde; özet görselin altında; görsel kırpılmadan orantılı; makale/köşe detay aynı düzen; sidebar korunur; hero standardizasyonuna dokunulmadı.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Test URL'leri:** `/haber/:slug`, `/tr/:siteSlug/haber/:slug`, köşe yazar makaleleri (`contentKind=makale`).

## Public zemin beyazlığı + hero ölçü standardı (12 Haziran 2026)

Durum: Tamamlandı.

**Kök neden:** Önceki hero düzeltmelerinden sonra bazı public gövde/root wrapper'ları hâlâ `#f5f7fa`, `#f4f6f8`, `#f7faf8`, `bg-gray-50` vb. açık gri/yeşil zeminlerle kalmıştı. Ayrıca `/haberler` ve `/yektube` için renklendirme ya çok kısa algılanıyor ya da manşeti kapsamıyordu.

**Yapılan:**

- `/turizm`: BookingCore ana/detay gövde rootları, turizm hub ve araç liste fallback zeminleri beyaza çekildi; hero gradient korunur.
- `/magaza`: Sellzy marketplace root/token, ürün/storefront/blog/ödeme/kampanya/marka/satıcı ol root zeminleri beyazlandı; kart ve medya içi soft yüzeyler kontrollü bırakıldı.
- `/kesfet`: ListingHub hero altı section wrapper gradyanı beyaza çekildi; işletme detay boş/hata root zemini beyazlandı; harita embed yüzeylerine dokunulmadı.
- `/haberler`: kategori nav + piyasa/hava + `Manşet` aynı standart `sade-public-hero-inner` ölçülü Sade gradient üst bölümüne taşındı; köşe yazarları ve alt haber modülleri beyaz gövdede başlar.
- `/yektube`: hoşgeldin içeriği geri eklenmeden, alt nav arkasında kısa ama görünür `sade-public-hero-surface--subnav-only` gradient bandı standart ölçüye alındı.
- `SADE_PUBLIC_PAGE_BG` varsayılanı ve hero fade hedefleri `#ffffff`; global empty hero veya çift hero eklenmedi.

**Kabul:** Seyahat, alışveriş, keşfet gövdeleri beyaz; hero altına gri/gölge gutter inmez. Haberler manşeti gradient arkasında, alt modüller beyazda; YekTube kısa üst bandı görünür ve içerik beyaz gövdeye akar.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build`.

**Test URL'leri:** `/turizm`, `/turizm/...`, `/magaza`, `/magaza/urun/:slug`, `/magaza/magaza/:slug`, `/kesfet`, `/kesfet/isletme/:id`, `/haberler`, `/yektube`.

## Bilgi Ağacı `/ansiklopedi/:slug` — makale detay infobox yan yana düzen (12 Haziran 2026)

Durum: Tamamlandı.

**Kök neden:** Önceki düzeltme (7f78e121) tüm infobox'ları blok kart yapıp alt alta dizdi; kullanıcı geri bildirimi: sağ/sol sütun bilgisi makale gövdesi içinde metinle **yan yana** olmalı, dışarıda ince şerit veya tam genişlik stack değil.

**Yapılan:**

- `.yekpare-rich-content.wiki-article` — yalnızca **ilk** infobox masaüstünde `float: right` (max 300px, makale konteyneri içinde); giriş paragrafları solda akar.
- İkinci ve sonraki infobox'lar float yok; makale akışında blok kart (max 420px), uzun sağ şerit oluşmaz.
- `infobox-l` / `floatleft` ilk infobox sola float; `h2`/`h3` `clear: both` ile bölüm başlıklarından sonra metin tam genişlik.
- Mobilde tüm infobox'lar tam genişlik stack.
- Bölüm pill navigasyonu, Yekpare yan paneli (altta grid), public zemin/hero değişmedi.

**Kabul kriterleri:**

- `/ansiklopedi/Adana`, `/ansiklopedi/Ankara` — infobox giriş metniyle yan yana; metin okunabilir genişlikte küçülmez.
- `/ansiklopedi/Osmanlı_İmparatorluğu` — tek lead infobox sağda; bölüm başlıklarından sonra tam genişlik; sonsuz sağ şerit yok.
- `pnpm --filter @workspace/ahenkpress run typecheck` ve `build` başarılı.

**Test URL'leri:** `/ansiklopedi/Adana`, `/ansiklopedi/Ankara`, `/ansiklopedi/Osmanlı_İmparatorluğu`.

## YekTube `/yektube` — standart hero gradient bandı (12 Haziran 2026)

Durum: Tamamlandı.

**Kök neden:** Hoşgeldin/logo başlık bloğu kaldırıldıktan sonra anasayfa yalnızca `sade-public-hero-surface--subnav-only` (64–92px) kullanıyordu; üst renklendirme ince şerit olarak görünüyordu.

**Yapılan:**

- `sade-public-hero-surface--yektube-band` — YekTube özel; standart Sade hero geçiş yüksekliği (`clamp(240px, 28vw, 310px)`), cam alt nav üstte, varsayılan blur + alt fade.
- `CanliTv.tsx`: anasayfa hero `SUBNAV_ONLY` → `YEKTUBE_BAND`; hoşgeldin içeriği geri eklenmedi.
- `sade-public-hero-surface--subnav-only` ve `/haberler` hero akışına dokunulmadı.

**Kabul:** `/yektube` anasayfada görünür standart üst gradient bandı; alt menü/arama bandının arkasında; beyaza fade sonra kartlar; çift hero veya boş ikinci band yok; içerik orantılı (aşırı boşluk yok).

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Test URL'leri:** `/yektube`, `/haberler` (regresyon).

**Ek düzeltme (kullanıcı geri bildirimi):** Band yüksekliği ve renklendirme korunarak `/yektube` anasayfa içerik kabuğu `yektube-home-content-lift` ile yukarı taşındı. Canlı Yayınlar/liste kartları hero fade bitişine yakın başlar; hoşgeldin bloğu, çift hero veya global boş hero eklenmedi.

## CI Düzeltmesi (GitHub Actions, 12 Haziran 2026)

Durum: Tamamlandı.

**Kök neden:** `Goalgo CI` workflow'u `383a6228` (YekTube hero fade üstü içerik) sonrası `pnpm run typecheck` adımında kırmızıydı. `artifacts/api-server/src/routes/settings.ts` içinde `publicThemeKey` alanı kullanılıyordu; `UpdateSiteSettingsBody` (api-zod) şemasında bu alan tanımlı değildi (`TS2339` / `TS2353`).

**Yapılan:**

- `goalgo/lib/api-zod/src/generated/api.ts` — `UpdateSiteSettingsBody` içine `publicThemeKey` eklendi.
- `goalgo/lib/api-spec/openapi.yaml` — `SiteSettingsInput` ve `SiteSettings` şemalarına `publicThemeKey` + eksik `newsLayoutJson` dokümantasyonu eklendi (gelecek codegen için; mevcut api-client-react üretimi değiştirilmedi).

**Doğrulama:** `pnpm run typecheck`, `pnpm run security:check`, `@workspace/api-server` build ve `@workspace/ahenkpress` build — hepsi başarılı.

## Turizm hero arama sekmeleri (12 Haziran 2026)

Durum: Güncellendi (Yat/Tekne geri eklendi).

**İstek (ilk):** `/turizm` arama kutusu üstündeki aktif olmayan stub sekmeler kaldırılacak.

**Kaldırılan stub sekmeler:** Etkinlik, Uçuş, Otobüs (`BC_SEARCH_TABS`).

**Aktif hero sekmeler (5):** Otel, Villa / Ev, Tur, Araba, **Yat/Tekne** (`boat` — eski «Bot» etiketi kullanılmaz).

**Yat modül etiketi:** UI’da «Yat Turları» yerine **Yat Tekne Kiralama**; rota slug `/turizm/yat-turlari` geriye dönük korunur.

**Yapılan:**

- `listingRoutes.ts` — `BC_SEARCH_TABS` beş aktif modül; `boat` → `TURIZM.yat.home`.
- `BookingCoreHeroSearch.tsx` — `boat` için giriş/çıkış tarih alanları.
- `turizmRoutes.ts` — nav/footer/modül etiketleri «Yat Tekne Kiralama».
- Liste/detay/vitrin kopyaları (`KonaklamaHome`, `BookingCoreHome`, `TurizmDetay`, `HomeTravelTabs`, `TurizmListe`).
- `bookingCoreTurizm.css` — beş sekme eşit genişlik (`flex: 1 1 0`).

**Not:** Stub rotalar (`/turizm/etkinlik`, `/turizm/ucus`, `/turizm/otobus`) korunur; hero’da gösterilmez.

**Kabul:** `/turizm` hero aramasında Otel, Villa/Ev, Tur, Araba, Yat/Tekne görünür; alt nav «Yat Tekne Kiralama»; `/turizm/yat-turlari` liste sayfası kiralama başlığıyla açılır.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

## Haritalar header üst üste binme + sol panel (12 Haziran 2026)

Durum: Tamamlandı.

**İstek:** `/haritalar` sayfasında harita yukarı çekilince/kaydırılınca site header'ının üstüne çıkıyordu; alttaki kategori/ikon kontrolleri Google Haritalar gibi solda açılır panel olmalı.

**Yapılan:**

- `kesfetHaritaSade.css` — `haritalar-map-shell` için `100dvh` + `overflow: hidden`; header `z-index: 5000`; harita sahnesi `isolation: isolate`; sol ray/panel Sade yeşil-beyaz sınıfları (`haritalar-map-rail`, `haritalar-map-left-panel`).
- `SixAmMartTheme.tsx` — `mapEmbed` kabuğunda header `z-[5000]`, kabuk `max-h-dvh overflow-hidden`.
- `Kesfet.tsx` — masaüstü alt orta yüzen tuş grubu kaldırıldı; sol dar ikon rayı + genişletilebilir sol panel (Harita, İşletme, Nav, Deprem, Hava, Güzergah); mevcut `renderGeoPanelBody()` işlevleri korundu; «Yeni sekmede aç» davranışı değişmedi.

**Kabul:** Yekpare header/nav her zaman harita tile/kontrol katmanlarının üstünde; harita gövdesi header altında başlar; masaüstünde kontroller solda ray + açılır panel; mobilde mevcut sol çekmece (hamburger) korunur.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

## Haritalar tam ekran yükseklik + footer gizleme (12 Haziran 2026)

Durum: Tamamlandı.

**İstek:** `/haritalar` bazı bilgisayarlarda harita hiç görünmüyor veya header ile footer arasında dar şerit kalıyordu; harita header altında tam viewport alanını doldurmalı.

**Yapılan:**

- `kesfetHaritaSade.css` — `100vh` + `@supports (100dvh)` yedekleri; `78vh` tavanı kaldırıldı; site header + harita üst bar için CSS değişkenleri (`--yekpare-haritalar-header-offset`, `--yekpare-haritalar-map-chrome`); flex zinciri `min-height: 0` ile güçlendirildi; harita sahnesi için `max(12rem, calc(100vh - header - chrome))` taban yüksekliği.
- `SixAmMartTheme.tsx` — `mapEmbed` (`/haritalar` masaüstü) kabuğunda footer gizlendi; kabuk `100vh`/`100dvh` CSS sınıfına taşındı (Tailwind `dvh` tek başına bırakılmadı).
- `Kesfet.tsx` — `desktop-chrome` gövdesinde `min(78vh, …)` inline tavan kaldırıldı; `ResizeObserver` + `invalidateSize` ile Leaflet boyut yenileme; mobil/standalone için `100vh` tabanı.

**Kabul:** Yekpare header haritanın üstünde kalır; harita gövdesi header altından viewport altına kadar uzanır; footer `/haritalar` masaüstünde görünmez (tam ekran sekme `/haritalar/tam-ekran` davranışı korunur); sol ray + genişletilebilir panel + «Yeni sekmede aç» korunur.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

## Haritalar marker bilgi kartı (12 Haziran 2026)

Durum: Tamamlandı.

**İstek:** `/haritalar` üzerinde işletme ve şehir pinlerine tıklayınca «Konuma git / Detay / Keşfet» aksiyonlu bilgi kartı görünmüyordu (sol panel + tam viewport düzenlemesinden sonra regresyon).

**Kök neden:** `kesfetHaritaSade.css` içinde tüm Leaflet katmanlarına `z-index: auto` verilmesi popup/tooltip yığınını bozuyordu; işletme pinlerinde `bindPopup` hiç yoktu (yalnızca state güncelleniyordu, masaüstünde görünür kart açılmıyordu).

**Yapılan:**

- `Kesfet.tsx` — `buildMapMarkerPopup` yardımcıları; işletme pinlerine «Konuma git / Detay / Keşfet» popup; şehir pinlerinde tıklamada `openPopup()`; «Detay» sol İşletmeler panelini açar.
- `kesfetHaritaSade.css` — Leaflet popup/tooltip/marker pane z-index düzeni; popup kart gölge/yuvarlak köşe.

**Smoke test:** `/haritalar` → işletme (⭐) veya şehir (🇹🇷) pinine tıkla → harita üstünde bilgi kartı + üç aksiyon görünür; «Detay» sol paneli açar; header/sol ray düzeni bozulmaz.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

## Haritalar mobil web eşliği (12 Haziran 2026)

Durum: Tamamlandı.

**İstek:** Masaüstünde `/haritalar` için yapılan tam boy harita, header güvenliği, sol ray/panel, marker popup ve «Yeni sekmede aç» davranışları mobilde de görünür/erişilebilir olmalı; mobilde özellik gizlenmemeli, yalnızca responsive drawer/rail ile sığdırılmalı.

**Yapılan:**

- `HaritalarRoute.tsx` — `/haritalar` artık mobilde de `SadePublicChrome mapEmbed` içinde açılır; footer harita ekranını sıkıştırmaz, header harita üstünde kalır.
- `Kesfet.tsx` — mobil harita üstünde arama, konum filtresi, kategori chip'leri, «Haritayı yeni sekmede aç» ve «İşletmem» aksiyonları görünür; masaüstü sol rayinin mobil yatay eşdeğeri (Harita, İşletme, Nav, Deprem, Hava, Güzergah) aynı panel içeriklerini drawer içinde açar.
- `Kesfet.tsx` — mobil drawer, gömülü `/haritalar` modunda site header'ı örtmez; tam ekran rotada tam viewport drawer davranışı korunur.
- `kesfetHaritaSade.css` — mobil rail yatay kaydırılabilir Sade yeşil-beyaz kontrol çubuğuna çevrildi; popup kart genişliği küçük ekranlarda viewport dışına taşmayacak şekilde sınırlandı.

**Kabul:** Mobil `/haritalar` header + üst kontrollerden sonra kalan viewport'u dolduran tam boy harita gösterir; footer yoktur; header overlap olmaz; marker popup aksiyonları («Konuma git / Detay / Keşfet») mobilde görünür; chat bubble `/haritalar` için kapalı kalır (`chatBubbleRoutes.ts`).

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `pnpm --filter @workspace/ahenkpress run build` başarılı.

## Yekpare ana landing + /servisler taşıma (12 Haziran 2026)

Durum: Güncellendi (6amMart `LandingPage` yapısına hizalandı).

**İstek:** Mevcut Yekpare açılış sayfası `/servisler` altında korunacak; root `/` ise 6amMart React **landing-page** (`pages/index.js` → `src/components/landing-page/index.js`) bölüm sırasını birebir izleyen, Yekpare markalı Sade beyaz/yeşil anasayfa olacak. «Son eklenen işletmeler» ve benzeri vitrin listeleri root `/` üzerinde **olmayacak**. Ana menüde `Servisler` ilk sırada kalır.

**Referans dosyalar (6amMart React — yerel tema):**

- `src/components/landing-page/index.js` — bölüm sırası
- `hero-section/HeroSection.js`, `HeroTitleSection.js`, `module-selection/ModuleSelectionRaw.js`
- `stats-section/StatsSection.tsx`, `AvailableZoneSection.js`, `Banners.js`, `ComponentTwo.js`
- `our-client/ClientSection.tsx`, `Registration.js`, `delivery-download-section/`, `DiscountBanner.js`, `Testimonials.js`, `gallery-section/GallerySection.tsx`, `ImageTitleSection.tsx`, `FaqTabSection.tsx`

**Yapılan:**

- `/servisler` rotası eski `SixAmMartHomePage` servis vitrinine bağlı kaldı; haber manşeti, Türkiye Şehirleri ve Bilgi Ağacı kutuları bu rotadan kaldırıldı.
- Root `/` (`YekpareLandingHome.tsx`) 6amMart landing akışına yeniden yazıldı: Hero (konum → modül kartları) → güven istatistikleri → hizmet bölgeleri → promosyon bannerları → müşteri uygulaması indir → marka/partner logosu şeridi → işletme kaydı → kurye uygulaması → indirim bandı + yorumlar → galeri → highlight CTA → sekmeli SSS.
- Kaldırıldı: `/api/map/homepage-businesses` çağrısı, «Popüler işletmeler / partnerler» grid’i, Yekpare’ye özgü ek vitrin bölümleri (AI kartı, bülten, servis bölgeleri+AI iki kolon, kategori 6’lı grid).
- Sade ana menüde ilk öğe `Servisler` (`/servisler`) korunur.

**Kabul:** Root yeni 6amMart-style landing’i gösterir; işletme listesi yalnızca `/servisler` ve modül vitrinlerinde; header/footer Sade tema; zemin beyaz/açık mint (`#039D55`).

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — premium landing + admin editör):**

- Root `/` landing görsel destekli premium yapıya taşındı: yerel FoodMart tema görselleri, foto/gradient hero arka planı, daha temiz banner/galeri/CTA kartları ve varsayılan kapalı kalabalık bölümler (`zones`, `partners`, `deliveryCta`) ile sade vitrin.
- Hero arama alanı: 1. satırda tek kompakt arama input'u + `Ara`; 2. satırda konum alanı + cam şeffaflığında `Konumum`, `Keşfet`, `Haritalar` hızlı aksiyonları. Mobilde düzgün stack, desktopta tek satır akışı.
- Admin: `/admin/anasayfa-tasarim` sayfası eklendi. `homepageDesignJson` üzerinden hero metinleri/görselleri, arama etiketleri, hızlı aksiyonlar, istatistikler, bannerlar, galeri, SSS, bölüm sırası ve show/hide toggle'ları düzenlenir; varsayılana dön ve önizleme vardır.
- Backend: `site_settings.homepage_design_json` ayarı, settings API serializer/validator ve OpenAPI/api-zod/api-client tipleri eklendi. Frontend ayar yoksa güvenli varsayılan `defaultYekpareLandingDesign()` kullanır.

**Güncelleme (12 Haziran 2026 — hero tam genişlik + görsel kaldırma):**

- Root `/` hero: sağ vitrin foto kartı varsayılan kapalı (`showSideImage: false`); arka plan fotoğrafı varsayılan kapalı (`showBackgroundImage: false`).
- Hero zemin rengi kart içinde değil, diğer Sade public sayfalarıyla aynı tam genişlik mint/krem gradient bandı (`sade-public-hero-stage` + `sade-public-hero-surface`); içerik max-width ortalı kalır.
- Admin `/admin/anasayfa-tasarim`: arka plan ve sağ görsel alanları opsiyonel; açıklama metni + göster/gizle anahtarları eklendi. Kayıtlı JSON’daki URL alanları korunur.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — hero modül kartları sağ kolon):**

- Root `/` hero desktop: sol kolonda eyebrow/başlık/alt başlık + arama/konum/hızlı aksiyonlar; sağ kolonda **3×2** hizmet modül kart grid’i (Yemek, Market, Yakınımdakiler, Seyahat, Ulaşım, Alışveriş).
- Keşfet ve Haritalar hero grid’inden çıkarıldı; varsayılan hızlı aksiyon pill’leri olarak arama altında kalır (`homepageDesignJson` → `hero.quickActions` ile admin’den düzenlenebilir).
- Mobil: başlık ve arama üstte, modül kartları altta kompakt **2 sütun × 3 satır** stack.
- Tam genişlik mint/krem hero gradient korunur; sağ vitrin foto varsayılan kapalı (`showSideImage: false`); admin `homepageDesignJson` ile metinler, hızlı aksiyonlar ve opsiyonel sağ görsel uyumluluğu bozulmaz.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — hero hızlı aksiyon mobil düzen + etiket görünürlüğü):**

- Root `/` hero: konum satırı tam genişlik; altında **Konumum / Keşfet / Haritalar** mobilde `grid-cols-3` yan yana; masaüstünde tek satır pill akışı (`sm:contents` + 4 kolon grid).
- Hızlı aksiyon butonları: cam şeffaflık (`bg-white/45`) yerine opak beyaz zemin, `border-slate-200/90`, açık `leading-tight`, `min-h-[38px]` ve inline `color` (#039D55 / #1e293b) — mobil ve masaüstünde etiketler okunur.
- Admin `homepageDesignJson` → `hero.quickActions` ve konum seçici davranışı korunur.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — hero altı kompakt gövde başlangıcı):**

- Hero alanları değiştirilmeden root `/`, `/yemek`, `/market`, `/isletmeler`, `/turizm`, `/kesfet`, `/alisveris`, `/magaza` ve `/ulasim` gövde başlangıçları anasayfa stats/promo ritmine yaklaştırıldı.
- İlk container/section `pt`, `gap`, kart iç boşluğu ve ilk promo/support yoğunluğu azaltıldı; beyaz zemin, mevcut layout akışı, root hızlı aksiyon düzeltmesi ve 3x2 hero modül grid’i korunur.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — landing CTA etiket görünürlüğü):**

- Root `/` landing tüm CTA butonları denetlendi: indirim bandı (`discount`), alt vurgu (`highlight`), uygulama/indir, işletme/kurye CTA ve hero arama/hızlı aksiyonlar.
- Yeşil bant üzerindeki **beyaz pill** butonlarda kalıtılan `text-white` nedeniyle boş görünen etiketler düzeltildi: `landing-cta-light` + inline `#039D55` + `index.css` kontrast kuralı.
- Yeşil CTA’lar (`landing-cta-green`) beyaz metin + `min-w-[120px]` / `min-h-[40px]`; admin etiketi boşsa `resolveLandingCtaLabel` yedekleri (`Keşfet`, `Başla`, `Siparişe başla`, `Servislere git` vb.).
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — site geneli hero altı kompakt gövde):**

- Paylaşılan token: `SADE_PUBLIC_POST_HERO_BODY_CLASS` (`pt-3 md:pt-4 lg:pt-5`) + `SADE_PUBLIC_POST_HERO_STACK_CLASS` (`space-y-6 md:space-y-7`) → `SADE_PUBLIC_POST_HERO_MAIN_CLASS`; `index.css` `.sade-public-post-hero-body`.
- Kapsam: sipariş hub + modül vitrinleri (`/siparis`, `/yemek`, `/market`, `/isletmeler`), turizm (`BookingCoreHome`, `TurizmListe`, SixAmMart seyahat), ulaşım, keşfet (`KesfetListingHub` CSS), haberler (`SixAmMartNewsPage/Detail`, `Habermerkezi`, yazarlar), alışveriş/magaza (Sellzy + magaza alt sayfalar), firma rehberi, ansiklopedi gövde üstü.
- Hero gradient/yükseklik, YekTube özel bandı ve kart içi yoğunluk korunur; yalnızca hero sonrası ilk boş bant daraltılır.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — site geneli hero altı kompakt gövde, 2. geçiş):**

- 1. geçişte (`4537fad6`) token tanımlandı ve kısmi dosyalara uygulandı; birçok rota hâlâ `py-10`/`pt-10` sınıfları veya route CSS (`bc-list-wrap`, `lh-section`) ile geniş band bırakıyordu.
- 2. geçiş: `index.css` seçicileri `section`/`div` + BookingCore/Kesfet hero kardeşleri; `bookingCoreTurizm.css` liste/gövde üstü; `listinghubKesfet.css` section padding; token eksik sayfalar (`Alisveris`, `HaberDetay`, `HaberAnasayfasi`, `VideoTvChannel`, magaza alt sayfalar, `YekparePortalYazarYazilari`, `KesfetListingHub`); `SellzySupportInfo` + `HomeServiceTabs` ara bandı sıkılaştırıldı. Hero yüksekliği/gradient dokunulmadı; ansiklopedi detay layout fix’ine dokunulmadı.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — ansiklopedi detay okunabilir düzen, kesin düzeltme):**

- Sorun: `/ansiklopedi/*` detay sayfalarında makale gövdesi infobox float nedeniyle dar ince sütunda akıyordu.
- Kök neden: Vikipedi infobox tabloları `float: right` + inline `width` ile gövdeye gömülü; uzun infobox yanında paragraflar dar şeritte sarılıyordu.
- Çözüm: `splitWikiArticleHtml()` ile infobox tablolar DOMParser ile ayrılıp `wiki-infobox-aside` kartında render ediliyor; `wiki-article-layout` grid (masaüstü: `1fr + 320px`, mobil: infobox üstte tam genişlik). Backend `cleanInfoboxOrTable()` inline width/style kaldırıyor.
- Dosyalar: `AnsiklopediDetay.tsx`, `wikiArticleHtml.ts`, `index.css`, `wiki.ts`.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — `/ulasim` ulaşım odaklı görselli sayfalar):**

- Kullanıcı isteği doğrultusunda `/ulasim` hero sağ panelindeki **Alışveriş/Seyahat çapraz servis reklamları** ulaşım rotasında kaldırıldı; Hero artık `/ulasim` için yalnızca ulaşım hizmeti görsel paneli gösterir.
- Header altında Sade cam stilde **Ulaşım alt menüsü** eklendi: Ulaşım, Çekici, Taksi, Araç Paylaşımı, Kurye, Kargo, Nakliyat; aktif alt hizmet vurgulanır.
- Yeni alt hizmet rotaları: `/ulasim/cekici`, `/ulasim/taksi`, `/ulasim/arac-paylasimi`, `/ulasim/kurye`, `/ulasim/kargo`, `/ulasim/nakliyat`.
- `/ulasim` anasayfası resimli sade kart vitrini + kısa teklif formuna indirildi; Çekici/Taksi/Araç Paylaşımı/Kurye/Kargo öncelikli, Nakliyat ek hizmet olarak korunur.
- Alt hizmet sayfaları aynı premium şablonu paylaşır; her hizmete özel başlık, görsel, açıklama, avantaj kartları, teklif formu ve CTA kullanır.
- Dosyalar: `SixAmMartTheme.tsx`, `Ulasim.tsx`, `App.tsx`.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — `/ulasim` talep formu + renk/slogan):**

- **Kök neden (talep butonu tepkisiz):** Yeni `SixAmMartTransportPage` teklif formundaki CTA (`Çekici talebi oluştur`, `Nakliyat planla` vb.) yalnızca statik `<button>` idi; `onClick` / API çağrısı yoktu. Eski `TowTab`/`TaxiTab` bileşenleri `POST /api/transport/request` kullanıyordu ancak yeni sayfa onlara bağlı değildi.
- **Çözüm:** `UlasimQuoteCard` → ad/telefon alanları, doğrulama, yükleme/hata/başarı durumu; `POST /api/transport/request` ile backend'e bağlandı (takip kodu + `/takip/:code` linki). Giriş yapmış kullanıcı ad/telefon otomatik dolar.
- **UI:** Hero sloganı → «Yolculuğun, gönderin ve acil yardımın tek noktada»; hizmet kartı gradientleri tek Sade yeşil/mint paletine (amber/turuncu/mavi kaldırıldı).
- **Backend durumu (denetim):** `goalgo/artifacts/api-server/src/routes/transport.ts` — `transport_requests` tablosu, `POST /api/transport/request`, admin `/admin/transport`, sağlayıcı `/ulasim-paneli`, sürücü paneli, WhatsApp admin bildirimi mevcut. Otomatik sağlayıcı atama / ödeme / fiyat teklifi karşılaştırma henüz tam üretim seviyesinde değil.
- Dosya: `SixAmMartTheme.tsx`.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — `/ulasim` sadeleştirme, premium sakin UI):**

- Kullanıcı geri bildirimi («çok karmaşık») sonrası `/ulasim` görsel gürültü azaltıldı; Çekici/Nakliyat önceliği ve «Hizmet seç» kaldırma korundu.
- Hero altındaki **çift konum bandı** kaldırıldı — alış/varış yalnızca Hızlı teklif formunda.
- **Öne çıkan + diğer hizmetler** tek «Hizmet tipi» bölümünde birleştirildi: Çekici/Nakliyat sade kartlar; taksi/kurye/kargo/araç paylaşımı kompakt pill satırı.
- **Hızlı teklif:** servis pill'leri, 5'li kontrol satırı ve 4 özet kartı kaldırıldı; görünür alanlar: seçili hizmet metni, alış/varış, tarih/saat, «Teklif al» CTA. Paket/araç/zamanlama **«Daha fazla seçenek»** açılırında.
- Gereksiz border/gradient/shadow katmanları azaltıldı; mobil + masaüstü premium ama sakin.
- Dosya: `SixAmMartTheme.tsx` (`SixAmMartTransportPage`).
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — `/ulasim` premium vitrin + Çekici/Nakliyat önceliği):**

- `/ulasim` sayfasından üst **Hizmet seç** modül seçici (`ModuleSelector`) kaldırıldı — yalnızca ulaşım rotasında; anasayfa ve diğer modüller etkilenmez.
- `SixAmMartTransportPage`: anasayfa ile uyumlu mint/beyaz Sade hero (çekici/nakliyat odaklı başlık, «Teklif al» CTA, hızlı aksiyon pill'leri: Yol yardımı çağır / Nakliyat planla); konum kartları turuncu → emerald ton.
- **Öne çıkan hizmetler:** Çekici ve Nakliyat büyük kartlar (CTA: Yol yardımı çağır, Nakliyat planla); taksi/kurye/araç paylaşımı/kargo ikincil kompakt grid.
- **Hızlı teklif:** servis pill'leri, alış/varış, tarih/saat/paket/araç/zamanlama alanları ve özet kartları premium emerald panel içinde korundu.
- `GoogleTrAddressQuickFill`: `emerald` variant eklendi (Sade yeşil CTA).
- Hero sonrası kompakt gövde token'ları (`SADE_PUBLIC_POST_HERO_MAIN_CLASS`) korunur.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

**Güncelleme (12 Haziran 2026 — pazaryeri ürün listesi + mağaza kartı navigasyonu):**

- Sorun: `/magaza` ve `/alisveris` vitrinlerinde ürün bölümü boş ("Henüz listelenecek ürün bulunamadı"); mağaza kartına tıklayınca Yekpare içi vitrine gitmiyor (özel alan adı `https://…` veya `/magaza/marka/…` fallback).
- Kök neden: (1) Vercel degrade fallback `/api/delivery/marketplace` yanıtında `success: true` eksikti — istemci `emptyMarketplacePayload` kullanıyordu; (2) `attachPublicStorefrontHrefs` özel alan adını `storefrontHref` olarak döndürüyordu, kartlar harici URL'ye gidiyordu; (3) `/magaza/magaza/:slug` ürünleri yalnızca `vendorName` eşlemesiyle filtreliyordu.
- Çözüm: `middleware-api-degrade.js` tam marketplace şeması + `success: true`; `useMarketplaceData` boş kategori filtresinde filtresiz yeniden deneme; `marketplaceStoreHref.ts` ile kartlar `/alisveris/magaza/:slug` (tam vitrin); API `yekpareStoreHref`; `MagazaMagazaDetay` vendor slug + `/delivery/vendors/:slug` menü fallback; boş durum yalnızca gerçekten ürün yokken.
- Dosyalar: `middleware-api-degrade.js`, `useMarketplaceData.ts`, `marketplaceStoreHref.ts`, `Alisveris.tsx`, `Magaza.tsx`, `MagazaKatalog.tsx`, `MagazaSlugPages.tsx`, `SellzyHomeSections.tsx`, `SixAmMartTheme.tsx`, `delivery.ts`, `marketplace-home-data.ts`.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `pnpm --filter @workspace/api-server run build` başarılı.

**Güncelleme (12 Haziran 2026 — alışveriş/pazaryeri genel marketplace metinleri):**

- `/alisveris` hero ve üst bant: sağlık/gıda odaklı dil kaldırıldı; genel pazaryeri başlığı ("Binlerce ürün ve güvenilir mağaza tek Yekpare'de"), elektronik/moda/ev/market alt metni, CTA ("Alışverişe başla", "Fırsatları keşfet"), arama placeholder ("Ürün, marka veya mağaza ara") ve destek kartları (Ücretsiz kargo, 7/24 destek, 30 gün iade, Güvenli ödeme) — mobil + masaüstü (`Alisveris.tsx`).
- `/magaza` Sellzy vitrin: hero fallback (`SellzyHero.tsx`), üst kampanya şeridi (`SellzyHeader.tsx` mobil/masaüstü), bölüm alt metinleri (`Magaza.tsx`, `SellzyHomeExtraSections.tsx`), footer varsayılan kategoriler (`SellzyFooter.tsx`).
- API pazaryeri seed/fallback (`marketplace-home-data.ts`): hero slaytları, promo banner, blog ve marka fallback metinleri genel alışveriş diline çekildi; görsel URL'ler sağlık/gıda yerine genel alışveriş temalı unsplash görselleri.
- Pazaryeri hakkında metni (`delivery.ts` mission) genelleştirildi.
- Layout, Sade tema ve hero sonrası kompakt gövde spacing korundu.
- Doğrulama: `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.

## Servisler tanıtım merkezi (12 Haziran 2026)

Durum: **Tamamlandı**

**İstek:** `/servisler` köken değişikliği — eski servis vitrini yerine premium tanıtım merkezi; alt menü ve her modül için ayrı detay sayfası.

**Yeni rotalar:**

| Rota | Sayfa |
|------|-------|
| `/servisler` | Genel tanıtım — hero, 6 modül kartı, platform avantajları, panel özeti, CTA |
| `/servisler/siparis` | Sipariş — menü, kurye/mutfak, POS, stok, CRM, şube |
| `/servisler/alisveris` | Alışveriş — pazaryeri, çoklu kargo, satıcı paneli, domain/e-posta |
| `/servisler/ulasim` | Ulaşım — çekici/taksi/kurye/kargo, filo, teklif akışı |
| `/servisler/turizm` | Turizm — otel/tur/villa/yat, rezervasyon, müsaitlik |
| `/servisler/haber-merkezi` | Haber Merkezi — editör paneli, RSS, yazarlar, SEO, domain |
| `/servisler/ai-cagri-merkezi` | AI Çağrı Merkezi — sesli/yazılı AI, CRM, eskalasyon |

**Bileşenler:**

- `servicesMarketingData.ts` — modül içerikleri (özellikler, paneller, fırsatlar)
- `ServicesSubNav.tsx` — cam/şeffaf alt menü (tüm `/servisler` ve `/servisler/:slug` sayfalarında)
- `ServicesMarketingChrome.tsx` — Sade header/footer + alt menü
- `ServicesMarketingOverview.tsx`, `ServiceMarketingDetail.tsx`

**Eski `/servisler`:** `SixAmMartHomePage` servis vitrini bu rotadan kaldırıldı; root `/` landing ve modül vitrinleri (`/yemek`, `/magaza`, `/turizm` vb.) ayrı kalır.

**Kabul:** Yekpare Sade beyaz/mint tema; responsive; ana menüde `Servisler` aktif (`/servisler` ve alt yollar); servis sağlayıcı/editör panel imkanları detay sayfalarında anlatılır.

**Doğrulama:** `pnpm --filter @workspace/ahenkpress run typecheck` + `build` başarılı.
