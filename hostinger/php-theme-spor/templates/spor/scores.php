<?php
/* spor 2026-10-10: /canli-skor */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;
use Yenisafak\SporLive;

/** @var array<string, mixed> $live */
$groups = [];
foreach ($live['matches'] ?? [] as $m) {
    if (!is_array($m)) {
        continue;
    }
    $groups[(string) $m['dayKey']]['label'] = (string) $m['dayLabel'];
    $groups[(string) $m['dayKey']]['rows'][] = $m;
}
ksort($groups);
?>
<section class="spor-chero" style="--c:#0e8f3d;--on:#fff"><div class="spor-wrap">
  <p class="spor-crumb"><a href="/">Ana Sayfa</a> / Canlı skor</p>
  <h1>Canlı skor</h1>
  <p>Süper Lig.<?php if (($live['season'] ?? '') !== ''): ?> Sezon <?= Html::e((string) $live['season']) ?>.<?php endif; ?>
  <?php if (!empty($live['fetchedAt'])): ?> Son okuma <?= Html::e(Spor::clockTr((int) $live['fetchedAt'])) ?> TSİ<?php if (!empty($live['degraded'])): ?> (son iyi veri, en fazla 6 saat)<?php endif; ?>.<?php endif; ?></p>
</div></section>
<div class="spor-wrap spor-page">
  <?php if (!SporLive::hasFixtures($live) && ($live['matches'] ?? []) === []): ?>
    <p class="spor-empty">Skor kaynağı şu an yanıt vermiyor. Uydurma skor gösterilmez.</p>
  <?php else: ?>
    <?php foreach ($groups as $g): $matches = $g['rows']; $heading = $g['label']; require __DIR__ . '/_fixtures.php'; endforeach; ?>
    <p class="spor-src">Kaynak: ESPN<?= ($live['league'] ?? '') !== '' ? ' · ' . Html::e((string) $live['league']) : '' ?>. Başlamamış maçta skor basılmaz.</p>
  <?php endif; ?>
</div>
