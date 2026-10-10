<?php
/* spor 2026-10-10: maç kartları. Skor yalnız homeScore doluysa (canlı veya bitmiş) basılır. */
declare(strict_types=1);

use Yenisafak\Html;

/** @var list<array<string, mixed>> $matches */
if ($matches === []) {
    return;
}
$heading = $heading ?? '';
?>
<?php if ($heading !== ''): ?><h3 class="spor-fx-h"><?= Html::e($heading) ?></h3><?php endif; ?>
<ul class="spor-fx">
<?php foreach ($matches as $m):
    $onAir = ($m['state'] ?? '') === 'in';
    $scored = $m['homeScore'] !== null && $m['awayScore'] !== null;
?>
  <li class="spor-fx-item<?= $onAir ? ' is-live' : '' ?>">
    <span class="spor-fx-when">
      <b><?= Html::e((string) $m['clockLabel']) ?></b>
      <small><?= Html::e((string) $m['dayLabel']) ?></small>
    </span>
    <span class="spor-fx-sides">
      <span class="home"><?= Html::e((string) $m['home']) ?></span>
      <?php if ($scored): ?>
        <span class="score" aria-label="Skor"><?= (int) $m['homeScore'] ?> – <?= (int) $m['awayScore'] ?></span>
      <?php else: ?>
        <span class="vs">v</span>
      <?php endif; ?>
      <span class="away"><?= Html::e((string) $m['away']) ?></span>
    </span>
    <span class="spor-fx-st">
      <?php if ($onAir): ?><span class="spor-live-dot" aria-hidden="true"></span><?php endif; ?>
      <?= Html::e((string) ($m['clock'] !== '' ? $m['clock'] : $m['status'])) ?>
    </span>
  </li>
<?php endforeach; ?>
</ul>
