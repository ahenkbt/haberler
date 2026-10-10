<?php
/* sector 2026-10-10: /bilgi — bilgi merkezi ana sayfası */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $hub */
/** @var array<string, array<string, mixed>> $pages */
$c = Sector::colors();
$motifs = ['grid', 'quote', 'rings', 'bars', 'dots', 'sun'];
$cols = [$c['hot'], $c['violet'], $c['hot2'], $c['mag'], $c['sun'], $c['hot']];
$i = 0;
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Bilgi Merkezi</p>
  <h1 class="yn-page-h"><?= Html::e((string) Sector::$def['short']) ?> <em>bilgi merkezi.</em></h1>
  <p class="yn-page-p"><?= Html::e((string) ($hub['intro'] ?? '')) ?></p>
</div></section>
<div class="yn-wrap yn-tiles">
<?php foreach ($pages as $slug => $pg): $col = $cols[$i % 6]; ?>
  <a class="yn-tile" href="/<?= Html::e((string) $slug) ?>" style="--c:<?= Html::e($col) ?>" data-reveal>
    <span class="yn-tile-art"><?= Sector::art($col, $motifs[$i % 6], $i + 31, 'yn-art') ?></span>
    <span class="yn-tile-h"><?= Html::e((string) $pg['h1']) ?></span>
    <span class="yn-tile-p"><?= Html::e((string) $pg['desc']) ?></span>
  </a>
<?php $i++; endforeach; ?>
  <a class="yn-tile" href="/araclar" style="--c:<?= Html::e($c['hot']) ?>" data-reveal><span class="yn-tile-art"><?= Sector::art($c['hot'], 'bars', 41, 'yn-art') ?></span><span class="yn-tile-h">Araçlar</span><span class="yn-tile-p"><?= Sector::key() === 'sendika' ? 'Kıdem, ihbar, yıllık izin, fazla mesai ve zam hesaplayıcıları.' : (Sector::key() === 'okul' ? 'Net hesaplama, ağırlıklı ortalama ve resmî tarihlere geri sayım.' : 'Dilekçe metni oluşturucu ve adres bildirim süresi hesaplayıcı.') ?></span></a>
<?php if (Sector::key() === 'okul'): ?>
  <a class="yn-tile" href="/il" style="--c:<?= Html::e($c['violet']) ?>" data-reveal><span class="yn-tile-art"><?= Sector::art($c['violet'], 'rings', 42, 'yn-art') ?></span><span class="yn-tile-h">İllere göre rehber</span><span class="yn-tile-p">81 il: okul, özel kurum, yurt ve kurum dışı eğitim kayıtları ilçelere göre.</span></a>
<?php elseif (Sector::key() === 'muhtar'): ?>
  <a class="yn-tile" href="/mahallemi-bul" style="--c:<?= Html::e($c['violet']) ?>" data-reveal><span class="yn-tile-art"><?= Sector::art($c['violet'], 'rings', 42, 'yn-art') ?></span><span class="yn-tile-h">Mahallemi Bul</span><span class="yn-tile-p">81 il, ilçe ve mahalle: muhtarını ve mahalle sayfasını bul.</span></a>
<?php endif; ?>
</div>
