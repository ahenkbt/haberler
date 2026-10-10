<?php
/* sector 2026-10-10: sektör ana sayfası (yeni.tc ana sayfası kalıbı) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var Yenisafak\Site $site */
/** @var list<array<string, mixed>> $latest */
/** @var array<string, list<array<string, mixed>>> $per */
/** @var list<array<string, mixed>> $provinces */
/** @var array<string, int|string> $dirCount */
$def = Sector::$def;
$h = $def['hero'];
$used = [];
$withImg = array_values(array_filter($latest, static fn (array $s): bool => ($s['image'] ?? '') !== ''));
$lead = $withImg[0] ?? ($latest[0] ?? null);
if ($lead !== null) {
    $used[$lead['slug']] = true;
}
$side = [];
foreach ($latest as $s) {
    if (count($side) >= 3) {
        break;
    }
    if (!isset($used[$s['slug']])) {
        $side[] = $s;
        $used[$s['slug']] = true;
    }
}
$secs = Sector::sections();
?>
<?php $heroTpl = __DIR__ . '/hero-' . Sector::key() . '.php'; if (is_file($heroTpl)) { require $heroTpl; } else { ?>
<section class="yn-hero" aria-labelledby="yn-hero-h">
  <div class="yn-hero-bg" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
  <div class="yn-wrap yn-hero-in">
    <div class="yn-sticker" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><path id="yn-circ" d="M60 60 m-48 0 a48 48 0 1 1 96 0 a48 48 0 1 1 -96 0"/></defs><text><textPath href="#yn-circ" textLength="296" lengthAdjust="spacing"><?= Html::e((string) $h['sticker']) ?></textPath></text></svg><b></b></div>
    <p class="yn-eyebrow yn-hero-eye"><span class="yn-dot"></span><?= Html::e((string) $h['eyebrow']) ?></p>
    <h1 id="yn-hero-h" class="yn-hero-h">
      <span class="yn-hero-l1"><?= Html::e((string) $h['l1']) ?></span>
      <span class="yn-hero-l2"><?= Html::e((string) $h['l2']) ?></span>
      <span class="yn-hero-l3"><?= Html::e((string) $h['l3']) ?><span class="yn-hero-dot"><?= Html::e((string) $h['dot']) ?></span></span>
    </h1>
    <p class="yn-hero-sub"><?= Html::e((string) $h['sub']) ?> <span class="yn-rotator" data-yn-rotator aria-live="off"><?php foreach ($h['rot'] as $i => $w): ?><b<?= $i === 0 ? ' class="is-on"' : '' ?>><?= Html::e((string) $w) ?></b><?php endforeach; ?></span> <?= Html::e((string) $h['sub2']) ?></p>
    <div class="yn-hero-cta">
      <?php foreach ($h['cta'] as $i => [$label, $href, $kind]): ?><a class="yn-btn yn-btn-<?= Html::e((string) $kind) ?> yn-btn-lg" href="<?= Html::e((string) $href) ?>"><?= Html::e((string) $label) ?></a><?php endforeach; ?>
    </div>
    <?php if ($provinces !== []): ?>
    <form class="sc-quick" data-sc-province action="/mahallemi-bul" method="get" aria-label="Hızlı mahalle bul">
      <label for="sc-q-il">Hızlı bul:</label>
      <select id="sc-q-il" aria-label="İl seç"><option value="">İlini seç…</option>
        <?php foreach ($provinces as $p): ?><option value="/mahallemi-bul/<?= (int) $p['plaka'] ?>-<?= Html::e(Sector::slug((string) $p['adi'])) ?>"><?= Html::e(Sector::tr((string) $p['adi'])) ?></option><?php endforeach; ?>
      </select>
      <button class="yn-btn yn-btn-lime" type="submit">Mahallemi bul →</button>
    </form>
    <?php endif; ?>
  </div>
  <div class="yn-marquee" aria-hidden="true"><div class="yn-marquee-in">
    <?php for ($k = 0; $k < 2; $k++): foreach ($secs as $s): ?><span style="--c:<?= Html::e($s['color']) ?>"><?= Html::e($s['name']) ?></span><?php endforeach; endfor; ?>
  </div></div>
</section>
<?php } ?>

