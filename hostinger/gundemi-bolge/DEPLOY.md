# gundemi.org bölgesel siteler — Cloudflare DNS + Hostinger/VPS

Zone `gundemi.org` Cloudflare’de. Ön yüz **Yenişafak PHP** (VPS `187.77.84.201`); Worker yalnızca panel/API.

Repo kataloğu: `goalgo/artifacts/api-server/src/lib/hm-gundemi-regional-sites.ts`  
Logolar: `assets/logos/` (ve SPA `goalgo/artifacts/ahenkpress/public/gundemi/logos/`)  
Neon seed: `pnpm --filter @workspace/api-server run ensure:gundemi-bolge`

## Apex = TürkAta (turkatahaber) alias

| Host | İçerik | HM |
|------|--------|-----|
| `gundemi.org` / `www.gundemi.org` | **turkatahaber.com** ile aynı site | slug `turkatahaber`, `domain2=gundemi.org` |
| `ege` … `kibris`.gundemi.org | 8 bölgesel Yenişafak sitesi | ayrı slug’lar (`ege-gundemi` …) |

Apex için **9. boş gundemi sitesi yok**. Worker: `turkata-haber.js` → `TURKATA_ALIAS_APEX_HOSTS` / `isTurkataHaberHost`.  
`www.gundemi.org` → `https://gundemi.org/…` (turkatahaber.com’a zorla yönlendirmez).

VPS: `gundemi.org` + `www.gundemi.org` ServerAlias → turkatahaber Yenişafak vhost **veya** Neon `meta/by-domain` (`domain2`).

## Bölgesel siteler

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

Her satır **Proxied (turuncu bulut)**.

| Type | Name | Content | Proxy | Serves |
|------|------|---------|-------|--------|
| A | `@` | `187.77.84.201` | Proxied | **turkatahaber** (apex alias) |
| A | `www` | `187.77.84.201` | Proxied | **turkatahaber** → apex |
| A | `ege` | `187.77.84.201` | Proxied | Ege Gündemi |
| A | `marmara` | `187.77.84.201` | Proxied | Marmara Gündemi |
| A | `karadeniz` | `187.77.84.201` | Proxied | Karadeniz Gündemi |
| A | `icanadolu` | `187.77.84.201` | Proxied | İç Anadolu Gündemi |
| A | `doguanadolu` | `187.77.84.201` | Proxied | Doğu Anadolu Gündemi |
| A | `guneydogu` | `187.77.84.201` | Proxied | Güneydoğu Gündemi |
| A | `akdeniz` | `187.77.84.201` | Proxied | Akdeniz Gündemi |
| A | `kibris` | `187.77.84.201` | Proxied | Kıbrıs Gündemi |

**Yapmayın:** `*.gundemi.org/*` catch-all Worker route (ön yüzü SPA’ya çeker).  
`wrangler.toml` yalnızca `*.gundemi.org/editor*`, `/api/*`, `/admin*`, `/tr/*`, `/hm/*`, yazar paneli vb. + apex panel yolları ekler.

Deploy sonrası: Cloudflare → Workers → `haberler` → Routes’ta `*.gundemi.org/editor*` vb. göründüğünü kontrol edin (`main` merge → `cloudflare-production` workflow).

## Hostinger / VPS (187.77.84.201)

1. **Apex:** `gundemi.org` / `www.gundemi.org` → turkatahaber Yenişafak document root (ServerAlias) veya Neon domain2 çözümlemesi.
2. **Bölgesel:** her alt alan için vhost (`ege.gundemi.org` … `kibris.gundemi.org`), aynı Yenişafak paket; `config/sites.php` veya `meta/by-domain`.
3. Logo dosyaları: `hostinger/gundemi-bolge/assets/logos/*-gundemi.png` → layout `logoUrl` `/gundemi/logos/…`.
4. SSL: Cloudflare Full (strict); turuncu bulut açıkken CF kenar sertifikası yeter.

## Neon / seed

Container boot’ta `GUNDEMI_BOLGE_SEED` (varsayılan açık):

1. `turkatahaber.domain2 = gundemi.org` (apex alias)
2. 8 bölgesel site + kategoriler + örnek haber + RSS kampanyası

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
