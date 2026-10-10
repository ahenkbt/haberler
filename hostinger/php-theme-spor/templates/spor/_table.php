<?php
/* spor 2026-10-10: Süper Lig tablosu. $rows boşsa hiçbir şey basılmaz. */
declare(strict_types=1);

use Yenisafak\Html;

/** @var list<array<string, mixed>> $rows */
/** @var string $season */
if ($rows === []) {
    return;
}
$season = $season ?? '';
$linkAll = $linkAll ?? false;
?>
<div class="spor-table-wrap">
  <table class="spor-table">
    <caption>Süper Lig puan durumu<?= $season !== '' ? ' · ' . Html::e($season) : '' ?></caption>
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Takım</th>
        <th scope="col">O</th>
        <th scope="col" class="spor-hide-sm">G</th>
        <th scope="col" class="spor-hide-sm">B</th>
        <th scope="col" class="spor-hide-sm">M</th>
        <th scope="col" class="spor-hide-md">A</th>
        <th scope="col" class="spor-hide-md">Y</th>
        <th scope="col">Av</th>
        <th scope="col">P</th>
      </tr>
    </thead>
    <tbody>
    <?php foreach ($rows as $r):
        $zone = (string) ($r['zoneRaw'] ?? '');
        $zclass = match (true) {
            str_contains($zone, 'Champions League') && !str_contains($zone, 'qualifying') => 'z-cl',
            str_contains($zone, 'Champions') => 'z-clq',
            str_contains($zone, 'Europa') => 'z-el',
            str_contains($zone, 'Conference') => 'z-ecl',
            $zone === 'Relegated' || $zone === 'Relegation' => 'z-rel',
            default => '',
        };
        $gd = (int) $r['gd'];
    ?>
      <tr class="<?= Html::e($zclass) ?>">
        <td class="rk"><?= (int) $r['rank'] ?></td>
        <th scope="row">
          <span class="tm"><?= Html::e((string) $r['team']) ?></span>
          <?php if (($r['zone'] ?? '') !== ''): ?><small><?= Html::e((string) $r['zone']) ?></small><?php endif; ?>
        </th>
        <td><?= (int) $r['played'] ?></td>
        <td class="spor-hide-sm"><?= (int) $r['wins'] ?></td>
        <td class="spor-hide-sm"><?= (int) $r['draws'] ?></td>
        <td class="spor-hide-sm"><?= (int) $r['losses'] ?></td>
        <td class="spor-hide-md"><?= (int) $r['gf'] ?></td>
        <td class="spor-hide-md"><?= (int) $r['ga'] ?></td>
        <td class="gd"><?= $gd > 0 ? '+' . $gd : (string) $gd ?></td>
        <td class="pts"><?= (int) $r['points'] ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <?php if ($linkAll): ?><p class="spor-table-more"><a href="/puan-durumu">Tüm tablo</a></p><?php endif; ?>
</div>
