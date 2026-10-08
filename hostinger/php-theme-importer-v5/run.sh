#!/bin/sh
# catfill runner: run.sh [fill|daily] [extra docker -e args]. INSERT-only into twilight-pine portal_rss_items.
MODE=${1:-daily}; shift 2>/dev/null
exec docker run --rm --name php-theme-importer-catfill-${CATFILL_SOURCE:-targets} -e CATFILL_SOURCE=${CATFILL_SOURCE:-targets} --cpus 0.5 --memory 384m --env-file /docker/php-theme/importer.env \
  -v /docker/php-theme/importer-v5:/app5:ro -e CATFILL_MODE=$MODE -e CATFILL_TARGETS=/app5/targets.json "$@" \
  php-theme-importer:4 python /app5/catfill.py
