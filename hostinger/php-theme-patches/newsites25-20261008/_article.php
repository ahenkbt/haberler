<?php

declare(strict_types=1);

use Yenisafak\Html;

/** One article unit (used by the article page and by the infinite-scroll fragments).
 *  @var Yenisafak\Site $site
 *  @var array<string, mixed> $story
 *  @var Yenisafak\Ads $ads
 *  @var list<array<string, mixed>> $authorMore   column pages: the author's other columns
 *  @var list<array<string, mixed>> $otherAuthors column pages: other columnists + latest column
 */
$cat = (string) ($story['category'] ?? '');
$authorMore = $authorMore ?? [];
$otherAuthors = $otherAuthors ?? [];
?>
<div class="ys-unit">
<article class="ys-article" data-ys-article data-url="<?= Html::e($site->path('/haber/' . rawurlencode((string) $story['slug']))) ?>" data-title="<?= Html::e((string) $story['title'] . ' | ' . $site->name) ?>">
  <?php if ($cat !== ''): ?>
    <p class="ys-kicker"><a href="<?= Html::e($site->path('/kategori/' . $cat)) ?>"><?= Html::e($site->categoryName($cat)) ?></a></p>
  <?php endif; ?>
  <?php if (($story['kind'] ?? '') === 'column' && ($story['authorName'] ?? '') !== ''): ?>
    <a class="ys-col-author" href="<?= Html::e($site->path('/yazar/a' . (int) ($story['authorId'] ?? 0))) ?>">
      <span class="ys-avatar"><b><?= Html::e(mb_substr((string) $story['authorName'], 0, 1)) ?></b><?php if (($story['authorImage'] ?? '') !== ''): ?><img src="<?= Html::e(Html::src($site->basePath, (string) $story['authorImage'])) ?>" alt="" width="56" height="56" loading="lazy" onerror="this.remove()"><?php endif; ?></span>
      <span><strong><?= Html::e((string) $story['authorName']) ?></strong><?php if (($story['authorTitle'] ?? '') !== ''): ?><small><?= Html::e((string) $story['authorTitle']) ?></small><?php endif; ?></span>
    </a>
  <?php endif; ?>
  <h1><?= Html::e((string) $story['title']) ?></h1>
  <p class="ys-meta">
    <time datetime="<?= Html::e(Html::iso((string) $story['publishedAt'])) ?>"><?= Html::e(Html::when((string) $story['publishedAt'])) ?></time>
  </p>
  <?php
    $body = Html::sanitize((string) ($story['body'] ?? ''));
    $image = (string) ($story['image'] ?? '');
    $showHero = $image !== '' && !str_contains($body, Html::e($image));
  ?>
  <?php $ysDateline = (($story['kind'] ?? '') !== 'column' && \Yenisafak\WorldDateline::enabled($site)) ? \Yenisafak\WorldDateline::label(array_merge($story, ['body' => $body])) : ''; /* newsites25 2026-10-08: world.fix.tc "TurkAta News - <Country>" dateline (layout_json hmWorldDateline only) */ ?>
  <?php if ($showHero): ?>
    <p class="ys-media ys-media-hero"<?= $ysDateline !== '' ? ' style="position:relative"' : '' ?>>
      <?php if ($ysDateline !== ''): /* newsites25 2026-10-08 */ ?><span class="ys-dateline-badge" style="position:absolute;left:12px;top:12px;z-index:2;background:var(--ys-accent,#e36414);color:#fff;font:700 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.03em;padding:6px 10px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.3)"><?= Html::e($ysDateline) ?></span><?php endif; ?>
      <img src="<?= Html::e(Html::src($site->basePath, $image)) ?>" alt="" width="960" height="540" <?= isset($depth) ? 'loading="lazy"' : 'fetchpriority="high"' ?> decoding="async" onerror="this.closest('.ys-media-hero').remove()">
      <?php if (($story['imageCredit'] ?? '') !== ''): ?><small class="ys-img-credit"><?= Html::e((string) $story['imageCredit']) ?></small><?php endif; ?>
    </p>
  <?php endif; ?>
  <?php if ($ysDateline !== ''): /* newsites25 2026-10-08 */ ?>
    <p class="ys-dateline" style="margin:.6em 0 .3em;font-weight:800;font-size:.95rem;letter-spacing:.02em;color:var(--ys-nav,#0f4c5c)"><?= Html::e($ysDateline) ?> —</p>
  <?php endif; ?>
  <?php if (($story['spot'] ?? '') !== '' && !str_starts_with(Html::text($body), mb_substr((string) $story['spot'], 0, 80))): ?>
    <p class="ys-spot"><?= Html::e((string) $story['spot']) ?></p>
  <?php endif; ?>
  <?php if (($story['previousPath'] ?? '') !== '' && ($story['previousTitle'] ?? '') !== ''): ?>
    <p class="onceki-gelisme ys-prev-dev">Olayın önceki gelişmesi: <a href="<?= Html::e($site->path((string) $story['previousPath'])) ?>"><?= Html::e((string) $story['previousTitle']) ?></a></p>
  <?php endif; ?>
  <?php if ($body !== ''): ?>
    <?php
      // In-article ad after the 3rd paragraph (only when the story is long enough).
      $inline = $ads->render('article_inline');
      if ($inline !== '' && preg_match_all('#</p>#i', $body, $m, PREG_OFFSET_CAPTURE) >= 4) {
          $cut = $m[0][2][1] + 4;
          $body = substr($body, 0, $cut) . $inline . substr($body, $cut);
      }
    ?>
    <div class="ys-body"><?= $body ?></div>
  <?php endif; ?>
  <?php if (($story['sourceUrl'] ?? '') !== ''): ?>
    <p class="ys-source-credit">Kaynak: <a href="<?= Html::e((string) $story['sourceUrl']) ?>" rel="noopener nofollow" target="_blank"><?= Html::e((string) (($story['credit'] ?? '') !== '' ? $story['credit'] : 'Haberin kaynağı')) ?></a></p>
  <?php endif; ?>
  <?php if ($site->shareEnabled()) { require __DIR__ . '/_share.php'; } /* editor hmYsShareEnabled */ ?>
</article>
<?php if ($authorMore !== []): ?>
  <section class="ys-more-cols" aria-label="Yazarın diğer yazıları">
    <h2 class="ys-head"><span>Yazarın diğer yazıları</span><a class="ys-head-more" href="<?= Html::e($site->path('/yazar/a' . (int) ($story['authorId'] ?? 0))) ?>">Tümü ›</a></h2>
    <ul class="ys-collist">
      <?php foreach ($authorMore as $it): ?>
        <li><a href="<?= Html::e($site->path('/haber/' . rawurlencode((string) $it['slug']))) ?>"><strong><?= Html::e((string) $it['title']) ?></strong><small><?= Html::e(Html::when((string) $it['publishedAt'])) ?></small></a></li>
      <?php endforeach; ?>
    </ul>
  </section>
<?php endif; ?>
<?php if ($otherAuthors !== []): ?>
  <?php $authorsTitle = 'Diğer yazarlar'; require __DIR__ . '/_authors_latest.php'; ?>
<?php endif; ?>
</div>
