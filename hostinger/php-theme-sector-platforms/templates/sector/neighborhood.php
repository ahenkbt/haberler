<?php
/* sector 2026-10-10: /mahalle/<id>-<ad> */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $m */
/** @var list<array<string, mixed>> $muhtar */
/** @var string $label */
$ilS = Sector::slug((string) $m['il']);
$ilceS = Sector::slug((string) $m['ilce']);
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><a href="/mahallemi-bul">Mahallemi Bul</a> / <a href="/mahallemi-bul/<?= (int) $m['il_plaka'] ?>-<?= Html::e($ilS) ?>"><?= Html::e(Sector::tr((string) $m['il'])) ?></a> / <a href="/mahallemi-bul/<?= (int) $m['il_plaka'] ?>-<?= Html::e($ilS) ?>/<?= (int) $m['ilce_kimlik'] ?>-<?= Html::e($ilceS) ?>"><?= Html::e(Sector::tr((string) $m['ilce'])) ?></a></p>
  <h1 class="yn-page-h"><?= Html::e($label) ?></h1>
  <p class="yn-page-p"><?= Html::e(Sector::tr((string) $m['ilce']) . ', ' . Sector::tr((string) $m['il'])) ?></p>
</div></section>
<div class="yn-wrap sc-detail sc-nb">
  <div class="sc-card">
    <p class="yn-eyebrow">Muhtar</p>
<?php if ($muhtar === []): ?>
    <p class="sc-big">Bu mahalle için henüz onaylı muhtar kaydı yok.</p>
    <p>Mahalle muhtarıysanız kaydınızı oluşturun; editör onayından sonra bu sayfada görünür.</p>
    <p class="yn-hero-cta"><a class="yn-btn yn-btn-hot" href="/uye-ol">Muhtarım, kaydımı oluştur →</a></p>
<?php else: foreach ($muhtar as $r): ?>
    <p class="sc-big"><a href="/rehber/muhtar/<?= (int) $r['id'] ?>-<?= Html::e(Sector::slug((string) $r['name'])) ?>"><?= Html::e((string) $r['name']) ?></a></p>
    <?php if (($r['summary'] ?? '') !== ''): ?><p><?= Html::e((string) $r['summary']) ?></p><?php endif; ?>
<?php endforeach; endif; ?>
  </div>
  <div class="sc-card">
    <p class="yn-eyebrow">Talep gönder</p>
    <p class="sc-big">Bu mahalle için bir talebin mi var?</p>
    <p>Altyapı, temizlik, belge işlemleri ya da önerin; talebin kayıt altına alınır, takip kodu verilir ve yayın masası ilgili muhtarlığa iletir.</p>
    <p class="yn-hero-cta"><a class="yn-btn yn-btn-hot" href="/talep/<?= (int) $m['kimlik_no'] ?>">Muhtarlığa talep gönder →</a></p>
  </div>
</div>
