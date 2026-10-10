<?php
/* sector 2026-10-10: /kategori/<slug> (App::render override; same data as templates/category.php) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var Yenisafak\Site $site */
/** @var string $name */
/** @var string $slug */
/** @var list<array<string, mixed>> $items */
/** @var int $page */
/** @var bool $hasMore */
$sec = Sector::section($slug) ?? ['name' => $name, 'blurb' => '', 'color' => Sector::colors()['hot'], 'slug' => $slug, 'motif' => 'dots'];
?>
<section class="yn-chero" style="--c:<?= Html::e($sec['color']) ?>">
  <div class="yn-chero-art" aria-hidden="true"><?= Sector::art($sec['color'], $sec['motif'] ?? 'dots', 5, 'yn-art') ?></div>
  <div class="yn-wrap yn-chero-in">
    <p class="yn-eyebrow"><a href="/bolumler">Bölümler</a> / <?= Html::e($sec['name']) ?></p>
    <h1 class="yn-chero-h"><?= Html::e($sec['name']) ?></h1>
    <?php if ($sec['blurb'] !== ''): ?><p class="yn-chero-p"><?= Html::e($sec['blurb']) ?></p><?php endif; ?>
    <a class="yn-btn yn-btn-lime" href="/uye-ol">Katıl / Başvur →</a>
  </div>
</section>
<div class="yn-wrap yn-cat">
  <?php if ($items === []): ?>
    <p class="yn-empty">Bu bölümün ilk yazıları yolda.</p>
  <?php else: ?>
    <div class="yn-grid3">
      <?php foreach ($items as $n => $s): $v = ($page === 1 && $n === 0) ? 'lead' : 'std'; ?>
        <?php if ($v === 'lead'): ?><div class="yn-grid-span"><?php require __DIR__ . '/_card.php'; ?></div><?php else: require __DIR__ . '/_card.php'; endif; ?>
      <?php endforeach; ?>
    </div>
    <nav class="yn-pager" aria-label="Sayfalar">
      <?php if ($page > 1): ?><a class="yn-btn yn-btn-ghost" href="/kategori/<?= Html::e($slug) ?><?= $page > 2 ? '?sayfa=' . ($page - 1) : '' ?>">← Önceki</a><?php endif; ?>
      <?php if ($hasMore): ?><a class="yn-btn yn-btn-ghost" href="/kategori/<?= Html::e($slug) ?>?sayfa=<?= $page + 1 ?>">Daha fazla →</a><?php endif; ?>
    </nav>
  <?php endif; ?>
</div>
