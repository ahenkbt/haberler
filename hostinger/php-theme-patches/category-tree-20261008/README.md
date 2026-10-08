# PHP theme: category tree + per-site override read side (2026-10-08)

Deployed live in `php-theme-yenisafak` (docker cp, php -l, no restart). Host working tree `/docker/php-theme/` updated too.
Backup / rollback: `/docker/php-theme/backups/cattree-20261008-2035/` (docker cp the files back to `/app/...`).

Files
- `CategoryTree.php` (new, `/app/src/CategoryTree.php`): tree Siyaset / Kamu (+ Güvenlik → TSK → KKK/HvKK/DzKK/Sahil Güvenlik, MSB, SSB, ASELSAN…, Emniyet, Jandarma) / STK / Yerel Yönetimler / Dünya, Bakanlıklar → 17 `bakanlik-*` tabs, Yerel → 7 `bolge-*` regions → 81 provinces.
  Mode per site: layout_json `hmCatTree` = full | yerel | off; default GENERAL ids = full, 231 (yerel.net.tr) = yerel, topical sites off.
- `theme.diff`: App.php (home block order, parent pages aggregate descendants via `Repository::storiesIn`, tab rows, off categories), Repository.php (`storiesIn`, per-site overrides in SQL, tepe manşet per owner site), Menu.php (no item for an off category), templates/category.php (tabs), templates/layout.php (desktop dropdowns incl. 3rd level, mobile drawer).

Per-site overrides (one shared pool, writer = HM Editör "RSS Haberler")
- `hm_site_content_hidden` (Pasif, any reason) and `hm_site_category_overrides.active = false` are applied in `Repository::storySql` (NOT EXISTS / NOT IN) plus `isBlocked()` (live items, story 404). An off tree parent hides its descendants.
- Page cache: `public/index.php` rebuilds copies older than `hm_site_override_rev.rev_at` (f8c22352's patch, APCu 10 s).
- Tepe manşet: pool rows (`site_id IS NULL`) are manşet only on `owner_site_id`; other sites list them as normal items.
