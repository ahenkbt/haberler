<?php
/* spor 2026-10-10: haber kartı. $s = story, $v = slide|feature|tile|row|mini */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;

/** @var array<string, mixed> $s */
/** @var Yenisafak\Site $site */
$v = $v ?? 'tile';
$cat = (string) ($s['category'] ?? '');
$sec = Spor::section($cat);
$href = '/haber/' . rawurlencode((string) ($s['slug'] ?? ''));
$img = (string) ($s['image'] ?? '');
$col = $sec['color'] ?? '#f5c518';
$ink = $sec['ink'] ?? '#12161a';
$tag = $sec['short'] ?? ($cat !== '' ? $cat : '');
$lazy = $v === 'slide' || $v === 'feature' ? 'fetchpriority="high"' : 'loading="lazy"';
$title = (string) ($s['title'] ?? '');
?>
<article class="spor-card spor-card-<?= Html::e($v) ?>" style="--c:<?= Html::e($col) ?>;--ink:<?= Html::e($ink) ?>">
  <a class="spor-card-a" href="<?= Html::e($href) ?>">
    <?php if ($v !== 'row'): ?>
    <span class="spor-card-media<?= $img === '' ? ' is-empty' : '' ?>">
      <?php if ($img !== ''): ?><img src="<?= Html::e(Html::src($site->basePath, $img)) ?>" alt="" <?= $lazy ?> decoding="async" onerror="this.parentNode.classList.add('is-empty');this.remove()"><?php endif; ?>
      <span class="spor-card-ph" aria-hidden="true"><?= Html::e(mb_substr($tag !== '' ? $tag : 'S', 0, 1)) ?></span>
    </span>
    <?php endif; ?>
    <span class="spor-card-body">
      <?php if ($tag !== ''): ?><span class="spor-tag"><?= Html::e($tag) ?></span><?php endif; ?>
      <span class="spor-card-t"><?= Html::e($title) ?></span>
      <?php if (in_array($v, ['feature', 'slide'], true) && ($s['spot'] ?? '') !== ''): ?><span class="spor-card-s"><?= Html::e(mb_strimwidth((string) $s['spot'], 0, 180, '…')) ?></span><?php endif; ?>
      <?php if (($s['publishedAt'] ?? '') !== '' && $v !== 'slide'): ?><span class="spor-card-m"><time datetime="<?= Html::e(Html::iso((string) $s['publishedAt'])) ?>"><?= Html::e(Html::when((string) $s['publishedAt'])) ?></time></span><?php endif; ?>
    </span>
  </a>
</article>
