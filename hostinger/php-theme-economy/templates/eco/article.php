<?php
/* eco 2026-10-10: /haber/<slug> (App::render override) */
declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var array<string, mixed> $story */
/** @var list<array<string, mixed>> $latest */
$cat = (string) ($story['category'] ?? '');
$sec = Eco::section($cat);
$col = $sec['color'] ?? '#c9a227';
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
$related = array_values(array_filter($latest, static fn (array $s): bool => $s['slug'] !== $story['slug']));
$marketCat = in_array($cat, ['eko-borsa', 'eko-doviz', 'eko-altin', 'eko-kripto', 'eko-banka-finans'], true);
$q = Eco::quotes();
$qrows = array_values(array_filter(array_map(static fn (string $k) => $q[$k] ?? null, Eco::quoteKeysFor($cat))));
?>
<div class="eco-wrap eco-art-wrap">
<article class="eco-art" style="--c:<?= Html::e($col) ?>">
  <header class="eco-art-h">
    <?php if ($sec !== null): ?><a class="eco-tag eco-tag-lg" href="/kategori/<?= Html::e($cat) ?>"><?= Html::e($sec['name']) ?></a><?php endif; ?>
    <h1><?= Html::e($t) ?></h1>
    <?php if ($spot !== ''): ?><p class="eco-art-dek"><?= Html::e($spot) ?></p><?php endif; ?>
    <p class="eco-art-meta">
      <span><?= $author !== '' ? Html::e($author) : 'Ekonomi Gündemi Haber Masası' ?></span>
      <time datetime="<?= Html::e(Html::iso((string) $story['publishedAt'])) ?>"><?= Html::e(Html::when((string) $story['publishedAt'])) ?></time>
    </p>
  </header>
  <?php if ($showHero): ?>
  <figure class="eco-art-fig">
    <img src="<?= Html::e(Html::src($site->basePath, $image)) ?>" alt="" width="1200" height="675" fetchpriority="high" decoding="async" onerror="this.closest('figure').remove()">
    <?php if (($story['imageCredit'] ?? '') !== ''): ?><figcaption><?= Html::e((string) $story['imageCredit']) ?></figcaption><?php endif; ?>
  </figure>
  <?php endif; ?>
  <div class="eco-art-share">
    <a href="https://wa.me/?text=<?= rawurlencode($t . ' ' . $url) ?>" target="_blank" rel="noopener">WhatsApp</a>
    <a href="https://x.com/intent/post?text=<?= rawurlencode($t) ?>&amp;url=<?= rawurlencode($url) ?>" target="_blank" rel="noopener">X</a>
    <a href="https://www.linkedin.com/sharing/share-offsite/?url=<?= rawurlencode($url) ?>" target="_blank" rel="noopener">LinkedIn</a>
  </div>
  <div class="eco-art-body"><?= $body ?></div>
  <?php if ($marketCat): ?><p class="eco-disclaimer">Bu içerik bilgilendirme amaçlıdır ve yatırım tavsiyesi değildir. Piyasa verileri gecikmeli olabilir.</p><?php endif; ?>
</article>
<aside class="eco-art-side">
  <?php if ($qrows === []) { $qrows = array_slice(Eco::strip(), 0, 6); } $rows = $qrows; $title = 'Piyasalar'; require __DIR__ . '/_quotes.php'; ?>
  <?php if ($related !== []): ?>
  <section class="eco-side"><h2 class="eco-side-h">Son Haberler</h2>
    <ul class="eco-latest"><?php foreach (array_slice($related, 0, 8) as $s): ?><li><time><?= Html::e(Html::when((string) $s['publishedAt'])) ?></time><a href="/haber/<?= Html::e(rawurlencode((string) $s['slug'])) ?>"><?= Html::e((string) $s['title']) ?></a></li><?php endforeach; ?></ul>
  </section>
  <?php endif; ?>
</aside>
</div>
<?php if ($related !== []): ?>
<section class="eco-wrap eco-rel" aria-labelledby="eco-rel-h">
  <h2 id="eco-rel-h" class="eco-h2">Okumaya devam edin</h2>
  <div class="eco-cat-grid"><?php foreach (array_slice($related, 8, 6) as $s): $v = 'std'; require __DIR__ . '/_card.php'; endforeach; ?></div>
</section>
<?php endif; ?>
