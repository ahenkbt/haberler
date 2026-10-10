<?php
/* spor 2026-10-10: /transfer — mevcut haberlerden süzülür, ayrı kategori açılmaz. */
declare(strict_types=1);

/** @var Yenisafak\Site $site */
/** @var list<array<string, mixed>> $items */
?>
<section class="spor-chero" style="--c:#f5c518;--on:#12161a"><div class="spor-wrap">
  <p class="spor-crumb"><a href="/">Ana Sayfa</a> / Transfer</p>
  <h1>Transfer</h1>
  <p>Başlığında transfer, bonservis veya kiralık geçen haberler. Ayrı bir kategori değildir; futbol ve spor haberlerinin içinden süzülür.</p>
</div></section>
<div class="spor-wrap spor-page">
  <?php if ($items === []): ?>
    <p class="spor-empty">Bu süzgeçte şu an haber yok.</p>
  <?php else: ?>
    <div class="spor-cat-grid"><?php foreach ($items as $s): $v = 'tile'; require __DIR__ . '/_card.php'; endforeach; ?></div>
  <?php endif; ?>
</div>
