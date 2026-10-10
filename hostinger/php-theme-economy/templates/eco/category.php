<?php
/* eco 2026-10-10: /kategori/<slug> (App::render override) */
declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var string $name */
/** @var string $slug */
/** @var list<array<string, mixed>> $items */
/** @var int $page */
/** @var bool $hasMore */
$sec = Eco::section($slug) ?? ['name' => $name, 'blurb' => '', 'color' => '#c9a227', 'slug' => $slug, 'short' => $name];
$q = Eco::quotes();
$qrows = array_values(array_filter(array_map(static fn (string $k) => $q[$k] ?? null, Eco::quoteKeysFor($slug))));
?>
<section class="eco-chero" style="--c:<?= Html::e($sec['color']) ?>">
  <div class="eco-wrap">
    <p class="eco-crumb"><a href="/">Ana Sayfa</a> / <a href="/bolumler">Bölümler</a> / <?= Html::e($sec['name']) ?></p>
    <h1><?= Html::e($sec['name']) ?></h1>
    <?php if ($sec['blurb'] !== ''): ?><p><?= Html::e($sec['blurb']) ?></p><?php endif; ?>
    <?php if ($qrows !== []): ?><div class="eco-chero-q"><?php foreach ($qrows as $m): $d = Eco::dir($m['change'] ?? null); ?><span class="is-<?= $d ?>"><em><?= Html::e((string) $m['label']) ?></em> <b><?= Html::e(Eco::fmt($m)) ?> <?= Html::e((string) $m['unit']) ?></b> <?= $m['change'] !== null ? '<i>' . ($d === 'up' ? '▲' : ($d === 'down' ? '▼' : '•')) . ' ' . Html::e(Eco::fmtChange((float) $m['change'])) . '</i>' : '' ?></span><?php endforeach; ?></div><?php endif; ?>
  </div>
</section>
<div class="eco-wrap eco-cat">
  <?php if ($items === []): ?>
    <p class="eco-empty">Bu bölümde henüz haber yok; yeni haberler geldikçe burada yer alacak.</p>
  <?php else: ?>
    <div class="eco-cat-grid">
      <?php foreach ($items as $n => $s): $v = ($page === 1 && $n === 0) ? 'wide' : 'std'; ?>
        <?php if ($v === 'wide'): ?><div class="eco-cat-span"><?php require __DIR__ . '/_card.php'; ?></div><?php else: require __DIR__ . '/_card.php'; endif; ?>
      <?php endforeach; ?>
    </div>
    <nav class="eco-pager" aria-label="Sayfalar">
      <?php if ($page > 1): ?><a class="eco-btn" href="/kategori/<?= Html::e($slug) ?><?= $page > 2 ? '?sayfa=' . ($page - 1) : '' ?>">← Önceki</a><?php endif; ?>
      <?php if ($hasMore): ?><a class="eco-btn" href="/kategori/<?= Html::e($slug) ?>?sayfa=<?= $page + 1 ?>">Daha fazla →</a><?php endif; ?>
    </nav>
  <?php endif; ?>
</div>
