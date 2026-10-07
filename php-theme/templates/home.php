<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var list<array<string, mixed>> $sections */
?>
<div class="ys-home">
<?php
$renderAd = static function (Yenisafak\Site $site, string $key): void {
    $ad = $site->adSlot($key);
    if ($ad === null) {
        return;
    }
    echo '<div class="ys-wrap ys-ad" data-ad-slot="' . Html::e($key) . '">';
    if ($ad['href'] !== '') {
        echo '<a href="' . Html::e($ad['href']) . '" rel="noopener sponsored">';
    }
    echo '<img src="' . Html::e(Html::src($site->basePath, $ad['image'])) . '" alt="" width="728" height="90">';
    if ($ad['href'] !== '') {
        echo '</a>';
    }
    echo '</div>';
};
?>
<?php $stripShown = false; ?>
<?php foreach ($sections as $section): ?>
  <?php if ($section['type'] === 'ysTicker'): ?>
    <div class="ys-ticker" aria-label="Son dakika">
      <span>SON DAKİKA</span>
      <div class="ys-ticker-track">
        <?php foreach ($section['items'] as $item): ?>
          <a href="<?= Html::e($site->path('/haber/' . rawurlencode((string) $item['slug']))) ?>"><?= Html::e((string) $item['title']) ?></a>
        <?php endforeach; ?>
      </div>
    </div>
    <?php $renderAd($site, 'block_strip'); $stripShown = true; ?>
  <?php elseif ($section['type'] === 'hero'): ?>
    <section class="ys-wrap ys-hero" aria-label="Manşet">
      <div class="ys-slider" data-ys-slider>
        <?php foreach ($section['slides'] as $index => $item): ?>
          <a class="ys-slide<?= $index === 0 ? ' is-on' : '' ?>" href="<?= Html::e($site->path('/haber/' . rawurlencode((string) $item['slug']))) ?>" <?= $index === 0 ? '' : 'hidden' ?>>
            <span class="ys-media ys-media-hero">
              <?php if (($item['image'] ?? '') !== ''): ?>
                <img src="<?= Html::e(Html::src($site->basePath, (string) $item['image'])) ?>" alt="" width="960" height="540" <?= $index === 0 ? 'fetchpriority="high"' : 'loading="lazy"' ?> decoding="async">
              <?php endif; ?>
            </span>
            <span class="ys-slide-copy">
              <strong><?= Html::e((string) $item['title']) ?></strong>
              <?php if (($item['spot'] ?? '') !== ''): ?><em><?= Html::e((string) $item['spot']) ?></em><?php endif; ?>
            </span>
          </a>
        <?php endforeach; ?>
        <?php if (count($section['slides']) > 1): ?>
          <div class="ys-pager" role="tablist" aria-label="Manşet sayfaları">
            <?php foreach ($section['slides'] as $index => $item): ?>
              <button type="button" <?= $index === 0 ? 'aria-current="true"' : '' ?>><?= $index + 1 ?></button>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
      <div class="ys-side">
        <?php foreach ($section['side'] as $item): ?>
          <?php $eager = false; require __DIR__ . '/_card.php'; ?>
        <?php endforeach; ?>
      </div>
    </section>
  <?php elseif ($section['type'] === 'ysManset' || $section['type'] === 'ysSide'): ?>
    <section class="ys-wrap ys-list">
      <?php foreach ($section['items'] as $i => $item): ?>
        <?php $eager = $i === 0 && $section['type'] === 'ysManset'; require __DIR__ . '/_card.php'; ?>
      <?php endforeach; ?>
    </section>
  <?php elseif ($section['type'] === 'categories'): ?>
    <div class="ys-wrap ys-blocks">
      <?php foreach ($section['categories'] as $block): ?>
        <?php if ($block['items'] === []) continue; ?>
        <section class="ys-block" aria-label="<?= Html::e($block['cat']['name']) ?>">
          <h2><a href="<?= Html::e($site->path('/kategori/' . $block['cat']['slug'])) ?>"><?= Html::e($block['cat']['name']) ?></a></h2>
          <div class="ys-block-grid">
            <?php foreach ($block['items'] as $item): ?>
              <?php $eager = false; require __DIR__ . '/_card.php'; ?>
            <?php endforeach; ?>
          </div>
        </section>
      <?php endforeach; ?>
    </div>
  <?php elseif ($section['type'] === 'video'): ?>
    <section class="ys-wrap ys-band" aria-label="Videolar">
      <h2><a href="<?= Html::e($site->path('/video')) ?>">Video</a></h2>
      <div class="ys-video-row">
        <?php foreach ($section['items'] as $video): ?>
          <a class="ys-video" href="<?= Html::e((string) $video['watchUrl']) ?>" rel="noopener">
            <span class="ys-media">
              <?php if (($video['image'] ?? '') !== ''): ?>
                <img src="<?= Html::e(Html::src($site->basePath, (string) $video['image'])) ?>" alt="" width="320" height="180" loading="lazy" decoding="async">
              <?php endif; ?>
            </span>
            <strong><?= Html::e((string) $video['title']) ?></strong>
            <small>YekTube<?= ($video['channel'] ?? '') !== '' ? ' · ' . Html::e((string) $video['channel']) : '' ?></small>
          </a>
        <?php endforeach; ?>
      </div>
    </section>
  <?php elseif ($section['type'] === 'authors'): ?>
    <section class="ys-wrap ys-band" aria-label="Yazarlar">
      <h2>Yazarlar</h2>
      <div class="ys-authors">
        <?php foreach ($section['items'] as $author): ?>
          <a class="ys-author" href="<?= Html::e($site->path('/yazar/' . $author['slug'])) ?>">
            <span class="ys-avatar" aria-hidden="true"><?= Html::e(function_exists('mb_substr') ? mb_substr((string) $author['name'], 0, 1) : substr((string) $author['name'], 0, 1)) ?></span>
            <strong><?= Html::e((string) $author['name']) ?></strong>
            <?php if (($author['title'] ?? '') !== ''): ?><small><?= Html::e((string) $author['title']) ?></small><?php endif; ?>
          </a>
        <?php endforeach; ?>
      </div>
    </section>
  <?php elseif ($section['type'] === 'most' || $section['type'] === 'gallery'): ?>
    <section class="ys-wrap ys-band" aria-label="<?= $section['type'] === 'most' ? 'Çok okunanlar' : 'Galeri' ?>">
      <h2><?= $section['type'] === 'most' ? 'Çok okunanlar' : 'Galeri' ?></h2>
      <div class="ys-block-grid">
        <?php foreach ($section['items'] as $item): ?>
          <?php $eager = false; require __DIR__ . '/_card.php'; ?>
        <?php endforeach; ?>
      </div>
    </section>
  <?php endif; ?>
<?php endforeach; ?>
<?php if (!$stripShown) { $renderAd($site, 'block_strip'); } ?>
<?php $renderAd($site, 'home_block_fill'); ?>
</div>
