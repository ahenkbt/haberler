# turkatahaber.com — canlı onarım

## Belirtiler

- `/haber/rss-*` **Maximum execution time 30s** (`/app/src/Db.php` ~41): genelde `news` tablosunda slug araması seq scan.
- Tepe menüde yalnızca **İller** (`/kategori/yerel`): PHP Neon `layout_json` eski; Cumha `hmNavOnlyCategorySlugs` yok.
- Logo `/turkata/*` → **404**; PHP tema `/brand/turkata/*` kullanır.
- `/iller` (ve `/daha`) **404 Sayfa bulunamadı**: Yenişafak PHP yalnızca `hakkimizda|kunye|iletisim` sunar; `hmExtraPages` Worker kenarında (`hm-kamu-yerel-extra-pages-edge.js`).
- `/kategori/bolge-*` (ve il slug’ları) 404 **Kategori bulunamadı**: satırlar twilight-pine’da olsa bile PHP `hmNavOnlyCategorySlugs`’i sayfa beyaz listesi sanır; tepe-only liste bolge/il’i keser.

## Kök nedenler

1. **PHP okur twilight-pine** (`NEWS_DATABASE_URL`, site id **230**), panel Neon (**1132**) ayrı — layout/kategoriler aynalanmadan kaldı.
2. **ensure NEWS_DB_READ=news** PHP id (230) ile dual-write yapınca panel **1132** atlanır; `sync-php --site-id=230` layout boş okur. **Slug ile sync** (`--site-slug=turkatahaber`) kullan.
3. **`hmNavOnlyCategorySlugs` tepe-only** iken PHP `/kategori/:slug` 404 döner; allowlist tüm kamu-yerel slug’larını (bolge-* + 81 il) içermeli, tepe menü `hmNavHiddenCategorySlugs` ile dar kalır.
4. **`news(slug)` indeks yok** — büyük RSS backfill sonrası haber detayı yavaşlar.
5. **RSS kampanyası** (ör. id **1021**) ingest edilmediyse vitrin eski ulusal RSS içeriği gösterir.

## Prod aksiyonları (sıra)

1. GitHub **Ensure Turkatahaber live** workflow (`ensure-turkatahaber-live`) veya:
   ```bash
   repository_dispatch: ensure-turkatahaber-live
   ```
   Secrets: `DATABASE_URL`, `NEWS_DATABASE_URL`.

2. Alternatif adımlar:
   ```bash
   repository_dispatch: ensure-kamu-yerel   # client_payload: { "sync_php_layout": "1" }
   repository_dispatch: sync-php-neon-news  # site_slug: turkatahaber, dry_run: false
   ```
   Hızlı layout: `sync-php-neon-news --apply --layout-only --site-slug=turkatahaber`

3. Neon indeks (twilight-pine):
   ```bash
   psql "$NEWS_DATABASE_URL" -f hostinger/turkatahaber/php-neon-indexes.sql
   ```

4. RSS kampanya **1021** — workflow `RUN_RSS_CAMPAIGN=1` veya panelden kampanya çalıştır.

5. Cloudflare cache: turkatahaber.com ana sayfa purge (layout menü CDN cache).

PHP container: `php-theme-yenisafak` — Db.php kaynak kodu VPS image içinde; kalıcı fix indeks + doğru Neon layout.
