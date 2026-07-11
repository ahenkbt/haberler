# Yektube v2 — Yol Haritası

> **Son güncelleme:** Haziran 2026  
> **Odak:** Oynatma stabilitesi, Yekçek/müzik UX, içerik kuralları, feed çeşitliliği  
> **Arşiv:** Tamamlanan Faz 0–5 özeti → [V1_ARCHIVE.md](./V1_ARCHIVE.md)

---

## Durum özeti

| Alan | Durum |
|------|--------|
| Çekirdek SPA (izleme, arama, kanal, admin) | ✅ Canlı |
| Kullanıcı paneli (`/hesabim`, `/kutuphane`) | ✅ Temel |
| Kullanıcı stüdyosu (`/studio`, `/studio/ekle`) | ✅ Temel |
| Oynatıcı (iframe + native proxy) | ✅ P0 + P2-N (PO Token/proxy env) |
| Yekçek / müzik / feed algoritması | ✅ P1–P3 tamamlandı |
| SEO (Faz 9) | ✅ Temel (SSR/OG ön-render hariç) |

**Prensip:** Embed izinli videolarda video baytları **cihaz ↔ YouTube (iframe)**; Railway yalnızca metadata, embed kapalı native proxy ve zorunlu fallback.

---

## Öncelik sırası

| Sıra | Paket | Hedef |
|------|--------|--------|
| **P0** | Oynatıcı altyapısı | ✅ Tamamlandı (deploy doğrulama P0-1 manuel) |
| **P1** | Yekçek UX | ✅ Tamamlandı (P1-Y1 … P1-Y5) |
| **P1** | Müzik arka plan | ✅ Tamamlandı (P1-M1 … P1-M5) |
| **P2** | İçerik kuralları | ✅ Tamamlandı (P2-D1 … P2-MF4) |
| **P2** | Feed çeşitliliği | ✅ Tamamlandı (P2-F1 … P2-F5) |
| **P2** | Native akış (kısa vade) | ✅ P2-N1 … P2-N3 |
| **P3** | Performans & yorumlar | ✅ Tamamlandı (P3-P1 … P3-C4) |
| **P2** | Native akış (uzun vade) | ✅ P2-N4 … P2-N6 (env ile PO Token / proxy) |
| **—** | Faz 7–9 eksikleri | ✅ Tamamlandı (SSR/OG ön-render opsiyonel) |

---

## P0 — Oynatıcı altyapısı ✅ (Haziran 2026)

Embed izinli içerik Railway’den geçmeden oynatılmalı; native yol yalnızca `embedAllowed: false` veya iframe hatası (101/150/153).

- [x] **P0-1** Canlı doğrulama — iframe-first bundle + SW sürümü; 3 cihazda Network (`youtube.com` vs `/play`) *(deploy sonrası manuel)*
- [x] **P0-2** Portal `YektubeWatchPlayer` → SPA ile iframe-first (`embedAllowed !== false`)
- [x] **P0-3** `vercel.json` youtube-stream Railway rewrite tutarlılığı (kök `vercel.json` eklendi)
- [x] **P0-4** Müzik: iframe önce, native `/play?audio=1` yalnızca fallback (`MusicBackgroundEngine`, `YoutubePlayer`)
- [x] **P0-5** `/api/video/youtube-stream/:id/play` 404/502 log metrikleri (`youtubeStreamMetrics.ts`, `streamMetric: true`)

### Bilinen oynatma hataları (referans)

| # | Belirti | Düzeltme |
|---|---------|----------|
| 1 | Native çözümleme 404 | iframe-first (SPA ✅, portal ⏳) |
| 2 | Vercel 25s / 504 | middleware bypass + rewrite (✅, kök vercel kontrol) |
| 3 | 3 cihaz eşzamanlı fail | iframe + önbellek/403 retry (Faz P0 + P2-5) |
| 4 | Portal native takılıyor | P0-2 |
| 5 | Müzik Railway yükü | P0-4 |
| 6 | Railway 502 | P0-5 + izleme |
| 7 | Embed kapalı sürekli fail | P2-6 (PO Token, TR proxy) |

