#!/bin/sh
# newsites25 importer: run-ns25.sh [fill|daily] [extra docker args]. INSERT-only into twilight-pine portal_rss_items via importer-v5 catfill.
MODE=${1:-daily}; shift 2>/dev/null
exec docker run --rm --name php-theme-importer-ns25-$MODE --cpus 0.5 --memory 384m --env-file /docker/php-theme/importer.env \
  -v /docker/php-theme/importer-v5:/app5:ro -v /docker/php-theme/newsites25/importer:/ns25:ro -e CATFILL_SOURCE=ns25 -e CATFILL_MODE=$MODE \
  -e CATFILL_TARGETS=/ns25/targets-ns25.json "$@" php-theme-importer:4 python /ns25/ns25_run.py
