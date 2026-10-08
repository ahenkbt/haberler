# Yenişafak PHP chrome colors

Nav / logo chrome must follow `hmPrimaryColor` (`--ys-nav`, `--ys-navy`).
Son dakika / CTA accents follow `hmSecondaryColor` (`--ys-accent`).

Canonical body style (replace the existing `style="--ys-accent: …"` on `<body class="ys…">`):

```php
$ysPrimary = $site->accent;
$ysSecondary = $secondary !== '' ? $secondary : $ysPrimary;
```

```php
<body class="ys<?= $preset !== '' ? ' ys-preset-' . Html::e($preset) : '' ?>" style="--ys-accent: <?= Html::e($ysSecondary) ?>; --ys-navy: <?= Html::e($ysPrimary) ?>; --ys-nav: <?= Html::e($ysPrimary) ?>; --ys-secondary: <?= Html::e($ysSecondary) ?>">
```

Apply on VPS with `scripts/vps-patch-ys-chrome-colors.sh`.

## Worker theme.css bridge (preferred live path)

PHP brand zones historically had Dashboard **Worker-less** `/assets/theme.*` exclusions, so
`/assets/*` hit the Worker for other files but `theme.css` still came from origin (navy
`--ys-nav`, no `x-yekpare-php-concept-colors`).

Fix:

1. Exact routes in `wrangler.toml`: `<host>/assets/theme.css` (+ `theme.js`)
2. Post-deploy rebind: `scripts/cf-ensure-php-theme-css-routes.mjs`
3. Smoke: `scripts/smoke-php-concept-theme.mjs` — expect `--ys-nav:#0b6e4f` on yesilvatan

Brand ASSETS overlay (belt-and-suspenders): `/yesilvatan/chrome.css` (and peers) after
Worker deploy; VPS patch can `<link>` them after `theme.css`.