---

## P1 — Yekçek (Shorts) UX ✅

**Mevcut:** `ShortsReel`, snap scroll, `onEnded` → sonraki, `sessionSeed`, aktif ±1 render penceresi, loop tercihi `localStorage`.

- [x] **P1-Y1** Autoplay: ekrana gelen video **muted autoplay**; “Sesi aç” katmanı; Play tuşu zorunluluğunu kaldır
- [x] **P1-Y2** Yekçek’te `audioMode` kaldırıldı — iframe-first (`shortsMode`); native yalnızca embed kapalı / iframe fail
- [x] **P1-Y3** Auto-next varsayılan: video bitince **sonraki slayta** kaydır (`goToNextShort` + `onEnded`)
- [x] **P1-Y4** **Loop modu (kullanıcı seçimi):** `ShortsActionRail` toggle; açıkken aynı video tekrar; kapalıyken auto-next
- [x] **P1-Y5** Gereksiz `youtubeStreamPlayUrl` prefetch kaldırıldı (iframe modunda Railway isteği azalt)

---

## P1 — Müzik arka plan oynatma ✅

**Hedef:** `/müzik` sekmesinde ekran kapanınca veya tarayıcı minimize olunca ses kesilmesin; kilit ekranında duraklat/oynat çalışsın.

- [x] **P1-M1** Müzik iframe-first + Media Session iframe player’a bağlandı (`MusicBackgroundEngine`, position state)
- [x] **P1-M2** `visibilitychange` / `pageshow` / `focus` resume mantığı güçlendirildi
- [x] **P1-M3** Android + iOS test checklist → [MUSIC_BACKGROUND_TEST.md](./MUSIC_BACKGROUND_TEST.md)
- [x] **P1-M4** PWA manifest (`scope`, `handle_links`, `launch_handler`); audio unlock akışı korundu
- [x] **P1-M5** SW ile müzik thread yapılmıyor — Media Session + gizli iframe yeterli

---

## P2 — İçerik kuralları & filtreleme

### 3 dakika eşiği (Yekçek vs genel listeler)

**Kural:** ≤180 sn videolar **yalnızca Yekçek**’te; genel kategori/ana sayfa listelerinde gösterilmez veya en sona atılır.

- [x] **P2-D1** `YEKCEK_MAX_DURATION_SECONDS = 180` (api-server, yektube-web, ahenkpress)
- [x] **P2-D2** `/api/video/videos`: `excludeStories` + `longFormOnly` ile ≤180 sn hariç
- [x] **P2-D3** `/api/video/shorts`: ≤180 sn dahil; süre bilinmeyenler mevcut başlık/`isStory` kuralları
- [x] **P2-D4** (Opsiyonel) Admin: süre backfill sonrası yeniden sınıflandırma (`POST /video/reclassify-yekcek-durations`)

### `/müzik` katı filtre

**Kural:** TV programı, tartışma, haber bülteni listeden çıksın; klip, şarkı, canlı performans kalsın.

- [x] **P2-MF1** Backend: `musicContentFilter.ts` başlık/etiket kara listesi
- [x] **P2-MF2** Beyaz liste: resmi müzik kanalı + klip/official anahtar kelimeleri
- [x] **P2-MF3** >15 dk kayıtlar müzik katalogundan çıkar
- [x] **P2-MF4** Filtre sonrası log (`[video] music catalog filter`)

---

## P2 — Feed çeşitliliği & algoritma

### Yekçek dağılımı

**Hedef:** Peş peşe aynı kategoriden en fazla 2 video; her oturumda farklı sıra.

**Mevcut:** `mixShortsFeed`, `fetchShorts({ mixChannels, seed })`.

- [x] **P2-F1** `mixShortsFeed`: `spreadByCategorySlugMaxRun` — ardışık aynı kategori ≤2
- [x] **P2-F2** Oturum seed + pool offset (`sessionFeedSeed`, ShortsReel)
- [x] **P2-F3** (Opsiyonel) Son izlenenleri hariç tut (`exclude` query + oturum izleme listesi)

