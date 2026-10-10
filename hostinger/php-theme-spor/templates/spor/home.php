<?php
/* spor 2026-10-10: Spor Gündemi ana sayfa */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;
use Yenisafak\SporLive;

/** @var Yenisafak\Site $site */
/** @var list<array<string, mixed>> $latest */
/** @var array<string, list<array<string, mixed>>> $per */
/** @var list<array<string, mixed>> $popular */
/** @var list<array<string, mixed>> $transfers */
/** @var array<string, mixed> $live */
$used = [];
$take = static function (array $list, int $n) use (&$used): array {
    $out = [];
    foreach ($list as $s) {
        if (!is_array($s) || count($out) >= $n) {
            break;
        }
        $slug = (string) ($s['slug'] ?? '');
        if ($slug === '' || isset($used[$slug])) {
            continue;
        }
        $out[] = $s;
        $used[$slug] = true;
    }
    return $out;
};
$pool = static function (string $slug) use ($per): array {
    $rows = [];
    foreach ($per[$slug] ?? [] as $s) {
        if (is_array($s)) {
            $rows[] = $s;
        }
    }
    return $rows;
};
$withImg = array_values(array_filter($latest, static fn (array $s): bool => ($s['image'] ?? '') !== ''));
$slides = $take($withImg, 5);
if (count($slides) < 1) {
    $slides = $take($latest, 1);
}
$rail = $take($latest, 4);
$breaking = array_slice($latest, 0, 8);
$sectionItems = static function (string $slug, int $n) use ($pool, &$used): array {
    $out = [];
    foreach ($pool($slug) as $s) {
        if (count($out) >= $n) {
            break;
        }
        $id = (string) ($s['slug'] ?? '');
        if ($id === '' || isset($used[$id])) {
            continue;
        }
        $out[] = $s;
    }
    foreach ($out as $s) {
        $used[(string) $s['slug']] = true;
    }
    return $out;
};
$futbol = $sectionItems('futbol', 5);
$basket = $sectionItems('basketbol', 4);
$voley = $sectionItems('voleybol', 4);
$others = [];
foreach (Spor::otherSlugs() as $slug) {
    $items = $sectionItems($slug, 3);
    if ($items !== []) {
        $others[$slug] = $items;
    }
}
$transferLeft = [];
foreach ($transfers as $s) {
    $id = (string) ($s['slug'] ?? '');
    if ($id !== '' && !isset($used[$id])) {
        $transferLeft[] = $s;
        $used[$id] = true;
    }
    if (count($transferLeft) >= 8) {
        break;
    }
}
$n = 0;
?>
<?php if ($breaking !== []): ?>
<section class="spor-break" aria-label="Günün başlıkları">
  <div class="spor-wrap spor-break-in">
    <span class="spor-break-l">GÜNÜN BAŞLIKLARI</span>
    <div class="spor-break-r"><div class="spor-break-t">
      <?php foreach ($breaking as $s): ?><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a><?php endforeach; ?>
    </div></div>
  </div>
</section>
<?php endif; ?>

<?php if ($slides !== []): ?>
<section class="spor-wrap spor-hero" aria-label="Manşet">
  <div class="spor-slider" data-spor-slider>
    <div class="spor-slider-track" data-spor-track>
      <?php foreach ($slides as $s): ?>
      <div class="spor-slide" data-spor-slide><?php $v = 'slide'; require __DIR__ . '/_card.php'; ?></div>
      <?php endforeach; ?>
    </div>
    <?php if (count($slides) > 1): ?>
    <button class="spor-slider-btn is-prev" type="button" data-spor-prev aria-label="Önceki manşet">‹</button>
    <button class="spor-slider-btn is-next" type="button" data-spor-next aria-label="Sonraki manşet">›</button>
    <div class="spor-slider-dots" role="tablist" aria-label="Manşet slaytları">
      <?php foreach ($slides as $i => $_s): ?><button type="button" data-spor-dot aria-label="Manşet <?= $i + 1 ?>"<?= $i === 0 ? ' aria-current="true"' : '' ?>></button><?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>
  <?php if ($rail !== []): ?>
  <div class="spor-rail">
    <?php foreach ($rail as $s): $v = 'mini'; require __DIR__ . '/_card.php'; endforeach; ?>
  </div>
  <?php endif; ?>
</section>
<?php elseif ($latest === []): ?>
<p class="spor-wrap spor-empty">Haberler yolda. Puan durumu ve fikstür, kaynak verdiği anda aşağıda belirir.</p>
<?php endif; ?>

<?php if (SporLive::hasFixtures($live) || SporLive::hasTable($live)): ?>
<section class="spor-wrap spor-board" aria-label="Süper Lig">
  <header class="spor-sec-h">
    <p class="spor-kicker">Süper Lig<?= ($live['season'] ?? '') !== '' ? ' · ' . Html::e((string) $live['season']) : '' ?></p>
    <h2>Saha kenarı</h2>
    <p class="spor-src">Kaynak: ESPN<?= ($live['league'] ?? '') !== '' ? ' · ' . Html::e((string) $live['league']) : '' ?><?php if (!empty($live['fetchedAt'])): ?> · <?= Html::e(Spor::clockTr((int) $live['fetchedAt'])) ?> TSİ<?php if (!empty($live['degraded'])): ?> (son iyi veri)<?php endif; ?><?php endif; ?></p>
  </header>
  <div class="spor-board-grid">
    <div class="spor-board-fx">
      <?php if (($live['live'] ?? []) !== []): $matches = $live['live']; $heading = 'Canlı'; require __DIR__ . '/_fixtures.php'; endif; ?>
      <?php if (($live['results'] ?? []) !== []): $matches = array_slice($live['results'], 0, 6); $heading = 'Günün sonuçları'; require __DIR__ . '/_fixtures.php'; endif; ?>
      <?php if (($live['upcoming'] ?? []) !== []): $matches = array_slice($live['upcoming'], 0, 6); $heading = 'Sıradaki maçlar'; require __DIR__ . '/_fixtures.php'; endif; ?>
      <?php if (SporLive::hasFixtures($live)): ?><p class="spor-more-link"><a href="/fikstur">Fikstür</a><?php if (($live['live'] ?? []) !== [] || ($live['results'] ?? []) !== []): ?> · <a href="/canli-skor">Canlı skor</a><?php endif; ?></p><?php endif; ?>
    </div>
    <div class="spor-board-table">
      <?php $rows = $live['standings'] ?? []; $season = (string) ($live['season'] ?? ''); $linkAll = false; require __DIR__ . '/_table.php'; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<?php if ($futbol !== []): $sec = Spor::section('futbol'); ?>
