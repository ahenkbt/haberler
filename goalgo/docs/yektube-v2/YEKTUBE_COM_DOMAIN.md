# yektube.com — kanonik Yektube alanı (turk.eco/yp)

## Beklenen davranış

| URL | Sonuç |
|-----|--------|
| `https://yektube.com/` | `/yp/` ana akışa yönlendirilir (301) |
| `https://yektube.com/yp` | Ana akış (turk.eco/yp içeriği) |
| `https://yektube.com/muzik` | Müzik |
| `https://www.yektube.com/*` | `https://yektube.com/*` (301) |
| `https://turk.eco/yp` | `https://yektube.com/yp` (308) |
| `https://turk.eco/yp/*` | `https://yektube.com/yp/*` (308) |
| `https://turk.eco/yektube` / `/yektube-v2` | `https://yektube.com/yp` (308) |

HM iframe (`?embed=1` veya `?hm=`) aynı origin’de kalır; kanonik yönlendirme uygulanmaz.

## Cloudflare (üretim)

1. Zone: `yektube.com` (NS Cloudflare’de olmalı).
2. `wrangler.toml`: `yektube.com` / `www.yektube.com` Worker routes + `custom_domain`.
3. DNS: `scripts/cf-fix-originless-dns.mjs` zone listesinde `yektube.com` var — originless AAAA/`custom_domain` Worker DNS.
4. Worker: `cloudflare/worker.js` portal `/yp` → `yektube.com` ve dedicated host kök yönlendirmesi.

## Build env

- `VITE_YEKTUBE_V2_ENABLED=true`
- `VITE_YEKTUBE_DEDICATED_HOSTS=yektube.com`
- `VITE_YEKTUBE_DEDICATED_PATH=/yp`
- `VITE_YEKTUBE_REDIRECT_TO_CANONICAL=1` (cloudflare/vercel/netlify build scriptleri)

## Hızlı test

```bash
curl -sI https://turk.eco/yp | head -20
# Beklenen: 308 Location: https://yektube.com/yp/

curl -sI https://yektube.com/ | head -20
# Beklenen: 301 Location: https://yektube.com/yp/  (veya 200 /yp SPA)
```
