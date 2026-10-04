# Yenişafak Tema (PHP)

Server-rendered news theme for Haber Merkezi sites. It is inspired by the information architecture of a dense newspaper homepage (dark page, red accent, numbered lead slider, category blocks, video strip, columnists). It does **not** include Yeni Şafak logos, trademarks, images, icons, font files, CSS, or JavaScript.

The React editor panel is unchanged. This folder is a separate app that reads the existing Postgres database and can sit beside the current containers.

## What it serves

| Route | Page |
| --- | --- |
| `/` | Homepage. Sections come from `hm_news_sites.layout_json`. |
| `/haber/{slug}` | Story. `rss-{id}` is a feed item (title, summary, image, source link only). |
| `/kategori/{slug}` | Category. |
| `/yazar/a{id}` | Columnist and `hm_makaleler`. |
| `/video` | Videos from the `videos` table. Watch links go to `https://yektube.com`. |
| `/kunye`, `/hakkimizda`, `/iletisim` | Static pages. TürkAta copy is used for the `turkatahaber` tenant. |
| `/sitemap.xml`, `/google-news.xml`, `/robots.txt` | SEO. |

`turkatahaber.com` and `ahenk.net.tr` resolve to the `turkatahaber` row. On `ahenk.net.tr` the same pages live under `/haberler` (for example `/haberler/kategori/spor`). Canonical URLs for that tenant stay on `https://turkatahaber.com`. Any other host is matched against `hm_news_sites.domain`, `domain2`, or `domain3`, and uses that site’s name, logo, and `hmPrimaryColor` (default `#c8102e`).

The database session is read-only (`default_transaction_read_only`). The schema is not changed and nothing is written to MySQL.

## Panel modules

Each homepage block follows keys the current vitrin panel already stores. If a key is missing, the block stays on. If the panel saved `false`, the block is hidden. Order follows `hmNewsHomeModuleOrder`. Category and count follow `hmNewsHomeModuleCategorySlugs` and `hmNewsHomeModuleItemCounts` when those keys exist.

| Block | Panel keys |
| --- | --- |
| Son dakika | `hmNewsBreakingBandEnabled`, order id `breakingBand` |
| Manşet | `hmNewsSliderEnabled` or `hmNewsTepeMansetEnabled`, `hero` / `tepeManset` |
| Yan manşetler | `hmNewsLeadListSidebarEnabled`, `leadListSidebar` |
| Kategori blokları | `hmNewsCategorySectionsEnabled` or `hmNewsYekpareKategorilerKutusuEnabled` |
| Video | `hmNewsRecentVideosSidebarEnabled`, `recentVideosSidebar` |
| Yazarlar | `hmNewsAuthorsEnabled`, `authorsStrip` |
| Çok okunanlar | `hmNewsAhenkPopulerHaberlerEnabled`, `ahenkPopulerHaberler` |
| Galeri | `hmNewsMediaDarkBlockEnabled`, `mediaDarkBlock` |

Optional `hmNewsYsTickerEnabled`, `hmNewsYsMansetEnabled`, `hmNewsYsSideHeadlinesEnabled`, `hmNewsYsCategoryBlocksEnabled`, `hmNewsYsVideoBandEnabled`, `hmNewsYsAuthorsEnabled`, `hmNewsYsMostReadEnabled`, and `hmNewsYsGalleryEnabled` override the mapped keys when present. The current panel does not write those names.

Accent: `hmPrimaryColor`. Logo: `logoUrl`. TürkAta uses its own wordmark when `logoUrl` is empty. Categories hidden in `hmNavHiddenCategorySlugs` drop out of the nav.

## RSS and video

Stories are read from `portal_rss_items`, `news` (with `news_site_overrides`), and `hm_makaleler`. Feed items show title, summary, image, and the stored source link. Full feed HTML is not rendered.

This app does not download feeds. Add the feeds in the existing RSS importer so Spor and Teknoloji are not empty. Public syndication feeds already used or probed for this desk:

