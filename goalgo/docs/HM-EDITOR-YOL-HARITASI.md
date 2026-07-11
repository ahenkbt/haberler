# HM Edit├Âr ÔÇö Vitrin ve Haber Y├Ânetimi Yol Haritas─▒

> **Haz─▒rlanma:** 7 Temmuz 2026  
> **Kapsam:** HM edit├Âr paneli (`EditorVitrinAyarlari`, `YekpareHaberlerVitrinAyarlari`), RSS haber y├Ânetimi, anasayfa man┼şet/header bile┼şenleri  
> **─░lgili:** [YEKPARE-PERFORMANS-YOL-HARITASI.md](./YEKPARE-PERFORMANS-YOL-HARITASI.md) ┬À [YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md](./YEKPARE-CANIYA-CIKIS-YOL-HARITASI.md)  
> **Ayarlar deposu:** `hm_news_sites.layout_json` ÔåÆ `NewsSiteLayoutPrefs` (`newsSiteLayout.ts`)

---

## P2-HM-Editor ÔÇö Vitrin ├Âzelle┼ştirme

Her madde tek PR; merge ├Âncesi `pnpm run typecheck`. HM edit├Âr sitelerinde de─şi┼şiklikler **yekpare.net** prod vitrinini bozmamal─▒ ÔÇö portal davran─▒┼ş─▒ ayr─▒ test edilir.

### P2-HM-0 ┬À Yeni site vitrin varsay─▒lanlar─▒ ÔÇö [x]

**Hedef:** HM edit├Ârde yeni site / varsay─▒lan `layout_json` ├Ân ayarlar─▒.

| Ayar | Varsay─▒lan |
|------|------------|
| ├£st men├╝ | Her zaman a├ğ─▒k (toggle kald─▒r─▒ld─▒) |
| ├£st krom modu | A├ğ─▒k (─▒┼ş─▒k) |
| Man┼şet d├╝zeni | Orta b├╝y├╝k man┼şet + sol/sa─ş kartlar (`center-trio`) |
| Man┼şet slider | Yaln─▒zca MAN┼ŞET etiketli + manuel haberler (RSS otomatik kapal─▒) |
| Yan kartlar | Son dakika haberleri dahil |
| Anasayfa temas─▒ | G├╝l ÔÇö uzun magazin (`esen`) |

**Dosyalar:** `newsSiteLayout.ts`, `EditorVitrinAyarlari.tsx`, `HaberAnasayfasi.tsx`, `hm.ts`, header bile┼şenleri.

### P2-HM-1 ┬À Yekpare men├╝ ÔÇö [x]

**Hedef:** Edit├Âr panelinde yatay ikon navigasyon men├╝s├╝ se├ğene─şi (G├╝ndem, Ekonomi, Spor, D├╝nya, Teknoloji, K├╝lt├╝r, Yazarlar, T├╝m haberler). Yektube men├╝ ├Â─şesi kald─▒r─▒ld─▒.

**Dosyalar:**
- `artifacts/ahenkpress/src/pages/editor/EditorVitrinAyarlari.tsx`
- `artifacts/ahenkpress/src/lib/newsSiteLayout.ts` (`yekpareMenuPreset`)
- `artifacts/ahenkpress/src/components/HmPublicHeader.tsx` (veya mevcut header bile┼şeni)

**Stub:** `yekpareMenuPreset` alan─▒ edit├Ârde kaydedilebilir (`default` | `yekpare-icons` | `custom`).

**DoD:** Se├ğilen ├Ân ayar vitrinde ikon ┼şeridini render eder; kapal─▒ sitelerde mevcut men├╝ korunur.

---

### P2-HM-2 ┬À RSS haber sil ÔÇö [x]

**Hedef:** RSS feed'den i├ğe aktar─▒lan haberlerin d├╝zenleme sayfas─▒nda **Sil** butonu; ├Ânbellek + (varsa) siteye kay─▒tl─▒ haber kayd─▒ kald─▒r─▒l─▒r.

**Dosyalar:**
- `artifacts/ahenkpress/src/components/RssHaberlerPanel.tsx`
- `artifacts/api-server/src/routes/hm-rss-news.ts`
- `artifacts/api-server/src/lib/hm-rss-news-service.ts`
- `artifacts/api-server/src/lib/portal-rss-cache.ts`
- `artifacts/api-server/src/lib/portal-rss-store.ts`

**U├ğ noktalar:**
- `DELETE /api/hm/editor/rss-news/:itemId`
- `DELETE /api/admin/rss-news/:itemId`

**DoD:** Edit├Âr RSS d├╝zenleme diyalo─şunda Sil ÔåÆ liste yenilenir; siteye kay─▒tl─▒ haber varsa `news` sat─▒r─▒ da silinir.