<section class="yn-wrap sc-tiles" aria-label="Hızlı erişim">
  <?php foreach ($def['tiles'] as $i => $t): ?>
    <a class="yn-tile sc-tile" href="<?= Html::e((string) $t['href']) ?>" style="--c:<?= Html::e((string) $t['c']) ?>" data-reveal>
      <span class="yn-tile-art"><?= Sector::art((string) $t['c'], (string) $t['motif'], $i + 4, 'yn-art') ?></span>
      <span class="yn-tile-h"><?= Html::e((string) $t['t']) ?></span>
      <span class="yn-tile-p"><?= Html::e((string) $t['p']) ?></span>
    </a>
  <?php endforeach; ?>
</section>

<?php if ($lead !== null): ?>
<section class="yn-wrap yn-cover" aria-label="Kapak">
  <div class="yn-cover-lead"><?php $s = $lead; $v = 'lead'; require __DIR__ . '/_card.php'; ?></div>
  <div class="yn-cover-side">
    <p class="yn-eyebrow">Son haberler</p>
    <?php foreach ($side as $n => $s): $v = 'row'; require __DIR__ . '/_card.php'; endforeach; ?>
  </div>
</section>
<?php else: ?>
<section class="yn-wrap yn-empty"><p>İlk yazılar yolda. <a href="/uye-ol">Rehbere başvurarak</a> sen de katkı verebilirsin.</p></section>
<?php endif; ?>

<?php foreach ($secs as $si => $sec):
    $items = array_values(array_filter($per[$sec['slug']] ?? [], static fn (array $s): bool => !isset($used[$s['slug']])));
    if ($items === []) {
        continue;
    }
    $items = array_slice($items, 0, 3);
    foreach ($items as $s) {
        $used[$s['slug']] = true;
    }
?>
<section class="yn-wrap yn-sec<?= $si % 2 ? ' yn-sec-alt' : '' ?>" style="--c:<?= Html::e($sec['color']) ?>" aria-labelledby="yn-sec-<?= Html::e($sec['slug']) ?>">
  <header class="yn-sec-head" data-reveal>
    <span class="yn-sec-art"><?= Sector::art($sec['color'], $sec['motif'], $si, 'yn-art') ?></span>
    <div>
      <h2 id="yn-sec-<?= Html::e($sec['slug']) ?>"><a href="/kategori/<?= Html::e($sec['slug']) ?>"><?= Html::e($sec['name']) ?></a></h2>
      <p><?= Html::e($sec['blurb']) ?></p>
    </div>
    <a class="yn-more" href="/kategori/<?= Html::e($sec['slug']) ?>">Bölüme git →</a>
  </header>
  <div class="yn-rail">
    <?php foreach ($items as $n => $s): $v = $n === 0 ? 'wide' : 'std'; require __DIR__ . '/_card.php'; endforeach; ?>
  </div>
</section>
<?php endforeach; ?>

<?php require __DIR__ . '/_benefits.php'; ?>
<section class="yn-voice-band" aria-labelledby="yn-vb-h">
  <div class="yn-wrap yn-voice-in" data-reveal>
    <div>
      <p class="yn-eyebrow">Katıl</p>
      <h2 id="yn-vb-h"><?= Html::e((string) ($def['join_h'] ?? 'Rehberin parçası ol.')) ?></h2>
      <p><?= Html::e((string) ($def['join_p'] ?? 'Rolünü seç, başvur. Editörlerimiz başvuruyu inceler; onaylanan rehber kayıtları yayımlanır. Üyelik ücretsizdir; ödeme, bağış ya da abonelik yoktur.')) ?></p>
    </div>
    <a class="yn-btn yn-btn-lime yn-btn-lg" href="/uye-ol">Başvur →</a>
  </div>
</section>

<section class="yn-wrap sc-res" aria-labelledby="sc-res-h">
  <h2 id="sc-res-h" class="yn-h2">Resmî kaynaklar</h2>
  <div class="sc-res-grid">
    <?php foreach ($def['resources'] as [$n, $u, $d]): ?>
      <a class="sc-res-card" href="<?= Html::e((string) $u) ?>" target="_blank" rel="noopener nofollow"><b><?= Html::e((string) $n) ?> ↗</b><span><?= Html::e((string) $d) ?></span></a>
    <?php endforeach; ?>
  </div>
</section>

<?php $more = array_values(array_filter($latest, static fn (array $s): bool => !isset($used[$s['slug']]))); if ($more !== []): ?>
<section class="yn-wrap yn-list" aria-labelledby="yn-more-h">
  <h2 id="yn-more-h" class="yn-h2">Son haberler</h2>
  <div class="yn-list-grid"><?php foreach (array_slice($more, 0, 8) as $n => $s): $v = 'text'; require __DIR__ . '/_card.php'; endforeach; ?></div>
</section>
<?php endif; ?>
