<?php
/* sector 2026-10-10: kayıt avantajları (yalnız çalışan özellikler) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

$bn = (array) (Sector::$def['benefits'] ?? []);
if ($bn === []) {
    return;
}
?>
<section class="yn-wrap sc-benefits" aria-labelledby="sc-bn-h">
  <div class="sc-bn-head">
    <h2 class="yn-h2" id="sc-bn-h"><?= Html::e((string) $bn['title']) ?></h2>
    <p><?= Html::e((string) $bn['lead']) ?></p>
  </div>
  <ul class="sc-bn-grid">
    <?php foreach ((array) $bn['items'] as $i => $it): ?>
      <li class="sc-card sc-bn"><span class="sc-bn-n"><?= $i + 1 ?></span><b><?= Html::e((string) $it[0]) ?></b><span><?= Html::e((string) $it[1]) ?></span></li>
    <?php endforeach; ?>
  </ul>
  <p class="sc-bn-cta"><a class="yn-btn yn-btn-hot yn-btn-lg" href="/uye-ol">Ücretsiz kayıt ol →</a></p>
</section>
