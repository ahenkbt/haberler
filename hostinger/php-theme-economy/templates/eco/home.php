<?php
/* eco 2026-10-10: Ekonomi Gündemi ana sayfa */
declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var list<array<string, mixed>> $latest */
/** @var array<string, list<array<string, mixed>>> $per */
/** @var list<array<string, mixed>> $popular */
/** @var array<string, array<string, mixed>> $quotes */
$used = [];
$take = static function (array $list, int $n) use (&$used): array {
    $out = [];
    foreach ($list as $s) {
        if (count($out) >= $n) {
            break;
        }
        if (!isset($used[$s['slug']])) {
            $out[] = $s;
            $used[$s['slug']] = true;
        }
    }
    return $out;
};
$withImg = array_values(array_filter($latest, static fn (array $s): bool => ($s['image'] ?? '') !== ''));
$lead = $take($withImg, 1)[0] ?? ($take($latest, 1)[0] ?? null);
$second = $take($withImg, 4);
if (count($second) < 4) {
    $second = array_merge($second, $take($latest, 4 - count($second)));
}
$breaking = array_slice($latest, 0, 8);
$strip = Eco::strip();
$sectionBlock = static function (string $slug) use ($per, &$used): array {
    $items = [];
    foreach (($per[$slug] ?? []) as $s) {
        if (!isset($used[$s['slug']])) {
            $items[] = $s;
        }
    }
    return array_slice($items, 0, 5);
};
?>
<?php if ($breaking !== []): ?>
<section class="eco-breaking" aria-label="Son dakika">
  <div class="eco-wrap eco-breaking-in">
    <span class="eco-breaking-l">SON DAKİKA</span>
    <div class="eco-breaking-r"><div class="eco-breaking-t">
      <?php foreach ($breaking as $s): ?><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a><?php endforeach; ?>
    </div></div>
  </div>
</section>
<?php endif; ?>

<section class="eco-wrap eco-hero" aria-label="Manşet">
  <?php if ($lead !== null): ?>
  <div class="eco-hero-lead"><?php $s = $lead; $v = 'lead'; require __DIR__ . '/_card.php'; ?></div>
  <div class="eco-hero-grid">
    <?php foreach ($second as $s): $v = 'std'; require __DIR__ . '/_card.php'; endforeach; ?>
  </div>
  <?php else: ?>
  <p class="eco-empty">Haberler yolda. Piyasa verileri aşağıda canlı olarak izlenebilir.</p>
  <?php endif; ?>
  <aside class="eco-hero-side" aria-label="Piyasalar">
    <?php $rows = $strip; $title = 'Piyasalar'; require __DIR__ . '/_quotes.php'; ?>
    <p class="eco-qnote">Veriler gecikmeli olabilir; yatırım tavsiyesi değildir.</p>
  </aside>
</section>

<?php foreach (['eko-borsa', 'eko-doviz', 'eko-altin', 'eko-kripto'] as $slug): $sec = Eco::section($slug); $items = $sectionBlock($slug); if ($items === []) { continue; } $used = $used + array_fill_keys(array_column($items, 'slug'), true);
    $qrows = array_values(array_filter(array_map(static fn (string $k) => $quotes[$k] ?? null, Eco::quoteKeysFor($slug)))); ?>
<section class="eco-wrap eco-block" style="--c:<?= Html::e($sec['color']) ?>" aria-labelledby="eco-b-<?= Html::e($slug) ?>">
  <header class="eco-block-h">
    <h2 id="eco-b-<?= Html::e($slug) ?>"><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($sec['name']) ?></a></h2>
    <?php if ($qrows !== []): ?><span class="eco-block-q"><?php foreach ($qrows as $m): $d = Eco::dir($m['change'] ?? null); ?><b class="is-<?= $d ?>"><?= Html::e((string) $m['label']) ?> <?= Html::e(Eco::fmt($m)) ?> <?= $m['change'] !== null ? Html::e(Eco::fmtChange((float) $m['change'])) : '' ?></b><?php endforeach; ?></span><?php endif; ?>
    <a class="eco-block-more" href="/kategori/<?= Html::e($slug) ?>">Tümü →</a>
  </header>
  <div class="eco-block-grid">
    <div class="eco-block-lead"><?php $s = $items[0]; $v = 'lead'; require __DIR__ . '/_card.php'; ?></div>
    <div class="eco-block-list"><?php foreach (array_slice($items, 1) as $n => $s): $v = 'row'; require __DIR__ . '/_card.php'; endforeach; ?></div>
  </div>
