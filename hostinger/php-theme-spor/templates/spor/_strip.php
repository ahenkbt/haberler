<?php
/* spor 2026-10-10: LED skor / puan şeridi. $live boşsa şerit yok. */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\SporLive;

/** @var array<string, mixed> $live */
if (!SporLive::hasStrip($live)) {
    return;
}
$chips = [];
foreach (array_slice($live['live'] ?? [], 0, 6) as $m) {
    $chips[] = ['kind' => 'match', 'm' => $m];
}
if ($chips === []) {
    foreach (array_slice($live['results'] ?? [], 0, 4) as $m) {
        $chips[] = ['kind' => 'match', 'm' => $m];
    }
}
if (count($chips) < 3) {
    foreach (array_slice($live['upcoming'] ?? [], 0, 4) as $m) {
        $chips[] = ['kind' => 'match', 'm' => $m];
    }
}
$top = array_slice($live['standings'] ?? [], 0, 8);
?>
<div class="spor-strip" role="region" aria-label="Süper Lig skor ve puan şeridi">
  <div class="spor-wrap spor-strip-in">
    <?php if ($chips !== []): ?>
    <ul class="spor-strip-ul">
      <?php foreach ($chips as $chip): $m = $chip['m']; $scored = $m['homeScore'] !== null && $m['awayScore'] !== null; $on = ($m['state'] ?? '') === 'in'; ?>
      <li class="<?= $on ? 'is-live' : '' ?>">
        <a href="/canli-skor" title="<?= Html::e($m['home'] . ' - ' . $m['away']) ?>">
          <?php if ($on): ?><span class="spor-live-dot" aria-hidden="true"></span><?php endif; ?>
          <span class="ab"><?= Html::e((string) $m['homeAbbr']) ?></span>
          <?php if ($scored): ?><b><?= (int) $m['homeScore'] ?>–<?= (int) $m['awayScore'] ?></b><?php else: ?><em><?= Html::e((string) $m['clockLabel']) ?></em><?php endif; ?>
          <span class="ab"><?= Html::e((string) $m['awayAbbr']) ?></span>
        </a>
      </li>
      <?php endforeach; ?>
    </ul>
    <?php endif; ?>
    <?php if ($top !== []): ?>
    <ol class="spor-strip-table">
      <?php foreach ($top as $r): ?>
      <li><a href="/puan-durumu" title="<?= Html::e((string) $r['team']) ?>"><span class="rk"><?= (int) $r['rank'] ?></span> <?= Html::e((string) $r['abbr']) ?> <b><?= (int) $r['points'] ?></b></a></li>
      <?php endforeach; ?>
    </ol>
    <?php endif; ?>
  </div>
</div>