<section class="spor-wrap spor-lane" style="--c:<?= Html::e($sec['color']) ?>;--ink:<?= Html::e($sec['ink']) ?>" aria-labelledby="spor-futbol">
  <header class="spor-sec-h">
    <p class="spor-kicker">01</p>
    <h2 id="spor-futbol"><a href="/kategori/futbol"><?= Html::e($sec['name']) ?></a></h2>
    <a class="spor-all" href="/kategori/futbol">Tümü</a>
  </header>
  <div class="spor-lane-grid">
    <div class="spor-lane-lead"><?php $s = $futbol[0]; $v = 'feature'; require __DIR__ . '/_card.php'; ?></div>
    <div class="spor-lane-list"><?php foreach (array_slice($futbol, 1) as $s): $v = 'row'; require __DIR__ . '/_card.php'; endforeach; ?></div>
  </div>
</section>
<?php endif; ?>

<?php if ($basket !== []): $sec = Spor::section('basketbol'); ?>
<section class="spor-band" style="--c:<?= Html::e($sec['color']) ?>;--ink:<?= Html::e($sec['ink']) ?>" aria-labelledby="spor-basket">
  <div class="spor-wrap">
    <header class="spor-sec-h spor-sec-h-light">
      <p class="spor-kicker">02</p>
      <h2 id="spor-basket"><a href="/kategori/basketbol"><?= Html::e($sec['name']) ?></a></h2>
      <a class="spor-all" href="/kategori/basketbol">Tümü</a>
    </header>
    <div class="spor-hscroll"><?php foreach ($basket as $s): $v = 'tile'; require __DIR__ . '/_card.php'; endforeach; ?></div>
  </div>
</section>
<?php endif; ?>

<?php if ($voley !== []): $sec = Spor::section('voleybol'); ?>
<section class="spor-wrap spor-mosaic" style="--c:<?= Html::e($sec['color']) ?>;--ink:<?= Html::e($sec['ink']) ?>" aria-labelledby="spor-voley">
  <header class="spor-sec-h">
    <p class="spor-kicker">03</p>
    <h2 id="spor-voley"><a href="/kategori/voleybol"><?= Html::e($sec['name']) ?></a></h2>
    <a class="spor-all" href="/kategori/voleybol">Tümü</a>
  </header>
  <div class="spor-mosaic-grid"><?php foreach ($voley as $s): $v = 'tile'; require __DIR__ . '/_card.php'; endforeach; ?></div>
</section>
<?php endif; ?>

<?php if ($others !== []): ?>
<section class="spor-wrap spor-others" aria-labelledby="spor-diger">
  <header class="spor-sec-h">
    <p class="spor-kicker">04</p>
    <h2 id="spor-diger">Diğer sporlar</h2>
  </header>
  <div class="spor-others-grid">
    <?php foreach ($others as $slug => $items): $sec = Spor::section($slug); ?>
    <section class="spor-other" style="--c:<?= Html::e($sec['color']) ?>;--ink:<?= Html::e($sec['ink']) ?>">
      <h3><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($sec['name']) ?></a></h3>
      <ul>
        <?php foreach ($items as $s): ?><li><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?>
      </ul>
    </section>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php if ($transferLeft !== []): ?>
<section class="spor-tape" aria-labelledby="spor-transfer">
  <div class="spor-wrap spor-tape-h">
    <h2 id="spor-transfer">Transfer</h2>
    <a href="/transfer">Tümü</a>
  </div>
  <div class="spor-tape-mask">
    <div class="spor-tape-track">
      <?php foreach ([0, 1] as $copy): ?>
      <ul<?= $copy === 1 ? ' aria-hidden="true"' : '' ?>>
        <?php foreach ($transferLeft as $s): ?><li><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?>
      </ul>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<section class="spor-wrap spor-split">
  <div>
    <?php if ($latest !== []): ?>
    <section aria-labelledby="spor-son">
      <header class="spor-sec-h"><h2 id="spor-son">Son haberler</h2></header>
      <ul class="spor-latest"><?php foreach (array_slice($latest, 0, 12) as $s): ?><li><time datetime="<?= Html::e(Html::iso((string) $s['publishedAt'])) ?>"><?= Html::e(Html::when((string) $s['publishedAt'])) ?></time><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?></ul>
    </section>
    <?php endif; ?>
  </div>
  <?php if ($popular !== []): ?>
  <aside class="spor-pop" aria-labelledby="spor-pop">
    <h2 id="spor-pop">En çok okunanlar</h2>
    <ol>
      <?php foreach ($popular as $s): $n++; ?>
      <li><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><span><?= str_pad((string) $n, 2, '0', STR_PAD_LEFT) ?></span><?= Html::e((string) $s['title']) ?></a></li>
      <?php endforeach; ?>
    </ol>
  </aside>
  <?php endif; ?>
</section>
