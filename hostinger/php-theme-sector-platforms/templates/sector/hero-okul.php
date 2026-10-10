<?php
/* tema 2026-10-10: "Okul Portal Teması" ana sayfa girişi (defter/karne + rozetler). Aynı veri, yeni yerleşim. */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $h */
/** @var array<string, mixed> $def */
$badges = [
    ['Başarı Köşesi', 'Motivasyon ve verimli çalışma', '/kategori/ok-basari-kosesi', '#F59E0B', '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'],
    ['Okul Rehberi', 'İl ve ilçeye göre okullar', '/rehber/okul', '#0EA5A4', '<path d="M3 10l9-6 9 6v2H3zM5 12v7h4v-4h6v4h4v-7"/>'],
    ['MEB Duyuruları', 'Kayıt, nakil, takvim', '/kategori/ok-meb-duyurulari', '#2F6BFF', '<path d="M4 9v6h3l5 4V5L7 9zM16 8.5a5 5 0 010 7"/>'],
    ['Sınavlar', 'LGS, YKS ve takvim', '/kategori/ok-sinavlar', '#E11D48', '<path d="M6 3h9l3 3v15H6zM9 11h6M9 15h6M9 7h3"/>'],
];
?>
<section class="ok-hero" aria-labelledby="ok-h1">
  <div class="yn-wrap ok-hero-in">
    <div class="ok-copy">
      <p class="ok-eyebrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0zM12 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0"/></svg><?= Html::e((string) $h['eyebrow']) ?></p>
      <h1 id="ok-h1" class="ok-h1"><?= Html::e((string) $h['l1']) ?> <mark><?= Html::e((string) $h['l2']) ?></mark> <span><?= Html::e((string) $h['l3']) ?><?= Html::e((string) $h['dot']) ?></span></h1>
      <p class="ok-sub"><?= Html::e((string) $h['sub']) ?> <span class="yn-rotator" data-yn-rotator aria-live="off"><?php foreach ($h['rot'] as $i => $w): ?><b<?= $i === 0 ? ' class="is-on"' : '' ?>><?= Html::e((string) $w) ?></b><?php endforeach; ?></span> <?= Html::e((string) $h['sub2']) ?></p>
      <div class="ok-cta">
        <?php foreach ($h['cta'] as [$label, $href, $kind]): ?><a class="yn-btn yn-btn-<?= Html::e((string) $kind) ?> yn-btn-lg" href="<?= Html::e((string) $href) ?>"><?= Html::e((string) $label) ?></a><?php endforeach; ?>
      </div>
    </div>
    <ul class="ok-badges" aria-label="Hızlı bölümler">
      <?php foreach ($badges as $i => [$t, $p, $href, $col, $ico]): ?>
        <li style="--c:<?= Html::e($col) ?>;--r:<?= [-3, 2, 3, -2][$i] ?>deg"><a href="<?= Html::e($href) ?>"><span class="ok-medal"><svg viewBox="0 0 24 24" aria-hidden="true"><?= $ico ?></svg></span><b><?= Html::e($t) ?></b><small><?= Html::e($p) ?></small></a></li>
      <?php endforeach; ?>
    </ul>
  </div>
  <svg class="ok-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30c120 28 240 28 360 0s240-28 360 0 240 28 360 0 240-28 360 0v30H0z"/></svg>
</section>
