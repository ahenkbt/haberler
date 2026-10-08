# Sosyal Hizmetler Haber (sosyalhizmetler.tr) — Cloudflare DNS + Hostinger/VPS

HM slug: **`sosyalhizmetler`** · displayName: **Sosyal Hizmetler Haber** · tema: Yenişafak PHP (`phpTheme` + `frontend: "php"`).

Repo kataloğu: `goalgo/artifacts/api-server/src/lib/hm-sosyalhizmetler-site.ts`

## Neon seed

```bash
cd goalgo && pnpm --filter @workspace/api-server run ensure:sosyalhizmetler
# önizleme (DB yok):
DRY_RUN=1 pnpm --filter @workspace/api-server run ensure:sosyalhizmetler
```

Panel: `https://sosyalhizmetler.tr/editor` — `bilgi@sosyalhizmetler.tr` / şifre = e-posta (seed hash).

GitHub Actions: **Ensure Sosyal Hizmetler Neon seed** (`workflow_dispatch` veya `repository_dispatch` → `ensure-sosyalhizmetler`). Secret: `DATABASE_URL`.

Seed, `sosyalhizmetler.tr` alan adını Marmara Gündemi `domain2` dahil tüm HM satırlarından alır ve bu siteye `domain` olarak yazar.

## Kenar (Cloudflare Worker)

| Route | Amaç |
|-------|------|
| `sosyalhizmetler.tr/assets/*` | `theme.css` → turkata PHP pack proxy (`gundemi-origin-bridge.js`) |
| `sosyalhizmetler.tr/sh/*` | Logo/favicon (Worker ASSETS) |
| panel/API/`/tr`/`/hm` | Worker SPA/API |

**Yok:** `sosyalhizmetler.tr/*` catch-all — kamu HTML doğrudan VPS PHP.

## DNS

```bash
CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-sosyalhizmetler-dns.mjs
```

GitHub Actions: **Ensure sosyalhizmetler.tr PHP DNS** (`cf-ensure-sosyalhizmetler-dns`).

## VPS Traefik

Şablon: [`../gundemi-bolge/traefik-sosyalhizmetler.yml`](../gundemi-bolge/traefik-sosyalhizmetler.yml) → `/docker/traefik/dynamic/sosyalhizmetler.yml` (upstream `:8095`).

## Canlı doğrulama (deploy sonrası)

1. `curl -sI https://sosyalhizmetler.tr/assets/theme.css` → **200**, `x-yekpare-frontend: gundemi-php-theme-asset` (Worker deploy sonrası)
2. `curl -s https://sosyalhizmetler.tr/ | grep -E '<title>|theme.css|/sh/'` → **Sosyal Hizmetler Haber**, styled CSS, `/sh/sosyal-hizmetler-logo.png`
3. `curl -s 'https://ahenk.net.tr/api/hm/meta/by-domain?domain=sosyalhizmetler.tr' | jq .slug` → `sosyalhizmetler` (seed sonrası)

Sıra: merge → Cloudflare Worker deploy → **Ensure Sosyal Hizmetler Neon seed** → cache purge (gerekirse).
