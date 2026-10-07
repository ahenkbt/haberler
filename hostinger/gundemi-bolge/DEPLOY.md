# gundemi.org bölgesel siteler — Cloudflare DNS + Hostinger/VPS

Zone `gundemi.org` Cloudflare’de. Ön yüz **Yenişafak PHP** (VPS `187.77.84.201`); Worker yalnızca panel/API.

Repo kataloğu: `goalgo/artifacts/api-server/src/lib/hm-gundemi-regional-sites.ts`  
Logolar: `assets/logos/` (ve SPA `goalgo/artifacts/ahenkpress/public/gundemi/logos/`)  
Neon seed: `pnpm --filter @workspace/api-server run ensure:gundemi-bolge`

## Siteler

| Alt alan | Slug | Tema (manset) | Primary |
|----------|------|---------------|---------|
| ege.gundemi.org | ege-gundemi | odatv | `#0a6b7a` |
| marmara.gundemi.org | marmara-gundemi | sabah | `#0b2d5c` |
| karadeniz.gundemi.org | karadeniz-gundemi | takvim | `#0d4f3c` |
| icanadolu.gundemi.org | icanadolu-gundemi | mynet | `#8b5a2b` |
| doguanadolu.gundemi.org | doguanadolu-gundemi | nefes | `#1a3a5c` |
| guneydogu.gundemi.org | guneydogu-gundemi | odatv | `#6b2d3c` |
| akdeniz.gundemi.org | akdeniz-gundemi | sabah | `#0c4a6e` |
| kibris.gundemi.org | kibris-gundemi | takvim | `#0b4f6c` |

## Cloudflare DNS (Dashboard — zone: gundemi.org)

Her satır **Proxied (turuncu bulut)**. Apex zaten eklendiyse sadece alt alanları ekleyin.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `187.77.84.201` | Proxied |
| A | `www` | `187.77.84.201` | Proxied |
| A | `ege` | `187.77.84.201` | Proxied |
| A | `marmara` | `187.77.84.201` | Proxied |
| A | `karadeniz` | `187.77.84.201` | Proxied |
| A | `icanadolu` | `187.77.84.201` | Proxied |
| A | `doguanadolu` | `187.77.84.201` | Proxied |
| A | `guneydogu` | `187.77.84.201` | Proxied |
| A | `akdeniz` | `187.77.84.201` | Proxied |
| A | `kibris` | `187.77.84.201` | Proxied |

**Yapmayın:** `*.gundemi.org/*` catch-all Worker route (ön yüzü SPA’ya çeker).  
`wrangler.toml` yalnızca `*.gundemi.org/editor*`, `/api/*`, `/admin*`, `/tr/*`, `/hm/*`, yazar paneli vb. ekler.

Deploy sonrası: Cloudflare → Workers → `haberler` → Routes’ta `*.gundemi.org/editor*` vb. göründüğünü kontrol edin (`main` merge → `cloudflare-production` workflow).

## Hostinger / VPS (187.77.84.201)

Diğer Yenişafak twin’ler (yesilvatan, sehitgazi, …) ile aynı model:

1. Her alt alan için vhost / ServerAlias ekleyin (`ege.gundemi.org` … `kibris.gundemi.org`).
2. Document root = mevcut Yenişafak PHP tema kökü (ASG/AHG ile aynı paket).
3. `config/sites.php` içeriğini PHP tema host haritasına ekleyin **veya** host’u Neon `hm_news_sites.domain` üzerinden `meta/by-domain` ile çözün.
4. Logo dosyalarını tema `assets` veya public logos klasörüne kopyalayın:
   - Kaynak: `hostinger/gundemi-bolge/assets/logos/*-gundemi.png`
   - SPA yolu (layout_json `logoUrl`): `/gundemi/logos/{region}-gundemi.png`
5. SSL: Cloudflare Full (strict) veya VPS Let’s Encrypt; turuncu bulut açıkken CF kenar sertifikası yeter.

## Neon / seed

Container boot’ta `GUNDEMI_BOLGE_SEED` (varsayılan açık) 8 site + kategoriler + örnek haber + RSS kampanyası yazar.

Manuel:

```bash
cd goalgo
pnpm --filter @workspace/api-server run ensure:gundemi-bolge
# katalog only:
DRY_RUN=1 pnpm --filter @workspace/api-server run ensure:gundemi-bolge
```

Editör: `https://{alt-alan}/editor` (Worker route) — örnek `https://ege.gundemi.org/editor`

## Logo üretimi

Kaynak PNG + bölge etiketi:

```bash
python3 scripts/gen-gundemi-regional-logos.py \
  --source path/to/gundemi-org.png \
  --out goalgo/artifacts/ahenkpress/public/gundemi/logos
# hostinger kopyası:
cp goalgo/artifacts/ahenkpress/public/gundemi/logos/*-gundemi.png hostinger/gundemi-bolge/assets/logos/
```

## Kontrol listesi

- [ ] DNS A kayıtları (8 alt alan + isteğe bağlı apex/www)
- [ ] `wrangler deploy` / production workflow yeşil
- [ ] VPS vhost + Yenişafak PHP
- [ ] `ensure:gundemi-bolge` veya container seed
- [ ] `https://ege.gundemi.org/` PHP home; `/editor` Worker SPA
