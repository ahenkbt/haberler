<?php
/* sector 2026-10-10: /rehber — rehber/dizin modülü ana sayfası */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, int|string> $counts */
$def = Sector::$def;
$c = Sector::colors();
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Rehber</p>
  <h1 class="yn-page-h"><?= Html::e((string) $def['short']) ?> <em>rehberi.</em></h1>
  <p class="yn-page-p"><?= Html::e((string) $def['desc']) ?></p>
</div></section>
<div class="yn-wrap yn-tiles">
<?php if (Sector::key() === 'muhtar'): ?>
  <a class="yn-tile" href="/mahallemi-bul" style="--c:#0F766E" data-reveal><span class="yn-tile-art"><?= Sector::art('#0F766E', 'rings', 3, 'yn-art') ?></span><span class="yn-tile-h">Mahallemi Bul</span><span class="yn-tile-p">81 il, ilçe ve mahalle: mahalleni seç, muhtarını ve talep formunu gör.</span></a>
<?php endif; ?>
<?php foreach ($def['kinds'] as $i => $k): ?>
  <a class="yn-tile" href="/rehber/<?= Html::e((string) $k['key']) ?>" style="--c:<?= Html::e($c['hot']) ?>" data-reveal>
    <span class="yn-tile-art"><?= Sector::art($c['hot'], ['grid', 'bars', 'dots'][$i % 3], $i + 8, 'yn-art') ?></span>
    <span class="yn-tile-h"><?= Html::e((string) $k['label']) ?></span>
    <span class="yn-tile-p"><?= Html::e((string) $k['blurb']) ?></span>
    <span class="yn-tile-l"><span><?= (int) ($counts[$k['key']] ?? 0) ?> onaylı kayıt</span></span>
  </a>
<?php endforeach; ?>
<?php if (Sector::key() === 'sendika'): ?>
  <a class="yn-tile" href="/araclar" style="--c:#D92B25" data-reveal><span class="yn-tile-art"><?= Sector::art('#D92B25', 'bars', 21, 'yn-art') ?></span><span class="yn-tile-h">Hesaplama araçları</span><span class="yn-tile-p">Kıdem, ihbar, yıllık izin, fazla mesai ve zam hesaplayıcıları.</span></a>
<?php endif; ?>
  <a class="yn-tile" href="/talep" style="--c:<?= Html::e($c['violet']) ?>" data-reveal><span class="yn-tile-art"><?= Sector::art($c['violet'], 'quote', 5, 'yn-art') ?></span><span class="yn-tile-h"><?= Html::e((string) $def['request']['title']) ?></span><span class="yn-tile-p"><?= Html::e((string) mb_substr((string) $def['request']['lead'], 0, 120)) ?>…</span></a>
  <a class="yn-tile" href="/uye-ol" style="--c:<?= Html::e($c['hot2']) ?>" data-reveal><span class="yn-tile-art"><?= Sector::art($c['hot2'], 'sun', 6, 'yn-art') ?></span><span class="yn-tile-h">Üye ol / Rehbere başvur</span><span class="yn-tile-p">Rolünü seç; onaylanan kayıtlar rehberde yayımlanır.</span></a>
</div>
<section class="yn-wrap sc-res" aria-labelledby="sc-res-h">
  <h2 id="sc-res-h" class="yn-h2">Resmî kaynaklar</h2>
  <div class="sc-res-grid">
    <?php foreach ($def['resources'] as [$n, $u, $d]): ?>
      <a class="sc-res-card" href="<?= Html::e((string) $u) ?>" target="_blank" rel="noopener nofollow"><b><?= Html::e((string) $n) ?> ↗</b><span><?= Html::e((string) $d) ?></span></a>
    <?php endforeach; ?>
  </div>
</section>
