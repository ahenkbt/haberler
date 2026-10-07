# gundemi.org bölgesel siteler — Cloudflare DNS + Hostinger/VPS

Zone `gundemi.org` Cloudflare’de (**NS: `kiki.ns.cloudflare.com` / `paul.ns.cloudflare.com`**).  
DNS A kayıtları Proxied → `187.77.84.201`. Neon seed (#390/#391) hazır.

## Canlı durum (2026-10-07)

| Katman | Durum |
|--------|--------|
| Registrar NS | Cloudflare (`kiki` / `paul`) — NS değiştirmeye gerek yok |
| Public DNS (`1.1.1.1` / `8.8.8.8`) | `@`, `www`, `ege`…`kibris` → CF anycast (`104.21…` / `172.67…`) |
| Kullanıcı `DNS_PROBE_FINISHED_NXDOMAIN` | Genelde **yerel/ISP önbellek** veya eski negatif TTL — kayıtlar zone’da var |
| Apex / bölgesel `/` 404 `page not found` | **Çözüldü (2026-10-07):** `/docker/traefik/dynamic/gundemi.yml` → `127.0.0.1:8095` (php-theme-yenisafak). |
| Kenar | Apex: Worker bridge veya Traefik Host. Bölgesel: **SPA yok** (#395) — orange → origin PHP |

**Kullanıcı (NXDOMAIN görüyorsa):** Windows `ipconfig /flushdns`, tarayıcı önbelleği temizle, mümkünse DNS’i `1.1.1.1` yap, gizli pencere dene. `nslookup ege.gundemi.org 1.1.1.1` CF IP dönmeli.

Repo kataloğu: `goalgo/artifacts/api-server/src/lib/hm-gundemi-regional-sites.ts`  
Logolar: `assets/logos/` (ve SPA `goalgo/artifacts/ahenkpress/public/gundemi/logos/`)  
Neon seed: `pnpm --filter @workspace/api-server run ensure:gundemi-bolge`  
DNS otomasyon: `scripts/cf-ensure-gundemi-php-dns.mjs` (manuel Actions: **workflow_dispatch**)  
Traefik şablon: [`traefik-gundemi.yml`](./traefik-gundemi.yml)

## Apex = TürkAta (turkatahaber) alias (#391)

| Host | İçerik | HM |
|------|--------|-----|
| `gundemi.org` / `www.gundemi.org` | **turkatahaber.com** ile aynı site | slug `turkatahaber`, `domain2=gundemi.org` |
| `ege` … `kibris`.gundemi.org | 8 bölgesel Yenişafak sitesi | ayrı slug’lar (`ege-gundemi` …) |

Apex için **9. boş gundemi sitesi yok**. Worker: `turkata-haber.js` → `TURKATA_ALIAS_APEX_HOSTS` / `isTurkataHaberHost`.  
`www.gundemi.org` → `https://gundemi.org/…` (turkatahaber.com’a zorla yönlendirmez).

Kalıcı VPS hedefi: `gundemi.org` + `www.gundemi.org` Traefik `Host()` → turkatahaber Yenişafak upstream; Neon `domain2` zaten `gundemi.org`.

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
`cf-fix-originless-dns.mjs` bu zone’a **dokunmaz**.

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

Doğrulama: `dig @1.1.1.1 +short ege.gundemi.org A` → CF anycast; boş / NXDOMAIN olmamalı.

## Traefik (VPS — uygulandı 2026-10-07)

| Öğe | Değer |
|-----|--------|
| Host | `187.77.84.201` (`turkatav`) |
| Container | `traefik-traefik-1` (`traefik:latest` v3.7) |
| Compose | `/docker/traefik/docker-compose.yml` |
| Dynamic dir | **`/docker/traefik/dynamic/`** → container `/dynamic` (watch=true) |
| Live file | `/docker/traefik/dynamic/gundemi.yml` |
| Docker service (labels) | `php-tema` on container `php-theme-yenisafak` |
| File-provider upstream | **`http://127.0.0.1:8095`** (same as `origin-tth.yml`) |
| File service name | `gundemi-php-theme` |

Doğrulama (VPS’ten, 2026-10-07):

| Host | HTTP | `X-Powered-By` | `<title>` |
|------|------|----------------|-----------|
| `ege.gundemi.org` | 200 | PHP/8.3.35 | Ege Gündemi |
| `gundemi.org` | 200 | PHP/8.3.35 | TÜRKATA HABER AJANSI |
| `marmara.gundemi.org` | 200 | PHP/8.3.35 | Marmara Gündemi |
| `akdeniz.gundemi.org` | 200 | PHP/8.3.35 | Akdeniz Gündemi |

Neon / by-domain zaten doğru (PHP tarafı ek patch gerekmedi).  
Worker bölgesel SPA catch-all kaldırıldı (#395 merged). Apex `gundemi.org/*` bridge isteğe bağlı kalabilir.

### VPS’te yeniden uygula / güncelle (root)

```bash
install -m 644 hostinger/gundemi-bolge/traefik-gundemi.yml /docker/traefik/dynamic/gundemi.yml
# file.watch=true → HUP gerekmez; gerekirse: docker kill -s HUP traefik-traefik-1
curl -sk --resolve ege.gundemi.org:443:127.0.0.1 -D- https://ege.gundemi.org/ | head -40
# Beklenen: HTTP/2 200 + X-Powered-By: PHP/… + <title>Ege Gündemi
```

## Worker kenar (PHP only — SPA yok)

`cloudflare/gundemi-origin-bridge.js` + wrangler:

- `gundemi.org` / `www` → turkatahaber.com PHP bridge (geçici)
- **`*.gundemi.org` kamu `/` → SPA ASSETS yok** — Cloudflare orange cloud → origin Yenişafak PHP  
  (Traefik HostRegexp şart; yoksa origin `404 page not found`)
- Panel/API: `/editor*`, `/api/*`, … Worker’da kalır (ankarasehirgazetesi.com modeli)
- **`*.gundemi.org/assets/*`**: **silme** — `/editor` `index-*` / `vendor-*` / lazy chunk’lar için şart.  
  Aynı pattern altına düşen `/assets/theme.css` + `theme.js` → bridge PHP  
  (`x-yekpare-frontend: gundemi-php-theme-asset`, upstream turkatahaber = `:8095` pack;  
  **asla** `gundemi-php-traefik-gap` 503 HTML).  
  Deploy sonrası: `node scripts/smoke-gundemi-assets.mjs` (Cloudflare Production Deploy adımı).
- **`*.gundemi.org/gundemi/logos/*`**: Worker ASSETS (`goalgo/artifacts/ahenkpress/public/gundemi/logos/`).  
  Origin’de de olmalı (`:8095` backup). ASSETS route şart.
  Ops (kalıcı image yoksa, container recreate sonrası tekrar):

```bash
# from repo hostinger/gundemi-bolge/assets/logos
docker exec php-theme-yenisafak mkdir -p /app/public/gundemi/logos
docker cp akdeniz-gundemi.png php-theme-yenisafak:/app/public/gundemi/logos/
# … diğer bölgeler + gundemi-org.png
```

## Admin panel — yeni `*.gundemi.org` site (otomatik)

Haber Siteleri panelinde domain `yeni.gundemi.org` gibi `*.gundemi.org` yazıldığında kayıt sonrası:

1. `layout_json.phpTheme` + `frontend: "php"` (opt-out yoksa)
2. Cloudflare Proxied **A** → `187.77.84.201` (idempotent)
3. Traefik HostRegexp yeni alt alanı otomatik karşılar (Worker SPA catch-all yok)

API: `POST /api/hm/sites` / `PATCH` otomatik; yeniden deneme `POST /api/hm/sites/:id/ensure-gundemi`.

**Secret adı:** `CLOUDFLARE_API_TOKEN` (Worker secret veya API Container env; `CF_API_TOKEN` de okunur).

**Gerekli CF token yetkileri (zone `gundemi.org`):**

| Permission | Neden |
|------------|--------|
| Zone → DNS → **Edit** | Alt alan A kaydı oluşturma |
| Zone → Workers Routes → **Edit** | Apex bridge + SPA catch-all silme |
| Zone → Zone → **Read** | Zone id çözümü |

Token yoksa soft-fail (site kaydı yine başarılı; NXDOMAIN kalır). Bölgesel PHP için VPS Traefik HostRegexp **zorunlu**.

## One-shot API (katalog / manuel)

Token: **Zone → DNS → Edit**, **Zone → Workers Routes → Edit**, Zone → Zone → Read; zone `gundemi.org`.  
GitHub secret’taki token çoğu zaman Workers Edit-only → API `10000` (DNS yazamaz); Dashboard veya DNS Edit’li token gerekir.

```bash
export CLOUDFLARE_API_TOKEN=...
node scripts/cf-ensure-gundemi-php-dns.mjs
DRY_RUN=1 node scripts/cf-ensure-gundemi-php-dns.mjs
```

Actions: **Ensure gundemi.org PHP DNS** → Run workflow (`workflow_dispatch` only).

## Cloudflare Dashboard (DNS eksikse)

1. Zone **`gundemi.org`** → **DNS** → **Records**  
2. Yukarıdaki 10 A kaydı Proxied → `187.77.84.201`  
3. Workers → `haberler` → Routes: panel + apex bridge; **`*.gundemi.org/*` olmamalı**

## Neon / seed

1. `turkatahaber.domain2 = gundemi.org` (#391) — canlıda doğrulandı  
2. 8 bölgesel site (ör. `ege-gundemi`) — canlıda doğrulandı  

```bash
cd goalgo
pnpm --filter @workspace/api-server run ensure:gundemi-bolge
```

Editör: `https://ege.gundemi.org/editor`

## Kontrol listesi

- [x] DNS A Proxied (public resolvers)
- [x] NS = Cloudflare
- [ ] Kullanıcı DNS flush (NXDOMAIN önbelleği)
- [x] Worker: bölgesel SPA catch-all kaldırıldı (#395); apex PHP bridge
- [x] VPS Traefik `/docker/traefik/dynamic/gundemi.yml` → `127.0.0.1:8095`
- [x] Origin `ege` / `gundemi` / `marmara` / `akdeniz` → PHP 200 + doğru `<title>`
- [ ] Public CF path smoke (tarayıcı); kullanıcı DNS flush (NXDOMAIN önbelleği)
