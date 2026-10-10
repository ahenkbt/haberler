<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var array<string, mixed> $item */
/** @var bool $eager */
$eager = $eager ?? false;
$href = $site->path('/haber/' . rawurlencode((string) $item['slug']));
?>
<a class="ys-card" href="<?= Html::e($href) ?>">
  <span class="ys-media">
    <?php if (($item['image'] ?? '') !== ''): ?>
      <img src="<?= Html::e(Html::src($site->basePath, (string) $item['image'])) ?>" alt="" width="640" height="360" <?= $eager ? 'fetchpriority="high"' : 'loading="lazy"' ?> decoding="async">
    <?php endif; ?>
  </span>
  <span class="ys-card-copy">
    <strong><?= Html::e((string) $item['title']) ?></strong>
    <?php if (($item['spot'] ?? '') !== ''): ?><em><?= Html::e((string) $item['spot']) ?></em><?php endif; ?>
    <?php if (($item['credit'] ?? '') !== ''): ?><small>Kaynak: <?= Html::e((string) $item['credit']) ?></small><?php endif; ?>
  </span>
</a>
