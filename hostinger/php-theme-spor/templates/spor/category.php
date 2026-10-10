<?php
/* spor 2026-10-10: /kategori/<slug> — bilinen ve sitede duran diğer slug'lar. */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;

/** @var Yenisafak\Site $site */
/** @var string $name */
/** @var string $slug */
/** @var list<array<string, mixed>> $items */
/** @var int $page */
/** @var bool $hasMore */
$sec = Spor::section($slug) ?? ['name' => $name, 'blurb' => '', 'color' => '#0e8f3d', 'ink' => '#ffffff', 'slug' => $slug, 'short' => $name, 'group' => ''];
?>
<section class="spor-chero" style="--c:<?= Html::e($sec['color']) ?>;--on:<?= Html::e($sec['ink']) ?>">
  <div class="spor-wrap">
    <p class="spor-crumb"><a href="/">Ana Sayfa</a> / <?= Html::e($sec['name']) ?></p>
    <h1><?= Html::e($sec['name']) ?></h1>
    <?php if (($sec['blurb'] ?? '') !== ''): ?><p><?= Html::e($sec['blurb']) ?></p><?php endif; ?>
  </div>
</section>
<div class="spor-wrap spor-cat">
  <?php if ($items === []): ?>
    <p class="spor-empty">Bu branşta henüz haber yok. Yeni haberler geldikçe burada durur.</p>
  <?php else: ?>
    <div class="spor-cat-grid">
      <?php foreach ($items as $n => $s): $v = ($page === 1 && $n === 0) ? 'feature' : 'tile'; ?>
        <?php if ($v === 'feature'): ?><div class="spor-cat-span"><?php require __DIR__ . '/_card.php'; ?></div><?php else: require __DIR__ . '/_card.php'; endif; ?>
      <?php endforeach; ?>
    </div>
    <nav class="spor-pager" aria-label="Sayfalar">
      <?php if ($page > 1): ?><a class="spor-btn" href="/kategori/<?= Html::e($slug) ?><?= $page > 2 ? '?sayfa=' . ($page - 1) : '' ?>">Önceki</a><?php endif; ?>
      <?php if ($hasMore): ?><a class="spor-btn" href="/kategori/<?= Html::e($slug) ?>?sayfa=<?= $page + 1 ?>">Daha fazla</a><?php endif; ?>
    </nav>
  <?php endif; ?>
</div>
