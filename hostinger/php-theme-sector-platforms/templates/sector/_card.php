<?php
/* sector 2026-10-10: story card (yeni.tc kartı). $s = story (Repository::mapStory), $v = lead|std|row|text|wide, $n = index (text variant) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $s */
$v = $v ?? 'std';
$sec = Sector::section((string) ($s['category'] ?? ''));
$href = '/haber/' . rawurlencode((string) $s['slug']);
$img = (string) ($s['image'] ?? '');
$col = $sec['color'] ?? Sector::colors()['hot'];
$tag = $sec['short'] ?? '';
$lazy = ($v === 'lead') ? 'fetchpriority="high"' : 'loading="lazy"';
?>
<article class="yn-card yn-card-<?= Html::e($v) ?>" style="--c:<?= Html::e($col) ?>" data-reveal>
  <a class="yn-card-a" href="<?= Html::e($href) ?>">
    <?php if ($v !== 'text'): ?>
    <span class="yn-card-media">
      <?php if ($img !== ''): ?><img src="<?= Html::e($img) ?>" alt="" <?= $lazy ?> decoding="async" onerror="this.parentNode.classList.add('is-art');this.remove()"><?php endif; ?>
      <?= Sector::artFor((string) ($s['category'] ?? ''), crc32((string) $s['slug']) % 97, 'yn-art yn-card-art') ?>
    </span>
    <?php else: ?>
    <span class="yn-card-n"><?= str_pad((string) (($n ?? 0) + 1), 2, '0', STR_PAD_LEFT) ?></span>
    <?php endif; ?>
    <span class="yn-card-body">
      <?php if ($tag !== ''): ?><span class="yn-tag"><?= Html::e($tag) ?></span><?php endif; ?>
      <span class="yn-card-t"><?= Html::e((string) $s['title']) ?></span>
      <?php if (($v === 'lead' || $v === 'wide' || $v === 'std') && ($s['spot'] ?? '') !== ''): ?><span class="yn-card-s"><?= Html::e(mb_strimwidth((string) $s['spot'], 0, $v === 'std' ? 140 : 220, '…')) ?></span><?php endif; ?>
      <span class="yn-card-m"><time datetime="<?= Html::e(Html::iso((string) $s['publishedAt'])) ?>"><?= Html::e(Html::when((string) $s['publishedAt'])) ?></time></span>
    </span>
  </a>
</article>