### Ana sayfa, kategori, `/müzik`, `/cocuk`

**Hedef:** Her açılışta aynı popüler videolar tekrar etmesin; seed’li ağırlıklı karışım (saf random değil).

- [x] **P2-F4** API: `seed` query param (`parseShortsSessionSeed`, `/video/videos`)
- [x] **P2-F5** `HomePage`, müzik, çocuk: `sessionStorage` seed
- [x] **P2-F6** (Opsiyonel) SEO/statik shelf'ler ile kişisel vitrin satırını ayır (`STATIC_SHELF_FEED_SEED`)

---

## P2 — Native akış (embed kapalı videolar)

Railway + YouTube sunucu tarafı; embed kapalı içerik için uzun vadeli.

- [x] **P2-N1** Çözümleme kuyruğu — eşzamanlı `resolveYoutubeStreamUrl` sınırı (3)
- [x] **P2-N2** 403 → `invalidateStreamCache` + istemci `force=1` retry (mevcut)
- [x] **P2-N3** Çözücü kaynak metrikleri (`resolve_ok` + `source`)
- [x] **P2-N4** **PO Token** — `YOUTUBE_PO_TOKEN` + InnerTube `serviceIntegrityDimensions`
- [x] **P2-N5** **TR egress proxy** — `YOUTUBE_EGRESS_PROXY_URL(S)` + `youtubeStreamFetch`
- [x] **P2-N6** **İmzalı URL decipher** — `youtubei.js` `UniversalCache` kalıcı player-script önbelleği

---

## P3 — Performans & yorumlar

### Yekçek performans

- [x] **P3-P1** Virtual window: aktif ±1 slayt (`shortsReelConfig`, P1’de uygulandı)
- [x] **P3-P2** CSS: `contain`, `will-change`; snap korundu
- [x] **P3-P3** `react-window` tam sanal liste (`ShortsVirtualList`, overscan ±1)

### Yorumlar bug fix

**Mevcut:** `WatchCommentsSection`, `useYoutubeEngagement`, `/api/video/youtube-engagement`.

- [x] **P3-C1** Engagement: boş yanıt yerine güvenli fallback + retry
- [x] **P3-C2** `WatchPage`: `useYoutubeEngagement` mount koşulu doğrulandı
- [x] **P3-C3** Yorum bölümü `z-index` / görünürlük
- [x] **P3-C4** Yekçek action rail yorum modal + loading state

---

## Sprint planı (önerilen sıra)

```
Sprint 1 (P0)     → P0-1 … P0-5
Sprint 2 (P1)     → P1-Y1 … P1-Y5 + P1-M1 … P1-M3
Sprint 3 (P2)     → P2-D1 … P2-D3 + P2-MF1 … P2-MF3 + P2-F1 … P2-F2
Sprint 4 (P2)     → P2-F4 … P2-F6 + P2-N1 … P2-N3
Sprint 5 (P3)     → P3-P1 … P3-P2 + P3-C1 … P3-C4
Sprint 6 (P2 uzun) → P2-N4 … P2-N6 (PO Token, TR proxy)
```

---

## Tamamlanan (Faz 0–6 — özet)

<details>
<summary>Genişlet — eski faz checklist</summary>

### Faz 0–5 ✅
Proje kurulumu, çekirdek deneyim (watch, shorts, arama, kanal), native his (SW, PWA, haptics), admin v2, üye paneli API (geçmiş, listeler, abonelik), geçiş (v2 flag, redirect, deploy).

### Faz 6 🚧 (kısmen)
- [x] Canlı Yayın, YekLive, embed kapalı proxy, filigran kalkanı
- [x] Canlı rozet polling (`GET /video/live/status`, 60 sn)
- [x] Yekçek doğrudan yükleme (`/studio/ekle?tur=yekcek`, ≤3 dk)

### Oynatıcı (kısmen ✅)
- [x] Piped, InnerTube, youtubei.js, ytdl, `/play` proxy
- [x] Vercel middleware bypass + Railway rewrite
- [x] SPA iframe-first (embed izinli)

