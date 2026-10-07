# gundemi.org bölgesel siteler — Cloudflare DNS + Hostinger/VPS

Zone `gundemi.org` Cloudflare’de. Ön yüz **Yenişafak PHP** (VPS `187.77.84.201`); Worker yalnızca panel/API.

Repo kataloğu: `goalgo/artifacts/api-server/src/lib/hm-gundemi-regional-sites.ts`  
Logolar: `assets/logos/` (ve SPA `goalgo/artifacts/ahenkpress/public/gundemi/logos/`)  
Neon seed: `pnpm --filter @workspace/api-server run ensure:gundemi-bolge`  
DNS otomasyon: `scripts/cf-ensure-gundemi-php-dns.mjs` (manuel Actions: **workflow_dispatch**)

## Apex = TürkAta (turkatahaber) alias (#391)

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

## DNS kayıtları (hedef)

Her satır **Proxied (turuncu bulut)** → Hostinger VPS.  
`cf-fix-originless-dns.mjs` bu zone’a **dokunmaz** (`PHP_THEME_APEX` / zone listesinde yok) — kayıtlar elle veya aşağıdaki script ile açılır.

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

**Yapmayın:** `*.gundemi.org/*` / `gundemi.org/*` catch-all Worker route (ön yüzü SPA’ya çeker).  
`wrangler.toml` yalnızca `*.gundemi.org/editor*`, `/api/*`, `/admin*`, `/tr/*`, `/hm/*`, yazar paneli vb. + apex panel yolları ekler.

Deploy sonrası: Cloudflare → Workers → `haberler` → Routes’ta `*.gundemi.org/editor*` vb. göründüğünü kontrol edin (`main` merge → `cloudflare-production` workflow).

### Belirti: `DNS_PROBE_FINISHED_NXDOMAIN`

Tarayıcıda `ege.gundemi.org` (veya diğer alt alan) açılmıyorsa zone’da A kaydı yoktur. Zone NS’leri Cloudflare’de olsa bile kayıt eklenmeden çözülmez.

## One-shot API (önerilen)

Token gereksinimleri (yoksa API `10000 Authentication error` — zone okunur, A yazılamaz):

| | |
|--|--|
| Permissions | **Zone → DNS → Edit**, **Zone → Workers Routes → Edit**, Zone → Zone → Read |
| Zone Resources | **Include → Specific zone → `gundemi.org`** (veya All zones) |
| Account | `16f5b996194174624e7969a3658bd2bb` (Ahenk) |

Deploy token’ı yalnızca Workers Edit ise DNS oluşturamaz; token’a `gundemi.org` DNS Edit ekleyin **veya** Dashboard adımlarını kullanın.

```bash
# Yerel — DNS Edit yetkili token
export CLOUDFLARE_API_TOKEN=...   # veya CF_API_TOKEN
# isteğe bağlı: export CLOUDFLARE_ACCOUNT_ID=16f5b996194174624e7969a3658bd2bb
node scripts/cf-ensure-gundemi-php-dns.mjs

# Önizleme (yazmaz)
DRY_RUN=1 node scripts/cf-ensure-gundemi-php-dns.mjs
```

GitHub Actions: **Actions → “Ensure gundemi.org PHP DNS” → Run workflow**  
(`.github/workflows/cf-ensure-gundemi-dns.yml` — yalnızca `workflow_dispatch`; push/PR’da çalışmaz, token yetkisi yokken check’i kırmızıya çekmez). Secret aynı yetkilere sahip olmalı.

Script:

1. `@`, `www`, 8 bölgesel isim için Proxied A → `187.77.84.201` oluşturur / düzeltir  
2. Catch-all Worker route varsa siler  
3. Panel/API route’larını `haberler` Worker’a bağlar (catch-all eklemez)  
4. DoH ile kısa probe yazar  

## Cloudflare Dashboard (token yoksa / NXDOMAIN acil)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → hesap **Ahenk** → zone **`gundemi.org`**
2. Sol menü **DNS** → **Records** → **Add record**
3. Her satır için:
   - **Type:** `A`
   - **Name:** `@` / `www` / `ege` / `marmara` / `karadeniz` / `icanadolu` / `doguanadolu` / `guneydogu` / `akdeniz` / `kibris`
   - **IPv4 address:** `187.77.84.201`
   - **Proxy status:** **Proxied** (turuncu bulut) — DNS only değil
   - **TTL:** Auto → **Save**
4. Doğrulama: `dig +short ege.gundemi.org A` → CF anycast (`104.x` / `172.x`); boş / NXDOMAIN olmamalı. Ham `187.77.84.201` proxied iken görünmez.
5. **Workers & Pages** → `haberler` → **Triggers / Routes**: `*.gundemi.org/editor*` vb. var mı (`main` → `cloudflare-production`). Catch-all `*.gundemi.org/*` **olmamalı**.

## Hostinger / VPS (187.77.84.201)

1. **Apex:** `gundemi.org` / `www.gundemi.org` → turkatahaber Yenişafak document root (ServerAlias) veya Neon `domain2`.
2. **Bölgesel:** her alt alan için vhost (`ege.gundemi.org` … `kibris.gundemi.org`), aynı Yenişafak paket; `config/sites.php` veya `meta/by-domain`.
3. Logo: `hostinger/gundemi-bolge/assets/logos/*-gundemi.png` → layout `logoUrl` `/gundemi/logos/…`.
4. SSL: Cloudflare Full (strict); turuncu bulut açıkken CF kenar sertifikası yeter.

## Neon / seed

Container boot’ta `GUNDEMI_BOLGE_SEED` (varsayılan açık):

1. `turkatahaber.domain2 = gundemi.org` (apex alias — #391)
2. 8 bölgesel site + kategoriler + örnek haber + RSS kampanyası

Manuel:

```bash
cd goalgo
pnpm --filter @workspace/api-server run ensure:gundemi-bolge
DRY_RUN=1 pnpm --filter @workspace/api-server run ensure:gundemi-bolge
```

Editör: `https://{alt-alan}/editor` — örnek `https://ege.gundemi.org/editor`

## Logo üretimi

```bash
python3 scripts/gen-gundemi-regional-logos.py \
  --source path/to/gundemi-org.png \
  --out goalgo/artifacts/ahenkpress/public/gundemi/logos
cp goalgo/artifacts/ahenkpress/public/gundemi/logos/*-gundemi.png hostinger/gundemi-bolge/assets/logos/
```

## Kontrol listesi

- [ ] DNS A Proxied (`@`/`www` + 8 alt alan) — Dashboard veya script (token’a Zone DNS Edit gerekir)
- [ ] `dig` / tarayıcı: NXDOMAIN yok
- [ ] Catch-all Worker route yok; panel routes var
- [ ] VPS vhost + Yenişafak PHP
- [ ] `ensure:gundemi-bolge` veya container seed
- [ ] `https://ege.gundemi.org/` PHP home; `/editor` Worker SPA
- [ ] `https://gundemi.org/` turkatahaber içeriği (#391)
