<?php
/* tema 2026-10-10: "Sendika Portal Teması" ana sayfa girişi (tipografi ağırlıklı manifesto bloğu). */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $h */
/** @var array<string, mixed> $def */
$secs = Sector::sections();
?>
<section class="sd-hero" aria-labelledby="sd-h1">
  <div class="yn-wrap sd-hero-in">
    <p class="sd-eyebrow"><?= Html::e((string) $h['eyebrow']) ?></p>
    <h1 id="sd-h1" class="sd-h1"><span><?= Html::e((string) $h['l1']) ?></span> <span><?= Html::e((string) $h['l2']) ?></span> <span class="sd-h1-3"><?= Html::e((string) $h['l3']) ?><?= Html::e((string) $h['dot']) ?></span></h1>
    <div class="sd-lower">
      <div>
        <p class="sd-sub"><?= Html::e((string) $h['sub']) ?> <span class="yn-rotator" data-yn-rotator aria-live="off"><?php foreach ($h['rot'] as $i => $w): ?><b<?= $i === 0 ? ' class="is-on"' : '' ?>><?= Html::e((string) $w) ?></b><?php endforeach; ?></span> <?= Html::e((string) $h['sub2']) ?></p>
        <div class="sd-cta">
          <?php foreach ($h['cta'] as [$label, $href, $kind]): ?><a class="yn-btn yn-btn-<?= Html::e((string) $kind) ?> yn-btn-lg" href="<?= Html::e((string) $href) ?>"><?= Html::e((string) $label) ?></a><?php endforeach; ?>
        </div>
      </div>
      <ol class="sd-pledge" aria-label="Öne çıkanlar">
        <?php foreach (array_slice($def['tiles'], 0, 3) as $i => $t): ?>
          <li><a href="<?= Html::e((string) $t['href']) ?>"><span class="sd-n"><?= str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) ?></span><span><b><?= Html::e((string) $t['t']) ?></b><small><?= Html::e((string) $t['p']) ?></small></span></a></li>
        <?php endforeach; ?>
      </ol>
    </div>
  </div>
  <div class="sd-ticker" aria-hidden="true"><div class="sd-ticker-in">
    <?php for ($k = 0; $k < 3; $k++): foreach ($secs as $s): ?><span><?= Html::e(mb_strtoupper(strtr($s['name'], ['i' => 'İ', 'ı' => 'I']), 'UTF-8')) ?></span><?php endforeach; endfor; ?>
  </div></div>
</section>
