<?php
/* sector 2026-10-10: Mahallemi Bul (tr_il / tr_ilce / tr_mahalle) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var string $mode index|province|district */
?>
<section class="yn-phero"><div class="yn-wrap">
<?php if ($mode === 'index'): ?>
  <p class="yn-eyebrow"><span class="yn-dot"></span>Mahallemi Bul</p>
  <h1 class="yn-page-h">Önce ilini seç,<br><em>mahalleni bul.</em></h1>
  <p class="yn-page-p">81 il, ilçe ve mahalle kaydı. Mahalleni seç; kayıtlı muhtarını gör, muhtarlığa talep gönder.</p>
<?php elseif ($mode === 'province'): ?>
  <p class="yn-eyebrow"><a href="/mahallemi-bul">Mahallemi Bul</a> / <?= Html::e(Sector::tr((string) $il['adi'])) ?></p>
  <h1 class="yn-page-h"><?= Html::e(Sector::tr((string) $il['adi'])) ?> <em>ilçeleri</em></h1>
  <p class="yn-page-p">İlçeni seç, ardından mahalleni bul.</p>
<?php else: ?>
  <p class="yn-eyebrow"><a href="/mahallemi-bul">Mahallemi Bul</a> / <a href="/mahallemi-bul/<?= (int) $d['il_plaka'] ?>-<?= Html::e(Sector::slug((string) $d['il'])) ?>"><?= Html::e(Sector::tr((string) $d['il'])) ?></a> / <?= Html::e(Sector::tr((string) $d['adi'])) ?></p>
  <h1 class="yn-page-h"><?= Html::e(Sector::tr((string) $d['adi'])) ?> <em>mahalleleri</em></h1>
  <p class="yn-page-p"><?= count($mah) ?> kayıt. Aradığın mahalleyi yaz ya da listeden seç.</p>
  <p><input class="sc-search" type="search" placeholder="Mahalle ara…" data-sc-filter="#sc-mlist" aria-label="Mahalle ara"></p>
<?php endif; ?>
</div></section>
<div class="yn-wrap sc-find">
<?php if ($mode === 'index'): ?>
  <div class="sc-pgrid">
    <?php foreach ($provinces as $p): ?><a href="/mahallemi-bul/<?= (int) $p['plaka'] ?>-<?= Html::e(Sector::slug((string) $p['adi'])) ?>"><i><?= str_pad((string) (int) $p['plaka'], 2, '0', STR_PAD_LEFT) ?></i><?= Html::e(Sector::tr((string) $p['adi'])) ?></a><?php endforeach; ?>
  </div>
<?php elseif ($mode === 'province'): ?>
  <div class="sc-pgrid sc-pgrid-w">
    <?php foreach ($ilceler as $i): ?><a href="/mahallemi-bul/<?= (int) $il['plaka'] ?>-<?= Html::e(Sector::slug((string) $il['adi'])) ?>/<?= (int) $i['kimlik_no'] ?>-<?= Html::e(Sector::slug((string) $i['adi'])) ?>"><?= Html::e(Sector::tr((string) $i['adi'])) ?><small><?= (int) $i['n'] ?> mahalle</small></a><?php endforeach; ?>
  </div>
<?php else: ?>
  <ul class="sc-mlist" id="sc-mlist">
    <?php foreach ($mah as $m): ?><li data-n="<?= Html::e(mb_strtolower(Sector::tr((string) ($m['bilesen'] ?: $m['adi'])), 'UTF-8')) ?>"><a href="/mahalle/<?= (int) $m['kimlik_no'] ?>-<?= Html::e(Sector::slug((string) $m['adi'])) ?>"><?= Html::e(Sector::tr((string) ($m['bilesen'] ?: $m['adi']))) ?><?= (int) $m['muhtar'] > 0 ? '<em>muhtar kayıtlı</em>' : '' ?></a></li><?php endforeach; ?>
  </ul>
<?php endif; ?>
</div>
