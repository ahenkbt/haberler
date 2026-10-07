<?php
declare(strict_types=1);
/** @var array<string, mixed> $site */
/** @var list<array{label:string,href:string,children:list<array{label:string,href:string}>}> $nav */
/** @var string $pageTitle */
/** @var string $pageDescription */
/** @var string $canonical */
/** @var string $contentHtml */
/** @var string $bodyClass */
$display = (string) ($site['displayName'] ?? 'Site');
$theme = (string) ($site['theme'] ?? 'vatan');
$primary = (string) ($site['primaryColor'] ?? '#8c1a2e');
$assetBase = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
if ($assetBase === '/' || $assetBase === '\\') {
    $assetBase = '';
}
?><!DOCTYPE html>
<html lang="tr" data-hm-vitrin-theme="<?= hk_h($theme) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= hk_h($pageTitle) ?></title>
  <meta name="description" content="<?= hk_h($pageDescription) ?>">
  <link rel="canonical" href="<?= hk_h($canonical) ?>">
  <meta name="theme-color" content="<?= hk_h($primary) ?>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= hk_h($assetBase) ?>/assets/css/kurumsal.css">
  <meta name="x-hm-frontend" content="php-kurumsal">
</head>
<body class="<?= hk_h($bodyClass ?? 'hk-page') ?>">
<header class="hk-header">
  <div class="hk-header__inner">
    <a class="hk-brand" href="/">
      <span class="hk-brand__mark" aria-hidden="true"></span>
      <span class="hk-brand__text">
        <strong><?= hk_h($display) ?></strong>
        <?php if (!empty($site['tagline'])): ?>
          <em><?= hk_h((string) $site['tagline']) ?></em>
        <?php endif; ?>
      </span>
    </a>
    <nav class="hk-nav" aria-label="Ana menü">
      <?php foreach ($nav as $item): ?>
        <div class="hk-nav__item<?= $item['children'] !== [] ? ' has-children' : '' ?>">
          <a href="<?= hk_h($item['href']) ?>"><?= hk_h($item['label']) ?></a>
          <?php if ($item['children'] !== []): ?>
            <div class="hk-nav__drop">
              <?php foreach ($item['children'] as $child): ?>
                <a href="<?= hk_h($child['href']) ?>"><?= hk_h($child['label']) ?></a>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        </div>
      <?php endforeach; ?>
    </nav>
    <button type="button" class="hk-nav-toggle" aria-label="Menü" data-hk-nav-toggle>☰</button>
  </div>
</header>
<main class="hk-main">
  <?= $contentHtml ?>
</main>
<footer class="hk-footer">
  <div class="hk-footer__inner">
    <p><strong><?= hk_h($display) ?></strong></p>
    <p>Editör paneli: <a href="/editor">/editor</a> · Hızlı PHP ön yüz (Hostinger)</p>
  </div>
</footer>
<script src="<?= hk_h($assetBase) ?>/assets/js/kurumsal.js" defer></script>
</body>
</html>
