# Yektube v2 — Proje Tanımı

YouTube-parite video platformu: **mobil uygulama hissi** (PWA), **masaüstü YouTube klonu**, **admin paneli** ve **kullanıcı paneli**.

## Hedef

Mevcut Yektube modülünü (`ahenkpress/CanliTv.tsx`) kademeli olarak değiştiren, bağımsız deploy edilebilir yeni frontend:

| Yüzey | Hedef |
|-------|--------|
| Mobil web / PWA | iOS/Android uygulaması gibi tam ekran, alt tab bar, dikey feed |
| Masaüstü | YouTube sidebar + ana içerik + watch sayfası |
| Admin | Kanal/video kaynak yönetimi, senkron, moderasyon (DTTube admin referansı) |
| Kullanıcı | Abonelikler, geçmiş, oynatma listeleri, profil |

## Referanslar

- [YouTube clone scripts (GitHub Topics)](https://github.com/topics/youtube-clone-script)
- [Anuj-S62/youtube_clone](https://github.com/Anuj-S62/youtube_clone) — React frontend yapısı
- [KhubaibKhan4/Youtube-Clone-KMP](https://github.com/KhubaibKhan4/Youtube-Clone-KMP) — mobil tab navigasyon, Shorts
- [shubho0908/YouTube-clone-MERN](https://github.com/shubho0908/YouTube-clone-MERN) — full-stack API desenleri
- [Breens-Mbaka/Youtube-Clone](https://github.com/Breens-Mbaka/Youtube-Clone) — UI bileşen organizasyonu
- **DTTube** (Flutter + Laravel) — çok modüllü video/reel/podcast/radyo; admin panel kapsamı

## Monorepo konumu

```
goalgo/
├── docs/yektube-v2/           ← bu dokümantasyon
├── lib/yektube-core/          ← paylaşımlı tipler, URL, nav, sabitler
├── artifacts/yektube-web/     ← v2 public SPA (PWA)
├── artifacts/api-server/      ← mevcut /video/* API (korunur)
└── artifacts/ahenkpress/      ← v1 + admin geçiş dönemi
```

## Rota stratejisi

| Ortam | v1 | v2 |
|-------|----|----|
| Production geçiş | `/yektube` | `/yektube-v2` (paralel) |
| Nihai | redirect | `/yektube` |

v2 kendi `YEKTUBE_V2_HOME = "/yektube-v2"` tabanını kullanır; API aynı kalır.

## Teknoloji (v2)

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind 4, wouter, TanStack Query
- **PWA:** `manifest.webmanifest`, safe-area, standalone display, service worker (Faz 2)
- **Backend:** Mevcut Express + Drizzle (`/api/video/*`) — yeni endpointler ihtiyaç halinde
- **Admin:** Faz 3 — `yektube-web/admin` veya ahenkpress `/admin/yektube-v2`

## Fazlar

Detay: [ROADMAP.md](./ROADMAP.md)

1. **Faz 0 (bu sprint):** Proje iskeleti, mobil shell, home feed
2. **Faz 1:** Watch, Shorts, Search, Subscriptions
3. **Faz 2:** PWA install, offline thumb cache, push (opsiyonel)
4. **Faz 3:** Admin v2 UI
5. **Faz 4:** Kullanıcı hesabı, abonelik, geçmiş
6. **Faz 5:** v1 kapatma, `/yektube` → v2

## Geliştirme

```bash
cd goalgo
pnpm install
pnpm dev:api          # terminal 1 — API :3000
pnpm dev:yektube      # terminal 2 — v2 :5174
```

Tarayıcı: `http://localhost:5174/yektube-v2`
