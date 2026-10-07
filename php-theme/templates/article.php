<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var array<string, mixed> $story */
$cat = (string) ($story['category'] ?? '');
?>
<article class="ys-wrap ys-article">
  <?php if ($cat !== ''): ?>
    <p class="ys-kicker"><a href="<?= Html::e($site->path('/kategori/' . $cat)) ?>"><?= Html::e($site->categoryName($cat)) ?></a></p>
  <?php endif; ?>
  <h1><?= Html::e((string) $story['title']) ?></h1>
  <p class="ys-meta">
    <time datetime="<?= Html::e(Html::iso((string) $story['publishedAt'])) ?>"><?= Html::e(Html::when((string) $story['publishedAt'])) ?></time>
    <?php if (($story['credit'] ?? '') !== ''): ?> · Kaynak: <?= Html::e((string) $story['credit']) ?><?php endif; ?>
  </p>
  <?php if (($story['image'] ?? '') !== ''): ?>
    <p class="ys-media ys-media-hero">
      <img src="<?= Html::e(Html::src($site->basePath, (string) $story['image'])) ?>" alt="" width="960" height="540" fetchpriority="high" decoding="async">
    </p>
  <?php endif; ?>
  <?php if (($story['spot'] ?? '') !== ''): ?>
    <p class="ys-spot"><?= Html::e((string) $story['spot']) ?></p>
  <?php endif; ?>
  <?php if (($story['kind'] ?? '') === 'rss' || ($story['sourceUrl'] ?? '') !== '' && ($story['body'] ?? '') === ''): ?>
    <p class="ys-source-note">Bu başlık, özet ve görsel kayıtlı beslemeden alınmıştır. Tam metin kaynakta yayımlanır.</p>
    <?php if (($story['sourceUrl'] ?? '') !== ''): ?>
      <p><a class="ys-source" href="<?= Html::e((string) $story['sourceUrl']) ?>" rel="noopener nofollow">Kaynağa git</a></p>
    <?php endif; ?>
  <?php elseif (($story['body'] ?? '') !== ''): ?>
    <div class="ys-body"><?= Html::sanitize((string) $story['body']) ?></div>
  <?php endif; ?>
  <?php if ($site->shareEnabled()): ?>
    <?php
      $shareUrl = $site->canonical('/haber/' . rawurlencode((string) ($story['slug'] ?? '')));
      $shareTitle = rawurlencode((string) ($story['title'] ?? ''));
      $shareLink = rawurlencode($shareUrl);
    ?>
    <p class="ys-share">
      <span>Paylaş</span>
      <a href="https://twitter.com/intent/tweet?url=<?= Html::e($shareLink) ?>&text=<?= Html::e($shareTitle) ?>" rel="noopener noreferrer">X</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=<?= Html::e($shareLink) ?>" rel="noopener noreferrer">Facebook</a>
      <a href="https://wa.me/?text=<?= Html::e($shareTitle) ?>%20<?= Html::e($shareLink) ?>" rel="noopener noreferrer">WhatsApp</a>
      <a href="https://t.me/share/url?url=<?= Html::e($shareLink) ?>&text=<?= Html::e($shareTitle) ?>" rel="noopener noreferrer">Telegram</a>
    </p>
  <?php endif; ?>
</article>