---

### P2-HM-2b ┬À RSS havuz arama + rol bazl─▒ sil ÔÇö [x]

**Hedef:** Yekpare RSS haber listesinde ba┼şl─▒k/kaynak/kategori aramas─▒; edit├Âr **Siteden kald─▒r** (merkez havuz korunur), Yekpare admin **Veritaban─▒ndan sil** (kal─▒c─▒).

**Dosyalar:**
- `artifacts/ahenkpress/src/components/RssHaberlerPanel.tsx`
- `artifacts/ahenkpress/src/lib/newsSiteLayout.ts` (`hmHiddenRssItemIds`)
- `artifacts/api-server/src/routes/hm-rss-news.ts`
- `artifacts/api-server/src/routes/portal-hybrid-news.ts`
- `artifacts/api-server/src/lib/hm-rss-news-service.ts`
- `artifacts/api-server/src/lib/hm-public-layout.ts`
- `artifacts/api-server/src/lib/hybrid-news-merge.ts`
- `artifacts/api-server/src/lib/portal-hybrid-config.ts`

**U├ğ noktalar:**
- `GET /api/hm/editor/rss-news?q=ÔÇĞ` ÔÇö ba┼şl─▒k, kaynak (feed etiketi), kategori
- `GET /api/admin/rss-news?q=ÔÇĞ` ÔÇö ayn─▒ arama
- `DELETE /api/hm/editor/rss-news/:itemId` ÔÇö siteden kald─▒r (`layout_json.hmHiddenRssItemIds` + site haberi)
- `DELETE /api/admin/rss-news/:itemId` ÔÇö veritaban─▒ndan kal─▒c─▒ sil

**DoD:** Edit├Âr ┬½Siteden kald─▒r┬╗ ÔåÆ haber listeden ve siteden kaybolur, admin panelinde g├Âr├╝n├╝r; admin ┬½Veritaban─▒ndan sil┬╗ ÔåÆ merkez RSS ├Ânbelle─şi/DB'den kald─▒r─▒l─▒r.

---

### P2-HM-2c ┬À RSS otomasyon zamanlamas─▒ ÔÇö [x]

**Hedef:** Yekpare admin ┬½RSS otomasyonu┬╗ a├ğ─▒kken haber ├ğekimi g├╝nde **3 kez** (8 saatte bir): **01:00, 09:00, 17:00** Europe/Istanbul. Eski gece penceresi (22:00ÔÇô06:00) kald─▒r─▒ld─▒.

| Davran─▒┼ş | A├ğ─▒klama |
|----------|----------|
| Otomatik | `rss-automation-control.ts` slot kontrol├╝ + `portal-rss-scheduler.ts` sonraki slota `setTimeout` |
| Manuel | `POST /api/admin/portal-rss/refresh` ve AI ┬½├çal─▒┼şt─▒r┬╗ ÔÇö slot d─▒┼ş─▒nda da an─▒nda |
| Test | `RSS_AUTOMATION_ALL_DAY=1` env ile 7/24 tick |
| Admin UI | `YekpareHaberlerVitrinAyarlari` ÔåÆ Kategori RSS sekmesi |

**Dosyalar:** `rss-automation-control.ts`, `portal-rss-scheduler.ts`, `YekpareHaberlerVitrinAyarlari.tsx`

---

### P2-HM-3 ┬À Man┼şet d├╝zeni ÔÇö [x]

**Hedef:** Referans d├╝zen ÔÇö sol b├╝y├╝k slider, sa─şda 4 yan haber k├╝├ğ├╝k g├Ârseli, altta ikon band─▒ (Gezilecek Yerler, Foto Galeri, vb.).

**Dosyalar:**
- `artifacts/ahenkpress/src/pages/public/HaberAnasayfasi.tsx`
- `artifacts/ahenkpress/src/components/HmCorporateHome.tsx`
- `artifacts/ahenkpress/src/lib/newsSiteLayout.ts` (`mansetVariant` geni┼şletme)

**DoD:** Yeni `mansetVariant` veya mod├╝l d├╝zeni edit├Ârden se├ğilebilir; mobil k─▒r─▒l─▒mda okunabilir kal─▒r.

---

### P2-HM-4 ┬À Header se├ğimi (Trabzonik) ÔÇö [x]

**Hedef:** Se├ğilebilir ┬½haber header┬╗ ├Ân ayar─▒ ÔÇö logo sol, banner sa─ş, bordo navigasyon, son dakika ticker (Trabzonik referans─▒).

**Dosyalar:**
- `artifacts/ahenkpress/src/pages/editor/EditorVitrinAyarlari.tsx`
- `artifacts/ahenkpress/src/lib/newsSiteLayout.ts` (`headerPreset`)
- HM public header bile┼şenleri

