<?php
/* eco 2026-10-10: haber kartı. $s = story, $v = lead|std|row|text|wide, $n = sıra */
declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var array<string, mixed> $s */
/** @var Yenisafak\Site $site */
$v = $v ?? 'std';
$cat = (string) ($s['category'] ?? '');
$sec = Eco::section($cat);
$href = '/haber/' . rawurlencode((string) $s['slug']);
$img = (string) ($s['image'] ?? '');
$col = $sec['color'] ?? '#c9a227';
$tag = $sec['short'] ?? '';
$lazy = $v === 'lead' ? 'fetchpriority="high"' : 'loading="lazy"';
?>
<article class="eco-card eco-card-<?= Html::e($v) ?>" style="--c:<?= Html::e($col) ?>">
  <a class="eco-card-a" href="<?= Html::e($href) ?>">
    <?php if ($v !== 'text' && $v !== 'row'): ?>
    <span class="eco-card-media<?= $img === '' ? ' is-empty' : '' ?>">
      <?php if ($img !== ''): ?><img src="<?= Html::e(Html::src($site->basePath, $img)) ?>" alt="" <?= $lazy ?> decoding="async" onerror="this.parentNode.classList.add('is-empty');this.remove()"><?php endif; ?>
      <span class="eco-card-ph" aria-hidden="true"><?= Html::e(mb_substr((string) ($sec['short'] ?? 'E'), 0, 1)) ?></span>
    </span>
    <?php elseif ($v === 'text'): ?>
    <span class="eco-card-n"><?= str_pad((string) (($n ?? 0) + 1), 2, '0', STR_PAD_LEFT) ?></span>
    <?php endif; ?>
    <span class="eco-card-body">
      <?php if ($tag !== '' && $v !== 'text'): ?><span class="eco-tag"><?= Html::e($tag) ?></span><?php endif; ?>
      <span class="eco-card-t"><?= Html::e((string) $s['title']) ?></span>
      <?php if (in_array($v, ['lead', 'wide'], true) && ($s['spot'] ?? '') !== ''): ?><span class="eco-card-s"><?= Html::e(mb_strimwidth((string) $s['spot'], 0, 230, '…')) ?></span><?php endif; ?>
      <span class="eco-card-m"><time datetime="<?= Html::e(Html::iso((string) $s['publishedAt'])) ?>"><?= Html::e(Html::when((string) $s['publishedAt'])) ?></time></span>
    </span>
  </a>
</article>
