# Concept sites + spor.gundemi.org (2026-10-08)

User rule (22:15 TRT): concept/topic sites (yeşilvatan, turksav, şehitgazi, dünyasağlık, fix.tc, all regional
*.gundemi.org incl. Kıbrıs) show no Süper Lig table and no burçlar. General news sites keep them. A sports concept
site keeps Süper Lig.

## Per-site setting (TP + panel layout_json)
- `hmConceptSite: true`, `hmConceptTopic: "<topic>"` (spor | savunma | sehit-gazi | cevre | saglik | teknoloji | bolge | diger)
- Explicit switches too: `hmNewsYsHoroscopeEnabled:false`, `hmNewsYsStandingsEnabled:false` (true for spor), `hmNewsYsSportsHoroscopeEnabled`.
- New sites: `/admin/haber-siteleri` → "Konsept site" switch + topic (create only) → `conceptSiteLayoutDefaults()` in
  api-server `lib/hm-site-kind.ts`, used by `POST /hm/sites`.

## Theme (php-theme-yenisafak; docker cp, php -l, no restart; hunks marked "concept sites 2026-10-08")
- `src/Widgets.php`: `Widgets::on()` returns false for horoscope on concept sites and for standings unless topic = spor
  (wins over hmNewsYs* keys merged from the panel by LiveBridge).
- `templates/layout.php`: "Burçlar" / "Puan durumu" links only when the widget is on.
- `src/CategoryTree.php`: tree mode `hmCatTree = "spor"` (mains = Spor; home = Spor + 13 branch blocks).
- `src/Repository.php` + `src/App.php`: `hmNewsRssCategoryOnly` limits shared-pool rows (and network pool news) to the listed categories.
- Backup / rollback: VPS `/docker/php-theme/backups/concept-20261008/orig/` (docker cp back). `theme.diff` here.

## spor.gundemi.org
- TP hm_news_sites id 1146 (slug spor; domain spor.gundemi.org, domain2 spor.fix.tc); SQL in `spor-tp-insert.sql`.
- Panel row: `cloudflare/hm-spor-gundemi-edge.js` creates it on the first by-domain miss (idempotent). Editor login
  spor@gundemi.org / password = username (convention account, opened on first login).
- Logo family: `goalgo/artifacts/ahenkpress/public/gundemi/logos/spor-gundemi*` + container `/app/public/gundemi/marka/`.