**Stub:** `headerPreset` alan─▒ edit├Ârde kaydedilebilir (`default` | `trabzonik` | `classic` | `minimal`).

**DoD:** `trabzonik` se├ğildi─şinde vitrin header layout'u referans g├Ârsele uygun render edilir.

---

### P2-HM-5 ┬À Renk + logo yan─▒ reklam ÔÇö [x]

**Hedef:** Header renk ├Âzelle┼ştirmesi (`hmPrimaryColor`, `hmSecondaryColor`) + logo yan─▒ iste─şe ba─şl─▒ reklam slotu.

**Dosyalar:**
- `artifacts/ahenkpress/src/pages/editor/EditorVitrinAyarlari.tsx`
- `artifacts/ahenkpress/src/lib/newsSiteLayout.ts` (`hmAdSlots`, `hmPrimaryColor`)
- Header / reklam slot bile┼şenleri

**DoD:** Edit├Âr renk se├ğer ve logo yan─▒ slotu a├ğ─▒p HTML/iframe reklam atayabilir; yekpare.net varsay─▒lanlar─▒ de─şi┼şmez.

---

### P2-HM-6 ┬À Piyasa/hava band─▒ konumu ÔÇö [x]

**Hedef:** Edit├Âr se├ğimi: logo yan─▒ | men├╝ alt─▒ | sidebar.

**Dosyalar:**
- `artifacts/ahenkpress/src/pages/editor/EditorVitrinAyarlari.tsx`
- `artifacts/ahenkpress/src/lib/newsSiteLayout.ts` (`tickerPlacement`)
- `HaberAnasayfasi.tsx` / header ticker mod├╝lleri

**Stub:** `tickerPlacement` alan─▒ edit├Ârde kaydedilebilir (`logo-side` | `below-menu` | `sidebar`).

**DoD:** Se├ğilen konumda d├Âviz/hava band─▒ render edilir; di─şer konumlarda gizlenir.

---

### P2-HM-7 ┬À Kategori kutusu 1+3 d├╝zeni ÔÇö [x]

**Hedef:** T├╝m kategori vitrin kutular─▒nda tutarl─▒ d├╝zen ÔÇö sol **1 b├╝y├╝k g├Ârsel haber**, sa─şda alt alta **3 haber** (k├╝├ğ├╝k thumb + ba┼şl─▒k). Masa├╝st├╝nde numaral─▒ metin listesi veya 2 yan kart yerine thumb'l─▒ 3'l├╝ s├╝tun.

**Dosyalar:**
- `artifacts/ahenkpress/src/components/HmCategoryBoxLayout.tsx` (`HmCategoryBoxGrid`, `HmCategoryThumbList`)
- `artifacts/ahenkpress/src/components/HmYekpareKategorilerKutusu.tsx`
- `artifacts/ahenkpress/src/lib/hmCategoryBoxItems.ts` (`CATEGORY_BOX_DESKTOP_LIST_SLOTS`, `splitCategoryBoxItems`)
- `artifacts/ahenkpress/src/pages/public/HaberAnasayfasi.tsx` (`yekpareKategorilerKutusu`, `featuredCategoryStrip`, classic kategori b├Âl├╝mleri)
- `artifacts/ahenkpress/src/styles/hmVitrinThemes.css` (kategori kutusu grid)

**DoD:** G├╝ndem, Ekonomi, Spor, D├╝nya vb. t├╝m kategori mod├╝lleri masa├╝st├╝nde 1+3 layout g├Âsterir; sa─şdaki 3 haberin hepsinde k├╝├ğ├╝k g├Ârsel + ba┼şl─▒k vard─▒r; mobil 2├ù2 quad korunur.

---

### P2-HM-8 ┬À HM ├Âzel alan performans ÔÇö hub-only mod├╝ller ÔÇö [x]

**Hedef:** HM custom domain'lerde (vatankahramanlari, tukav, ankarasehirgazetesi, ÔÇĞ) YekTube, Bilgi A─şac─▒, harita ve a─ş─▒r anasayfa mod├╝lleri tamamen kapal─▒; haber listesi m├╝mk├╝n olan en az API ile y├╝klenir. `yekpare.net` hub davran─▒┼ş─▒ de─şi┼şmez.

