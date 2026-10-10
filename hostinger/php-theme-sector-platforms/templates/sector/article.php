<?php
/* yenitc 2026-10-09: /haber/<slug> for yeni.tc (App::render override; same data as templates/article.php) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var Yenisafak\Site $site */
/** @var array<string, mixed> $story */
/** @var list<array<string, mixed>> $latest */
$cat = (string) ($story['category'] ?? '');
$sec = Sector::section($cat);
$col = $sec['color'] ?? Sector::colors()['hot'];
$body = Html::sanitize((string) ($story['body'] ?? ''));
// sector 2026-10-10: interaktif test — içerikteki [[sc-quiz]] işareti, sector_quiz tablosundaki sorularla değiştirilir (veri sunucuda doğrulanmış JSON)
if (str_contains($body, '[[sc-quiz]]')) {
    $qz = Sector::quizData((string) ($story['slug'] ?? ''));
    $body = str_replace(['<p>[[sc-quiz]]</p>', '[[sc-quiz]]'], $qz !== '' ? '<div class="sc-quiz" data-quiz="' . Html::e($qz) . '"><p>Test, JavaScript açıkken çalışır.</p></div>' : '', $body);
}
$image = (string) ($story['image'] ?? '');
$showHero = $image !== '' && !str_contains($body, Html::e($image));
$min = Sector::minutes($body);
$url = $site->canonical('/haber/' . rawurlencode((string) $story['slug']));
$t = (string) $story['title'];
$author = (string) ($story['authorName'] ?? '');
$spot = (string) ($story['spot'] ?? '');
if ($spot !== '' && str_starts_with(Html::text($body), mb_substr($spot, 0, 80))) {
    $spot = '';
}
$related = array_values(array_filter($latest, static fn (array $s): bool => $s['slug'] !== $story['slug']));
?>
<article class="yn-art-page" style="--c:<?= Html::e($col) ?>">
  <header class="yn-ah">
    <div class="yn-wrap-n">
      <?php if ($sec !== null): ?><a class="yn-tag yn-tag-lg" href="/kategori/<?= Html::e($cat) ?>"><?= Html::e($sec['name']) ?></a><?php endif; ?>
      <h1 class="yn-ah-t"><?= Html::e($t) ?></h1>
      <?php if ($spot !== ''): ?><p class="yn-ah-dek"><?= Html::e($spot) ?></p><?php endif; ?>
      <p class="yn-ah-meta">
        <?php if ($author !== ''): ?><span class="yn-ah-by"><?= Html::e($author) ?></span><?php else: ?><span class="yn-ah-by"><?= Html::e((string) Sector::$def["short"]) ?> Yayın Masası</span><?php endif; ?>
        <time datetime="<?= Html::e(Html::iso((string) $story['publishedAt'])) ?>"><?= Html::e(Html::when((string) $story['publishedAt'])) ?></time>
        <span><?= $min ?> dk okuma</span>
      </p>
    </div>
  </header>
  <?php if ($showHero): ?>
  <figure class="yn-ah-fig">
    <img src="<?= Html::e(Html::src($site->basePath, $image)) ?>" alt="" width="1600" height="900" fetchpriority="high" decoding="async" onerror="this.closest('figure').remove()">
    <?php if (($story['imageCredit'] ?? '') !== ''): ?><figcaption><?= Html::e((string) $story['imageCredit']) ?></figcaption><?php endif; ?>
  </figure>
  <?php endif; ?>
  <div class="yn-wrap-n yn-ab-wrap">
    <aside class="yn-share" aria-label="Paylaş">
      <a href="https://wa.me/?text=<?= rawurlencode($t . ' ' . $url) ?>" target="_blank" rel="noopener" aria-label="WhatsApp'ta paylaş"><svg viewBox="0 0 24 24"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.3L2 22l4.8-1.2A11 11 0 0 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2 4.6 4.6 0 0 0 1 2.5 10.6 10.6 0 0 0 4.1 3.6c1.5.7 2.1.7 2.9.6a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.4-.3z"/></svg></a>
      <a href="https://x.com/intent/post?text=<?= rawurlencode($t) ?>&amp;url=<?= rawurlencode($url) ?>" target="_blank" rel="noopener" aria-label="X'te paylaş"><svg viewBox="0 0 24 24"><path d="M17.7 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg></a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=<?= rawurlencode($url) ?>" target="_blank" rel="noopener" aria-label="LinkedIn'de paylaş"><svg viewBox="0 0 24 24"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zm7 0h3.8v1.7h.1a4.2 4.2 0 0 1 3.8-2c4 0 4.8 2.7 4.8 6.1V21h-4v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4z"/></svg></a>
      <button type="button" data-yn-copy="<?= Html::e($url) ?>" aria-label="Bağlantıyı kopyala"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    </aside>
    <div class="yn-ab"><?= $body ?></div>
  </div>
  <div class="yn-wrap-n">
    <aside class="yn-react" data-reveal>
      <p class="yn-eyebrow">Sen de katıl</p>
      <p class="yn-react-h">Rolünü seç, rehbere başvur ya da bir talebini ilet.</p>
      <a class="yn-btn yn-btn-hot" href="/uye-ol">Üye ol / Başvur →</a>
    </aside>
  </div>
</article>
<?php if ($related !== []): ?>
<section class="yn-wrap yn-list" aria-labelledby="yn-rel-h">
  <h2 id="yn-rel-h" class="yn-h2">Okumaya devam et</h2>
  <div class="yn-grid3"><?php foreach (array_slice($related, 0, 6) as $n => $s): $v = 'std'; require __DIR__ . '/_card.php'; endforeach; ?></div>
</section>
<?php endif; ?>
