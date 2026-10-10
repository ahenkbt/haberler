<?php
/* tema 2026-10-10: "Muhtar Portal Teması" ana sayfa girişi (duyuru panosu + mühür). */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $h */
/** @var array<string, mixed> $def */
/** @var list<array<string, mixed>> $latest */
/** @var list<array<string, mixed>> $provinces */
$notes = [];
foreach (array_slice($latest, 4, 3) as $s) {
    $notes[] = [(string) $s['title'], '/haber/' . rawurlencode((string) $s['slug']), (string) Html::when((string) $s['publishedAt'])];
}
if (count($notes) < 3) {
    foreach ($def['tiles'] as $t) {
        if (count($notes) >= 3) {
            break;
        }
        $notes[] = [(string) $t['t'], (string) $t['href'], (string) $t['p']];
    }
}
?>
<section class="mu-hero" aria-labelledby="mu-h1">
  <div class="yn-wrap mu-hero-in">
    <div class="mu-copy">
      <p class="mu-eyebrow"><span aria-hidden="true">★</span> <?= Html::e((string) $h['eyebrow']) ?></p>
      <h1 id="mu-h1" class="mu-h1"><?= Html::e((string) $h['l1']) ?> <?= Html::e((string) $h['l2']) ?> <em><?= Html::e((string) $h['l3']) ?><?= Html::e((string) $h['dot']) ?></em></h1>
      <p class="mu-sub"><?= Html::e((string) $h['sub']) ?> <span class="yn-rotator" data-yn-rotator aria-live="off"><?php foreach ($h['rot'] as $i => $w): ?><b<?= $i === 0 ? ' class="is-on"' : '' ?>><?= Html::e((string) $w) ?></b><?php endforeach; ?></span> <?= Html::e((string) $h['sub2']) ?></p>
      <div class="mu-cta">
        <?php foreach ($h['cta'] as [$label, $href, $kind]): ?><a class="yn-btn yn-btn-<?= Html::e((string) $kind) ?> yn-btn-lg" href="<?= Html::e((string) $href) ?>"><?= Html::e((string) $label) ?></a><?php endforeach; ?>
      </div>
      <?php if ($provinces !== []): ?>
      <form class="sc-quick mu-quick" data-sc-province action="/mahallemi-bul" method="get" aria-label="Hızlı mahalle bul">
        <label for="sc-q-il">Hızlı bul:</label>
        <select id="sc-q-il" aria-label="İl seç"><option value="">İlini seç…</option>
          <?php foreach ($provinces as $p): ?><option value="/mahallemi-bul/<?= (int) $p['plaka'] ?>-<?= Html::e(Sector::slug((string) $p['adi'])) ?>"><?= Html::e(Sector::tr((string) $p['adi'])) ?></option><?php endforeach; ?>
        </select>
        <button class="yn-btn yn-btn-lime" type="submit">Mahallemi bul →</button>
      </form>
      <?php endif; ?>
    </div>
    <aside class="mu-board" aria-label="Duyuru panosu">
      <p class="mu-board-h"><span>DUYURU PANOSU</span><i aria-hidden="true"></i></p>
      <ul>
        <?php foreach ($notes as $i => [$t, $href, $m]): ?>
          <li style="--r:<?= [-1.4, .9, -.6][$i % 3] ?>deg"><a href="<?= Html::e($href) ?>"><i class="mu-pin" aria-hidden="true"></i><small>İLAN <?= str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) ?></small><b><?= Html::e(mb_strimwidth($t, 0, 96, '…')) ?></b><span><?= Html::e(mb_strimwidth($m, 0, 70, '…')) ?></span></a></li>
        <?php endforeach; ?>
      </ul>
      <div class="mu-seal" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><path id="mu-circ" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs><text><textPath href="#mu-circ" textLength="270" lengthAdjust="spacing">MAHALLE · MUHTARLIK · KOMŞULUK ·</textPath></text><path d="M60 38l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/></svg></div>
    </aside>
  </div>
</section>
