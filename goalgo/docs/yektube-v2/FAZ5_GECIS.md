# Yektube v2 — Faz 5 Geçiş

## Özet

Faz 5, Yekpare üzerindeki v1 Yektube rotalarını v2 SPA’ya yönlendirir. Geçiş **feature flag** ile kontrol edilir; bayrak kapalıyken davranış v1 ile aynıdır.

## Feature flag

| Ortam | Değişken | Örnek |
|-------|----------|-------|
| Vercel (ahenkpress build) | `VITE_YEKTUBE_V2_ENABLED` | `true` |
| Yerel ahenkpress | `.env` | `VITE_YEKTUBE_V2_ENABLED=true` |
| Opsiyonel public base | `VITE_YEKTUBE_V2_PUBLIC_BASE` | `/yektube-v2` (varsayılan) |

## Davranış (flag açık)

| Giriş | Sonuç |
|-------|--------|
| `/yektube`, `/yektube/*`, `/canlitv/*` | Tam sayfa → `/yektube-v2/...` |
| `/tr/:slug/video-tv/*` | HM kabuğu + iframe → `/yektube-v2/...?embed=1&hm=:slug` |
| `/video-tv/kanal/*`, eski bölüm slug’ları | SEO redirect → v2 kanonik URL |
| `/video-galeri` | → v2 ana sayfa |

## Production build

```bash
cd goalgo
pnpm run build:web:full
```

Sıra: `build:yektube` → `scripts/copy-yektube-build.mjs` → `build:web`

Vercel `buildCommand` bunu `build:web:full` ile kullanır. `vercel.json` içinde `/yektube-v2/*` SPA rewrite’ları tanımlıdır.

## Yerel test

```powershell
cd goalgo
# Terminal 1
pnpm dev:api
# Terminal 2 — v2 SPA
pnpm dev:yektube
# Terminal 3 — Yekpare (flag ile)
$env:VITE_YEKTUBE_V2_ENABLED="true"; pnpm dev:web
```

- v2 doğrudan: http://localhost:5174/yektube-v2/
- Gateway: http://localhost:5173/yektube (flag açıkken 5174/v2’ye yönlendirir; prod’da aynı origin `/yektube-v2/`)

## HM embed

iframe `?embed=1&hm=site-slug` ile minimal chrome (Yekpare / Studio linkleri gizli).

## v1 arşiv

Detay: [V1_ARCHIVE.md](./V1_ARCHIVE.md)
