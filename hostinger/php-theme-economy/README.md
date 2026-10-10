# Ekonomi Gündemi (ekonomi.gundemi.org) — PHP tema eki

VPS'te (`/docker/php-theme`) çalışan PHP temasına (Yenişafak/FrankenPHP) eklenen, **tamamen ekonomi** sitesi. Portal temasından farklı palet
(koyu lacivert + yeşil/altın), piyasa şeridi (BIST 100, USD/TRY, EUR/TRY, gram altın, Brent, BTC; ek: GBP, ons, çeyrek, ETH), 16 bölüm sayfası,
`/piyasalar` (canlı tablo + TCMB gösterge kurları), `/bolumler`.

| Parça | Yol (VPS) | Not |
|---|---|---|
| Sınıf | `src/Eco.php` | Site `slug=ekonomi` / `domain=ekonomi.gundemi.org` / `layout_json.hmEco` ile tanınır |
| Kabuk/şablonlar | `templates/eco/*` | `App::html/render` içindeki 3 "eco 2026-10-10" bloğu (`patch_app_php.py`) |
| Varlıklar | `public/brand/eco/*` | css, js, ikon, og görseli |
| Kurulum/onarım | `newsites28/eco_ensure.py` | İdempotent: site satırı (yalnız `--create`), layout anahtarları, `eko-*` kategorileri, AI editör satırı, importer hedefleri |
| RSS | `newsites28/mktargets_ns28.py`, `ns28_run.py`, `run-ns28.sh` | importer-v5 catfill, 30 gerçek ekonomi RSS kaynağı; yeniden yazım/atıf/imza/tekilleştirme `rssrewrite` cron'unda otomatik |
| (C) AI editör | `newsites28/ai_autoenable.py` | Site açılışında `hm_ai_editor_sites` satırı otomatik `enabled=true`; konsept = site açıklaması / `hmAiConcept` → `topic_rule` |
| Cron | `newsites28/cron.php-theme-ekonomi` → `/etc/cron.d/php-theme-ekonomi` | |

Piyasa verisi: Yahoo Finance chart API (BIST 100, kur, Brent, ons, BTC/ETH), Truncgil (gram/çeyrek altın, gümüş), TCMB today.xml. Kaynak yoksa kalem gizlenir; değer üretilmez.

Dağıtım (PHP konteyneri yeniden başlatılmaz): dosyalar `docker cp` ile `/app/...`'e kopyalanır, `php -l` ile denetlenir.
Geri alma: `templates/eco`, `src/Eco.php` sil; `App.php` yedeği `backups/eco-20261010/App.php.before`; cron dosyasını sil; satırı `active=false` yap.
