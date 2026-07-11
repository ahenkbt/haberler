# Yekpare.net — Performans Yol Haritası

> **Hazırlanma:** 7 Temmuz 2026  
> **Kaynak:** Render `api-server` pino log analizi + önceki production readiness denetimi  
> **API:** https://goalgo-y7ze.onrender.com · **Frontend:** https://yekpare.net (Netlify)  
> **İlgili:** [YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md](./YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md) · [NETLIFY-RENDER-KURULUM-RAPORU.md](./NETLIFY-RENDER-KURULUM-RAPORU.md)

---

## Yönetici özeti

Render production logları, tek sayfa yüklemesinde **aynı meta uç noktasının 25+ kez** çağrıldığını; wiki, YouTube engagement ve video benzeri uçların **6–18 saniye** sürdüğünü; istemci zaman aşımı (`request aborted`) ve **404 gürültüsünün** pool tüketimini artırdığını gösteriyor. Render PostgreSQL pool varsayılanı **5 bağlantı** (`PG_POOL_MAX`); eşzamanlı yavaş istekler 502/504 riski taşır.

Önceki denetim bulguları (haber listesinde tam `content`, anasayfada ~17 paralel API, RSS botları varsayılan kapalı) bu tabloya eklenmiştir. **Güvenlik P0** ([canlıya çıkış yol haritası](./YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md)) ile **performans P0** paralel ilerleyebilir; bu belge yalnızca performans odaklıdır.

### Deploy politikası (7 Tem 2026)

- **Toplu merge:** PR'lar biriktirilir; oturum veya gün başına **tek batch merge**. Kullanıcı **"et"** demeden `gh pr merge` yapılmaz.
- **HM + perf birlesik batch:** #431 merged; kalan HM+perf `auto/hm-perf-final-batch` (supersedes #433).
- **Merge sonrası:** Render `GET /healthz` yeşil olana kadar bekle → ardından tarayıcıda **hard refresh** (Ctrl+Shift+R / cache bypass).
- **AGENTS.md otomatik merge** kuralı performans PR'ları için geçerli değil — onay kullanıcıda.

| Faz | Süre | Odak | Beklenen kazanç |
|-----|------|------|-----------------|
| **P0** | ~1 hafta | Dedup, timeout, cache, payload küçültme | Tek sayfa API yükü −40–60%, tail latency −30% |
| **P1** | 2–4 hafta | Anasayfa bundle, indeks, Redis, pool | TTFB stabil, pool bekleme azalır |
| **P2** | 1–2 ay | CDN, worker ayrımı | Medya ve arka plan iş yükü API'den ayrılır |
| **P3** | sürekli | Mimari (BFF, read replica, observability) | Ölçeklenebilir büyüme |

---

## Log'dan tespit edilen sorunlar

Aşağıdaki tablo, kullanıcı tarafından paylaşılan Render pino log özetine dayanır. Süreler tek istek örnekleridir; kümülatif etki parantez içinde not edilmiştir.

| Endpoint / kalıp | Gözlemlenen süre | Risk | Kök neden (muhtemel) |
|------------------|------------------|------|----------------------|
| `GET /api/hm/meta/by-domain` | 4–99 ms × **25+ çağrı / ~20 sn** | **Yüksek** — pool + gereksiz RTT | Aynı `domain` için dedup yok; `index.html`, `middleware.js`, birden fazla React bileşeni ve farklı TanStack `queryKey` suffix'leri (`slug-resolve`, `home`, `haber-detail-route`, …) |
| `GET /api/video/youtube-engagement/:id` | **8,8 s – 9,4 s** | **Yüksek** — dış API, pool blokajı | YouTube Data API senkron; cache yok / kısa TTL |
| `GET /api/wiki/article/:title` | **17–18 s** → 404 | **Yüksek** — boşa harcanan süre | Geçersiz slug (boşluk, `?`, Türkçe karakter); upstream timeout uzun |
| `GET /api/video/videos/:id/channel-more` | **6,5–6,7 s** | Orta–yüksek | DB + dış meta; N+1 veya indeks eksikliği |
| `GET /api/video/videos/:id/similar` | **6,5–6,7 s** | Orta–yüksek | Benzerlik sorgusu ağır |
| `GET /api/public/og-html?path=…` | **4–6 s** (çoğu 404) | Orta — bot/crawler gürültüsü | Var olmayan path; SSRF-safe ama cache/early-exit yok |
| `request aborted` (wiki) | 2,8 s / **7,8 s** | Orta — kötü UX | İstemci timeout (~8–18 s); sunucu işi sürdürüyor |
| `youtube-meta` 404 | — | Düşük–orta | Silinmiş / yanlış video id |
| Wiki kötü slug (`cezayirliler?`, boşluklu başlık) | 404 uzun sürede | Orta | Slug normalizasyonu + hızlı negative cache yok |
| Eşzamanlı yavaş istek + **PG pool max 5** | — | **Yüksek** — 502/504 | Render `connection.ts` varsayılanı; OOM yok ama kuyruk |