### Faz 11 tamamlanan (UX)
- [x] Yekçek seed + mixChannels, mobil sessiz autoplay katmanı
- [x] İzleme sayfası panelleri, Türkçe öncelik, Media Session (native)
- [x] Canlı TV oynatıcı

</details>

---

## Bekleyen — Faz 7–9 (paralel / sonra)

### Faz 7 — Kullanıcı paneli (temel ✅)
- [x] `/hesabim`, `/kutuphane`, geçmiş, listeler, abonelikler, tercihler
- [x] Profil fotoğrafı, kanal bağlama, push bildirimleri (VAPID + abonelik + yeni video push)

### Faz 8 — Kullanıcı stüdyosu ✅
- [x] `/studio`, `/studio/ekle`, üye kaynak gönderimi
- [x] Gönderi listesi + durum (`/studio` — moderasyonda / yayında)
- [x] Analitik özet kartları (`GET /video/me/creator/analytics`)
- [x] S3/volume yükleme metadata (transcoding bilinçli scope dışı)

### Faz 9 — SEO ✅ (kısmi)
- [x] Slug URL'ler (`channelPathSlug`, `videoPathSlug`), izleme sayfası JSON-LD + geo TR
- [x] Sitemap (`/api/sitemap/yektube-*`), statik geo/description meta, `og:image`
- [x] OG HTML ön-render (`GET /api/video/og/watch`, `watchOgShareUrl`)
- [x] Bot middleware SSR (`/api/video/og/watch-by-path`, Vercel edge → izleme URL)

### Diğer uzun vade
- [x] Canlı yayın DASH birleştirme (video + audio ayrı akış; native fallback)
- [x] Kişiselleştirilmiş Yekçek önerileri (üye izleme geçmişi + son kanalları geriye itme; misafir `exclude` query)
- [x] Kanal/playlist zenginleştirme, topluluk gönderileri (podcast sekmesi, Topluluk tab, playlist önizleme)
- [x] Türkçe altyazı, iOS PiP rehberi (TR VTT + iframe cc; izleme sayfası toggle + iOS banner)
- [x] Düşük bant modu (Hesabım → Ayarlar; iframe tercih, prefetch kapalı)
- [x] Kanal kaynağı ETag (`GET /video/sources/by-ref`, 304 destek)
- [x] Redis kanal cache, thumbnail CDN (Upstash + `/api/video/thumb`; meta/playlists/community)

---

## Yapılmayacaklar (bilinçli)

| Konu | Neden |
|------|--------|
| Video arka planda oynatma (müzikle birlikte) | Ürün kararı — yalnızca müzik arka plan |
| Müzik + video eşzamanlı | `stopAllHtmlMedia` — çakışma önleme korunur |
| SW ile müzik “background thread” | Yanlış araç; Media Session + iframe yeterli |
| Kullanıcı paneli/stüdyo sıfırdan | Zaten var; Faz 7–8 eksikleri ayrı backlog |

---

## Mimari özet

```
Yektube (izleyici)          YekLive (üretici)           Yönetim
─────────────────          ───────────────────         ────────
Ana Sayfa / Yekçek         /yek-gonder, /yeklive       /admin
/muzik, /cocuk             /studio, /studio/ekle
/canli                     POST …/me/creator/sources
/hesabim, /kutuphane

Oynatma (embed izinli):  Cihaz ──iframe──► YouTube
Oynatma (embed kapalı):  Cihaz ──► Vercel ──► Railway /play ──► googlevideo
Müzik arka plan:         Gizli iframe + Media Session (hedef)
```

---

## İlgili dokümanlar

- [PROJECT.md](./PROJECT.md) — modül tanımı
- [V1_ARCHIVE.md](./V1_ARCHIVE.md) — v1 rotalar
- [YEKTUBE_COM_DOMAIN.md](./YEKTUBE_COM_DOMAIN.md) — domain kurulum
- [PUSH_SETUP.md](./PUSH_SETUP.md) — VAPID / web push kurulumu
- `TALIMAT-GOREVLERI.md` — Vercel/Railway 502 degrade
