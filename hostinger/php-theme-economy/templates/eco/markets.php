<?php
/* eco 2026-10-10: /piyasalar — canlı piyasa tablosu (gerçek kaynaklar) + TCMB gösterge kurları */
declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var array<string, array<string, mixed>> $quotes */
/** @var array<string, mixed>|null $tcmb */
/** @var int|null $at */
$groups = [
    'Borsa ve Endeks' => ['bist'],
    'Döviz' => ['usd', 'eur', 'gbp'],
    'Altın ve Gümüş' => ['gram', 'ceyrek', 'ons', 'gumus'],
    'Enerji' => ['brent'],
    'Kripto Para' => ['btc', 'eth'],
];
?>
<section class="eco-chero" style="--c:#c9a227"><div class="eco-wrap">
  <p class="eco-crumb"><a href="/">Ana Sayfa</a> / Canlı Piyasalar</p>
  <h1>Canlı Piyasalar</h1>
  <p>BIST 100, döviz, altın, Brent petrol ve kripto para güncel fiyatları.<?php if ($at): ?> Son güncelleme: <?= Html::e(date('H:i', $at)) ?> (TSİ).<?php endif; ?></p>
</div></section>
<div class="eco-wrap eco-mkt">
  <?php if ($quotes === []): ?><p class="eco-empty">Piyasa verileri şu anda alınamıyor. Kısa süre sonra yeniden deneyin.</p><?php endif; ?>
  <div class="eco-mkt-grid">
  <?php foreach ($groups as $gname => $keys): $rows = array_values(array_filter(array_map(static fn (string $k) => $quotes[$k] ?? null, $keys))); if ($rows === []) { continue; } $title = $gname; ?>
    <?php require __DIR__ . '/_quotes.php'; ?>
  <?php endforeach; ?>
  </div>
  <?php if (is_array($tcmb) && !empty($tcmb['rates'])): ?>
  <section class="eco-qbox eco-tcmb"><h3 class="eco-qbox-h">T.C. Merkez Bankası Gösterge Kurları <small><?= Html::e((string) ($tcmb['date'] ?? '')) ?></small></h3>
    <table class="eco-qtable eco-qtable-w"><thead><tr><th>Para birimi</th><th>Alış</th><th>Satış</th></tr></thead><tbody>
    <?php foreach ($tcmb['rates'] as $code => $r): ?><tr><th scope="row"><?= Html::e((string) $code) ?> <small><?= Html::e((string) $r['name']) ?></small></th><td class="v"><?= Html::e(number_format((float) $r['buying'], 4, ',', '.')) ?></td><td class="v"><?= Html::e(number_format((float) $r['selling'], 4, ',', '.')) ?></td></tr><?php endforeach; ?>
    </tbody></table>
  </section>
  <?php endif; ?>
  <p class="eco-qnote">Kaynaklar: Yahoo Finance (BIST 100, kur, Brent, ons altın, kripto), Truncgil Finans (gram/çeyrek altın, gümüş), T.C. Merkez Bankası. Veriler gecikmeli olabilir; bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.</p>
</div>
