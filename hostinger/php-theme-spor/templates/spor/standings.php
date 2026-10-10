<?php
/* spor 2026-10-10: /puan-durumu */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;
use Yenisafak\SporLive;

/** @var array<string, mixed> $live */
?>
<section class="spor-chero" style="--c:#f5c518;--on:#12161a"><div class="spor-wrap">
  <p class="spor-crumb"><a href="/">Ana Sayfa</a> / Puan durumu</p>
  <h1>Süper Lig puan durumu</h1>
  <p><?php if (($live['season'] ?? '') !== ''): ?><?= Html::e((string) $live['season']) ?>. <?php endif; ?>
  <?php if (!empty($live['fetchedAt'])): ?>Son okuma <?= Html::e(Spor::clockTr((int) $live['fetchedAt'])) ?> TSİ<?php if (!empty($live['degraded'])): ?> (son iyi veri)<?php endif; ?>.<?php endif; ?></p>
</div></section>
<div class="spor-wrap spor-page">
  <?php if (!SporLive::hasTable($live)): ?>
    <p class="spor-empty">Puan durumu şu an alınamıyor. Tablo boş bırakıldı; sıra ve puan üretilmez.</p>
  <?php else: ?>
    <?php $rows = $live['standings']; $season = (string) ($live['season'] ?? ''); $linkAll = false; require __DIR__ . '/_table.php'; ?>
    <ul class="spor-legend">
      <li class="z-cl">Şampiyonlar Ligi</li>
      <li class="z-clq">ŞL elemesi</li>
      <li class="z-el">Avrupa Ligi elemesi</li>
      <li class="z-ecl">Konferans Ligi elemesi</li>
      <li class="z-rel">Düşme hattı</li>
    </ul>
    <p class="spor-src">Kaynak: ESPN<?= ($live['league'] ?? '') !== '' ? ' · ' . Html::e((string) $live['league']) : '' ?>. Bölge etiketleri kaynağın not alanından gelir; not yoksa satır renksiz kalır.</p>
  <?php endif; ?>
</div>
