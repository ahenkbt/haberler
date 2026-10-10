<?php
/* sector 2026-10-10: /sektor/takip */
declare(strict_types=1);

use Yenisafak\Html;

/** @var string $ref */
/** @var array<string, mixed>|null $row */
$names = ['new' => 'Alındı – inceleniyor', 'forwarded' => 'İlgili birime iletildi', 'answered' => 'Yanıtlandı', 'closed' => 'Kapatıldı'];
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Talep takibi</p>
  <h1 class="yn-page-h">Talebin <em>nerede?</em></h1>
  <form class="sc-track" method="get" action="/sektor/takip"><input type="text" name="ref" value="<?= Html::e($ref) ?>" placeholder="Takip kodu (ör. MU-AB12CD3)" maxlength="12" required><button class="yn-btn yn-btn-hot" type="submit">Sorgula</button></form>
<?php if ($ref !== '' && $row === null): ?><p class="yn-page-p">Bu kodla bir talep bulunamadı.</p>
<?php elseif ($row !== null): ?>
  <div class="sc-card sc-track-res">
    <p><b><?= Html::e((string) $row['ref']) ?></b> · <?= Html::e((string) $row['kind']) ?></p>
    <p class="sc-big"><?= Html::e((string) $row['subject']) ?></p>
    <p>Durum: <span class="sc-status sc-st-<?= Html::e((string) $row['status']) ?>"><?= Html::e($names[(string) $row['status']] ?? (string) $row['status']) ?></span></p>
    <?php if (($row['public_note'] ?? '') !== ''): ?><p class="sc-note-pub"><b>Yayın masası notu:</b> <?= Html::e((string) $row['public_note']) ?></p><?php endif; ?>
    <p class="yn-note">Kayıt: <?= Html::e(Html::when((string) $row['created_at'])) ?> · Son güncelleme: <?= Html::e(Html::when((string) $row['updated_at'])) ?></p>
  </div>
<?php endif; ?>
</div></section>
