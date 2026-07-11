# Yektube v1 — Arşiv

Yektube v2 geçişi (Faz 5) tamamlandığında aşağıdaki dosyalar **yalnızca v1 fallback** için tutulur. `VITE_YEKTUBE_V2_ENABLED=true` iken kullanıcılar bu bileşenlere yönlendirilmez.

## v1 bileşenleri (ahenkpress)

| Dosya | Rol |
|-------|-----|
| `artifacts/ahenkpress/src/pages/public/CanliTv.tsx` | Ana feed, bölüm sekmeleri |
| `artifacts/ahenkpress/src/pages/public/VideoTvChannel.tsx` | Kanal / oynatma sayfası |
| `artifacts/ahenkpress/src/pages/public/YektubeCanliTvPage.tsx` | Canlı yayın listesi |
| `artifacts/ahenkpress/src/components/YektubeStandaloneShell.tsx` | Standalone chrome |
| `artifacts/ahenkpress/src/pages/public/HmVideoTvShell.tsx` | HM site video-tv kabuğu |
| `artifacts/ahenkpress/src/pages/public/YektubeRedirects.tsx` | SEO / legacy URL yönlendirmeleri |

## Geçiş katmanı (v1 ↔ v2)

| Dosya | Rol |
|-------|-----|
| `artifacts/ahenkpress/src/components/YektubeV2Gateway.tsx` | Redirect, HM iframe, route wrapper |
| `artifacts/ahenkpress/src/lib/yektubeV2Feature.ts` | Feature flag re-export |
| `lib/yektube-core/src/migratePaths.ts` | URL eşleme (v1 → v2) |
| `lib/yektube-core/src/featureFlag.ts` | `isYektubeV2Enabled()` |

## v2 uygulama

- Kaynak: `artifacts/yektube-web/`
- Prod static: `artifacts/ahenkpress/public/yektube-v2/` (build sonrası kopya)
- Public URL: `/yektube-v2/` (geçiş sonrası `/yektube` gateway ile v2’ye yönlenir)

## v1 admin

`/admin/video-tv` v1 yönetim paneli olarak kalır. v2 admin: `/yektube-v2/admin` (Yektube Studio).

## Kaldırma kriteri

v2 prod’da en az bir sprint stabil çalıştıktan ve v1 fallback trafiği sıfıra indikten sonra v1 UI dosyaları silinebilir; API (`/api/video/*`) ve Yektube DB ortak kalır.
