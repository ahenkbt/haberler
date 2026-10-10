<?php
/* eco 2026-10-10: piyasa kutusu (tablo). $rows = list of quote rows, $title (opsiyonel) */
declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var list<array<string, mixed>> $rows */
if ($rows === []) {
    return;
}
?>
<div class="eco-qbox">
  <?php if (($title ?? '') !== ''): ?><h3 class="eco-qbox-h"><?= Html::e($title) ?><a href="/piyasalar">Tümü →</a></h3><?php endif; ?>
  <table class="eco-qtable"><tbody>
  <?php foreach ($rows as $m): $d = Eco::dir($m['change'] ?? null); ?>
    <tr class="is-<?= $d ?>">
      <th scope="row"><?= Html::e((string) $m['label']) ?></th>
      <td class="v"><?= Html::e(Eco::fmt($m)) ?> <small><?= Html::e((string) $m['unit']) ?></small></td>
      <td class="c"><?php if (($m['change'] ?? null) !== null): ?><?= $d === 'up' ? '▲' : ($d === 'down' ? '▼' : '•') ?> <?= Html::e(Eco::fmtChange((float) $m['change'])) ?><?php endif; ?></td>
    </tr>
  <?php endforeach; ?>
  </tbody></table>
</div>
