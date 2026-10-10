<?php
/* sector 2026-10-10: /bolumler */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, list<array<string, mixed>>> $per */
$secs = Sector::sections();
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Bölümler</p>
  <h1 class="yn-page-h"><?= Html::e((string) Sector::$def['name']) ?> <em>bölümleri.</em></h1>
</div></section>
<div class="yn-wrap yn-tiles">
  <?php foreach ($secs as $i => $sec): $items = $per[$sec['slug']] ?? []; ?>
    <a class="yn-tile" href="/kategori/<?= Html::e($sec['slug']) ?>" style="--c:<?= Html::e($sec['color']) ?>" data-reveal>
      <span class="yn-tile-art"><?= Sector::art($sec['color'], $sec['motif'], $i + 11, 'yn-art') ?></span>
      <span class="yn-tile-h"><?= Html::e($sec['name']) ?></span>
      <span class="yn-tile-p"><?= Html::e($sec['blurb']) ?></span>
      <?php if ($items !== []): ?><span class="yn-tile-l"><?php foreach (array_slice($items, 0, 2) as $s): ?><span>→ <?= Html::e((string) $s['title']) ?></span><?php endforeach; ?></span><?php endif; ?>
    </a>
  <?php endforeach; ?>
</div>
