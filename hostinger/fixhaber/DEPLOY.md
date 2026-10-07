# Fix Haber (fix.tc) — Cloudflare DNS + Hostinger/VPS

HM slug: **`fixhaber`** · displayName: **Fix Haber** · tema: Yenişafak PHP (`phpTheme` + `frontend: "php"`).

Repo kataloğu: `goalgo/artifacts/api-server/src/lib/hm-fixhaber-site.ts`  
Neon seed (merge sonrası):

```bash
cd goalgo && pnpm --filter @workspace/api-server run ensure:fixhaber
# katalog kontrolü (DB yok):
DRY_RUN=1 pnpm --filter @workspace/api-server run ensure:fixhaber
```

Panel giriş: `https://fix.tc/editor` — `bilgi@fix.tc` / şifre = e-posta (seed hash).

## Model

Ankara Şehir Gazetesi modeli: kamu sayfaları **origin PHP** (VPS `187.77.84.201`), Worker yalnızca panel/API + legacy `/tr`|/`hm` 301. **SPA catch-all `fix.tc/*` yok.**

| Katman | Değer |
|--------|--------|
| Zone | `fix.tc` (NS: `kiki.ns.cloudflare.com` / `paul.ns.cloudflare.com` — zone CF’de mevcut) |
| Apex / www | Proxied A → `187.77.84.201` |
| PHP upstream | `http://127.0.0.1:8095` (`php-theme-yenisafak` / `php-tema`) |
| Worker routes | `wrangler.toml` — `editor*`, `api/*`, `admin*`, `panel*`, `haber-merkezi*`, `assets/*`, `sw.js`, `llms.txt`, `ai.txt`, `manifest.json`, yazar paneli, `/tr/*`, `/hm/*` |

## DNS (Proxied A — kök neden: zone CF NS’te ama A yok)

Public DNS’te: `kiki.ns.cloudflare.com` / `paul.ns.cloudflare.com` — zone Cloudflare’de; **apex/www A kaydı yok** → tarayıcı `DNS_PROBE_FINISHED_NXDOMAIN` (veya boş A).

### Otomasyon (tercih)

```bash
CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-fixhaber-dns.mjs
DRY_RUN=1 CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-fixhaber-dns.mjs
```

GitHub Actions: **Ensure fix.tc PHP DNS** (`workflow_dispatch`) — repo secret `CLOUDFLARE_API_TOKEN` or `CLOUDFLAREDNS_API_TOKEN` (Zone → DNS → Edit, zone `fix.tc`).

Cloud Agent environment secret `CLOUDFLAREDNS_API_TOKEN` is injected only on **new agent runs** after saving the secret (not mid-conversation).

Token yoksa veya zone bu Cloudflare hesabında değilse → Dashboard’dan elle:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `187.77.84.201` | Proxied (turuncu) |
| A | `www` | `187.77.84.201` | Proxied (turuncu) |

Doğrulama: `dig @1.1.1.1 +short fix.tc A` → CF anycast (ör. `104.21.x.x` / `172.67.x.x`).

`cf-fix-originless-dns.mjs` bu zone’a **dokunmaz** (`PHP_THEME_APEX` / `PHP_THEME_ZONES`). Apex catch-all Worker route ekleme.

## Traefik (VPS — uygulandı 2026-10-07)

Aynı Yenişafak PHP servisi (`127.0.0.1:8095`). Şablon: [`traefik-fixhaber.yml`](./traefik-fixhaber.yml).

| Öğe | Değer |
|-----|--------|
| Live file | `/docker/traefik/dynamic/fixhaber.yml` |
| File service | `fixhaber-php-theme` → `http://127.0.0.1:8095` |
| Host rules | `Host(\`fix.tc\`)` + `Host(\`www.fix.tc\`)` |
| Doğrulama (VPS `--resolve`) | HTTP/2 **200**, `X-Powered-By: PHP/8.3.35` |

```bash
# Yeniden uygula:
install -m 644 hostinger/fixhaber/traefik-fixhaber.yml /docker/traefik/dynamic/fixhaber.yml
curl -sk --resolve fix.tc:443:127.0.0.1 -D- https://fix.tc/ | head -40
```

Public DNS A kaydı eklenene kadar dışarıdan erişim CF anycast’e düşmez; VPS içinden `--resolve` ile doğrulanır.

## Logo / slogan

| Öğe | Yol |
|-----|-----|
| Banner logo | `goalgo/artifacts/ahenkpress/public/fix/fix-haber-logo.png` → `/fix/fix-haber-logo.png` |
| Favicon (küre) | `goalgo/artifacts/ahenkpress/public/fix/fix-haber-favicon.png` → `/fix/fix-haber-favicon.png` |
| Hostinger pack | `hostinger/fixhaber/assets/logos/` (aynı dosyalar) |

`layout_json`: `logoUrl` + `faviconUrl`; renkler `hmPrimaryColor` **#002B5C** (navy), `hmSecondaryColor` **#D20000** (kırmızı). `hmYsSlogan`: **Fix Haber**.

## Ops checklist

- [ ] CF: Proxied A `@` + `www` → `187.77.84.201` (`cf-ensure-fixhaber-dns.mjs` veya Dashboard)
- [x] VPS: `/docker/traefik/dynamic/fixhaber.yml` (2026-10-07)
- [ ] Merge sonrası: `ensure:fixhaber` (Neon — site satırı + editör + kategoriler + örnek haber + RSS)
- [ ] Worker deploy: `wrangler.toml` panel/API routes
- [ ] `https://fix.tc/` PHP 200 + Fix Haber markası; `https://fix.tc/editor` Worker panel
- [ ] Root SSH parolasını rotate et (sohbette paylaşıldı; repoya yazılmaz)
