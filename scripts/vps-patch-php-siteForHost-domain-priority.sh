#!/usr/bin/env bash
# Patch php-theme-yenisafak Repository::siteForHost domain slot priority + reload PHP.
set -euo pipefail
CONTAINER="${PHP_THEME_CONTAINER:-php-theme-yenisafak}"
FILE="/app/src/Repository.php"
docker exec "$CONTAINER" python3 - <<'PY'
from pathlib import Path
path = Path("/app/src/Repository.php")
text = path.read_text()
old = """             WHERE active = true
               AND (
                 lower(domain) = :host OR lower(domain) = :bare
                 OR lower(coalesce(domain2, \\'\\')) = :host OR lower(coalesce(domain2, \\'\\')) = :bare
                 OR lower(coalesce(domain3, \\'\\')) = :host OR lower(coalesce(domain3, \\'\\')) = :bare
               )
             LIMIT 1"""
new = """             WHERE active = true
               AND (
                 lower(domain) = :host OR lower(domain) = :bare
                 OR lower(coalesce(domain2, \\'\\')) = :host OR lower(coalesce(domain2, \\'\\')) = :bare
                 OR lower(coalesce(domain3, \\'\\')) = :host OR lower(coalesce(domain3, \\'\\')) = :bare
               )
             ORDER BY
               CASE
                 WHEN lower(domain) = :host OR lower(domain) = :bare THEN 0
                 WHEN lower(coalesce(domain2, \\'\\')) = :host OR lower(coalesce(domain2, \\'\\')) = :bare THEN 1
                 WHEN lower(coalesce(domain3, \\'\\')) = :host OR lower(coalesce(domain3, \\'\\')) = :bare THEN 2
                 ELSE 3
               END,
               id ASC
             LIMIT 1"""
if old not in text:
    raise SystemExit("Repository.php pattern not found — already patched or layout changed")
path.write_text(text.replace(old, new, 1))
print("patched siteForHost ORDER BY domain slot")
PY
docker exec "$CONTAINER" sh -c 'kill -USR2 1 2>/dev/null || true'
echo "done"
