# HM kurumsal PHP — Hostinger deploy (VKD + TGD)

Bu paket `vatankahramanlari.org` (VKD) ve `trafikdernegi.com` / `tgd.tc` (TGD) ön yüzünü **Cold Cloudflare Container SPA yerine** Hostinger PHP/HTML ile sunar. Haber twin’leriyle aynı DNS modeli: apex **A → `187.77.84.201` (proxied)**; Worker yalnızca `/editor*`, `/api/*`, `/admin*`, `/tr/*`, `/hm/*` vb.

## 1) Hostinger (her domain / addon domain)

1. `hostinger/php-kurumsal/` içeriğinin tamamını ilgili sitenin `public_html` köküne yükleyin (`index.php`, `.htaccess`, `lib/`, `templates/`, `assets/`, `config/`).
2. PHP 8.1+ (tercihen 8.3), `mod_rewrite` açık, `allow_url_fopen` veya `curl` açık.
3. İsteğe bağlı: `HK_API_BASE=https://ahenk.net.tr` — aynı origin `/api` henüz Worker’a gitmiyorsa meta için portal API.
4. Smoke: `https://DOMAIN/` → `X-HM-Frontend: php-kurumsal` ve `X-Powered-By: PHP/…`.
5. **Bekçi notu:** Dosyalar yüklenmeden apex `/` Cloudflare üzerinden 9s timeout / origin 404 verir. Panel «Haber AI Bekçi» bunu soft uyarı sayar (haber twin’lerini kırmaz). PHP Neon eşitleme bu paketi deploy etmez — ayrı adım.

## 2) Cloudflare DNS

Her zone için (apex + www):

| Tip | Ad | İçerik | Proxy |
|-----|-----|--------|-------|
| A | `@` | `187.77.84.201` | Proxied (turuncu) |
| CNAME veya A | `www` | apex / aynı IP | Proxied |

**Uyarı:** Worker catch-all (`DOMAIN/*`) kaldırılmadan önce PHP dosyaları Hostinger’da olmalı; aksi halde ana sayfa boş/origin 404 olur.

## 3) Worker deploy (bu PR)

`wrangler.toml` VKD/TGD catch-all’ları kaldırır; panel/API + legacy `/tr|/*` `/hm/*` route’ları bırakır. `php-theme-legacy-redirect.js` kurumsal host’ları listeler.

Sıra:

1. Hostinger upload (adım 1)
2. DNS A kaydı Hostinger’a (adım 2) — zaten haber siteleriyle aynı VPS ise doğrulayın
3. Bu PR merge → Cloudflare deploy
4. Kontrol: ana sayfa PHP; `/editor` SPA; `/tr/vkd/...` → 301 apex PHP yolu

## 4) Editör / veri

İçerik hâlâ Neon `layout_json` (`hmExtraPages`, menü, Vatan kopyası). PHP, Worker `/api/hm/meta/by-domain?includePageContent=1` ile okur. Haber dual-write / Neon sync kurumsal sayfalar için değişmez.

## 5) Geri alma

Catch-all route’ları `wrangler.toml`’a geri ekleyip deploy edin; DNS’i eski modele döndürmeniz gerekmez (Worker yine catch-all alır).