| Category | Feeds |
| --- | --- |
| Gündem | `https://www.aa.com.tr/tr/rss/default?cat=gundem`, `https://www.trthaber.com/gundem_articles.rss`, `https://www.trthaber.com/turkiye_articles.rss`, `https://www.trthaber.com/manset_articles.rss`, `https://www.dirilispostasi.com/rss/gundem`, `https://www.birgun.net/rss/kategori/guncel-7`, `https://www.ntv.com.tr/son-dakika.rss`, `https://www.ntv.com.tr/turkiye.rss` |
| Ekonomi | `https://www.aa.com.tr/tr/rss/default?cat=ekonomi`, `https://www.trthaber.com/ekonomi_articles.rss`, `https://www.ntv.com.tr/ekonomi.rss`, `https://www.ntv.com.tr/ntvpara.rss` |
| Dünya | `https://www.aa.com.tr/tr/rss/default?cat=dunya`, `https://www.trthaber.com/dunya_articles.rss`, `https://www.ntv.com.tr/dunya.rss`, `https://www.birgun.net/rss/kategori/dunya-13` |
| Politika | `https://www.aa.com.tr/tr/rss/default?cat=politika`, `https://www.dirilispostasi.com/rss/siyaset`, `https://www.birgun.net/rss/kategori/siyaset-8` |
| Spor | `https://www.aa.com.tr/tr/rss/default?cat=spor`, `https://www.trthaber.com/spor_articles.rss`, `https://www.dirilispostasi.com/rss/spor`, `https://www.birgun.net/rss/kategori/spor-12`, `https://www.ntv.com.tr/sporskor.rss` |
| Teknoloji | `https://www.dirilispostasi.com/rss/teknoloji`, `https://www.birgun.net/rss/kategori/teknoloji-28`, `https://www.birgun.net/rss/kategori/bilim-40`, `https://www.ntv.com.tr/teknoloji.rss` |
| Kültür-Sanat | `https://www.dirilispostasi.com/rss/kultur-sanat`, `https://www.birgun.net/rss/kategori/kultur-sanat-11` |
| Sağlık | `https://www.aa.com.tr/tr/rss/default?cat=saglik`, `https://www.trthaber.com/saglik_articles.rss`, `https://www.dirilispostasi.com/rss/saglik`, `https://www.birgun.net/rss/kategori/saglik-27`, `https://www.ntv.com.tr/saglik.rss` |
| Yaşam | `https://www.aa.com.tr/tr/rss/default?cat=yasam`, `https://www.trthaber.com/yasam_articles.rss`, `https://www.dirilispostasi.com/rss/yasam`, `https://www.birgun.net/rss/kategori/yasam-14`, `https://www.ntv.com.tr/yasam.rss` |
| Eğitim | `https://www.aa.com.tr/tr/rss/default?cat=egitim`, `https://www.trthaber.com/egitim_articles.rss`, `https://www.dirilispostasi.com/rss/egitim`, `https://www.birgun.net/rss/kategori/egitim-31`, `https://www.ntv.com.tr/egitim.rss` |
| Yerel | `https://www.dirilispostasi.com/rss/yerel-haber`, `https://www.birgun.net/rss/kategori/yerel-38` |
| Ankara | `https://www.ticarihayat.com/rss/ankara-haberleri`, `https://www.bizimankara.com.tr/rss/ankara` |

Videos prefer the shared `videos` table (same rows as the HM YekTube catalog). If that table is empty and `YEKTUBE_API_BASE` is an `https` origin, the app calls `{YEKTUBE_API_BASE}/api/hm/yektube/videos` and only keeps `yektube.com` watch URLs.

## Cache

HTML is cached for 60 seconds in APCu when the extension is loaded, and always in `CACHE_DIR` (default `/tmp/yenisafak-cache`). Responses send `Cache-Control: public, max-age=60, s-maxage=60`, which Cloudflare can honor. Images use width, height, `aspect-ratio`, and `loading="lazy"` except the first lead.

## Deploy on the VPS

PHP 8.2+ with `pdo_pgsql`. The image is FrankenPHP (PHP 8.3) plus nginx-equivalent Caddy.

1. On the host that already runs Traefik, clone the repo and `cd php-theme`.
2. Create a Postgres role with `SELECT` on the news tables and put its URL in `DATABASE_URL` (`postgres://...` with `sslmode=require` when the server requires TLS). Do not run `seed/demo.sql` on that database.
3. If the Traefik Docker network is not named `proxy`, change `docker-compose.yml`. If the certificate resolver is not `le`, change `tls.certresolver`.
4. `docker compose up -d --build`.
5. Point `turkatahaber.com` and `www.turkatahaber.com` at this router. Route `ahenk.net.tr` `/haberler` here as well; leave the agency site on the existing app.
6. In the existing vitrin panel for TürkAta, turn on Son dakika, manşet, Öne Çıkan Haber Dosyası, kategori bölümleri, Son Eklenen Videolar, yazarlar, Popüler Haberler, and Video / Galeri if a previous save stored them as off.
7. Confirm `https://turkatahaber.com/`, a category, `/sitemap.xml`, and `/google-news.xml`.

`docker-compose.demo.yml` is only for a local Postgres with fake rows. `SITE_HOST=turkatahaber.com` forces tenant lookup when you open the app on localhost.

## Local check without Docker

```bash
sudo -u postgres psql -c "CREATE USER yenisafak WITH PASSWORD 'demo';" || true
sudo -u postgres psql -c "CREATE DATABASE yenisafak OWNER yenisafak;" || true
sudo -u postgres psql -d yenisafak -f seed/demo.sql
DATABASE_URL='postgres://yenisafak:demo@127.0.0.1:5432/yenisafak' \
SITE_HOST=turkatahaber.com \
php -S 127.0.0.1:8090 -t public public/index.php
```