**Kapsam (PR #429 + #431 ├╝zerine, g├╝├ğlendirildi):**
- `isYekparePortalHubOnly` ÔÇö men├╝, layout, anasayfa mod├╝l filtresi
- `HM_HUB_ONLY_HOME_MODULE_IDS` + `filterHmHomeModulesForPortalHub` ÔÇö merkezi mod├╝l strip
- Yekpare men├╝ / S├╝mb├╝l ┼şerit: **Yektube ├Â─şesi tamamen kald─▒r─▒ld─▒** (yekpare.net dahil)
- `HmYekpareFeaturesCards`: Haritalar + Ke┼şfet kartlar─▒ HM'de yok
- Hub-only mod├╝ller lazy chunk ÔÇö HM'de JS indirilmez (`LazyHmNewsMapModule`, `LazyHmRecentVideosBox`)
- `/tr/:slug/video-tv/*` rotalar─▒ `YekparePortalHubOnlyRoute` ile kapal─▒
- ├ûzel edit├Âr men├╝lerinde hub-only href filtresi

**Dosyalar:** `hmPortalHosts.ts`, `newsSiteLayout.ts`, `hmCorporateNavMenu.ts`, `hmYekpareFeaturesNav.ts`, `HaberAnasayfasi.tsx`, `HmNestedLayout.tsx`, `HmSumbulCategoryNavStrip.tsx`, `HmYekpareFeaturesCards.tsx`, `App.tsx`, `EditorVitrinAyarlari.tsx`

**DoD:** HM anasayfa a├ğ─▒l─▒┼ş─▒nda video/wiki/harita API ├ğa─şr─▒s─▒ yok; `worldBriefs` (D├╝nya band─▒) korunur.

---

### P2-HM-9 · Pasif kategoriler vitrin filtresi — [x]

**Hedef:** Editörde «Vitrinde Kapalı» (`hmNavHiddenCategorySlugs`) veya Yekpare havuzunda kapalı (`hmActivatedCategorySlugs`) kategoriler footer, nav şeridi, anasayfa modülleri ve `/api/categories?siteId=` yanıtında görünmez.

**Dosyalar:** `hm-editor-categories.ts`, `categories.ts`, `hmPublicCategoryFilter.ts`, `HmPublicSiteFooter.tsx`, `useHmPublicNewsCategoryMenu.ts`, `HaberAnasayfasi.tsx`

**DoD:** ankarasehirgazetesi.com / vatankahramanlari.org footer «Haber kategorileri» yalnızca aktif kategorileri listeler; Global varsayılan kapalı kalır.

---


## HM + performans birleşik batch (final)

> **7 Temmuz 2026:** Kullanıcı HM + performansı **tek merge** istedi. #431 (HM+perf kısmi) main'e merge edildi; #433 (HM vitrin P2-HM-1…6) açık kaldı — **yanlış yaklaşım**. Tüm kalan iş `auto/hm-perf-final-batch` dalında birleştirildi; #433 kapatıldı (superseded). Merge yalnızca kullanıcı **«et»** dediğinde.

**7 Temmuz 2026 (kısa-kısa):** `/kisa-kisa` (Dünyadan Kısa Kısa) yalnızca Türkçe başlık gösterir — `isTurkishWorldBriefContent` + bilinen yabancı kaynak (NOS, DW, Le Monde, O Globo) filtresi; `loadWorldBriefs` API'de çift geçiş. Doğrulama: `pnpm --filter @workspace/api-server test src/lib/turkishContent.test.ts`; canlıda `GET /api/news/world-briefs?perFeed=8` yanıtında yabancı dil başlık olmamalı.

---

## HM batch tamamlanma durumu

> HM batch merge için planlanan P2-HM-1…6 maddeleri `[x]` olana kadar PR biriktirilir. **PR #431** şu an HM+perf birleşik dal; merge onayı kullanıcıda.

| ID | Görev | Durum | Batch merge |
|----|-------|-------|-------------|
| P2-HM-0 | Yeni site varsayılanları | [x] | #431 |
| P2-HM-1 | Yekpare menü | [x] | final batch |
| P2-HM-2 | RSS haber sil | [x] | #431 |
| P2-HM-2b | RSS arama + rol sil | [x] | #431 |
| P2-HM-2c | RSS otomasyon 3×/gün | [x] | #431 |
| P2-HM-3 | Manşet düzeni | [x] | final batch |
| P2-HM-4 | Header (Trabzonik) | [x] | final batch |
| P2-HM-5 | Renk + reklam | [x] | final batch |
| P2-HM-6 | Ticker konumu | [x] | final batch |
| P2-HM-7 | Kategori 1+3 | [x] | #431 (ex-#432) |
| P2-HM-8 | Hub-only performans | [x] | #431 |
| P2-HM-9 | Pasif kategori vitrin filtresi | [x] | `auto/hm-category-active-filter` |

**Batch merge hazır mı?** Evet — P2-HM-1…6 + P0-3 + P1-1 (kısmi) tek PR'da birleştirildi (`auto/hm-perf-final-batch`). PR #433 superseded. Merge onayı kullanıcıda («et»).

