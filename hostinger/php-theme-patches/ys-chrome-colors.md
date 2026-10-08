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