### Önceki denetim bulguları (log dışı)

| Bulgu | Etki | Dosya / alan |
|-------|------|----------------|
| Haber listesi tam `content` kolonu döndürüyor | Büyük JSON, yavaş serileştirme | `artifacts/api-server/src/routes/news.ts` — `.select()` tüm satır |
| Anasayfa ~**17 paralel** API çağrısı | Bağlantı havuzu baskısı | `HmCorporateHome`, portal hybrid, ticker modülleri |
| RSS arka plan botları **varsayılan kapalı** (#427) | ✅ Prod yük azaltıldı | `rss-automation-control.ts` — `rssAutomationEnabled: false` |
| Render `PG_POOL_MAX=5` | Darboğaz | `lib/db/src/connection.ts` |
| Verimor PBX **3CX API'den bağımsız** | Performans karıştırılmamalı | `routes/pbx.ts`, Verimor ayarları |
| Metin-önce + lazy görseller **kısmen** uygulandı | LCP iyileşti ama tutarsız | `HaberAnasayfasi.tsx`, `HmCorporateHome.tsx` |

---

## P0 — Acil (≈ 1 hafta)

Her madde tek PR veya batch PR; merge öncesi `pnpm run typecheck`. **Merge yalnızca kullanıcı "et" onayı ile** (bkz. [Deploy politikası](#deploy-politikası-7-tem-2026)).

### P0-1 · `/api/hm/meta/by-domain` deduplication — [x]

> **PR durumu:** #428 merged — `perf(P0-1): deduplicate hm meta by-domain fetches`.

**Hedef:** Tek sayfa yüklemesinde aynı domain için **1 ağ isteği** (SSR/middleware hariç tutulabilir).

**Yapılacaklar:**

1. **Tek TanStack Query anahtarı** — Tüm `queryKey: ["/api/hm/meta/by-domain", host, "…"]` suffix'lerini kaldırın; ortak key: `["hm-meta-by-domain", host]`. Dosyalar:
   - `artifacts/ahenkpress/src/hooks/useHmDomainSlugFromHost.ts`
   - `artifacts/ahenkpress/src/components/HmPortalOrHmDomainHome.tsx`
   - `artifacts/ahenkpress/src/components/HmCustomDomainPathRedirect.tsx`
   - `artifacts/ahenkpress/src/pages/public/HmOrPortalHaberDetailRoute.tsx`
   - `artifacts/ahenkpress/src/pages/public/HaberDetay.tsx`
   - `artifacts/ahenkpress/src/pages/editor/EditorGiris.tsx`
2. **React context veya modül düzeyi in-flight dedup** — İlk fetch promise'i paylaş; `writeHmDomainSlugCache` / `resolveHmDomainSlugHint` ile uyumlu tutun.
3. **`index.html` inline fetch** — Sonuç zaten context'ten geliyorsa tekrar çağrıyı atlayın veya sessionStorage ile 60 sn cache (mevcut `hmNestedMetaStorage` ile birleştirin).
4. **API tarafı** — `hm.ts` `GET /hm/meta/by-domain` için `Cache-Control: public, max-age=60, s-maxage=300` (slug nadiren değişir).

**DoD:** DevTools Network'te özel alan anasayfasında `by-domain` ≤ 2 istek (middleware + client veya yalnızca client).

---

### P0-2 · Wiki uç noktası: timeout, slug doğrulama, negative cache — [x] (kısmi)

> **PR durumu:** PR #431 — 8s upstream timeout, kötü slug hızlı 404, 5 dk negative cache. Tam kazanç için HM'den wiki kaldırma: [P0-6](#p0-6--newsmap-bilgi-ağacı-ve-yektube--yalnızca-yekparenet-hub--x).

**Hedef:** Geçersiz slug'larda yanıt **< 500 ms**; geçerli slug'larda **≤ 8 s** hard timeout.

**Yapılacaklar:**

1. `wiki.ts` `GET /wiki/article/:title` — girişte slug normalizasyonu (trim, URL decode, boşluk → `_`, `?` reddi).
2. Upstream fetch'e **AbortController 8 s**; 404 için **5 dk negative cache** (bellek veya `site_settings` / basit LRU).
3. Log seviyesini 404 için `debug` — pino `warn` gürültüsünü azalt.
4. Frontend: wiki widget'larında istemci timeout **≤ 8 s**; abort sonrası skeleton/hata UI.

**DoD:** `cezayirliler?` ve boşluklu slug log'da < 1 s, 404; pool'da 17 s tutma yok.

### P0-fetch-fix · Hybrid news fetch hata önbelleği — [x]

> **PR:** PR #431 — `fetchHybridNewsListResult` API hatasında boş dizi yerine throw; TanStack Query başarısız yanıtı cache'lemez, sessionStorage yedek kalır.

---

### P0-3 · YouTube engagement: async + cache — [x]

> **PR durumu:** `auto/hm-perf-final-batch` — 24h bellek LRU, `Cache-Control` + stale-while-revalidate, quota circuit breaker, stale fallback.

**Hedef:** `GET /api/video/youtube-engagement/:youtubeVideoId` p95 **< 2 s** (cache hit **< 50 ms**).

**Yapılacaklar:**

1. `video.ts` — yanıtı **24 saat** cache (Redis yoksa bellek LRU + `Cache-Control`).
2. İlk istekte **stale-while-revalidate**: hemen `{ pending: true, cached: null }` veya son bilinen değer; arka planda güncelle (isteğe bağlı P0.3b worker).
3. YouTube API quota aşımında circuit breaker — 503 yerine son cache, log `warn` bir kez.

**DoD:** Aynı video id ikinci istekte < 100 ms; log'da 8 s+ engagement satırı yok.

---

### P0-4 · Haber listesinden `content` çıkar — [x]

**Hedef:** `GET /api/news`, kategori ve editör scoped listelerde payload **−70–90%**.

**Yapılacaklar:**

1. List sorgularında `.select()` yerine explicit kolonlar: `id, slug, title, excerpt/spot, image, categorySlug, createdAt, …` — **`content` hariç**.
2. Detay: mevcut `GET /api/news/:id` ve `GET /api/news/page-bundle/:slug` tam içerik taşımaya devam eder.
3. `hybrid-news-merge` / portal RSS merge — list DTO'da `content: null` veya alanı omit edin.

**DoD:** `/api/news?limit=50` yanıt boyutu ölçümü (kb) yarıdan az; frontend listeler kırılmaz.

---

### P0-5 · Deploy #427 (RSS botları kapalı) doğrulama — [x] (checklist)

**Durum:** Kodda varsayılan kapalı (`rss-automation-control.ts`). Production doğrulama checklist'i aşağıda; merge sonrası manuel kontrol.

**Yapılacaklar:**

1. Render deploy sonrası `GET /api/admin/background-jobs/rss` (admin oturumu) — `rssAutomationEnabled: false`.
2. Planlı slot dışında scheduler log'unda `outside_slot` veya `skipped — automation disabled` satırı.
3. Dokümantasyon: `YekpareHaberlerVitrinAyarlari` admin UI metni ile uyum (01:00, 09:00, 17:00 TR).

**DoD:** Gündüz trafikte arka plan RSS/AI meta scheduler CPU spike yok.

#### P0-5 prod doğrulama checklist (merge sonrası)

- [ ] Render deploy sonrası `GET /healthz` yeşil
- [ ] Admin oturumu: `GET /api/admin/background-jobs/rss` → `rssAutomationEnabled: false`
- [ ] Render log: gündüz saatlerinde `outside_slot` veya `skipped — automation disabled`
- [ ] `YekpareHaberlerVitrinAyarlari` UI metni 01:00 / 09:00 / 17:00 TR ile uyumlu
- [ ] Tarayıcı hard refresh (Ctrl+Shift+R) sonrası anasayfa yükü normal

---

### P0-6 · Newsmap, Bilgi Ağacı ve YekTube — yalnızca yekpare.net hub — [x]

> **Ürün kararı (7 Tem 2026):** Newsmap, Bilgi Ağacı ve YekTube/Video TV **sadece yekpare.net ana portalında** çalışır. HM editör / public haber sitelerinden (**vatankahramanlari.org**, **tukav.org**, `yekpare.net/tr/{siteSlug}/…` vb.) **tamamen kaldırılır**.  
> **Uygulama:** `isYekparePortalHubOnly()` + `YekparePortalHubOnlyRoute`; HM nav/footer/anasayfa modülleri kapalı; kök hub rotaları korunur. Detay: [P1-6](#p1-6--newsmap-bilgi-ağacı-ve-yektube--yalnızca-yekparenet-hub).

#### Kapsam (özet)

| Ortam | Newsmap / Bilgi Ağacı / YekTube |
|-------|----------------------------------|
| **KORU** — `yekpare.net/newsmap`, `/bilgiagaci`, `/yektube`, `/video-tv` | ✅ Hub açık |
| **KALDIR** — HM özel alan (`vatankahramanlari.org`, `tukav.org`, …) | ❌ Route + nav + modül + API yok |
| **KALDIR** — `yekpare.net/tr/{siteSlug}/…` (`siteSlug !== yekpare`) | ❌ Nested HM path'ler hub modülü taşımaz |

**Algılama:** `!isDefaultPortalHost(host)` · `isKnownHmCustomHost(host)` · `/api/hm/meta/by-domain` → `slug !== "yekpare"` · `/tr/:slug` route param.

#### Kaldırılacak / devre dışı bırakılacak modüller (HM sitelerde)

| Modül | Kullanıcı yüzü | İlgili API / yük |
|-------|----------------|------------------|
| **Newsmap** (Haber Haritası) | `HmNewsMapModule`, `newsMapModule` vitrin bloğu | `/api/map/newsmap/*`, `portal-hybrid-news?newsmap=1`, harita katman JS |
| **Bilgi Ağacı** (wiki ansiklopedi) | `/tr/:slug/bilgiagaci`, `HmBilgiAgaciChromeBand` | `GET /api/wiki/article/:title` (**17–18 s** spike), featured widget |
| **YekTube / Video TV** | `/tr/:slug/video-tv`, nav strip | `youtube-engagement` (**8–9 s**), `channel-more` / `similar` (**~6 s**), video chunk bundle |

#### Performans gerekçesi

Log analizi (yukarıdaki tablo) bu modüllerin HM anasayfa yükünde doğrudan tail latency ve pool tüketimi yarattığını gösteriyor:

- Wiki slug hataları → **17 s** boşa harcanan istek + `request aborted`
- YouTube engagement → **8–9 s** dış API blokajı
- Video `channel-more` / `similar` → **~6 s** DB + meta
- Newsmap → ek harita katmanları, hybrid RSS/DB birleşimi, ayrı JS chunk
- Nav + route tanımları → gereksiz lazy chunk indirme ve mount maliyeti

**Kısmi kazanç vs tam kaldırma:** [P0-2](#p0-2--wiki-uç-noktası-timeout-slug-doğrulama-negative-cache) (wiki timeout + negative cache) kötü slug'larda **kısmi kazanç** sağlar; HM anasayfasında Bilgi Ağacı widget'ı ve nav linki kalsa bile `/api/wiki/*` çağrıları devam eder. **Tam HM modül kaldırma** (bu madde) ilgili sitelerde bu uçları **hiç tetiklemez** — beklenen etki, P0-2+P0-3 optimizasyonlarından daha büyük ve kalıcıdır.

#### Uygulama fazları (tek PR = bir alt görev)

1. **Hub-only guard** — ortak `isYekparePortalHubOnly()`; HM slug / custom domain'de modül kapalı.
2. **HM editör vitrin ayarları** — `YekpareHaberlerVitrinAyarlari.tsx`, `EditorVitrinAyarlari.tsx`: `slug !== yekpare` için toggle gizle.
3. **`HaberAnasayfasi.tsx`** — `newsMapModule`, video TV vitrin blokları, Bilgi Ağacı bandı: HM'de mount etme.
4. **Nav ve footer** — `HmPublicNewsNavStrip`, `HmPublicSiteFooter`, `HmMobileBottomNav`, `hmCorporateNavMenu.ts`: HM'de link kaldır.
5. **Route gate (`App.tsx`)** — `/tr/:slug/newsmap|bilgiagaci|video-tv` yalnızca hub; HM'de 404/redirect. **yekpare.net kök** route'ları (`/newsmap`, `/bilgiagaci`, `/yektube`) korunur.
6. **Doğrulama** — HM site DevTools: wiki / youtube-engagement / newsmap isteği **0**; `yekpare.net/newsmap` çalışır.

**PR adı önerisi:** `perf/p0-6-hm-strip-newsmap-wiki-videotv` (veya site başına alt PR'lar: `perf/p0-6a-hm-nav`, `perf/p0-6b-hm-anasayfa-api`).

**DoD:** En az bir prod HM sitesinde (ör. `vatankahramanlari.org`) anasayfa yüklemesinde wiki + youtube-engagement + newsmap API çağrısı yok; nav'da üç modül linki görünmüyor; **yekpare.net hub modülleri çalışmaya devam eder**.

**P1 alternatifi:** Acil pool baskısı düşükse P0-2/3 cache ile paralel ilerleyip uygulamayı P1-6'ya kaydırmak mümkün; log'daki 17 s wiki spike devam ediyorsa **P0-6 önceliklendirilir**.

---

### P0 checklist özeti

| ID | Görev | PR adı önerisi |
|----|-------|----------------|
| P0-1 | Meta by-domain dedup | `auto/p0-1-hm-meta-dedup` (#428) |
| P0-2 | Wiki timeout + negative cache | PR #431 |
| P0-3 | YouTube engagement cache | `auto/hm-perf-final-batch` |
| P0-4 | News list content strip | `auto/p0-hm-news-perf` |
| P0-5 | RSS #427 prod verify | checklist (bu belge) |
| P0-6 | HM: Newsmap + Bilgi Ağacı + YekTube kaldır | `auto/p0-hm-news-perf` |

---

## P1 — Stabilizasyon (2–4 hafta)

### P1-1 · Anasayfa API bundle — [x] (kısmi)

**Hedef:** HM/portal anasayfasında paralel istek **17 → ≤ 6**.

- `GET /api/hm/home-bundle?siteId=` — featured + breaking + popular tek round-trip (HM scoped).
- `HaberAnasayfasi.tsx` bundle yanıtından breaking/popular beslenir; RSS manşet açıkken featured ayrı kalır.
- **Ertelenen:** tam 17→6 (kategori blokları, ticker lazy, hybrid RSS birleşimi) — sonraki P1 batch.

### P1-2 · Veritabanı indeksleri

Log'daki yavaş video/wiki sorguları için (migration + `_journal.json`):

- `news`: `(site_id, status, created_at DESC)`, `(category_slug, created_at DESC)`
- `video` / yektube tabloları: `(channel_id, published_at)`, foreign key on `youtube_video_id`
- Wiki cache tablosu varsa `(slug)` unique

Her migration sonrası `EXPLAIN ANALYZE` staging'de.

### P1-3 · Redis (veya Upstash) paylaşımlı cache

- Wiki negative/positive, youtube-engagement, og-html path cache.
- Session store zaten PG — Redis yalnızca cache katmanı; `REDIS_URL` Render add-on veya Upstash.

### P1-4 · Pool tuning ve gözlem

| Ortam | `PG_POOL_MAX` öneri | Not |
|-------|---------------------|-----|
| Render starter | **8–10** | DB plan limitine göre; 5'ten yukarı ancak PG `max_connections` izin veriyorsa |
| Render standard+ | 15–20 | `NEWS_PG_POOL_MAX`, `YEKTUBE_PG_POOL_MAX` ayrı tutulmalı |

- Pino'ya `durationMs`, `poolWaiting` (pg-pool event) ekleyin.
- Render log alert: `statusCode=502|504` ve `durationMs>10000`.

### P1-5 · og-html ve 404 gürültüsü

- Bilinen bot user-agent için rate limit.
- Path whitelist ön kontrol — dosya yoksa **hemen 404** (< 50 ms), tam HTML üretme denemesi yok.
- Başarılı og-html 1 saat cache.

### P1-6 · Newsmap, Bilgi Ağacı ve YekTube — yalnızca yekpare.net hub

> **Ürün kararı (7 Temmuz 2026):** Newsmap, Bilgi Ağacı ve YekTube/Video TV **sadece yekpare.net ana portalında** çalışır. HM editör / public haber sitelerinden (**vatankahramanlari.org**, **tukav.org**, `yekpare.net/tr/{siteSlug}/…` vb.) **tamamen kaldırılır**.

#### Kapsam tablosu

| Ortam | Örnek | Newsmap / Bilgi Ağacı / YekTube |
|-------|-------|----------------------------------|
| **KORU** | `yekpare.net/newsmap`, `/bilgiagaci`, `/yektube`, `/video-tv`, `/kesfet` | ✅ Açık — ana arama motoru / portal hub |
| **KALDIR** | `vatankahramanlari.org`, `tukav.org`, diğer HM özel alanları | ❌ Route, nav, anasayfa modülü, wiki/video API çağrısı yok |
| **KALDIR** | `yekpare.net/tr/vatankahramanlari/newsmap` (ve `/bilgiagaci`, `/video-tv` alt path) | ❌ Nested HM public path'ler hub modülü taşımaz |
| **KALDIR** | HM editör vitrin ayarları (`/editor/vitrin`, admin vitrin) — `slug !== yekpare` | ❌ Toggle gizli veya salt okunur "hub-only" |

**Not:** `yekpare.net/tr/yekpare/…` yol haritası dışı; kanonik hub rotaları kök seviyededir (`/newsmap`, `/bilgiagaci`, `/yektube`).

#### Domain / site algılama (tek guard kaynağı hedefi)

Uygulama PR'da ortak helper (ör. `isYekparePortalHubOnly()`):

| Sinyal | Kaynak | Hub-only (`true`) |
|--------|--------|-------------------|
| Özel alan | `!isDefaultPortalHost(host)` · `isKnownHmCustomHost(host)` | `false` → modül kapalı |
| Meta slug | `GET /api/hm/meta/by-domain` → `slug` | `slug === "yekpare"` **veya** kök portal rotası |
| Nested HM path | `/tr/:slug/…` route param | `slug !== "yekpare"` → modül kapalı |
| Host + path birlikte | `isEffectivePortalHost(host)` **ve** kök hub path | `true` → modül açık |

Mevcut hook: `useHmDomainSlugFromHost()` + `hmPortalHosts.ts` (`isDefaultPortalHost`, `isKnownHmCustomHost`, `isEffectivePortalHost`).

#### Kaldırılacak modüller (HM sitelerde)

| Modül | Etkilenen yavaş uç / bundle | Beklenen kazanç |
|-------|-----------------------------|-----------------|
| **Newsmap** | Harita chunk + geo API | Daha küçük JS bundle, harita lazy load yok |
| **Bilgi Ağacı** (wiki widget) | `GET /api/wiki/article/:title` — log'da **17–18 s** | Kötü slug / upstream timeout tamamen ortadan kalkar (P0-2 ile birlikte) |
| **YekTube / Video TV** | `youtube-engagement` **~8 s**, `similar` / `channel-more` **~6,5 s** | Sayfa başına 0–3 ağır video isteği kalkar |

**Performans özeti:** HM anasayfa ve haber detayında wiki + YouTube + video benzeri çağrıları **sıfıra** indirir; P0 cache/timeout iyileştirmelerine ek olarak gereksiz modül yükü kalkar.

#### Yapılacaklar

1. **Route gate (`App.tsx`)** — `/tr/:slug/newsmap`, `/tr/:slug/bilgiagaci`, `/tr/:slug/video-tv` (ve alt path) yalnızca `slug === "yekpare"` iken render; aksi halde 404 veya haber anasayfasına redirect. Özel alanda aynı path'ler hiç mount edilmez.
2. **Nav / footer / mobil menü** — `HmPublicNewsNavStrip`, `HmPublicSiteFooter`, `HmMobileBottomNav`, `hmCorporateNavMenu.ts`: HM slug ≠ yekpare veya custom domain'de Newsmap / Bilgi Ağacı / Video TV linklerini gösterme.
3. **`HaberAnasayfasi` modülleri** — `newsMapModule`, `recentVideosSidebar`, `mediaDarkBlock` (video), Bilgi Ağacı bandı: vitrin toggle'ından bağımsız hub-only guard; HM sitelerde mount etme.
4. **Editör paneli** — `EditorVitrinAyarlari`, `YekpareHaberlerVitrinAyarlari`: `slug !== yekpare` için ilgili toggle'ları gizle veya "yalnızca yekpare.net hub" etiketi.
5. **Per-site feature flag (opsiyonel, API uyumu)** — `site_settings` / HM meta: `features.newsmap`, `features.wikiTree`, `features.yektube` — tüm HM slug'lar için varsayılan **`false`**; yalnızca hub backend'de `true`.
6. **Lazy chunk** — HM entry bundle'ında `NewsmapRoute`, `HmPublicNewsmapRoute`, `HmPublicVideoTvRoute`, `BilgiAgaciShell` dynamic import'ları hub guard arkasında; HM sayfa yükünde chunk prefetch yok.

#### Etkilenen dosyalar (uygulama PR referansı)

| Alan | Dosyalar |
|------|----------|
| Route gate | `artifacts/ahenkpress/src/App.tsx` |
| Domain algılama | `lib/hmPortalHosts.ts`, `hooks/useHmDomainSlugFromHost.ts`, `lib/fetchHmMetaByDomain.ts` |
| HM public shell | `pages/public/HmSitePublic.tsx`, `components/HmNestedLayout.tsx` |
| Anasayfa modülleri | `pages/public/HaberAnasayfasi.tsx`, `components/HmNewsMapModule.tsx`, `components/HmRecentVideosBox.tsx`, `components/home/HomeBilgiAgaciBand.tsx`, `components/HmBilgiAgaciChromeBand.tsx` |
| Nav / footer | `components/HmPublicNewsNavStrip.tsx`, `components/HmPublicSiteFooter.tsx`, `components/HmMobileBottomNav.tsx`, `lib/hmCorporateNavMenu.ts` |
| Hub-only sayfalar | `pages/public/NewsmapRoute.tsx`, `pages/public/HmPublicNewsmapRoute.tsx`, `pages/public/HmPublicVideoTvRoute.tsx`, `pages/public/HmVideoTvPage.tsx`, `components/BilgiAgaciShell.tsx`, `lib/bilgiAgaciHmRoutes.ts`, `lib/hmHaritalarRoutes.ts` |
| Editör vitrin | `pages/editor/EditorVitrinAyarlari.tsx`, `pages/admin/YekpareHaberlerVitrinAyarlari.tsx` |
| Video context | `components/HmVideoTvEnabledGate.tsx`, `contexts/HmVideoTvContext.tsx` |

**DoD:** `vatankahramanlari.org` ve `tukav.org` production'da DevTools Network'te wiki / youtube-engagement / video similar isteği **yok**; nav'da Newsmap / Bilgi Ağacı / Video TV linki **yok**; `yekpare.net/newsmap` ve `/bilgiagaci` **çalışmaya devam eder**; bundle analizinde newsmap + yektube chunk'ları HM custom-domain entry'de yüklenmiyor.

---

### P1-7 · Video `channel-more` / `similar`

- Sorgu birleştirme, limit cap, 5 dk cache.
- İsteğe bağlı: ayrı `GET /api/video/videos/:id/related-bundle`.
- **Not:** HM domain'lerde YekTube kapalıysa (P1-6) bu madde yalnızca **yekpare.net hub** (`/yektube`, kök `/video-tv`) için geçerlidir; HM editör sitelerinde bu uçlar çağrılmamalı.

---

## P2 — Medya ve iş yükü ayrımı (1–2 ay)

| Görev | Açıklama |
|-------|----------|
| **Görsel CDN** | S3/CloudFront veya imgproxy; HM haber görselleri sabit boyut parametreleri (`?w=800&q=80`) |
| **Worker servisi** | RSS sync, AI meta, YouTube engagement refresh — Render **Background Worker** veya ayrı servis; API'den `pg advisory lock` ile tek instance |
| **Statik edge** | Sitemap, robots, vitrin CSS — Netlify edge cache süreleri artır |
| **NEWS / YEKTUBE ayrı DB** | Yük artınca `NEWS_DATABASE_URL`, `YEKTUBE_DATABASE_URL` ([.env.example](../artifacts/api-server/.env.example)) |

---

## P3 — Mimari (sürekli)

- **BFF katmanı:** HM özel alanları için ince BFF (Netlify Function veya hafif Node) — meta + ilk haber dilimi tek hop.
- **Read replica:** Haber okuma trafiği replica'ya; yazma primary.
- **OpenTelemetry:** Trace id log ↔ frontend `x-request-id`.
- **Load test:** k6 senaryosu — 50 eşzamanlı anasayfa + 10 wiki slug; p95 < 3 s hedef.
- **Frontend:** `Kesfet` / harita chunk'ları zaten lazy ([canlıya çıkış](./YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md)); kalan eager import audit.

---

## Verimor / PBX notları (3CX API ile ilişkisiz)

Performans loglarındaki yavaşlıklar **Verimor SIP trunk** veya temsilci softphone trafiğinden kaynaklanmaz.

| Konu | Açıklama |
|------|----------|
| **Verimor** | Türkiye bulut santral; `GET/PUT /api/pbx/verimor/*`, temsilci paneli `AgentPanel.tsx` (`backend === "verimor"`) |
| **3CX API** | Ayrı entegrasyon yolu; Verimor trunk ayarları 3CX REST çağrısı **yapmaz** |
| **Performans** | Çağrı merkezi API'si (`/api/pbx/*`) haber/video/wiki pool'unu paylaşır ama tipik sayfa yükünde görünmez |
| **İzolasyon (P2)** | Yoğun kampanya dönemlerinde PBX route'ları için rate limit ve ayrı log stream düşünülebilir — acil değil |

Detay: [YEKPARE_CALL_CENTER.md](./YEKPARE_CALL_CENTER.md), [PBX_YOL_HARITASI.md](./PBX_YOL_HARITASI.md).

---

## Render ortam değişkenleri checklist

Production (`goalgo-y7ze.onrender.com`) Render dashboard → Environment:

### Zorunlu / mevcut

- [ ] `DATABASE_URL` — PostgreSQL bağlantısı
- [ ] `SESSION_SECRET` — min 16 karakter
- [ ] `NODE_ENV=production`

### Performans (P0–P1)

- [ ] `PG_POOL_MAX` — **şu an varsayılan 5**; P1'de 8–10'a çıkar (PG plan limiti kontrol)
- [ ] `PG_POOL_IDLE_TIMEOUT_MS=30000`
- [ ] `PG_POOL_CONNECTION_TIMEOUT_MS=5000` (Render)
- [ ] `NEWS_PG_POOL_MAX=4` (ayrı haber DB varsa)
- [ ] `YEKTUBE_PG_POOL_MAX=3` (ayrı Yektube DB varsa)

### RSS / arka plan (P0-5)

- [ ] `RSS_AUTOMATION_*` — günde 3× planlı slot (01:00, 09:00, 17:00 TR); **`rssAutomationEnabled` DB'de false**
- [ ] `PORTAL_RSS_REFRESH_MS` — scheduler aralığı (automation açıksa)
- [ ] `PORTAL_RSS_AI_META_ENABLED` — yalnızca bilinçli açılışta `1`

### Cache / dış API (P1)

- [ ] `REDIS_URL` — P1-3 sonrası
- [ ] YouTube / wiki upstream anahtarları — quota ve timeout env ile

### Güvenlik (performansla çakışmayan)

- [ ] `CORS_ALLOWED_ORIGINS` — gereksiz preflight azaltır
- [ ] `RELAX_CORS_IN_PRODUCTION` — **prod'da unset**

### Deploy doğrulama

```bash
# Health + pool (admin)
curl -sS https://goalgo-y7ze.onrender.com/healthz
# Log: Render dashboard → Logs → filter "durationMs" / "by-domain"
```

---

## Metin-önce + lazy görsel planı

**Amaç:** LCP ve First Contentful Paint — önce başlık/metin, görseller viewport'a girince yüklensin.

### Mevcut durum

- `HaberAnasayfasi.tsx`, `HmCorporateHome.tsx` — `loading="lazy"` kısmen uygulandı.
- `HmNewsImage` bileşeni merkezi nokta; tüm vitrinlerde kullanılmıyor.

### P0 (hızlı kazanım)

1. Liste kartlarında **`fetchpriority="high"` yalnızca hero/LCP görseli**; diğerleri lazy.
2. Görsel URL'lerinde sabit `width/height` veya aspect-ratio — CLS önleme.
3. Placeholder: dominant renk veya blur hash (P2 CDN ile).

### P1

1. **`HmNewsImage` zorunlu** — tüm HM tema bileşenlerinde lazy + `decoding="async"`.
2. **Metin-önce CSS:** kart layout'ta `min-height` metin alanı; görsel `background` yerine `<img>` lazy.
3. **Above-the-fold audit:** Lighthouse mobil — LCP elemanı tek hero; slider'da ilk slide eager, diğerleri lazy.

### P2

1. CDN resize + WebP/AVIF otomatik.
2. `content-visibility: auto` uzun haber listelerinde.

### DoD

- Mobil Lighthouse Performance **≥ 70** (HM anasayfa, 3G throttled).
- Network waterfall: LCP görseli metin render'dan **≤ 500 ms** sonra (metin önce görünür).

---

## Ölçüm ve regresyon

| Metrik | Araç | Hedef (P0 sonrası) |
|--------|------|---------------------|
| `by-domain` istek/sayfa | DevTools / Render log | ≤ 2 |
| `/api/news?limit=50` boyut | curl `-w size_download` | −50% min |
| Wiki 404 süresi | pino `durationMs` | p95 < 500 ms |
| youtube-engagement | pino | p95 < 2 s (cache warm) |
| Pool timeout / 502 | Render metrics | 0 spike / deploy günü |

**Smoke:** `pnpm run typecheck` + özel alan anasayfa manuel + `curl` wiki kötü slug.

---

## PR şablonu (performans)

```
## Checklist maddesi
P0-X / P1-X: ...

## Değişiklik
- ...

## Test
- [ ] pnpm run typecheck
- [ ] Render log before/after (endpoint, durationMs)
- [ ] Payload size / Network count

## Risk
Düşük / Orta — ...
```

---

## Sonraki adım

1. **Final batch merge** (`auto/hm-perf-final-batch`) — kullanıcı «et» onayı bekler.
2. **P0-5** prod checklist (yukarı) merge sonrası manuel.
3. **P1-1 tam bundle** — kategori blokları + ticker lazy (sonraki batch).
4. **P1-2** DB indeksleri — video/wiki sorguları.

**HM editör vitrin özelleştirme (P2):** Ayrı belge → [HM-EDITOR-YOL-HARITASI.md](./HM-EDITOR-YOL-HARITASI.md) (Yekpare menü, manşet, header, RSS sil, renk/reklam, ticker konumu).

*Bu belge yalnızca planlama içindir; uygulama [AGENTS.md](../AGENTS.md) ve [YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md](./YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md) ile koordine edilmelidir. **Otomatik merge yapılmaz** — batch PR'lar kullanıcı "et" onayı bekler.*
