#!/usr/bin/env bash
# Append Yenişafak header logo CSS fix into php-theme-yenisafak theme.css + bump cache.
# Run on VPS (or via SSH) after merging logo-trim PR.
set -euo pipefail
CONTAINER="${PHP_THEME_CONTAINER:-php-theme-yenisafak}"
THEME_CSS="${THEME_CSS_PATH:-/app/public/assets/theme.css}"
PATCH_SRC="$(cd "$(dirname "$0")/.." && pwd)/hostinger/php-theme-patches/ys-logo-header-fix.css"

if [[ ! -f "$PATCH_SRC" ]]; then
  echo "missing patch: $PATCH_SRC" >&2
  exit 1
fi

docker exec "$CONTAINER" test -f "$THEME_CSS"

if docker exec "$CONTAINER" grep -q 'ys-logo-header-fix:v1' "$THEME_CSS"; then
  echo "theme.css already has ys-logo-header-fix:v1"
else
  docker exec -i "$CONTAINER" sh -c "cat >> '$THEME_CSS'" <"$PATCH_SRC"
  echo "appended ys-logo-header-fix:v1 to $THEME_CSS"
fi

# Prefer readable logo height attr when layout still ships height="44".
docker exec "$CONTAINER" sh -c '
  for f in /app/templates/layout.php /app/public/index.php; do
    [ -f "$f" ] || continue
    sed -i -E "s/height=\"44\"/height=\"64\"/g; s/height=\"48\"/height=\"64\"/g" "$f" || true
  done
'

docker exec "$CONTAINER" sh -c 'kill -USR2 1 2>/dev/null || true'
echo "done — purge CF cache for /assets/theme.css on PHP hosts if needed"
