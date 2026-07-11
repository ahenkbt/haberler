# Yektube v2 — Mimari

## Katmanlar

```
┌─────────────────────────────────────────────────────────┐
│  yektube-web (artifacts)                                │
│  ├─ shell/     MobileAppShell | DesktopShell            │
│  ├─ features/  home | watch | shorts | search | channel│
│  └─ shared/    ui components                            │
├─────────────────────────────────────────────────────────┤
│  yektube-core (lib) — types, urls, nav, constants      │
├─────────────────────────────────────────────────────────┤
│  api-client-react — generated hooks (/video/*)          │
├─────────────────────────────────────────────────────────┤
│  api-server — Express routes + YouTube sync             │
├─────────────────────────────────────────────────────────┤
│  Yektube DB (YEKTUBE_DATABASE_URL)                      │
│  video_sources, videos, yektube_member_*                │
│  Ana DB: site_members, panel_admin_users, site_settings │
└─────────────────────────────────────────────────────────┘
```

## Mobil shell (YouTube app parity)

Referans: KhubaibKhan4 KMP + mevcut `YektubeMobileChrome.tsx` iyileştirmeleri.

| Bölge | Davranış |
|-------|----------|
| Top bar | Logo, arama, (ileride) bildirim |
| Bottom nav | Home · Shorts · Create · Subscriptions · You |
| Feed | Tam genişlik 16:9 thumb + avatar + 2 satır başlık |
| Shorts | Siyah tam ekran, swipe dikey |
| Safe area | `env(safe-area-inset-*)` |

## Masaüstü shell

Referans: Anuj-S62 / Breens-Mbaka sidebar layout.

- Sol: daraltılabilir sidebar (Ana Sayfa, Yekçek, Abonelikler, …)
- Orta: grid feed veya watch
- Sağ (watch): önerilen videolar sütunu

## API (mevcut, değişiklik yok — v2 tüketici)

| Endpoint | Kullanım |
|----------|----------|
| `GET /video/videos` | Home feed |
| `GET /video/shorts` | Yekçek |
| `GET /video/search` | Arama |
| `GET /video/sources` | Kanallar |
| `POST /video/sync` | Admin sync |

## DTTube’dan alınacak fikirler

- Modüler içerik tipleri (video, reel, podcast, radyo, müzik)
- Admin’de modül aç/kapa
- Kullanıcı profili + kütüphane sekmeleri

*(DTTube Laravel backend kullanılmaz; fikirler Goalgo API’ye uyarlanır.)*

## Deploy

- **Dev:** Vite `:5174`, proxy `/api` → `:3000`
- **Prod:** `yektube-web` build → static; Railway/Vercel ile `BASE_PATH=/yektube-v2`
- **PWA:** aynı origin altında manifest
