# HM news-site provisioning (2026-10-08)

New news site in `/admin/haber-siteleri` (slug `adana`) → serves at once on `adana.gundemi.org` and `adana.fix.tc` (PHP theme).

| Piece | Where | What |
|---|---|---|
| Wildcard DNS | Cloudflare zones gundemi.org, fix.tc | `*` A 187.77.84.201 proxied (SSL mode "full", Universal SSL covers `*.zone`) |
| Worker routes | wrangler.toml `*.gundemi.org/…`, `*.fix.tc/…` | panel/API paths only (editor, api, admin, assets…); no catch-all |
| Traefik | VPS `/docker/traefik/dynamic/gundemi.yml` (gundemi-wild), `fixtc-wild.yml` | HostRegexp → php-theme-yenisafak :8095 |
| Theme | `php-theme/src/App.php` (`$platformSub`) | host → hm_news_sites.domain/domain2/domain3; unknown `<x>.gundemi.org`/`<x>.fix.tc` → 404 (no SITE_SLUG fallback) |
| Canonical | theme | origin = `https://<domain>` (first domain). Panel orders: custom domain → `<slug>.gundemi.org` → `<slug>.fix.tc` |
| Custom domains | VPS cron `/etc/cron.d/php-theme-hm-domains` → `hm-domains-sync.py` | every minute: active NEWS sites' custom domains (TP hm_news_sites) whose DNS resolves get a Traefik Host() router in `hm-sites-auto.yml`; corporate sites never |
| Panel API | `api-server/src/routes/hm.ts` + `lib/hm-site-kind.ts` | POST auto-aliases, type lock (news ↔ corporate refused), PHP forced for news, `POST /api/hm/sites/:id/domain-check` |
| Panel UI | `/admin/haber-siteleri` (news), `/admin/hm-kurumsal` (corporate) | same component, `kind` prop |

Rollback: delete the two `*` DNS records, `rm /docker/traefik/dynamic/fixtc-wild.yml /docker/traefik/dynamic/hm-sites-auto.yml /etc/cron.d/php-theme-hm-domains`, restore `App.php` from `/docker/php-theme/backups/prov-20261008-174023/App.php.live`.
