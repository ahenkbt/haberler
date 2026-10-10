<?php
/* sector 2026-10-10: /rehber/<tür>/<id>-<ad> */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var array<string, mixed> $kd */
/** @var array<string, mixed> $r */
$data = json_decode((string) ($r['data'] ?? '{}'), true) ?: [];
$loc = array_filter([$r['mahalle'] ? Sector::tr((string) $r['mahalle']) : '', $r['ilce'] ? Sector::tr((string) $r['ilce']) : '', $r['il'] ? Sector::tr((string) $r['il']) : '']);
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><a href="/rehber">Rehber</a> / <a href="/rehber/<?= Html::e((string) $kd['key']) ?>"><?= Html::e((string) $kd['label']) ?></a></p>
  <h1 class="yn-page-h"><?= Html::e((string) $r['name']) ?></h1>
  <?php if ($loc !== []): ?><p class="yn-page-p"><?= Html::e(implode(' · ', $loc)) ?></p><?php endif; ?>
</div></section>
<div class="yn-wrap sc-detail">
  <div class="sc-card">
    <?php if (!empty($data['about'])): ?><div class="sc-about"><?php foreach (preg_split('/\R{2,}/u', (string) $data['about']) ?: [] as $para): ?><p><?= nl2br(Html::e(trim($para)), false) ?></p><?php endforeach; ?></div><?php endif; ?>
    <?php if (($r['summary'] ?? '') !== ''): ?><p class="sc-big"><?= Html::e((string) $r['summary']) ?></p><?php endif; ?>
    <dl class="sc-dl">
      <?php if (!empty($data['tur'])): ?><dt>Tür</dt><dd><?= Html::e((string) $data['tur']) ?></dd><?php endif; ?>
      <?php if (!empty($r['web'])): ?><dt>Web sitesi</dt><dd><a href="<?= Html::e((string) $r['web']) ?>" target="_blank" rel="noopener nofollow"><?= Html::e((string) preg_replace('#^https?://(www\.)?#', '', (string) $r['web'])) ?> ↗</a></dd><?php endif; ?>
      <?php if (!empty($data['mahalle'])): ?><dt>Mahalle / köy</dt><dd><?= Html::e((string) $data['mahalle']) ?></dd><?php endif; ?>
      <?php if (!empty($data['adres'])): ?><dt>Adres</dt><dd><?= Html::e((string) $data['adres']) ?></dd><?php endif; ?>
      <?php $gsm = !empty($r['has_tel']) && str_starts_with((string) $r['contact'], '05'); ?>
      <?php if (!empty($r['has_tel']) && !$gsm && (string) $kd['key'] !== 'muhtar'): $tel = preg_replace('/\D/', '', (string) $r['contact']); ?><dt>Telefon</dt><dd><a href="tel:<?= Html::e((string) $tel) ?>"><?= Html::e(strlen($tel) === 11 ? '(' . substr($tel, 0, 4) . ') ' . substr($tel, 4, 3) . ' ' . substr($tel, 7, 2) . ' ' . substr($tel, 9, 2) : $tel) ?></a></dd><?php endif; ?>
      <?php if (!empty($data['yetkili'])): ?><dt><?= Html::e((string) $kd['one']) ?> temsilcisi</dt><dd><?= Html::e((string) $data['yetkili']) ?></dd><?php endif; ?>
    </dl>
    <?php if ($gsm || (!empty($r['has_tel']) && (string) $kd['key'] === 'muhtar')): ?>
    <p class="sc-tel-row"><button type="button" class="yn-btn yn-btn-hot sc-tel" data-id="<?= (int) $r['id'] ?>" data-t="<?= Html::e((string) $telTok) ?>">📞 Ara</button> <span class="sc-tel-note" role="status"></span></p>
    <p class="yn-note">Telefon numarası sayfaya yazılmaz; “Ara”ya dokunduğunuzda arama uygulamanıza aktarılır (otomatik taramaya karşı sınırlandırılmıştır).</p>
    <?php endif; ?>
    <p class="yn-note">Bu kayıt <?= Html::e(Sector::$site->name) ?> yayın masasınca derlenmiş / onaylanmıştır; resmî kaynak değildir. Bilgilerde hata varsa ya da kaydın düzeltilmesini ya da kaldırılmasını istiyorsanız <a href="/iletisim">bize bildirin</a> (<a href="/kvkk-aydinlatma">KVKK</a>).</p>
    <p class="yn-hero-cta"><?php if ($r['mahalle_id']): ?><a class="yn-btn yn-btn-hot" href="/talep/<?= (int) $r['mahalle_id'] ?>">Bu mahalleye talep gönder</a> <?php endif; ?><a class="yn-btn yn-btn-ghost" href="/rehber/<?= Html::e((string) $kd['key']) ?>/<?= (int) $r['id'] ?>-<?= Html::e(Sector::slug((string) $r['name'])) ?>/kartvizit">Kartvizit / QR</a> <a class="yn-btn yn-btn-ghost" href="/rehber/<?= Html::e((string) $kd['key']) ?>">← Listeye dön</a></p>
  </div>
</div>
