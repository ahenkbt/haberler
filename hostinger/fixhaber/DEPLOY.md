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

## DNS (Dashboard — A kaydı henüz yok)

Public DNS’te (2026-10-07): NS Cloudflare’de; **A kaydı yok** → Dashboard’dan ekle:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `187.77.84.201` | Proxied (turuncu) |
| A | `www` | `187.77.84.201` | Proxied (turuncu) |

Doğrulama: `dig @1.1.1.1 +short fix.tc A` → CF anycast.

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

Logo sağlanmadı → metin marka (displayName **Fix Haber**); `hmYsSlogan`: **Fix Haber**. Yenişafak varsayılanları.

## Ops checklist

- [ ] CF Dashboard: Proxied A `@` + `www` → `187.77.84.201` (zone NS hazır; A yok)
- [x] VPS: `/docker/traefik/dynamic/fixhaber.yml` (2026-10-07)
- [ ] Merge sonrası: `ensure:fixhaber` (Neon — site satırı + editör + kategoriler + örnek haber + RSS)
- [ ] Worker deploy: `wrangler.toml` panel/API routes
- [ ] `https://fix.tc/` PHP 200 + Fix Haber markası; `https://fix.tc/editor` Worker panel
- [ ] Root SSH parolasını rotate et (sohbette paylaşıldı; repoya yazılmaz)
