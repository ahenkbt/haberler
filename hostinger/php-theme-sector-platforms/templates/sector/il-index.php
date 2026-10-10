<?php
/* sector 2026-10-10: /il — okul platformu il listesi */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var list<array<string, mixed>> $provinces */
/** @var array<int|string, int|string> $counts */
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><a href="/bilgi">Bilgi Merkezi</a> / İller</p>
  <h1 class="yn-page-h">İllere göre <em>eğitim rehberi.</em></h1>
  <p class="yn-page-p">İlini seç: okul, özel kurum, yurt ve kurum dışı eğitim kayıtlarını ilçelere göre gör. Kayıtlar derlemedir; resmî bilgi için il millî eğitim müdürlüğüne başvurun.</p>
</div></section>
<div class="yn-wrap"><ul class="sc-mlist">
<?php foreach ($provinces as $p): ?>
  <li><a href="/il/<?= (int) $p['plaka'] ?>-<?= Html::e(Sector::slug((string) $p['adi'])) ?>"><?= Html::e(Sector::tr((string) $p['adi'])) ?> <small><?= (int) ($counts[$p['plaka']] ?? 0) ?> kayıt</small></a></li>
<?php endforeach; ?>
</ul></div>
