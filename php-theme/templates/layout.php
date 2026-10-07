<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var string $title */
/** @var string $description */
/** @var string $body */
/** @var string $canonical */
/** @var string $imageAbs */
/** @var array<string, mixed>|null $jsonLd */
$logoSrc = $site->logo;
$logoLocal = $logoSrc !== '' && str_starts_with($logoSrc, '/');
$preset = $site->mansetPreset();
$secondary = $site->secondaryColor();
$headerAd = $site->adSlot('header');
?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= Html::e($title) ?></title>
  <meta name="description" content="<?= Html::e($description) ?>">
  <link rel="canonical" href="<?= Html::e($canonical) ?>">
  <meta property="og:type" content="<?= str_contains($canonical, '/haber/') ? 'article' : 'website' ?>">
  <meta property="og:title" content="<?= Html::e($title) ?>">
  <meta property="og:description" content="<?= Html::e($description) ?>">
  <meta property="og:url" content="<?= Html::e($canonical) ?>">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:site_name" content="<?= Html::e($site->name) ?>">
  <?php if ($imageAbs !== ''): ?>
    <meta property="og:image" content="<?= Html::e($imageAbs) ?>">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="<?= Html::e($imageAbs) ?>">
  <?php else: ?>
    <meta name="twitter:card" content="summary">
  <?php endif; ?>
  <meta name="twitter:title" content="<?= Html::e($title) ?>">
  <meta name="twitter:description" content="<?= Html::e($description) ?>">
  <link rel="icon" href="<?= Html::e($site->faviconHref()) ?>">
  <link rel="stylesheet" href="<?= Html::e($site->path('/assets/theme.css')) ?>">
  <?php if ($jsonLd !== null): ?>
    <script type="application/ld+json"><?= Html::json($jsonLd) ?></script>
  <?php endif; ?>
</head>
<body class="ys<?= $preset !== '' ? ' ys-preset-' . Html::e($preset) : '' ?>" style="--ys-accent: <?= Html::e($site->accent) ?><?= $secondary !== '' ? '; --ys-secondary: ' . Html::e($secondary) : '' ?>">
  <a class="ys-skip" href="#icerik">İçeriğe geç</a>
  <header class="ys-header">
    <div class="ys-bar">
      <a class="ys-logo" href="<?= Html::e($site->path('/')) ?>">
        <?php if ($logoSrc !== ''): ?>
          <img src="<?= Html::e($logoLocal ? $site->path($logoSrc) : $logoSrc) ?>" alt="<?= Html::e($site->name) ?>" width="220" height="44">
        <?php else: ?>
          <strong><?= Html::e($site->name) ?></strong>
        <?php endif; ?>
      </a>
      <nav class="ys-tools" aria-label="Site">
        <?php foreach ($site->headerTools() as $item): ?>
          <a href="<?= Html::e($item['href']) ?>"><?= Html::e($item['label']) ?></a>
        <?php endforeach; ?>
      </nav>
    </div>
    <?php if ($headerAd !== null): ?>
      <div class="ys-wrap ys-ad" data-ad-slot="header">
        <?php if ($headerAd['href'] !== ''): ?><a href="<?= Html::e($headerAd['href']) ?>" rel="noopener sponsored"><?php endif; ?>
          <img src="<?= Html::e(Html::src($site->basePath, $headerAd['image'])) ?>" alt="" width="728" height="90">
        <?php if ($headerAd['href'] !== ''): ?></a><?php endif; ?>
      </div>
    <?php endif; ?>
    <?php $mainMenu = $site->mainMenu(); ?>
    <nav class="ys-cats" aria-label="<?= $mainMenu === [] ? 'Kategoriler' : 'Ana menü' ?>">
      <?php if ($mainMenu === []): ?>
        <?php foreach ($site->categories as $cat): ?>
          <a href="<?= Html::e($site->path('/kategori/' . $cat['slug'])) ?>"><?= Html::e($cat['name']) ?></a>
        <?php endforeach; ?>
      <?php else: ?>
        <?php foreach ($mainMenu as $item): ?>
          <?php if ($item['children'] === []): ?>
            <a href="<?= Html::e($item['href']) ?>"><?= Html::e($item['label']) ?></a>
          <?php else: ?>
            <span class="ys-drop">
              <a href="<?= Html::e($item['href']) ?>"><?= Html::e($item['label']) ?></a>
              <span class="ys-drop-menu">
                <?php foreach ($item['children'] as $child): ?>
                  <a href="<?= Html::e($child['href']) ?>"><?= Html::e($child['label']) ?></a>
                <?php endforeach; ?>
              </span>
            </span>
          <?php endif; ?>
        <?php endforeach; ?>
      <?php endif; ?>
    </nav>
  </header>
  <main id="icerik">
    <?= $body ?>
  </main>
  <footer class="ys-footer">
    <div class="ys-wrap">
      <p class="ys-footer-name"><?= Html::e($site->name) ?></p>
      <p><?= Html::e($site->slogan()) ?></p>
      <?php $social = $site->socialLinks(); ?>
      <?php if ($social !== []): ?>
        <nav class="ys-social" aria-label="Sosyal">
          <?php foreach ($social as $item): ?>
            <a href="<?= Html::e($item['href']) ?>" rel="noopener noreferrer"><?= Html::e($item['label']) ?></a>
          <?php endforeach; ?>
        </nav>
      <?php endif; ?>
      <nav aria-label="Alt">
        <?php foreach ($site->footerLinks() as $item): ?>
          <a href="<?= Html::e($item['href']) ?>"><?= Html::e($item['label']) ?></a>
        <?php endforeach; ?>
      </nav>
    </div>
  </footer>
  <script src="<?= Html::e($site->path('/assets/theme.js')) ?>" defer></script>
</body>
</html>
