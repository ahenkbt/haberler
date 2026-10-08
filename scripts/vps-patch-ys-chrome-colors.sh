#!/usr/bin/env bash
# Patch php-theme-yenisafak layout.php so --ys-nav/--ys-navy follow hmPrimaryColor.
# Run on VPS after merging site-concept-colors PR.
set -euo pipefail
CONTAINER="${PHP_THEME_CONTAINER:-php-theme-yenisafak}"
LAYOUT="${LAYOUT_PATH:-/app/templates/layout.php}"

docker exec "$CONTAINER" test -f "$LAYOUT"

docker exec "$CONTAINER" python3 - <<'PY'
from pathlib import Path
import re

path = Path("/app/templates/layout.php")
text = path.read_text()
marker = "ys-chrome-colors:v1"
if marker in text:
    print("layout.php already has ys-chrome-colors:v1")
    raise SystemExit(0)

if "$secondary = $site->secondaryColor()" not in text:
    text = text.replace(
        "$preset = $site->mansetPreset();",
        "$preset = $site->mansetPreset();\n$secondary = $site->secondaryColor();",
        1,
    )

old_re = re.compile(
    r'<body class="ys<\?= \$preset !== \'\' \? \' ys-preset-\' \. Html::e\(\$preset\) : \'\' \?>" '
    r'style="--ys-accent: <\?= Html::e\(\$site->accent\) \?>'
    r'(?:<\?= \$secondary !== \'\' \? \'; --ys-secondary: \' \. Html::e\(\$secondary\) : \'\' \?>)?"'
)

new = (
    '<?php /* ys-chrome-colors:v1 */\n'
    '$ysPrimary = $site->accent;\n'
    "$ysSecondary = $secondary !== '' ? $secondary : $ysPrimary;\n"
    "?>\n"
    '<body class="ys<?= $preset !== \'\' ? \' ys-preset-\' . Html::e($preset) : \'\' ?>" '
    'style="--ys-accent: <?= Html::e($ysSecondary) ?>; --ys-navy: <?= Html::e($ysPrimary) ?>; '
    '--ys-nav: <?= Html::e($ysPrimary) ?>; --ys-secondary: <?= Html::e($ysSecondary) ?>"'
)

if not old_re.search(text):
    old_re = re.compile(
        r'<body class="ys[^"]*" style="--ys-accent: <\?= Html::e\(\$site->accent\) \?>[^"]*"'
    )
    if not old_re.search(text):
        raise SystemExit("layout.php body style pattern not found — inspect templates/layout.php")

path.write_text(old_re.sub(new, text, count=1))
print("patched layout.php ys-chrome-colors:v1")
PY

docker exec "$CONTAINER" sh -c 'kill -USR2 1 2>/dev/null || true'
echo "done — purge CF HTML cache for PHP hosts if nav still navy"
