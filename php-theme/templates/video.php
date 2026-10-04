<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var list<array<string, mixed>> $videos */
?>
<header class="ys-cat-hero"><h1>Video</h1></header>
<div class="ys-wrap ys-category">
  <p class="ys-source-note">Videolar YekTube kataloğundan listelenir ve yektube.com üzerinde açılır.</p>
  <div class="ys-video-row">
    <?php foreach ($videos as $video): ?>
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
  <?php if ($videos === []): ?><p class="ys-empty">YekTube kataloğunda video yok.</p><?php endif; ?>
</div>
