<?php
/* spor 2026-10-10: /fikstur */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;
use Yenisafak\SporLive;

/** @var array<string, mixed> $live */
$upcoming = $live['upcoming'] ?? [];
$groups = [];
foreach ($upcoming as $m) {
    $groups[(string) $m['dayKey']]['label'] = (string) $m['dayLabel'];
    $groups[(string) $m['dayKey']]['rows'][] = $m;
}
?>
<section class="spor-chero" style="--c:#0e8f3d;--on:#fff"><div class="spor-wrap">
  <p class="spor-crumb"><a href="/">Ana Sayfa</a> / Fikstür</p>
  <h1>Süper Lig fikstür</h1>
  <p>Sıradaki maçlar.<?php if (!empty($live['fetchedAt'])): ?> Son okuma <?= Html::e(Spor::clockTr((int) $live['fetchedAt'])) ?> TSİ.<?php endif; ?></p>
</div></section>
<div class="spor-wrap spor-page">
  <?php if ($upcoming === []): ?>
    <p class="spor-empty">Yaklaşan maç listesi şu an yok. Fikstür uydurulmaz.</p>
    <?php if (($live['results'] ?? []) !== []): $matches = $live['results']; $heading = 'Bugün oynananlar'; require __DIR__ . '/_fixtures.php'; endif; ?>
  <?php else: ?>
    <?php foreach ($groups as $g): $matches = $g['rows']; $heading = $g['label']; require __DIR__ . '/_fixtures.php'; endforeach; ?>
    <p class="spor-src">Kaynak: ESPN<?= ($live['league'] ?? '') !== '' ? ' · ' . Html::e((string) $live['league']) : '' ?>.</p>
  <?php endif; ?>
</div>
