<?php
/* sector 2026-10-10: form sonucu */
declare(strict_types=1);

use Yenisafak\Html;

/** @var string $h */
/** @var string $html */
?>
<section class="yn-phero"><div class="yn-wrap sc-thanks">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Sonuç</p>
  <h1 class="yn-page-h"><?= Html::e($h) ?></h1>
  <div class="yn-page-p sc-thanks-body"><?= $html ?></div>
</div></section>
