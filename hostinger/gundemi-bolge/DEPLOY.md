# gundemi.org bölgesel siteler — Cloudflare DNS + Hostinger/VPS

Zone `gundemi.org` Cloudflare’de (**NS: `kiki.ns.cloudflare.com` / `paul.ns.cloudflare.com`**).  
DNS A kayıtları Proxied → `187.77.84.201`. Neon seed (#390/#391) hazır.

## Canlı durum (2026-10-07)

| Katman | Durum |
|--------|--------|
| Registrar NS | Cloudflare (`kiki` / `paul`) — NS değiştirmeye gerek yok |
| Public DNS (`1.1.1.1` / `8.8.8.8`) | `@`, `www`, `ege`…`kibris` → CF anycast (`104.21…` / `172.67…`) |
| Kullanıcı `DNS_PROBE_FINISHED_NXDOMAIN` | Genelde **yerel/ISP önbellek** veya eski negatif TTL — kayıtlar zone’da var |
| Apex / bölgesel `/` 404 `page not found` | **VPS Traefik**’te `Host()` router yok (DEFAULT CERT + Go 404). DNS değil. |
| Geçici kenar köprüsü | Worker catch-all + `gundemi-origin-bridge.js`: apex → turkatahaber PHP; bölgesel → SPA ta ki Traefik hazır |

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

## Traefik gap (asıl 404 kök nedeni)

Origin `187.77.84.201` TLS: **TRAEFIK DEFAULT CERT**.  
`Host: turkatahaber.com` → PHP 200; `Host: gundemi.org` / `ege.gundemi.org` → `404 page not found`.

1. VPS’te [`traefik-gundemi.yml`](./traefik-gundemi.yml) Host() router’larını turkatahaber ile **aynı Yenişafak PHP service**’e bağla.  
2. `config/sites.php` / Neon `meta/by-domain` host eşlemesi (apex = turkatahaber).  
3. Traefik canlı olduktan sonra `wrangler.toml` içindeki geçici  
   `gundemi.org/*`, `www.gundemi.org/*`, `*.gundemi.org/*` route’larını **sil** ve Worker’ı redeploy et.

## Geçici Worker köprüsü (bu PR)

`cloudflare/gundemi-origin-bridge.js` + catch-all routes:

- `gundemi.org` / `www` → turkatahaber.com PHP (URL’ler `gundemi.org` olarak yeniden yazılır)
- **Herhangi bir** `*.gundemi.org` alt alan (seed 8 bölge + panelden yeni açılanlar) → SPA ASSETS  
  (Neon `meta/by-domain` eşleşmesi; PHP Traefik sonrası origin’e geçer)
- wrangler.toml’da site başına route gerekmez — `*.gundemi.org/*` yeterli

Panel/API route’ları (`/editor*`, `/api/*`, …) daha spesifik kalır.

## Admin panel — yeni `*.gundemi.org` site (otomatik)

Haber Siteleri panelinde domain `yeni.gundemi.org` gibi `*.gundemi.org` yazıldığında kayıt sonrası:

1. `layout_json.phpTheme` + `frontend: "php"` (opt-out yoksa)
2. Cloudflare Proxied **A** → `187.77.84.201` (idempotent)
3. Worker catch-all `*.gundemi.org/*` (Traefik Host() olmadan SPA/bridge ile açılır)

API: `POST /api/hm/sites` / `PATCH` otomatik; yeniden deneme `POST /api/hm/sites/:id/ensure-gundemi`.

**Secret adı:** `CLOUDFLARE_API_TOKEN` (Worker secret veya API Container env; `CF_API_TOKEN` de okunur).

**Gerekli CF token yetkileri (zone `gundemi.org`):**

| Permission | Neden |
|------------|--------|
| Zone → DNS → **Edit** | Alt alan A kaydı oluşturma |
| Zone → Workers Routes → **Edit** | `*.gundemi.org/*` catch-all |
| Zone → Zone → **Read** | Zone id çözümü |

Token yoksa soft-fail (site kaydı yine başarılı; NXDOMAIN kalır). Pure origin PHP için VPS Traefik `Host()` hâlâ opsiyonel — Worker yolu yeni siteleri Traefik olmadan açar.

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
3. Workers → `haberler` → Routes: panel + (geçici) catch-all bridge

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
- [x] Geçici Worker bridge (apex PHP / bölgesel SPA)
- [ ] VPS Traefik Host() + Yenişafak PHP (`traefik-gundemi.yml`)
- [ ] Traefik sonrası catch-all Worker route’larını kaldır
- [ ] `https://ege.gundemi.org/` PHP home; `/editor` Worker SPA
- [ ] `https://gundemi.org/` turkatahaber içeriği (bridge veya Traefik)