</section>
<?php endforeach; ?>

<?php $bandCols = []; foreach (['eko-banka-finans', 'eko-makro', 'eko-sirketler'] as $slug) { $bi = $sectionBlock($slug); if ($bi !== []) { $bandCols[$slug] = $bi; $used = $used + array_fill_keys(array_column($bi, 'slug'), true); } } ?>
<?php if ($bandCols !== []): ?>
<section class="eco-band">
  <div class="eco-wrap eco-cols3">
    <?php foreach ($bandCols as $slug => $items): $sec = Eco::section($slug); ?>
    <div class="eco-col" style="--c:<?= Html::e($sec['color']) ?>">
      <h2 class="eco-col-h"><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($sec['name']) ?></a></h2>
      <?php $s = $items[0]; $v = 'std'; require __DIR__ . '/_card.php'; ?>
      <ol class="eco-col-list"><?php foreach (array_slice($items, 1, 4) as $s): ?><li><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?></ol>
    </div>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<section class="eco-wrap eco-main2">
  <div class="eco-main2-l">
    <?php foreach (['eko-enerji', 'eko-sanayi-ihracat', 'eko-dunya', 'eko-emlak', 'eko-tarim', 'eko-teknoloji', 'eko-is-dunyasi', 'eko-genel-gundem'] as $slug): $sec = Eco::section($slug); $items = $sectionBlock($slug); if ($items === []) { continue; } $used = $used + array_fill_keys(array_column($items, 'slug'), true); ?>
    <section class="eco-sub" style="--c:<?= Html::e($sec['color']) ?>">
      <h2 class="eco-sub-h"><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($sec['name']) ?></a></h2>
      <div class="eco-sub-grid"><?php foreach (array_slice($items, 0, 3) as $s): $v = 'std'; require __DIR__ . '/_card.php'; endforeach; ?></div>
    </section>
    <?php endforeach; ?>
  </div>
  <aside class="eco-main2-r">
    <?php $feat = array_values(array_filter($latest, static fn (array $x): bool => ($x['image'] ?? '') !== '')); ?>
    <?php if ($feat !== []): ?>
    <section class="eco-side">
      <h2 class="eco-side-h">Öne Çıkanlar</h2>
      <ol class="eco-rank"><?php foreach (array_slice($feat, 0, 8) as $s): ?><li><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?></ol>
    </section>
    <?php endif; ?>
    <?php if ($latest !== []): ?>
    <section class="eco-side">
      <h2 class="eco-side-h">Son Haberler</h2>
      <ul class="eco-latest"><?php foreach (array_slice($latest, 0, 12) as $s): ?><li><time><?= Html::e(Html::when((string) $s['publishedAt'])) ?></time><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?></ul>
    </section>
    <?php endif; ?>
  </aside>
</section>

<section class="eco-wrap eco-sections" aria-labelledby="eco-sec-h">
  <h2 id="eco-sec-h" class="eco-h2">Bölümler</h2>
  <div class="eco-sec-grid">
    <?php foreach (Eco::sections() as $sec): ?>
    <a class="eco-sec" href="/kategori/<?= Html::e($sec['slug']) ?>" style="--c:<?= Html::e($sec['color']) ?>"><b><?= Html::e($sec['name']) ?></b><small><?= Html::e($sec['blurb']) ?></small></a>
    <?php endforeach; ?>
  </div>
</section>
