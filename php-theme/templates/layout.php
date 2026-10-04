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
  <link rel="icon" href="<?= Html::e($site->path('/favicon.svg')) ?>" type="image/svg+xml">
  <link rel="stylesheet" href="<?= Html::e($site->path('/assets/theme.css')) ?>">
  <?php if ($jsonLd !== null): ?>
    <script type="application/ld+json"><?= Html::json($jsonLd) ?></script>
  <?php endif; ?>
</head>
<body class="ys" style="--ys-accent: <?= Html::e($site->accent) ?>">
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
        <a href="<?= Html::e($site->path('/video')) ?>">Video</a>
        <a href="<?= Html::e($site->path('/hakkimizda')) ?>">Hakkımızda</a>
        <a href="<?= Html::e($site->path('/kunye')) ?>">Künye</a>
        <a href="<?= Html::e($site->path('/iletisim')) ?>">İletişim</a>
      </nav>
    </div>
    <nav class="ys-cats" aria-label="Kategoriler">
      <?php foreach ($site->categories as $cat): ?>
        <a href="<?= Html::e($site->path('/kategori/' . $cat['slug'])) ?>"><?= Html::e($cat['name']) ?></a>
      <?php endforeach; ?>
    </nav>
  </header>
  <main id="icerik">
    <?= $body ?>
  </main>
  <footer class="ys-footer">
    <div class="ys-wrap">
      <p class="ys-footer-name"><?= Html::e($site->name) ?></p>
      <p><?= Html::e($site->description) ?></p>
      <nav aria-label="Alt">
        <a href="<?= Html::e($site->path('/kunye')) ?>">Künye</a>
        <a href="<?= Html::e($site->path('/hakkimizda')) ?>">Hakkımızda</a>
        <a href="<?= Html::e($site->path('/iletisim')) ?>">İletişim</a>
        <a href="<?= Html::e($site->path('/sitemap.xml')) ?>">Site haritası</a>
      </nav>
    </div>
  </footer>
  <script src="<?= Html::e($site->path('/assets/theme.js')) ?>" defer></script>
</body>
</html>
