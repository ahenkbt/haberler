<?php
/* eco 2026-10-10: /bolumler */
declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var array<string, list<array<string, mixed>>> $per */
?>
<section class="eco-chero" style="--c:#c9a227"><div class="eco-wrap">
  <p class="eco-crumb"><a href="/">Ana Sayfa</a> / Bölümler</p>
  <h1>Bölümler</h1>
  <p>Piyasalardan şirketlere, makro ekonomiden gayrimenkule tüm ekonomi bölümleri.</p>
</div></section>
<div class="eco-wrap eco-secpage">
  <?php foreach (Eco::sections() as $sec): $items = array_slice($per[$sec['slug']] ?? [], 0, 3); ?>
  <section class="eco-sub" style="--c:<?= Html::e($sec['color']) ?>">
    <h2 class="eco-sub-h"><a href="/kategori/<?= Html::e($sec['slug']) ?>"><?= Html::e($sec['name']) ?></a><small><?= Html::e($sec['blurb']) ?></small></h2>
    <?php if ($items !== []): ?><div class="eco-sub-grid"><?php foreach ($items as $s): $v = 'std'; require __DIR__ . '/_card.php'; endforeach; ?></div><?php else: ?><p class="eco-empty">Yakında.</p><?php endif; ?>
  </section>
  <?php endforeach; ?>
</div>
