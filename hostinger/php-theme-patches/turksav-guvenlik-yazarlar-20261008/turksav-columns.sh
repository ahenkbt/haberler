#!/bin/sh
# turksav.org (233) defense columnists (turksav concept 2026-10-08). Same image/env as the AI editor; script mounted read-only.
#   ops/turksav-columns.sh write [--dry-run] [--force] [--authors 615,616]
set -eu
mkdir -p /var/log/php-theme
exec docker run --rm --name "php-theme-turksav-columns-$$" --cpus 0.5 --memory 256m --pids-limit 64 --user 1000:1000 \
  --env-file /docker/php-theme/ai-editor.env \
  -v /docker/php-theme/ai-editor/turksav_columns.py:/app/turksav_columns.py:ro \
  php-theme-ai-editor:1 python /app/turksav_columns.py "$@"
