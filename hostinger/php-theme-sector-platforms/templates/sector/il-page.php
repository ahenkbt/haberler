<?php
/* sector 2026-10-10: /il/<plaka>-<ad> — okul platformu il sayfası (yalnız dizin verisi + resmî bağlantılar) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var int $plaka */
/** @var string $name */
/** @var array<string, int|string> $kinds */
/** @var list<array<string, mixed>> $ilce */
/** @var string $mem */
$labels = [];
foreach ((array) Sector::$def['kinds'] as $k) {
    $labels[(string) $k['key']] = (string) $k['label'];
}
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><a href="/il">İller</a> / <?= Html::e($name) ?></p>
  <h1 class="yn-page-h"><?= Html::e($name) ?> <em>eğitim rehberi.</em></h1>
  <p class="yn-page-p"><?= Html::e($name) ?> ilindeki kayıtlı okul, özel kurum, yurt ve kurum dışı eğitim kayıtları. Veriler platform dizininden alınır ve derlemedir; resmî bilgi için il millî eğitim müdürlüğüne başvurun.</p>
</div></section>
<div class="yn-wrap sc-kb">
  <section class="sc-card"><h2>Kayıt türleri</h2><ul>
  <?php foreach (['okul', 'ozel', 'kurumdisi', 'yurt'] as $k): $n = (int) ($kinds[$k] ?? 0); if ($n === 0) { continue; } ?>
    <li><a href="/rehber/<?= Html::e($k) ?>?sehir=<?= (int) $plaka ?>"><?= Html::e($labels[$k] ?? $k) ?></a> — <?= $n ?> kayıt</li>
  <?php endforeach; ?>
  <?php if (array_sum(array_map('intval', $kinds)) === 0): ?><li>Bu il için henüz onaylı kayıt yok.</li><?php endif; ?>
  </ul></section>
<?php if ($ilce !== []): ?>
  <section class="sc-card"><h2>İlçelere göre okullar</h2><ul class="sc-mlist">
  <?php foreach ($ilce as $i): ?><li><a href="/rehber/okul?sehir=<?= (int) $plaka ?>&amp;ilce=<?= (int) $i['id'] ?>"><?= Html::e(Sector::tr((string) $i['adi'])) ?> <small><?= (int) $i['c'] ?> okul</small></a></li><?php endforeach; ?>
  </ul></section>
<?php endif; ?>
  <section class="sc-kb-src"><h2>Resmî kaynaklar</h2><ul>
    <?php if ($mem !== ''): ?><li><a href="<?= Html::e($mem) ?>" target="_blank" rel="noopener nofollow"><?= Html::e($name) ?> İl Millî Eğitim Müdürlüğü ↗</a></li><?php endif; ?>
    <li><a href="https://www.meb.gov.tr" target="_blank" rel="noopener nofollow">Millî Eğitim Bakanlığı ↗</a></li>
    <li><a href="https://www.turkiye.gov.tr" target="_blank" rel="noopener nofollow">e-Devlet Kapısı (e-Okul) ↗</a></li>
  </ul></section>
</div>
