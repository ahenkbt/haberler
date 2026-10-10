<?php
/* spor 2026-10-10: /haber/<slug> */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;
use Yenisafak\SporLive;

/** @var Yenisafak\Site $site */
/** @var array<string, mixed> $story */
/** @var list<array<string, mixed>> $latest */
$cat = (string) ($story['category'] ?? '');
$sec = Spor::section($cat);
$col = $sec['color'] ?? '#0e8f3d';
$ink = $sec['ink'] ?? '#ffffff';
$body = Html::sanitize((string) ($story['body'] ?? ''));
$image = (string) ($story['image'] ?? '');
$showHero = $image !== '' && !str_contains($body, Html::e($image));
$url = $site->canonical('/haber/' . rawurlencode((string) $story['slug']));
$t = (string) $story['title'];
$author = (string) ($story['authorName'] ?? '');
$spot = (string) ($story['spot'] ?? '');
if ($spot !== '' && str_starts_with(Html::text($body), mb_substr($spot, 0, 80))) {
    $spot = '';
}
$related = array_values(array_filter($latest, static fn (array $s): bool => ($s['slug'] ?? '') !== ($story['slug'] ?? '')));
$live = SporLive::bundle();
?>
<div class="spor-wrap spor-art-wrap">
<article class="spor-art" style="--c:<?= Html::e($col) ?>;--on:<?= Html::e($ink) ?>">
  <header class="spor-art-h">
    <?php if ($sec !== null): ?><a class="spor-tag spor-tag-lg" href="/kategori/<?= Html::e($cat) ?>"><?= Html::e($sec['name']) ?></a><?php elseif ($cat !== ''): ?><a class="spor-tag spor-tag-lg" href="/kategori/<?= Html::e($cat) ?>"><?= Html::e($cat) ?></a><?php endif; ?>
    <h1><?= Html::e($t) ?></h1>
    <?php if ($spot !== ''): ?><p class="spor-art-dek"><?= Html::e($spot) ?></p><?php endif; ?>
    <p class="spor-art-meta">
      <span><?= $author !== '' ? Html::e($author) : 'Spor Gündemi Haber Masası' ?></span>
      <time datetime="<?= Html::e(Html::iso((string) $story['publishedAt'])) ?>"><?= Html::e(Html::when((string) $story['publishedAt'])) ?></time>
    </p>
  </header>
  <?php if ($showHero): ?>
  <figure class="spor-art-fig">
    <img src="<?= Html::e(Html::src($site->basePath, $image)) ?>" alt="" width="1200" height="675" fetchpriority="high" decoding="async" onerror="this.closest('figure').remove()">
    <?php if (($story['imageCredit'] ?? '') !== ''): ?><figcaption><?= Html::e((string) $story['imageCredit']) ?></figcaption><?php endif; ?>
  </figure>
  <?php endif; ?>
  <div class="spor-art-share">
    <a href="https://wa.me/?text=<?= rawurlencode($t . ' ' . $url) ?>" target="_blank" rel="noopener">WhatsApp</a>
    <a href="https://x.com/intent/post?text=<?= rawurlencode($t) ?>&amp;url=<?= rawurlencode($url) ?>" target="_blank" rel="noopener">X</a>
  </div>
  <div class="spor-art-body"><?= $body ?></div>
</article>
<aside class="spor-art-side">
  <?php if (SporLive::hasTable($live)): ?>
  <section class="spor-side-board">
    <h2>Süper Lig</h2>
    <?php $rows = array_slice($live['standings'], 0, 8); $season = (string) ($live['season'] ?? ''); $linkAll = true; require __DIR__ . '/_table.php'; ?>
  </section>
  <?php endif; ?>
  <?php if (($live['upcoming'] ?? []) !== []): $matches = array_slice($live['upcoming'], 0, 4); $heading = 'Sıradaki'; require __DIR__ . '/_fixtures.php'; endif; ?>
  <?php if ($related !== []): ?>
  <section class="spor-side">
    <h2>Son haberler</h2>
    <ul class="spor-latest"><?php foreach (array_slice($related, 0, 8) as $s): ?><li><time><?= Html::e(Html::when((string) $s['publishedAt'])) ?></time><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?></ul>
  </section>
  <?php endif; ?>
</aside>
</div>
<?php if ($related !== []): ?>
<section class="spor-wrap spor-rel" aria-labelledby="spor-rel">
  <h2 id="spor-rel" class="spor-h2">Okumaya devam</h2>
  <div class="spor-cat-grid"><?php foreach (array_slice($related, 0, 3) as $s): $v = 'tile'; require __DIR__ . '/_card.php'; endforeach; ?></div>
</section>
<?php endif; ?>
