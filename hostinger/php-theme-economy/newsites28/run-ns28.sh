#!/bin/sh
# ekonomi 2026-10-10: run-ns28.sh [fill|daily] — ekonomi.gundemi.org RSS (importer-v5 catfill), INSERT-only portal_rss_items.
# Hedefler: /docker/php-theme/newsites28/targets-ns28.json (eco_ensure.py üretir). Yeniden yazım rssrewrite cron'unda (atıf, kaynak linki, imza, tekilleştirme).
[ -s /docker/php-theme/newsites28/targets-ns28.json ] || { echo "targets-ns28.json yok (site satırı bekleniyor)"; exit 0; }
MODE=${1:-daily}; shift 2>/dev/null
exec docker run --rm --name php-theme-importer-ns28-$MODE --cpus 0.5 --memory 384m --env-file /docker/php-theme/importer.env \
  -v /docker/php-theme/importer-v5:/app5:ro -v /docker/php-theme/newsites27/importer:/ns27:ro -v /docker/php-theme/newsites28:/ns28:ro -e CATFILL_SOURCE=ns28 -e CATFILL_MODE=$MODE \
  -e CATFILL_TARGETS=/ns28/targets-ns28.json "$@" php-theme-importer:4 python /ns28/ns28_run.py
