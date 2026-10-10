<?php
/* sector 2026-10-10: il / ilçe / mahalle seçici (JS /sektor/api/ilce, /sektor/api/mahalle). $provinces, $geoMah (bool), $geoReq (bool), $geoIds = [il, ilce, mah] */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

$geoMah = $geoMah ?? true;
$geoReq = $geoReq ?? false;
$geoIds = $geoIds ?? [0, 0, 0];
?>
<div class="sc-geo" data-sc-geo<?= isset($geoMahLabel) ? '' : '' ?>>
  <div class="yn-f"><label for="sc-il">İl<?= $geoReq ? '' : ' <em>(isteğe bağlı)</em>' ?></label>
    <select id="sc-il" name="il"<?= $geoReq ? ' required' : '' ?> data-sc-il><option value="">Seç</option>
      <?php foreach ($provinces as $p): ?><option value="<?= (int) $p['plaka'] ?>"<?= (int) $geoIds[0] === (int) $p['plaka'] ? ' selected' : '' ?>><?= Html::e(Sector::tr((string) $p['adi'])) ?></option><?php endforeach; ?>
    </select></div>
  <div class="yn-f"><label for="sc-ilce">İlçe</label>
    <select id="sc-ilce" name="ilce"<?= $geoReq ? ' required' : '' ?> data-sc-ilce data-pre="<?= (int) $geoIds[1] ?>" disabled><option value="">Önce il seç</option></select></div>
<?php if ($geoMah): ?>
  <div class="yn-f"><label for="sc-mah">Mahalle / köy</label>
    <select id="sc-mah" name="mahalle"<?= $geoReq ? ' required' : '' ?> data-sc-mah data-pre="<?= (int) $geoIds[2] ?>" disabled><option value="">Önce ilçe seç</option></select></div>
<?php endif; ?>
</div>
