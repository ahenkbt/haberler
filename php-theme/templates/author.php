<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var array<string, mixed> $author */
/** @var list<array<string, mixed>> $items */
?>
<header class="ys-cat-hero">
  <h1><?= Html::e((string) $author['name']) ?></h1>
  <?php if (($author['title'] ?? '') !== ''): ?><p><?= Html::e((string) $author['title']) ?></p><?php endif; ?>
</header>
<div class="ys-wrap ys-category">
  <?php if (($author['bio'] ?? '') !== ''): ?><p class="ys-spot"><?= Html::e((string) $author['bio']) ?></p><?php endif; ?>
  <div class="ys-block-grid">
    <?php foreach ($items as $item): ?>
      <?php $eager = false; require __DIR__ . '/_card.php'; ?>
    <?php endforeach; ?>
  </div>
  <?php if ($items === []): ?><p class="ys-empty">Bu yazara ait yazı yok.</p><?php endif; ?>
</div>
