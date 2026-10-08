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

# Ensure secondary is read (older templates already do this).
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
    # Broader fallback: any body.ys with only --ys-accent
    old_re = re.compile(
        r'<body class="ys[^"]*" style="--ys-accent: <\?= Html::e\(\$site->accent\) \?>[^"]*"'
    )
    if not old_re.search(text):
        raise SystemExit("layout.php body style pattern not found — inspect templates/layout.php")

path.write_text(old_re.sub(new, text, count=1))
print("patched layout.php ys-chrome-colors:v1")
PY

# Optional: brand chrome.css from Worker ASSETS (/yesilvatan/chrome.css etc.) after theme.css.
docker exec "$CONTAINER" python3 - <<'PY'
from pathlib import Path
import re

path = Path("/app/templates/layout.php")
text = path.read_text()
if "hm-php-concept-chrome-link:v1" in text:
    print("layout.php already has hm-php-concept-chrome-link:v1")
else:
    # After theme.css link, inject brand chrome overlay when site domain maps to ASSETS path.
    marker = 'hm-php-concept-chrome-link:v1'
    inject = (
        "<?php /* " + marker + " */\n"
        "$ysChromeHost = strtolower((string)($site->domain ?? ''));\n"
        "$ysChromeHost = preg_replace('/^www\\./', '', $ysChromeHost);\n"
        "$ysChromeMap = [\n"
        "  'yesilvatan.gen.tr' => '/yesilvatan/chrome.css',\n"
        "  'yerel.net.tr' => '/yerel/chrome.css',\n"
        "  'sehitgazi.org.tr' => '/sehitgazi/chrome.css',\n"
        "  'turksav.org' => '/turksav/chrome.css',\n"
        "  'dunyasaglik.org' => '/dunyasaglik/chrome.css',\n"
        "];\n"
        "if (isset($ysChromeMap[$ysChromeHost])) {\n"
        "  echo '<link rel=\"stylesheet\" href=\"' . Html::e($ysChromeMap[$ysChromeHost]) . '\">\\n';\n"
        "}\n"
        "?>\n"
    )
    # Prefer inserting after theme.css stylesheet link.
    m = re.search(r'(<link rel="stylesheet" href="/assets/theme\.css[^"]*">\s*)', text)
    if not m:
        print("theme.css link not found — skip chrome.css inject")
    else:
        path.write_text(text[: m.end()] + inject + text[m.end() :])
        print("patched layout.php hm-php-concept-chrome-link:v1")
PY

docker exec "$CONTAINER" sh -c 'kill -USR2 1 2>/dev/null || true'
echo "done — purge CF HTML + /assets/theme.css cache for PHP hosts if nav still navy"
echo "tip: curl -sI https://yesilvatan.gen.tr/assets/theme.css | grep -i x-yekpare"
