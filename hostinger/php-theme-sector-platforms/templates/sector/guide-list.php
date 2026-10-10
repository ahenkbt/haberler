<?php
/* sector 2026-10-10: /rehber/<tür> */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $kd */
/** @var list<array<string, mixed>> $rows */
/** @var int $plaka */
/** @var int $ilceId */
/** @var string $q */
/** @var list<array<string, mixed>> $ilceler */
/** @var int $page */
/** @var bool $more */
/** @var list<array<string, mixed>> $provinces */
$k = (string) $kd['key'];
$base = '/rehber/' . $k;
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><a href="/rehber">Rehber</a> / <?= Html::e((string) $kd['label']) ?></p>
  <h1 class="yn-page-h"><?= Html::e((string) $kd['label']) ?></h1>
  <p class="yn-page-p"><?= Html::e((string) $kd['blurb']) ?></p>
  <form class="sc-filter" method="get" action="<?= Html::e($base) ?>" role="search" aria-label="Rehberde ara">
    <?php if ($provinces !== []): ?>
    <label for="sc-f-il">İl</label>
    <select id="sc-f-il" name="sehir" onchange="this.form.ilce&&(this.form.ilce.value='');this.form.submit()"><option value="">Tüm iller</option>
      <?php foreach ($provinces as $p): ?><option value="<?= (int) $p['plaka'] ?>"<?= $plaka === (int) $p['plaka'] ? ' selected' : '' ?>><?= Html::e(Sector::tr((string) $p['adi'])) ?></option><?php endforeach; ?>
    </select>
    <?php if ($ilceler !== []): ?>
    <label for="sc-f-ilce">İlçe</label>
    <select id="sc-f-ilce" name="ilce" onchange="this.form.submit()"><option value="">Tüm ilçeler</option>
      <?php foreach ($ilceler as $i): ?><option value="<?= (int) $i['id'] ?>"<?= $ilceId === (int) $i['id'] ? ' selected' : '' ?>><?= Html::e(Sector::tr((string) $i['adi'])) ?></option><?php endforeach; ?>
    </select>
    <?php endif; ?>
    <?php endif; ?>
    <label for="sc-f-q">Ara</label>
    <input id="sc-f-q" type="search" name="q" value="<?= Html::e($q) ?>" maxlength="60" placeholder="<?= $k === 'muhtar' ? 'mahalle veya ad' : 'ad veya adres' ?>" autocomplete="off">
    <button class="yn-btn yn-btn-hot" type="submit">Ara</button>
    <?php if ($plaka > 0 || $q !== ''): ?><a class="yn-btn yn-btn-ghost" href="<?= Html::e($base) ?>">Temizle</a><?php endif; ?>
  </form>
</div></section>
<div class="yn-wrap sc-dir">
<?php if ($rows !== [] && ($plaka > 0 || $q !== '')): ?><p class="yn-note">Sonuçlar sayfa <?= (int) $page ?> · her sayfada 30 kayıt.</p><?php endif; ?>
<?php if ($rows === []): ?>
  <div class="sc-empty">
    <p class="sc-big">Bu listede henüz onaylı kayıt yok.</p>
    <p>Rehber, başvuruların editör onayından geçmesiyle büyür. İlk kayıt sen olabilirsin.</p>
    <p><a class="yn-btn yn-btn-hot" href="/uye-ol">Rehbere başvur →</a></p>
  </div>
<?php else: ?>
  <div class="sc-grid">
    <?php foreach ($rows as $i => $r): $href = '/rehber/' . $k . '/' . (int) $r['id'] . '-' . Sector::slug((string) $r['name']); $data = json_decode((string) ($r['data'] ?? '{}'), true) ?: []; ?>
      <a class="sc-card sc-dcard" href="<?= Html::e($href) ?>" data-reveal>
        <span class="sc-dcard-art"><?= Sector::art(Sector::colors()['hot'], ['grid', 'rings', 'dots', 'bars'][$i % 4], (int) $r['id'], 'yn-art') ?></span>
        <b class="sc-dcard-t"><?= Html::e((string) $r['name']) ?></b>
        <?php if (($r['il'] ?? '') !== '' && $r['il'] !== null): ?><span class="sc-dcard-m"><?= Html::e(Sector::tr((string) ($r['ilce'] ?? '')) . ($r['ilce'] ? ' / ' : '') . Sector::tr((string) $r['il'])) ?></span><?php elseif (!empty($data['tur'])): ?><span class="sc-dcard-m"><?= Html::e((string) $data['tur']) ?></span><?php endif; ?>
        <?php if (!empty($data['mahalle'])): ?><span class="sc-dcard-s"><?= Html::e((string) $data['mahalle']) ?></span><?php elseif (!empty($data['adres'])): ?><span class="sc-dcard-s"><?= Html::e(mb_strimwidth((string) $data['adres'], 0, 90, '…')) ?></span><?php endif; ?>
        <?php if (($r['summary'] ?? '') !== ''): ?><span class="sc-dcard-s"><?= Html::e(mb_strimwidth((string) $r['summary'], 0, 130, '…')) ?></span><?php endif; ?>
      </a>
    <?php endforeach; ?>
  </div>
  <nav class="yn-pager" aria-label="Sayfalar">
    <?php $qs = ($plaka > 0 ? 'sehir=' . $plaka . '&' : '') . ($ilceId > 0 ? 'ilce=' . $ilceId . '&' : '') . ($q !== '' ? 'q=' . rawurlencode($q) . '&' : ''); ?>
    <?php if ($page > 1): ?><a class="yn-btn yn-btn-ghost" href="<?= Html::e($base . '?' . $qs . 'sayfa=' . ($page - 1)) ?>">← Önceki</a><?php endif; ?>
    <?php if ($more): ?><a class="yn-btn yn-btn-ghost" href="<?= Html::e($base . '?' . $qs . 'sayfa=' . ($page + 1)) ?>">Daha fazla →</a><?php endif; ?>
  </nav>
<?php endif; ?>
</div>
