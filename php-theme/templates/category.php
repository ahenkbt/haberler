<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var string $name */
/** @var string $slug */
/** @var list<array<string, mixed>> $items */
/** @var int $page */
/** @var bool $hasMore */
?>
<header class="ys-cat-hero"><h1><?= Html::e($name) ?></h1></header>
<div class="ys-wrap ys-category">
  <?php if ($items === []): ?>
    <p class="ys-empty">Bu kategoride henüz haber yok.</p>
  <?php else: ?>
    <div class="ys-block-grid">
      <?php foreach ($items as $item): ?>
        <?php $eager = false; require __DIR__ . '/_card.php'; ?>
      <?php endforeach; ?>
    </div>
    <p class="ys-more">
      <?php if ($page > 1): ?>
        <a href="<?= Html::e($site->path('/kategori/' . $slug . ($page > 2 ? '?sayfa=' . ($page - 1) : ''))) ?>">Önceki</a>
      <?php endif; ?>
      <?php if ($hasMore): ?>
        <a href="<?= Html::e($site->path('/kategori/' . $slug . '?sayfa=' . ($page + 1))) ?>">Daha fazla</a>
      <?php endif; ?>
    </p>
  <?php endif; ?>
</div>
