<?php
/* sector 2026-10-10: bilgi merkezi sayfası (sözlük / SSS / kontrol listesi / takvim / rehber / emsal karar) — veri: config/sector-content.json */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $pg */
/** @var string $slug */
$type = (string) ($pg['type'] ?? 'guide');
$labels = ['glossary' => 'Sözlük', 'faq' => 'SSS', 'checklist' => 'Kontrol listeleri', 'calendar' => 'Takvim', 'guide' => 'Rehber', 'cases' => 'Emsal kararlar'];
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><a href="/bilgi">Bilgi Merkezi</a> / <?= Html::e($labels[$type] ?? 'Rehber') ?></p>
  <h1 class="yn-page-h"><?= Html::e((string) $pg['h1']) ?></h1>
  <p class="yn-page-p"><?= Html::e((string) ($pg['intro'] ?? '')) ?></p>
  <?php if (!empty($pg['updated'])): ?><p class="yn-note">Son gözden geçirme: <?= Html::e((string) $pg['updated']) ?></p><?php endif; ?>
</div></section>
<div class="yn-wrap sc-kb">
<?php if ($type === 'glossary'): ?>
  <label class="sc-kb-find" for="sc-kb-q">Terim ara <input id="sc-kb-q" type="search" data-sc-filter="#sc-kb-list" placeholder="ör. kıdem" autocomplete="off"></label>
  <ul class="sc-kb-list" id="sc-kb-list">
  <?php $items = (array) $pg['items']; usort($items, static fn ($a, $b) => strcmp(Sector::slug((string) $a[0]), Sector::slug((string) $b[0]))); foreach ($items as $it): ?>
    <li class="sc-card" data-n="<?= Html::e(mb_strtolower((string) $it[0] . ' ' . (string) $it[1], 'UTF-8')) ?>" id="<?= Html::e(Sector::slug((string) $it[0])) ?>"><h2><?= Html::e((string) $it[0]) ?></h2><p><?= Html::e((string) $it[1]) ?></p></li>
  <?php endforeach; ?>
  </ul>
<?php elseif ($type === 'faq'): ?>
  <div class="sc-kb-faq">
  <?php foreach ((array) $pg['items'] as $it): ?>
    <details class="sc-card"><summary><?= Html::e((string) $it[0]) ?></summary><p><?= (string) $it[1] ?></p></details>
  <?php endforeach; ?>
  </div>
<?php elseif ($type === 'checklist'): ?>
  <?php foreach ((array) $pg['groups'] as $gi => $g): ?>
  <section class="sc-card sc-kb-check"><h2><?= Html::e((string) $g['t']) ?></h2>
    <ul><?php foreach ((array) $g['items'] as $ii => $t): ?><li><label><input type="checkbox"> <span><?= Html::e((string) $t) ?></span></label></li><?php endforeach; ?></ul>
  </section>
  <?php endforeach; ?>
  <p><button type="button" class="yn-btn yn-btn-ghost" onclick="window.print()">Yazdır</button></p>
<?php elseif ($type === 'calendar'): ?>
  <div class="sc-kb-table-wrap"><table class="sc-kb-table"><thead><tr><th>Tarih</th><th>Olay</th><th>Kaynak</th></tr></thead><tbody>
  <?php foreach ((array) $pg['rows'] as $r): ?><tr><td><?= Html::e((string) $r[0]) ?></td><td><?= Html::e((string) $r[1]) ?></td><td><?= Html::e((string) ($r[2] ?? '')) ?></td></tr><?php endforeach; ?>
  </tbody></table></div>
  <?php if (!empty($pg['note'])): ?><p class="yn-note"><?= Html::e((string) $pg['note']) ?></p><?php endif; ?>
<?php elseif ($type === 'cases'): ?>
  <?php foreach ((array) $pg['cases'] as $c): ?>
  <article class="sc-card sc-kb-case"><p class="yn-note"><?= Html::e((string) $c['court']) ?> · <?= Html::e((string) $c['no']) ?> · <?= Html::e((string) $c['date']) ?></p>
    <h2><?= Html::e((string) $c['topic']) ?></h2><p><?= Html::e((string) $c['summary']) ?></p>
    <p><a href="<?= Html::e((string) $c['url']) ?>" target="_blank" rel="noopener nofollow">Kaynak: <?= Html::e((string) $c['src']) ?> ↗</a></p></article>
  <?php endforeach; ?>
  <?php if (!empty($pg['dbs'])): ?><section class="sc-card"><h2>Resmî karar veri tabanları</h2><ul><?php foreach ((array) $pg['dbs'] as $d): ?><li><a href="<?= Html::e((string) $d[1]) ?>" target="_blank" rel="noopener nofollow"><?= Html::e((string) $d[0]) ?> ↗</a></li><?php endforeach; ?></ul></section><?php endif; ?>
<?php else: ?>
  <?php foreach ((array) ($pg['sections'] ?? []) as $sec): ?>
  <section class="sc-card sc-kb-sec"><h2><?= Html::e((string) $sec['h']) ?></h2><?= (string) $sec['html'] ?></section>
  <?php endforeach; ?>
<?php endif; ?>
<?php if (!empty($pg['sources'])): ?>
  <section class="sc-kb-src"><h2>Kaynaklar</h2><ul><?php foreach ((array) $pg['sources'] as $s): ?><li><a href="<?= Html::e((string) $s[1]) ?>" target="_blank" rel="noopener nofollow"><?= Html::e((string) $s[0]) ?> ↗</a></li><?php endforeach; ?></ul>
  <p class="yn-note">Bu sayfa genel bilgilendirme amaçlıdır; resmî ve bağlayıcı metin için kaynaklara bakın. Hukuki, mali veya tıbbi tavsiye değildir.</p></section>
<?php endif; ?>
</div>
